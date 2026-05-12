import { Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("number") playerNumber: number = 0;        // 1 ou 2
  @type("string") pseudo: string = "";

  // Transform
  @type("number") posX: number = 0;
  @type("number") posY: number = 0;
  @type("number") posZ: number = 0;
  @type("number") velX: number = 0;
  @type("number") velY: number = 0;
  @type("number") velZ: number = 0;
  @type("number") rotY: number = 0;

  // Animation flags
  @type("boolean") isGrounded: boolean = false;
  @type("boolean") isSliding: boolean = false;
  @type("boolean") isStunned: boolean = false;
  @type("number") horizontalInput: number = 0;

  // Game state
  @type("number") score: number = 0;
  @type("number") distanceTraveled: number = 0;
  @type("number") survivalTime: number = 0;
  @type("number") collectibles: number = 0;
  @type("boolean") hasFinished: boolean = false;
  @type("boolean") isAlive: boolean = true;
}
