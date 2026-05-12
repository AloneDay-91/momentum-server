import { Schema, type, MapSchema } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type("string") status: string = "waiting";       // waiting | countdown | playing | finished
  @type("number") countdownRemaining: number = 0;
  @type("number") elapsedTime: number = 0;
  @type("string") winnerSessionId: string = "";
  @type("string") mapName: string = "main";
}
