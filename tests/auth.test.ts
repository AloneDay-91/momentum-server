import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/db/prisma";
import { verifyGameSession } from "../src/auth/verifyGameSession";

const TEST_SESSION_ID = "TEST-AUTH-" + Date.now();
const TEST_SESSION_ID_EXPIRED = "TEST-AUTH-EXP-" + Date.now();
const TEST_SESSION_ID_FINISHED = "TEST-AUTH-FIN-" + Date.now();

beforeAll(async () => {
  await prisma.gameSession.create({
    data: {
      sessionId: TEST_SESSION_ID,
      player1Token: "tok-p1",
      player2Token: "tok-p2",
      player1Pseudo: "Alice",
      player2Pseudo: "Bob",
      status: "waiting",
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  await prisma.gameSession.create({
    data: {
      sessionId: TEST_SESSION_ID_EXPIRED,
      player1Token: "exp-p1",
      player2Token: "exp-p2",
      status: "waiting",
      expiresAt: new Date(Date.now() - 60_000), // already expired
    },
  });
  await prisma.gameSession.create({
    data: {
      sessionId: TEST_SESSION_ID_FINISHED,
      player1Token: "fin-p1",
      player2Token: "fin-p2",
      status: "finished",
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
});

afterAll(async () => {
  await prisma.gameSession.deleteMany({
    where: { sessionId: { startsWith: "TEST-AUTH-" } },
  });
  await prisma.$disconnect();
});

describe("verifyGameSession", () => {
  it("accepts player1 with correct token", async () => {
    const r = await verifyGameSession(TEST_SESSION_ID, "tok-p1");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.playerNumber).toBe(1);
      expect(r.pseudo).toBe("Alice");
    }
  });

  it("accepts player2 with correct token", async () => {
    const r = await verifyGameSession(TEST_SESSION_ID, "tok-p2");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.playerNumber).toBe(2);
      expect(r.pseudo).toBe("Bob");
    }
  });

  it("rejects unknown token", async () => {
    const r = await verifyGameSession(TEST_SESSION_ID, "bogus");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid-token");
  });

  it("rejects unknown sessionId", async () => {
    const r = await verifyGameSession("does-not-exist", "tok-p1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("session-not-found");
  });

  it("rejects empty inputs", async () => {
    const r = await verifyGameSession("", "");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("missing-credentials");
  });

  it("rejects expired session", async () => {
    const r = await verifyGameSession(TEST_SESSION_ID_EXPIRED, "exp-p1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("expired");
  });

  it("rejects finished session", async () => {
    const r = await verifyGameSession(TEST_SESSION_ID_FINISHED, "fin-p1");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("session-finished");
  });
});
