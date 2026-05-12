import { prisma } from "../db/prisma";

export interface VerifyResult {
  ok: true;
  playerNumber: 1 | 2;
  pseudo: string;
  gameSessionInternalId: string;
}

export interface VerifyError {
  ok: false;
  reason: string;
}

export async function verifyGameSession(
  sessionId: string,
  token: string
): Promise<VerifyResult | VerifyError> {
  if (!sessionId || !token) {
    return { ok: false, reason: "missing-credentials" };
  }

  const session = await prisma.gameSession.findUnique({
    where: { sessionId },
  });

  if (!session) return { ok: false, reason: "session-not-found" };
  if (session.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (session.status === "finished") return { ok: false, reason: "session-finished" };

  let playerNumber: 1 | 2;
  let pseudo: string;
  if (token === session.player1Token) {
    playerNumber = 1;
    pseudo = session.player1Pseudo ?? "Player1";
  } else if (token === session.player2Token) {
    playerNumber = 2;
    pseudo = session.player2Pseudo ?? "Player2";
  } else {
    return { ok: false, reason: "invalid-token" };
  }

  return {
    ok: true,
    playerNumber,
    pseudo,
    gameSessionInternalId: session.id,
  };
}

export async function markPlayerJoined(
  gameSessionInternalId: string,
  playerNumber: 1 | 2
): Promise<void> {
  await prisma.gameSession.update({
    where: { id: gameSessionInternalId },
    data: playerNumber === 1
      ? { player1Joined: true }
      : { player2Joined: true },
  });
}
