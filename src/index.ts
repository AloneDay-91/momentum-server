import "dotenv/config";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";
import express from "express";
import { createServer } from "http";

const port = Number(process.env.PORT || 2567);
const app = express();
const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

app.use("/colyseus", monitor());
app.use("/playground", playground);
app.get("/health", (_, res) => res.json({ ok: true }));

httpServer.listen(port, () => {
  console.log(`[Momentum] Game server listening on :${port}`);
});
