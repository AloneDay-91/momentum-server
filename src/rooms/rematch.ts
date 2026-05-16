import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";

/**
 * Remet un joueur dans l'état d'un début de partie, en préservant son identité
 * (playerNumber, pseudo). Appelé pour chaque joueur lors d'un rematch.
 */
export function resetPlayerForRematch(p: PlayerState): void {
  p.posX = 0;
  p.posY = 0;
  p.posZ = 0;
  p.velX = 0;
  p.velY = 0;
  p.velZ = 0;
  p.rotY = 0;
  p.isGrounded = false;
  p.isSliding = false;
  p.isStunned = false;
  p.horizontalInput = 0;
  p.score = 0;
  p.distanceTraveled = 0;
  p.survivalTime = 0;
  p.collectibles = 0;
  p.hasFinished = false;
  p.isAlive = true;
  p.isManuallySliding = false;
  p.isLandingHard = false;
  p.actionSeq = 0;
  p.actionId = 0;
  p.wantsRematch = false;
}

/**
 * Vrai si la room contient au moins un joueur et que TOUS ont demandé le rematch.
 */
export function allPlayersWantRematch(players: {
  forEach: (cb: (p: PlayerState) => void) => void;
}): boolean {
  let count = 0;
  let all = true;
  players.forEach((p) => {
    count++;
    if (!p.wantsRematch) all = false;
  });
  return count > 0 && all;
}

/**
 * Remet toute la GameState dans l'état "loading" pour relancer le handshake de
 * démarrage existant (loading → sceneReady → countdown → playing).
 */
export function resetGameStateForRematch(state: GameState): void {
  state.winnerSessionId = "";
  state.elapsedTime = 0;
  state.countdownRemaining = 0;
  state.players.forEach((p) => resetPlayerForRematch(p));
  state.status = "loading";
}
