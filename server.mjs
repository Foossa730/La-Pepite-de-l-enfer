import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";
import { createRoomId, createRound, endRoundScoring } from "./src/lib/gameLogic.mjs";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 10000);
const host = process.env.HOST || "0.0.0.0";

const app = next({ dev, port, hostname: host });
const handle = app.getRequestHandler();

/**
 * In-memory rooms (good for LAN party; not for multi-instance hosting).
 * Room state is authoritative on the server.
 */
const rooms = new Map(); // roomId -> room
const clients = new Map(); // ws -> { clientId, roomId }
// Keep non-serializable Node.js timers out of `room` (JSON.stringify would crash).
const roomTimers = new Map(); // roomId -> Timeout

function now() {
  return Date.now();
}

function send(ws, payload) {
  try {
    ws.send(JSON.stringify(payload));
  } catch (err) {
    // Never crash the process due to a bad payload; log and move on.
    console.error("WS send failed:", err?.message || err);
  }
}

function broadcast(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.updatedAt = now();
  for (const [ws, meta] of clients) {
    if (meta.roomId === roomId && ws.readyState === ws.OPEN) {
      send(ws, { type: "room_state", room });
    }
  }
}

function sanitizeName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 18);
}

function getPlayer(room, clientId) {
  return room.players.find((p) => p.id === clientId) || null;
}

function everyoneFinished(room) {
  const active = room.players.filter((p) => p.connected);
  if (active.length < 2) return false;
  return active.every((p) => p.finished);
}

function endRound(room) {
  if (room.phase !== "round") return;
  const t = roomTimers.get(room.id);
  if (t) clearTimeout(t);
  roomTimers.delete(room.id);
  room.round.endedAt = now();
  endRoundScoring(room);
  room.phase = "review";
  room.review = { index: 0, order: room.players.map((p) => p.id) };
  room.updatedAt = now();
}

await app.prepare();

const server = createServer((req, res) => handle(req, res));
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  if (req.url !== "/ws") {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});

wss.on("connection", (ws) => {
  ws.isAlive = true;
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }

    switch (msg.type) {
      case "hello": {
        const clientId = String(msg.clientId || "");
        const name = sanitizeName(msg.name);
        if (!clientId || !name) return;
        clients.set(ws, { clientId, roomId: null, name });
        send(ws, { type: "hello_ok" });
        return;
      }

      case "create_room": {
        const client = clients.get(ws);
        if (!client?.clientId) return;
        const roomId = createRoomId();
        const room = {
          id: roomId,
          hostId: client.clientId,
          phase: "lobby",
          settings: { timerSec: 5 * 60, totalRounds: 3 },
          players: [
            {
              id: client.clientId,
              name: client.name,
              connected: true,
              url: "",
              manual: null,
              finished: false,
              totalScore: 0
            }
          ],
          round: null,
          review: null,
          createdAt: now(),
          updatedAt: now()
        };
        rooms.set(roomId, room);
        clients.set(ws, { ...client, roomId });
        broadcast(roomId);
        return;
      }

      case "join_room": {
        const client = clients.get(ws);
        if (!client?.clientId) return;
        const roomId = String(msg.roomId || "").toUpperCase();
        const room = rooms.get(roomId);
        if (!room) {
          send(ws, { type: "error", message: "Partie introuvable." });
          return;
        }
        if (room.players.length >= 6) {
          send(ws, { type: "error", message: "Partie complète (max 6)." });
          return;
        }
        if (!getPlayer(room, client.clientId)) {
          room.players.push({
            id: client.clientId,
            name: client.name,
            connected: true,
            url: "",
            manual: null,
            finished: false,
            totalScore: 0
          });
        } else {
          getPlayer(room, client.clientId).connected = true;
        }
        clients.set(ws, { ...client, roomId });
        broadcast(roomId);
        return;
      }

      case "leave_room": {
        const client = clients.get(ws);
        if (!client?.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room) return;
        const player = getPlayer(room, client.clientId);
        if (player) player.connected = false;
        clients.set(ws, { ...client, roomId: null });
        broadcast(room.id);
        return;
      }

      case "set_timer": {
        const client = clients.get(ws);
        if (!client?.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room || room.hostId !== client.clientId) return;
        const timerSec = Math.max(5 * 60, Math.min(10 * 60, Math.floor(Number(msg.timerSec) || 300)));
        room.settings.timerSec = timerSec;
        broadcast(room.id);
        return;
      }

      case "claim_host": {
        const client = clients.get(ws);
        if (!client?.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room) return;
        const hostPlayer = getPlayer(room, room.hostId);
        if (hostPlayer && hostPlayer.connected) {
          send(ws, { type: "error", message: "Le Maître du Jeu est déjà connecté." });
          return;
        }
        room.hostId = client.clientId;
        room.updatedAt = now();
        broadcast(room.id);
        return;
      }

      case "start_round": {
        const client = clients.get(ws);
        if (!client?.roomId) {
          send(ws, { type: "error", message: "Tu n'es pas dans une partie." });
          return;
        }
        const room = rooms.get(client.roomId);
        if (!room) {
          send(ws, { type: "error", message: "Partie introuvable." });
          return;
        }
        if (room.hostId !== client.clientId) {
          send(ws, { type: "error", message: "Seul le Maître du Jeu peut lancer une manche." });
          return;
        }
        if (room.phase !== "lobby" && room.phase !== "review") {
          send(ws, { type: "error", message: `Impossible de lancer: phase actuelle = ${room.phase}.` });
          return;
        }
        if (room.players.length < 2) {
          send(ws, { type: "error", message: "Il faut au moins 2 joueurs pour démarrer." });
          return;
        }
        const roundIndex = room.round?.index ? room.round.index + 1 : 1;
        if (roundIndex > room.settings.totalRounds) {
          send(ws, { type: "error", message: "La partie est terminée (plus de manches disponibles)." });
          return;
        }

        room.players.forEach((p) => {
          p.url = "";
          p.manual = null;
          p.finished = false;
          p.roundScore = 0;
          p.roundResult = null;
        });

        room.round = createRound({ index: roundIndex, timerSec: room.settings.timerSec, seed: room.id + ":" + roundIndex });
        room.phase = "round";
        room.review = null;
        room.updatedAt = now();
        const prev = roomTimers.get(room.id);
        if (prev) clearTimeout(prev);
        roomTimers.set(
          room.id,
          setTimeout(() => {
            endRound(room);
            broadcast(room.id);
          }, Math.max(0, room.round.endsAt - now()))
        );

        send(ws, { type: "info", message: `Manche ${roundIndex} lancée.` });
        broadcast(room.id);
        return;
      }

      case "submit_url": {
        const client = clients.get(ws);
        if (!client?.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room || room.phase !== "round") return;
        const player = getPlayer(room, client.clientId);
        if (!player) return;
        player.url = String(msg.url || "").trim().slice(0, 500);
        const manual = msg.manual && typeof msg.manual === "object" ? msg.manual : null;
        if (manual) {
          const toNum = (v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
          };
          const payload = {
            price: toNum(manual.price),
            km: toNum(manual.km),
            hp: toNum(manual.hp),
            year: toNum(manual.year)
          };
          const hasAny = Object.values(payload).some((v) => v !== null);
          player.manual = hasAny ? payload : null;
        } else {
          player.manual = null;
        }
        broadcast(room.id);
        return;
      }

      case "finish": {
        const client = clients.get(ws);
        if (!client?.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room || room.phase !== "round") return;
        const player = getPlayer(room, client.clientId);
        if (!player) return;
        player.finished = true;
        room.updatedAt = now();
        if (everyoneFinished(room)) endRound(room);
        broadcast(room.id);
        return;
      }

      case "review_next": {
        const client = clients.get(ws);
        if (!client?.roomId) return;
        const room = rooms.get(client.roomId);
        if (!room || room.phase !== "review") return;
        if (room.hostId !== client.clientId) return;
        room.review.index = Math.min(room.review.index + 1, room.review.order.length);
        if (room.review.index >= room.review.order.length) {
          room.phase = room.round.index >= room.settings.totalRounds ? "final" : "lobby";
        }
        room.updatedAt = now();
        broadcast(room.id);
        return;
      }

      default:
        return;
    }
  });

  ws.on("close", () => {
    const meta = clients.get(ws);
    clients.delete(ws);
    if (!meta?.roomId) return;
    const room = rooms.get(meta.roomId);
    if (!room) return;
    const player = getPlayer(room, meta.clientId);
    if (player) player.connected = false;
    room.updatedAt = now();
    broadcast(room.id);
  });
});

// Heartbeat: drop dead sockets.
setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) ws.terminate();
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000).unref();

// Cleanup: remove empty rooms after inactivity.
setInterval(() => {
  const cutoff = now() - 30 * 60 * 1000; // 30 min
  for (const [roomId, room] of rooms) {
    const anyConnected = room.players.some((p) => p.connected);
    const last = room.updatedAt ?? room.createdAt ?? 0;
    if (!anyConnected && last < cutoff) {
      const t = roomTimers.get(roomId);
      if (t) clearTimeout(t);
      roomTimers.delete(roomId);
      rooms.delete(roomId);
    }
  }
}, 60_000).unref();

server.listen(port, host, () => {
  console.log(`Server ready on http://${host}:${port} (ws: /ws)`);
});
