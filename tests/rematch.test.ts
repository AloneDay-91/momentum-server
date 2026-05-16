import { describe, it, expect } from "vitest";
import { GameState } from "../src/schema/GameState";
import { PlayerState } from "../src/schema/PlayerState";
import {
  resetPlayerForRematch,
  allPlayersWantRematch,
  resetGameStateForRematch,
} from "../src/rooms/rematch";

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  const p = new PlayerState();
  Object.assign(p, overrides);
  return p;
}

describe("resetPlayerForRematch", () => {
  it("remet à zéro le score, la vie, la position et le flag wantsRematch", () => {
    const p = makePlayer({
      score: 4200,
      isAlive: false,
      hasFinished: true,
      posX: 99,
      wantsRematch: true,
      playerNumber: 2,
      pseudo: "Bob",
    });

    resetPlayerForRematch(p);

    expect(p.score).toBe(0);
    expect(p.isAlive).toBe(true);
    expect(p.hasFinished).toBe(false);
    expect(p.posX).toBe(0);
    expect(p.wantsRematch).toBe(false);
    // L'identité du joueur est préservée.
    expect(p.playerNumber).toBe(2);
    expect(p.pseudo).toBe("Bob");
  });
});

describe("allPlayersWantRematch", () => {
  it("false quand un seul joueur a cliqué", () => {
    const players = [makePlayer({ wantsRematch: true }), makePlayer({ wantsRematch: false })];
    const map = { forEach: (cb: (p: PlayerState) => void) => players.forEach(cb) };
    expect(allPlayersWantRematch(map)).toBe(false);
  });

  it("true quand les deux joueurs ont cliqué", () => {
    const players = [makePlayer({ wantsRematch: true }), makePlayer({ wantsRematch: true })];
    const map = { forEach: (cb: (p: PlayerState) => void) => players.forEach(cb) };
    expect(allPlayersWantRematch(map)).toBe(true);
  });

  it("false quand il n'y a aucun joueur", () => {
    const map = { forEach: (_cb: (p: PlayerState) => void) => {} };
    expect(allPlayersWantRematch(map)).toBe(false);
  });
});

describe("resetGameStateForRematch", () => {
  it("repasse le status à loading et reset les joueurs", () => {
    const state = new GameState();
    state.status = "finished";
    state.winnerSessionId = "abc";
    state.elapsedTime = 120;
    const p = makePlayer({ score: 500, isAlive: false, wantsRematch: true });
    state.players.set("s1", p);

    resetGameStateForRematch(state);

    expect(state.status).toBe("loading");
    expect(state.winnerSessionId).toBe("");
    expect(state.elapsedTime).toBe(0);
    expect(state.players.get("s1")!.score).toBe(0);
    expect(state.players.get("s1")!.isAlive).toBe(true);
    expect(state.players.get("s1")!.wantsRematch).toBe(false);
  });
});
