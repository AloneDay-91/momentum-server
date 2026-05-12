import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/db/prisma";
import { persistRoomScores } from "../src/db/persistScores";

const TEST_SESSION_ID = "TEST-PERSIST-" + Date.now();
let gameSessionInternalId = "";

beforeAll(async () => {
  const gs = await prisma.gameSession.create({
    data: {
      sessionId: TEST_SESSION_ID,
      player1Token: "p1",
      player2Token: "p2",
      status: "playing",
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  gameSessionInternalId = gs.id;
});

afterAll(async () => {
  await prisma.gameSession.deleteMany({ where: { sessionId: { startsWith: "TEST-PERSIST-" } } });
  await prisma.$disconnect();
});

describe("persistRoomScores", () => {
  it("writes 2 score rows and marks the session finished", async () => {
    const fakePlayers = [
      { pseudo: "Alice", playerNumber: 1, score: 1234.7, distanceTraveled: 50.1, survivalTime: 30.2, collectibles: 5.0, hasFinished: true },
      { pseudo: "Bob", playerNumber: 2, score: 999, distanceTraveled: 40.5, survivalTime: 28.1, collectibles: 3.0, hasFinished: true },
    ];
    const map = { forEach: (cb: (p: typeof fakePlayers[0]) => void) => fakePlayers.forEach(cb) };

    await persistRoomScores(gameSessionInternalId, map);

    const scores = await prisma.score.findMany({ where: { gameSessionId: gameSessionInternalId } });
    expect(scores).toHaveLength(2);
    const alice = scores.find((s) => s.playerName === "Alice");
    expect(alice?.totalScore).toBe(1234); // Math.floor
    expect(alice?.playerNumber).toBe(1);
    expect(alice?.hasFinished).toBe(true);

    const updated = await prisma.gameSession.findUnique({ where: { id: gameSessionInternalId } });
    expect(updated?.status).toBe("finished");
    expect(updated?.finishedAt).not.toBeNull();
  });
});
