const test = require("node:test");
const assert = require("node:assert/strict");
const { performance } = require("node:perf_hooks");
const { io: createClient } = require("socket.io-client");
const { server, rooms } = require("../server");

function emitAck(socket, event, payload) {
  return new Promise((resolve) => {
    if (payload === undefined) socket.emit(event, resolve);
    else socket.emit(event, payload, resolve);
  });
}

function connect(socket) {
  if (socket.connected) return Promise.resolve();
  return new Promise((resolve) => socket.once("connect", resolve));
}

function waitForPlaying(socket, timeout = 5_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Không nhận được state chơi")), timeout);
    socket.on("state", function handler(state) {
      if (state.status !== "playing") return;
      clearTimeout(timer);
      socket.off("state", handler);
      resolve(state);
    });
  });
}

test("benchmark 55 người kết nối, vào 8 đội và nhận state realtime", { timeout: 20_000 }, async (t) => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const host = createClient(url, { transports: ["websocket"] });
  const clients = Array.from({ length: 55 }, () => createClient(url, { transports: ["websocket"] }));

  t.after(async () => {
    host.close();
    clients.forEach((client) => client.close());
    rooms.clear();
    await new Promise((resolve) => server.close(resolve));
  });

  const startedAt = performance.now();
  await Promise.all([host, ...clients].map(connect));
  const connectedAt = performance.now();
  const created = await emitAck(host, "host:create");
  const joins = await Promise.all(clients.map((client, index) => emitAck(client, "player:join", {
    code: created.code,
    nickname: `Học sinh ${index + 1}`,
    teamId: `team-${(index % 8) + 1}`,
  })));
  const joinedAt = performance.now();

  assert.equal(joins.filter((result) => result.ok).length, 55);
  assert.equal(rooms.get(created.code).players.size, 55);
  assert.ok(rooms.get(created.code).teams.every((team) => team.players.length <= 7));

  const playingStates = clients.map((client) => waitForPlaying(client));
  const startResult = await emitAck(host, "host:start", { code: created.code, hostToken: created.hostToken });
  assert.equal(startResult.ok, true);
  const states = await Promise.all(playingStates);
  const readyAt = performance.now();

  assert.equal(states.length, 55);
  assert.ok(states.every((state) => state.playersCount === 55 && state.game.markets.length === 8));
  assert.ok(readyAt - startedAt < 15_000);
  t.diagnostic(`55 kết nối: ${Math.round(connectedAt - startedAt)}ms; vào đội: ${Math.round(joinedAt - connectedAt)}ms; phát state mở sàn: ${Math.round(readyAt - joinedAt)}ms`);
});
