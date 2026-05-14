import { prisma } from "./prisma";

interface PlayerLike {
  pseudo: string;
  playerNumber: number;
  score: number;
  distanceTraveled: number;
  survivalTime: number;
  collectibles: number;
  hasFinished: boolean;
}

// Called by MomentumRoom when match state flips to "finished". We only mark the session
// as finished here — actual score creation is owned by the REST `/api/game/end` flow
// triggered by each client. PlayerState.score/distance/... are not authoritatively
// populated by the Colyseus room (clients only send pos/animation through `input`), so
// writing rows from this side produced records full of zeros.
export async function persistRoomScores(
  gameSessionInternalId: string,
  _players: { forEach: (cb: (p: PlayerLike) => void) => void }
): Promise<void> {
  await prisma.gameSession.update({
    where: { id: gameSessionInternalId },
    data: { status: "finished", finishedAt: new Date() },
  });
}

// Called when the Colyseus match actually starts ("playing" status). We promote the DB
// GameSession from "waiting" to "playing" so the REST /api/game/end endpoint accepts
// the client's score POST when the match ends. Without this, the DB stays in "waiting"
// because no client ever calls /api/game/start in the multiplayer flow.
export async function markGameSessionPlaying(
  gameSessionInternalId: string
): Promise<void> {
  await prisma.gameSession.update({
    where: { id: gameSessionInternalId },
    data: { status: "playing", startedAt: new Date() },
  });
}
