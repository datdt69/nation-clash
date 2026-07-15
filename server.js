const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const http = require("node:http");
const QRCode = require("qrcode");
const { Server } = require("socket.io");
const {
  POLICIES,
  EVENTS,
  addDelta,
  majority,
  applyPolicy,
  resolveDuel,
  calculateScore,
  createTeam,
  serializeTeam,
} = require("./game-engine");

const PORT = Number(process.env.PORT || 3000);
const MAX_PLAYERS = 8;
const TEAM_SIZE = 1;
const PHASE_SECONDS = {
  policy: Number(process.env.POLICY_SECONDS || 32),
  duel: Number(process.env.DUEL_SECONDS || 24),
  reveal: Number(process.env.REVEAL_SECONDS || 14),
};

const app = express();
app.set("trust proxy", true);
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, rooms: rooms.size }));
app.get("/{*splat}", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
  transports: ["websocket", "polling"],
});

const rooms = new Map();

function token(bytes = 18) {
  return crypto.randomBytes(bytes).toString("base64url");
}

function roomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";
    for (let i = 0; i < 5; i += 1) {
      code += chars[crypto.randomInt(chars.length)];
    }
    if (!rooms.has(code)) return code;
  }
  throw new Error("Không thể tạo mã phòng");
}

function cleanNickname(value) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 22);
}

function originFor(socket) {
  const headers = socket.handshake.headers;
  const proto = String(headers["x-forwarded-proto"] || "http").split(",")[0];
  const host = headers["x-forwarded-host"] || headers.host;
  return `${proto}://${host}`;
}

function connectedPlayers(room) {
  return [...room.players.values()].filter((player) => player.connected);
}

function getTeam(room, teamId) {
  return room.teams.find((team) => team.id === teamId);
}

function publicState(room, viewer = "player") {
  const includeVotes = viewer === "host";
  return {
    code: room.code,
    status: room.status,
    phase: room.phase,
    roundIndex: room.roundIndex,
    totalRounds: EVENTS.length,
    event: EVENTS[room.roundIndex] || null,
    deadline: room.deadline,
    playersCount: room.players.size,
    connectedCount: connectedPlayers(room).length,
    maxPlayers: MAX_PLAYERS,
    teams: room.teams.map((team) => serializeTeam(team, includeVotes)),
    pairings: room.pairings,
    reveal: room.reveal,
    champions: room.champions,
  };
}

function emitState(room) {
  io.to(`${room.code}:players`).emit("state", publicState(room, "player"));
  io.to(`${room.code}:host`).emit("state", publicState(room, "host"));
}

function clearRoomTimer(room) {
  if (room.timer) clearTimeout(room.timer);
  room.timer = null;
}

function schedule(room, seconds, callback) {
  clearRoomTimer(room);
  room.deadline = Date.now() + seconds * 1000;
  room.timer = setTimeout(() => {
    room.timer = null;
    callback();
  }, seconds * 1000);
}

function createPairings(room) {
  const teams = [...room.teams].filter((team) => team.players.length > 0);
  if (teams.length < 2) return [];
  const shift = room.roundIndex % teams.length;
  const rotated = [...teams.slice(shift), ...teams.slice(0, shift)];
  const pairings = [];
  for (let i = 0; i < rotated.length; i += 2) {
    const a = rotated[i];
    const b = rotated[i + 1];
    if (b) pairings.push({ a: a.id, b: b.id });
    else pairings.push({ a: a.id, b: null });
  }
  return pairings;
}

function beginPolicy(room) {
  if (!EVENTS[room.roundIndex]) return finishGame(room);
  room.status = "playing";
  room.phase = "policy";
  room.reveal = null;
  room.pairings = [];
  for (const team of room.teams) {
    team.policyVotes = {};
    team.duelVotes = {};
    team.selectedPolicy = null;
    team.duelChoice = null;
    team.lastRound = null;
  }
  schedule(room, PHASE_SECONDS.policy, () => beginDuel(room));
  emitState(room);
}

function beginDuel(room) {
  if (room.phase !== "policy") return;
  room.phase = "duel";
  room.pairings = createPairings(room);
  for (const team of room.teams) {
    const playerIds = team.players.map((player) => player.id);
    const votes = playerIds.map((id) => team.policyVotes[id]).filter(Boolean);
    const result = majority(votes, Object.keys(POLICIES));
    team.selectedPolicy = result.winner;
  }
  schedule(room, PHASE_SECONDS.duel, () => resolveRoomRound(room));
  emitState(room);
}

function applyPublicPolicy(room, notes) {
  const activeTeams = room.teams.filter((team) => team.players.length > 0);
  const richest = [...activeTeams]
    .sort((a, b) => b.gdp - a.gdp)
    .slice(0, Math.max(1, Math.ceil(activeTeams.length * 0.3)));

  for (const team of richest) addDelta(team, { gdp: -4 });
  for (const team of activeTeams) addDelta(team, { welfare: 2, stability: 3 });
  notes.push(
    "Nhóm GDP cao đóng góp vào quỹ chung; hạ tầng và ổn định của toàn thị trường được tăng cường.",
  );
}

function resolveRoomRound(room) {
  if (room.phase !== "duel") return;
  const event = EVENTS[room.roundIndex];
  const roundNotes = [];

  for (const team of room.teams) {
    if (!team.players.length) continue;
    const policyResult = applyPolicy(
      team,
      team.selectedPolicy,
      event,
      room.roundIndex,
      team.index,
    );
    team.lastRound = {
      policy: team.selectedPolicy,
      policyName: policyResult.policy.name,
      policyDelta: policyResult.delta,
      eventNote: null,
      duelNote: null,
    };
  }

  for (const pairing of room.pairings) {
    const teamA = getTeam(room, pairing.a);
    const teamB = getTeam(room, pairing.b);
    if (!teamA || !teamB) continue;

    const votesA = teamA.players
      .map((player) => teamA.duelVotes[player.id])
      .filter(Boolean);
    const votesB = teamB.players
      .map((player) => teamB.duelVotes[player.id])
      .filter(Boolean);
    teamA.duelChoice = majority(votesA, ["cooperate", "compete"]).winner;
    teamB.duelChoice = majority(votesB, ["cooperate", "compete"]).winner;
    const note = resolveDuel(
      teamA,
      teamB,
      teamA.duelChoice,
      teamB.duelChoice,
    );
    teamA.lastRound.duelNote = note;
    teamB.lastRound.duelNote = note;
    roundNotes.push(note);
  }

  if (event.publicPolicy) applyPublicPolicy(room, roundNotes);

  if (event.afterRound) {
    for (const team of room.teams) {
      if (!team.players.length) continue;
      const effect = event.afterRound(team);
      addDelta(team, effect.delta);
      team.lastRound.eventNote = effect.note;
    }
  }

  for (const team of room.teams) team.score = calculateScore(team);
  room.phase = "reveal";
  room.reveal = {
    eventId: event.id,
    notes: [...new Set(roundNotes)],
    rankings: [...room.teams]
      .filter((team) => team.players.length > 0)
      .sort((a, b) => calculateScore(b) - calculateScore(a))
      .map((team) => team.id),
  };
  schedule(room, PHASE_SECONDS.reveal, () => {
    room.roundIndex += 1;
    beginPolicy(room);
  });
  emitState(room);
}

function finishGame(room) {
  clearRoomTimer(room);
  room.status = "finished";
  room.phase = "finished";
  room.deadline = null;
  const active = room.teams.filter((team) => team.players.length > 0);
  const growth = [...active].sort((a, b) => b.gdp - a.gdp)[0] || null;
  const development = [...active].sort(
    (a, b) => calculateScore(b) - calculateScore(a),
  )[0] || null;
  room.champions = {
    growth: growth?.id || null,
    development: development?.id || null,
  };
  emitState(room);
}

function startGame(room) {
  if (room.players.size < 2) throw new Error("Cần ít nhất 2 người chơi");
  clearRoomTimer(room);
  room.roundIndex = 0;
  room.champions = null;
  room.reveal = null;
  for (const team of room.teams) {
    team.gdp = 40;
    team.welfare = 40;
    team.stability = 40;
    team.score = 40;
  }
  beginPolicy(room);
}

function nextPhase(room) {
  clearRoomTimer(room);
  if (room.phase === "policy") return beginDuel(room);
  if (room.phase === "duel") return resolveRoomRound(room);
  if (room.phase === "reveal") {
    room.roundIndex += 1;
    return beginPolicy(room);
  }
}

function findPlayerByToken(room, playerToken) {
  return [...room.players.values()].find((player) => player.token === playerToken);
}

function assignTeam(room, preferredIndex) {
  if (Number.isInteger(preferredIndex)) {
    const preferred = room.teams[preferredIndex];
    if (preferred && preferred.players.length < TEAM_SIZE) return preferred;
    return null;
  }
  const available = room.teams
    .filter((team) => team.players.length < TEAM_SIZE)
    .sort((a, b) => a.players.length - b.players.length || a.index - b.index);
  return available[0] || null;
}

function socketError(socket, message) {
  socket.emit("app:error", { message });
}

io.on("connection", (socket) => {
  socket.on("host:create", async (callback = () => {}) => {
    try {
      const code = roomCode();
      const hostToken = token();
      const joinUrl = `${originFor(socket)}/?room=${code}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, {
        margin: 1,
        width: 360,
        color: { dark: "#10182f", light: "#ffffff" },
      });
      const room = {
        code,
        hostToken,
        hostSocketId: socket.id,
        players: new Map(),
        teams: Array.from({ length: 8 }, (_, index) => createTeam(index)),
        status: "lobby",
        phase: "lobby",
        roundIndex: 0,
        deadline: null,
        pairings: [],
        reveal: null,
        champions: null,
        timer: null,
        createdAt: Date.now(),
        joinUrl,
        qrDataUrl,
      };
      rooms.set(code, room);
      socket.join(`${code}:host`);
      callback({ ok: true, code, hostToken, joinUrl, qrDataUrl });
      emitState(room);
    } catch (error) {
      callback({ ok: false, message: error.message });
    }
  });

  socket.on("host:resume", ({ code, hostToken } = {}, callback = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.hostToken !== hostToken) {
      return callback({ ok: false, message: "Không thể khôi phục phòng host" });
    }
    room.hostSocketId = socket.id;
    socket.join(`${room.code}:host`);
    callback({
      ok: true,
      code: room.code,
      joinUrl: room.joinUrl,
      qrDataUrl: room.qrDataUrl,
    });
    emitState(room);
  });

  socket.on("host:start", ({ code, hostToken } = {}, callback = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.hostToken !== hostToken) {
      return callback({ ok: false, message: "Không có quyền điều khiển phòng" });
    }
    try {
      startGame(room);
      callback({ ok: true });
    } catch (error) {
      callback({ ok: false, message: error.message });
    }
  });

  socket.on("host:next", ({ code, hostToken } = {}, callback = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.hostToken !== hostToken) {
      return callback({ ok: false, message: "Không có quyền điều khiển phòng" });
    }
    nextPhase(room);
    callback({ ok: true });
  });

  socket.on("host:end", ({ code, hostToken } = {}, callback = () => {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.hostToken !== hostToken) {
      return callback({ ok: false, message: "Không có quyền điều khiển phòng" });
    }
    finishGame(room);
    callback({ ok: true });
  });

  socket.on(
    "player:join",
    ({ code, nickname, playerToken, teamNumber } = {}, callback = () => {}) => {
      const normalizedCode = String(code || "").trim().toUpperCase();
      const room = rooms.get(normalizedCode);
      const safeName = cleanNickname(nickname);
      if (!room) return callback({ ok: false, message: "Không tìm thấy phòng" });
      if (!safeName) return callback({ ok: false, message: "Nhập tên trước đã" });

      let player = playerToken ? findPlayerByToken(room, playerToken) : null;
      if (player) {
        player.socketId = socket.id;
        player.connected = true;
        player.nickname = safeName;
      } else {
        if (room.status !== "lobby") {
          return callback({ ok: false, message: "Trận đấu đã bắt đầu" });
        }
        if (room.players.size >= MAX_PLAYERS) {
          return callback({ ok: false, message: "Phòng đã đủ 8 đại diện" });
        }
        const requestedTeam = Number(teamNumber);
        if (!Number.isInteger(requestedTeam) || requestedTeam < 1 || requestedTeam > 8) {
          return callback({ ok: false, message: "Hãy chọn đội từ 1 đến 8" });
        }
        const preferredIndex = requestedTeam - 1;
        const team = assignTeam(room, preferredIndex);
        if (!team) {
          return callback({
            ok: false,
            message: "Đội này đã có đại diện, hãy kiểm tra lại",
          });
        }
        player = {
          id: token(8),
          token: token(),
          nickname: safeName,
          socketId: socket.id,
          teamId: team.id,
          connected: true,
        };
        room.players.set(player.id, player);
        team.players.push(player);
      }

      socket.data.player = { roomCode: room.code, playerId: player.id };
      socket.join(`${room.code}:players`);
      callback({
        ok: true,
        playerToken: player.token,
        playerId: player.id,
        teamId: player.teamId,
      });
      emitState(room);
    },
  );

  socket.on("player:vote-policy", ({ code, playerToken, policy } = {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.phase !== "policy" || !POLICIES[policy]) return;
    const player = findPlayerByToken(room, playerToken);
    if (!player) return;
    const team = getTeam(room, player.teamId);
    team.policyVotes[player.id] = policy;
    emitState(room);
  });

  socket.on("player:vote-duel", ({ code, playerToken, choice } = {}) => {
    const room = rooms.get(String(code || "").toUpperCase());
    if (!room || room.phase !== "duel") return;
    if (!["cooperate", "compete"].includes(choice)) return;
    const player = findPlayerByToken(room, playerToken);
    if (!player) return;
    const team = getTeam(room, player.teamId);
    team.duelVotes[player.id] = choice;
    emitState(room);
  });

  socket.on("disconnect", () => {
    const identity = socket.data.player;
    if (!identity) return;
    const room = rooms.get(identity.roomCode);
    const player = room?.players.get(identity.playerId);
    if (!player) return;
    player.connected = false;
    emitState(room);
  });
});

setInterval(() => {
  const cutoff = Date.now() - 3 * 60 * 60 * 1000;
  for (const [code, room] of rooms.entries()) {
    if (room.createdAt < cutoff) {
      clearRoomTimer(room);
      rooms.delete(code);
    }
  }
}, 30 * 60 * 1000).unref();

if (require.main === module) {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Nation Clash đang chạy tại http://localhost:${PORT}`);
  });
}

module.exports = { app, server, rooms };
