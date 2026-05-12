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

    console.log(`[Room] Created for gameSession=${options.gameSessionId ?? "none"}`);
  }

  async onAuth(_client: Client, options: JoinOptions): Promise<AuthData> {
    const result = await verifyGameSession(options.sessionId, options.token);
    if (!result.ok) {
      throw new Error(`Auth failed: ${result.reason}`);
    }

    // Verify this playerNumber slot isn't already taken in this room
    let alreadyTaken = false;
    (this.state as GameState).players.forEach((p) => {
      if (p.playerNumber === result.playerNumber) alreadyTaken = true;
    });
    if (alreadyTaken) throw new Error("player-slot-taken");

    await markPlayerJoined(result.gameSessionInternalId, result.playerNumber);

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

    console.log(`[Room] ${auth.pseudo} (P${auth.playerNumber}) joined as ${client.sessionId}`);

    if ((this.state as GameState).players.size === MAX_CLIENTS_PER_ROOM) {
      this.startCountdown();
    }
  }

  onLeave(client: Client, _code?: number) {
    const gameState = this.state as GameState;
    gameState.players.delete(client.sessionId);
    console.log(`[Room] Client ${client.sessionId} left`);

    if (gameState.status === "playing") {
      gameState.status = "finished";
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
  }

  // === Message handlers ===

  private handleInput(client: Client, msg: PlayerInputMessage) {
    const gameState = this.state as GameState;
    const player = gameState.players.get(client.sessionId);
    if (!player || gameState.status !== "playing" || player.isStunned) return;

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

    let allFinished = true;
    gameState.players.forEach((p: PlayerState) => {
      if (!p.hasFinished) allFinished = false;
    });
    if (allFinished) {
      gameState.status = "finished";
      this.determineWinner();
    }
  }

  private determineWinner() {
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
  }
}
