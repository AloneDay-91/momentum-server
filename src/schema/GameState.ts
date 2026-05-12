import { Schema, MapSchema, defineTypes } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";

export class GameState extends Schema {
  players: MapSchema<PlayerState> = new MapSchema<PlayerState>();
  status: string = "waiting";       // waiting | countdown | playing | finished
  countdownRemaining: number = 0;
  elapsedTime: number = 0;
  winnerSessionId: string = "";
  mapName: string = "main";
}

defineTypes(GameState, {
  players: { map: PlayerState },
  status: "string",
  countdownRemaining: "number",
  elapsedTime: "number",
  winnerSessionId: "string",
  mapName: "string",
});
