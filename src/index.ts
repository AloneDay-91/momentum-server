import "dotenv/config";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import express from "express";
import basicAuth from "express-basic-auth";
import { createServer } from "http";
import { MomentumRoom } from "./rooms/MomentumRoom";

const port = Number(process.env.PORT || 2567);
const app = express();
const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("momentum", MomentumRoom);

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
