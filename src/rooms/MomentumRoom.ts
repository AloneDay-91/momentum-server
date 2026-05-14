import { Room, Client } from "colyseus";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import {
  TICK_RATE_HZ,
  MAX_CLIENTS_PER_ROOM,
  COUNTDOWN_SECONDS,
  STUN_DURATION_MS,
} from "../config";
import { verifyGameSession, markPlayerJoined } from "../auth/verifyGameSession";
import { persistRoomScores, markGameSessionPlaying } from "../db/persistScores";

interface JoinOptions {
  sessionId: string;
  token: string;
  pseudo?: string;
}

interface PlayerInputMessage {
  posX: number; posY: number; posZ: number;
  velX: number; velY: number; velZ: number;
  rotY: number;
  isGrounded: boolean;
  isSliding: boolean;
  horizontalInput: number;
  isManuallySliding?: boolean;
  isLandingHard?: boolean;
  actionSeq?: number;
  actionId?: number;
}

interface AuthData {
  playerNumber: 1 | 2;
  pseudo: string;
  gameSessionInternalId: string;
}

interface MomentumRoomOptions {
  state?: GameState;
  metadata?: { gameSessionId: string };
}

export class MomentumRoom extends Room<MomentumRoomOptions> {
  maxClients = MAX_CLIENTS_PER_ROOM;
  patchRate = 1000 / TICK_RATE_HZ;
  autoDispose = true;

  private elapsedInterval?: { clear(): void };
  private countdownInterval?: { clear(): void };
  private gameSessionInternalId: string = "";
  private sceneReadySessionIds: Set<string> = new Set();

  onCreate(options: { gameSessionId?: string }) {
    this.setState(new GameState());
    this.setMetadata({ gameSessionId: options.gameSessionId ?? "" });

    this.onMessage("input", (client: Client, msg: PlayerInputMessage) =>
      this.handleInput(client, msg)
    );
    this.onMessage("stun", (client: Client) => this.handleStun(client));
    this.onMessage("finish", (client: Client, payload: { score: number }) =>
      this.handleFinish(client, payload)
    );
    this.onMessage("sceneReady", (client: Client) => this.handleSceneReady(client));
    this.onMessage("death", (client: Client) => this.handleDeath(client));

    console.log(`[Room] Created for gameSession=${options.gameSessionId ?? "none"}`);
  }

  async onAuth(_client: Client, options: JoinOptions): Promise<AuthData> {
    let result;
    try {
      result = await verifyGameSession(options.sessionId, options.token);
    } catch (err) {
      console.error(`[Room] Auth DB error:`, err);
      throw new Error("internal-error");
    }
    if (!result.ok) {
      throw new Error(`Auth failed: ${result.reason}`);
    }

    let alreadyTaken = false;
    this.state.players.forEach((p) => {
      if (p.playerNumber === result.playerNumber) alreadyTaken = true;
    });
    if (alreadyTaken) throw new Error("player-slot-taken");

    return {
      playerNumber: result.playerNumber,
      pseudo: result.pseudo,
      gameSessionInternalId: result.gameSessionInternalId,
    };
  }

  onJoin(client: Client, _options: JoinOptions, auth: AuthData) {
    this.gameSessionInternalId = auth.gameSessionInternalId;

    const player = new PlayerState();
    player.playerNumber = auth.playerNumber;
    player.pseudo = auth.pseudo;
    (this.state as GameState).players.set(client.sessionId, player);

    // Mark in DB only after the player is confirmed seated
    markPlayerJoined(auth.gameSessionInternalId, auth.playerNumber).catch((err) => {
      console.error(`[Room] Failed to mark player joined:`, err);
    });

    console.log(`[Room] ${auth.pseudo} (P${auth.playerNumber}) joined as ${client.sessionId}`);

    // Once both players are present, tell every client to LoadScene. We DON'T start the
    // countdown yet — we wait for both clients to signal "sceneReady" so the in-game
    // countdown is perfectly synchronized regardless of WebGL load time differences.
    if ((this.state as GameState).players.size === MAX_CLIENTS_PER_ROOM) {
      (this.state as GameState).status = "loading";
      console.log(`[Room] Both players present → status=loading, waiting for sceneReady handshake`);
    }
  }

  onLeave(client: Client, _code?: number) {
    const gameState = this.state as GameState;
    gameState.players.delete(client.sessionId);
    console.log(`[Room] Client ${client.sessionId} left`);

    if (gameState.status === "playing") {
      gameState.status = "finished";
      this.determineWinner().catch((err) => {
        console.error(`[Room] determineWinner on disconnect failed:`, err);
      });
    }
  }

  onDispose() {
    this.elapsedInterval?.clear();
    this.countdownInterval?.clear();
    console.log(`[Room] Disposed`);
  }

  // === Game flow ===

  private startCountdown() {
    const gameState = this.state as GameState;
    gameState.status = "countdown";
    gameState.countdownRemaining = COUNTDOWN_SECONDS;
    this.countdownInterval?.clear();
    this.countdownInterval = this.clock.setInterval(() => {
      gameState.countdownRemaining -= 1;
      if (gameState.countdownRemaining <= 0) {
        this.countdownInterval?.clear();
        this.countdownInterval = undefined;
        this.startGame();
      }
    }, 1000);
  }

  private startGame() {
    const gameState = this.state as GameState;
    gameState.status = "playing";
    gameState.elapsedTime = 0;
    this.elapsedInterval?.clear();
    this.elapsedInterval = this.clock.setInterval(() => {
      if (gameState.status === "playing") gameState.elapsedTime += 0.1;
    }, 100);

    // Promote the DB GameSession to "playing" so /api/game/end accepts score POSTs
    // when the match finishes. No client ever calls /api/game/start in the multiplayer
    // flow, so without this the DB row stays at "waiting" forever and the REST endpoint
    // rejects scores with "La partie n'est pas en cours".
    if (this.gameSessionInternalId) {
      markGameSessionPlaying(this.gameSessionInternalId).catch((err) => {
        console.error(`[Room] Failed to mark GameSession playing:`, err);
      });
    }
  }

  // === Message handlers ===

  private handleInput(client: Client, msg: PlayerInputMessage) {
    const gameState = this.state as GameState;
    const player = gameState.players.get(client.sessionId);
    if (!player || player.isStunned) return;
    // Accept position writes during "loading"/"countdown" too — otherwise remotes
    // see the player teleport into place at the GO instead of being there from start.
    if (gameState.status === "finished") return;

    player.posX = msg.posX;
    player.posY = msg.posY;
    player.posZ = msg.posZ;
    player.velX = msg.velX;
    player.velY = msg.velY;
    player.velZ = msg.velZ;
    player.rotY = msg.rotY;
    player.isGrounded = msg.isGrounded;
    player.isSliding = msg.isSliding;
    player.horizontalInput = msg.horizontalInput;

    // Animation extras (optional for back-compat with older clients)
    if (msg.isManuallySliding !== undefined) player.isManuallySliding = msg.isManuallySliding;
    if (msg.isLandingHard !== undefined) player.isLandingHard = msg.isLandingHard;
    if (msg.actionSeq !== undefined && msg.actionSeq > player.actionSeq) {
      player.actionSeq = msg.actionSeq;
      player.actionId = msg.actionId ?? 0;
    }
  }

  private handleStun(attacker: Client) {
    const gameState = this.state as GameState;
    const attackerPlayer = gameState.players.get(attacker.sessionId);
    if (!attackerPlayer || gameState.status !== "playing") return;

    gameState.players.forEach((player: PlayerState, sessionId: string) => {
      if (sessionId !== attacker.sessionId && !player.isStunned) {
        player.isStunned = true;
        this.clock.setTimeout(() => {
          player.isStunned = false;
        }, STUN_DURATION_MS);
      }
    });
  }

  private handleFinish(client: Client, payload: { score: number }) {
    const gameState = this.state as GameState;
    const player = gameState.players.get(client.sessionId);
    if (!player || player.hasFinished || gameState.status !== "playing") return;
    player.hasFinished = true;
    player.score = payload.score;
    this.checkAllDone();
  }

  private handleSceneReady(client: Client) {
    const gameState = this.state as GameState;
    if (gameState.status !== "loading") return;
    if (this.sceneReadySessionIds.has(client.sessionId)) return;
    this.sceneReadySessionIds.add(client.sessionId);
    console.log(`[Room] sceneReady from ${client.sessionId} (${this.sceneReadySessionIds.size}/${MAX_CLIENTS_PER_ROOM})`);
    if (this.sceneReadySessionIds.size >= MAX_CLIENTS_PER_ROOM) {
      this.startCountdown();
    }
  }

  private handleDeath(client: Client) {
    const gameState = this.state as GameState;
    const player = gameState.players.get(client.sessionId);
    if (!player || gameState.status !== "playing" || !player.isAlive) return;
    player.isAlive = false;
    console.log(`[Room] P${player.playerNumber} died`);
    this.checkAllDone();
  }

  // Match ends when every player has either finished the parkour or died.
  private checkAllDone() {
    const gameState = this.state as GameState;
    if (gameState.status !== "playing") return;
    let allDone = true;
    gameState.players.forEach((p: PlayerState) => {
      if (p.isAlive && !p.hasFinished) allDone = false;
    });
    if (allDone) {
      gameState.status = "finished";
      this.determineWinner().catch((err) => console.error(`[Room] determineWinner failed:`, err));
    }
  }

  private async determineWinner() {
    const gameState = this.state as GameState;
    let bestScore = -1;
    let winnerSessionId = "";
    gameState.players.forEach((p: PlayerState, sessionId: string) => {
      if (p.score > bestScore) {
        bestScore = p.score;
        winnerSessionId = sessionId;
      }
    });
    gameState.winnerSessionId = winnerSessionId;

    if (!this.gameSessionInternalId) {
      console.warn(`[Room] No gameSessionInternalId — skipping score persistence`);
      return;
    }

    try {
      await persistRoomScores(this.gameSessionInternalId, gameState.players);
      console.log(`[Room] Scores persisted for ${this.gameSessionInternalId}`);
    } catch (err) {
      console.error(`[Room] Failed to persist scores:`, err);
    }
  }
}
