import { Schema, defineTypes } from "@colyseus/schema";

export class PlayerState extends Schema {
  playerNumber: number = 0;        // 1 ou 2
  pseudo: string = "";

  // Transform
  posX: number = 0;
  posY: number = 0;
  posZ: number = 0;
  velX: number = 0;
  velY: number = 0;
  velZ: number = 0;
  rotY: number = 0;

  // Animation flags
  isGrounded: boolean = false;
  isSliding: boolean = false;
  isStunned: boolean = false;
  horizontalInput: number = 0;

  // Game state
  score: number = 0;
  distanceTraveled: number = 0;
  survivalTime: number = 0;
  collectibles: number = 0;
  hasFinished: boolean = false;
  isAlive: boolean = true;
}

defineTypes(PlayerState, {
  playerNumber: "number",
  pseudo: "string",
  posX: "number",
  posY: "number",
  posZ: "number",
  velX: "number",
  velY: "number",
  velZ: "number",
  rotY: "number",
  isGrounded: "boolean",
  isSliding: "boolean",
  isStunned: "boolean",
  horizontalInput: "number",
  score: "number",
  distanceTraveled: "number",
  survivalTime: "number",
  collectibles: "number",
  hasFinished: "boolean",
  isAlive: "boolean",
});
