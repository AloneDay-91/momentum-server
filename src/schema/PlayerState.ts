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

  // Animation extras (added so remotes see jump/slide/vault/landing properly)
  isManuallySliding: boolean = false;
  isLandingHard: boolean = false;
  // One-shot animation triggers. actionSeq increments each time a trigger fires;
  // remotes detect "new trigger" by seeing actionSeq change. actionId: 1=jump, 2=slide, 3=vault.
  actionSeq: number = 0;
  actionId: number = 0;

  // Rematch : le joueur a cliqué « Rejouer » et attend l'autre.
  wantsRematch: boolean = false;
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
  isManuallySliding: "boolean",
  isLandingHard: "boolean",
  actionSeq: "number",
  actionId: "number",
  wantsRematch: "boolean",
});
