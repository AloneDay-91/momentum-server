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

export async function persistRoomScores(
  gameSessionInternalId: string,
  players: { forEach: (cb: (p: PlayerLike) => void) => void }
): Promise<void> {
  const records: Array<{
    playerName: string;
    playerNumber: number;
    totalScore: number;
    distanceTraveled: number;
    survivalTime: number;
    collectiblesCollected: number;
    hasFinished: boolean;
    gameSessionId: string;
  }> = [];

  players.forEach((p) => {
    records.push({
      playerName: p.pseudo,
      playerNumber: p.playerNumber,
      totalScore: Math.floor(p.score),
      distanceTraveled: p.distanceTraveled,
      survivalTime: p.survivalTime,
      collectiblesCollected: Math.floor(p.collectibles),
      hasFinished: p.hasFinished,
      gameSessionId: gameSessionInternalId,
    });
  });

  if (records.length === 0) return;

  await prisma.$transaction([
    prisma.score.createMany({ data: records }),
    prisma.gameSession.update({
      where: { id: gameSessionInternalId },
      data: { status: "finished", finishedAt: new Date() },
    }),
  ]);
}
