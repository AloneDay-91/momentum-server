import "./polyfill-symbol-metadata";
import "dotenv/config";
import { Server, matchMaker } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import express from "express";
import cors from "cors";
import basicAuth from "express-basic-auth";
import { createServer } from "http";
import { MomentumRoom } from "./rooms/MomentumRoom";

const port = Number(process.env.PORT || 2567);
const app = express();

// CORS — allow the Next.js site (and any origin in dev) to reach the matchmake API.
// In production tighten this to the actual game site origin.
const allowedOrigins = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim());
app.use(
  cors({
    origin: allowedOrigins.includes("*") ? true : allowedOrigins,
    credentials: true,
  })
);

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("momentum", MomentumRoom);

// HTTP matchmake routes (used by Unity / other clients that POST to /matchmake/...).
// Colyseus 0.17 ships the controller bridge but does not auto-mount the routes —
// we wire them ourselves so JoinOrCreate() works from the WebGL client.
app.use(express.json());
app.post("/matchmake/:method/:roomName", async (req, res) => {
  const method = req.params.method;
  const roomName = req.params.roomName;
  const clientOptions = req.body ?? {};

  if (!matchMaker.controller.exposedMethods.includes(method)) {
    return res.status(404).json({ error: "method-not-allowed" });
  }

  try {
    const seatReservation = await matchMaker.controller.invokeMethod(
      method,
      roomName,
      clientOptions
    );
    res.json(seatReservation);
  } catch (err: any) {
    res.status(err.code === 4212 ? 404 : 500).json({
      code: err.code,
      error: err.message ?? String(err),
    });
  }
});

// Monitor — protected by basic auth, skipped if creds missing
const monitorUser = process.env.MONITOR_USER;
const monitorPass = process.env.MONITOR_PASS;
if (monitorUser && monitorPass) {
  app.use(
    "/colyseus",
    basicAuth({ users: { [monitorUser]: monitorPass }, challenge: true }),
    monitor()
  );
} else {
  console.warn("[Momentum] MONITOR_USER/MONITOR_PASS not set — /colyseus monitor disabled");
}

// Playground — dev only
if (process.env.NODE_ENV !== "production") {
  app.use("/playground", playground);
}

app.get("/health", (_, res) => res.json({ ok: true }));

httpServer.on("error", (err) => {
  console.error("[Momentum] HTTP server error:", err);
  process.exit(1);
});

httpServer.listen(port, () => {
  console.log(`[Momentum] Game server listening on :${port}`);
});
