const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const http = require("node:http");
const QRCode = require("qrcode");
const { Server } = require("socket.io");
const { createTeam, serializeTeam } = require("./game-engine");
const { createGame, tick, trade, finishGame, winner, publicState } = require("./market-engine");

const PORT = Number(process.env.PORT || 3000);
const TEAM_COUNT = 8;
const MAX_PLAYERS_PER_TEAM = 7;
const MAX_PLAYERS = TEAM_COUNT * MAX_PLAYERS_PER_TEAM;
const app = express();
app.set("trust proxy", true);
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, rooms: rooms.size }));
app.get("/{*splat}", (_req, res) => res.sendFile(path.join(__dirname, "public/index.html")));

const server = http.createServer(app);
const io = new Server(server, {
  transports: ["websocket", "polling"],
  pingInterval: 20_000,
  pingTimeout: 20_000,
});
const rooms = new Map();

const token = (size = 18) => crypto.randomBytes(size).toString("base64url");
const clean = (value) => String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 22);
const findPlayer = (room, playerToken) => [...room.players.values()].find((player) => player.token === playerToken);

function roomCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 5 }, () => characters[crypto.randomInt(characters.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function roomState(room, viewerPlayerId = null) {
  return {
    code: room.code,
    status: room.status,
    playersCount: room.players.size,
    maxPlayers: MAX_PLAYERS,
    maxPlayersPerTeam: MAX_PLAYERS_PER_TEAM,
    serverNow: Date.now(),
    teams: room.teams.map(serializeTeam),
    game: room.game ? publicState(room.game, viewerPlayerId) : null,
    champions: room.champions,
  };
}

function emitState(room) {
  io.to(`${room.code}:host`).emit("state", roomState(room));
  for (const player of room.players.values()) {
    if (player.connected) io.to(`${room.code}:player:${player.id}`).emit("state", roomState(room, player.id));
  }
}

function finish(room) {
  if (!room.game) return;
  finishGame(room.game);
  room.status = "finished";
  room.champions = { teamId: winner(room.game) };
  emitState(room);
}

function start(room, options = {}) {
  if (room.players.size < 1) throw new Error("Cần ít nhất 1 người để mở thị trường");
  const durationMinutes = Math.max(10, Math.min(30, Number(options.durationMinutes) || 10));
  const eventMinutes = Math.max(1, Math.min(5, Number(options.eventMinutes) || 2));
  room.status = "playing";
  room.champions = null;
  room.game = createGame(room.teams, {
    durationMs: durationMinutes * 60_000,
    eventIntervalMs: eventMinutes * 60_000,
  });
  emitState(room);
}

io.on("connection", (socket) => {
  socket.on("host:create", async (callback = () => {}) => {
    try {
      const code = roomCode();
      const protocol = String(socket.handshake.headers["x-forwarded-proto"] || "http").split(",")[0];
      const requestHost = socket.handshake.headers["x-forwarded-host"] || socket.handshake.headers.host;
      const joinUrl = `${protocol}://${requestHost}/?room=${code}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, {
        margin: 1,
        width: 420,
        color: { dark: "#081015", light: "#f8faf7" },
      });
      const room = {
        code,
        hostToken: token(),
        joinUrl,
        qrDataUrl,
        players: new Map(),
        teams: Array.from({ length: TEAM_COUNT }, (_, index) => createTeam(index)),
        status: "lobby",
        game: null,
        champions: null,
        createdAt: Date.now(),
      };
      rooms.set(code, room);
      socket.join(`${code}:host`);
      callback({ ok: true, code, hostToken: room.hostToken, joinUrl, qrDataUrl });
      emitState(room);
    } catch (error) {
      callback({ ok: false, message: error.message });
    }
  });

  socket.on("host:resume", ({ code, hostToken } = {}, callback = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.hostToken !== hostToken) return callback({ ok: false, message: "Không thể khôi phục màn điều khiển" });
    socket.join(`${room.code}:host`);
    callback({ ok: true, code: room.code, joinUrl: room.joinUrl, qrDataUrl: room.qrDataUrl });
    emitState(room);
  });

  socket.on("host:start", ({ code, hostToken, durationMinutes, eventMinutes } = {}, callback = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.hostToken !== hostToken) return callback({ ok: false, message: "Không có quyền điều khiển phòng" });
    if (room.status !== "lobby") return callback({ ok: false, message: "Phòng không còn ở trạng thái chờ" });
    try {
      start(room, { durationMinutes, eventMinutes });
      callback({ ok: true });
    } catch (error) {
      callback({ ok: false, message: error.message });
    }
  });

  socket.on("host:end", ({ code, hostToken } = {}, callback = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.hostToken !== hostToken) return callback({ ok: false, message: "Không có quyền điều khiển phòng" });
    if (!room.game) return callback({ ok: false, message: "Trận chưa bắt đầu" });
    finish(room);
    callback({ ok: true });
  });

  socket.on("player:join", ({ code, nickname, teamId, playerToken } = {}, callback = () => {}) => {
    const room = rooms.get(String(code || "").trim().toUpperCase());
    const name = clean(nickname);
    if (!room) return callback({ ok: false, message: "Không tìm thấy phòng" });
    if (!name) return callback({ ok: false, message: "Nhập tên đội trước đã" });

    let player = playerToken ? findPlayer(room, playerToken) : null;
    if (player) {
      player.connected = true;
      player.socketId = socket.id;
      player.nickname = name;
    } else {
      if (room.status !== "lobby") return callback({ ok: false, message: "Thị trường đã mở, không thể thêm đội mới" });
      if (room.players.size >= MAX_PLAYERS) return callback({ ok: false, message: "Phòng đã đủ 56 người" });
      const requestedTeam = room.teams.find((candidate) => candidate.id === teamId);
      const team = requestedTeam || room.teams.find((candidate) => candidate.players.length < MAX_PLAYERS_PER_TEAM);
      if (!team) return callback({ ok: false, message: "Không tìm thấy đội phù hợp" });
      if (team.players.length >= MAX_PLAYERS_PER_TEAM) return callback({ ok: false, message: `${team.name} đã đủ 7 người` });
      player = {
        id: token(8),
        token: token(),
        nickname: name,
        teamId: team.id,
        connected: true,
        socketId: socket.id,
      };
      team.players.push(player);
      room.players.set(player.id, player);
    }

    socket.data.player = { roomCode: room.code, playerId: player.id };
    socket.join(`${room.code}:players`);
    socket.join(`${room.code}:player:${player.id}`);
    callback({ ok: true, playerToken: player.token, playerId: player.id, teamId: player.teamId });
    emitState(room);
  });

  socket.on("player:trade", ({ code, playerToken, symbol, side, quantity } = {}, callback = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    const player = room && findPlayer(room, playerToken);
    if (!room || room.status !== "playing" || !player) return callback({ ok: false, message: "Tài khoản giao dịch không hợp lệ" });
    const result = trade(room.game, player.id, { symbol, side, quantity });
    callback(result);
    if (result.ok) emitState(room);
  });

  socket.on("disconnect", () => {
    const identity = socket.data.player;
    const room = identity && rooms.get(identity.roomCode);
    const player = room?.players.get(identity.playerId);
    if (player?.socketId === socket.id) {
      player.connected = false;
      emitState(room);
    }
  });
});

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.status !== "playing") continue;
    const result = tick(room.game, now);
    if (result.finished) finish(room);
    else if (result.changed) emitState(room);
  }
}, 500).unref();

setInterval(() => {
  for (const [code, room] of rooms) {
    if (Date.now() - room.createdAt > 3 * 60 * 60_000) rooms.delete(code);
  }
}, 30 * 60_000).unref();

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => console.log(`Sàn Kinh Tế đang chạy tại http://localhost:${PORT}`));
}

module.exports = { app, server, rooms, TEAM_COUNT, MAX_PLAYERS_PER_TEAM, MAX_PLAYERS };
