const test = require("node:test");
const assert = require("node:assert/strict");
const { io: createClient } = require("socket.io-client");
const { server, rooms } = require("../server");

function emitAck(socket, event, payload) {
  return new Promise((resolve) => {
    if (payload === undefined) socket.emit(event, resolve);
    else socket.emit(event, payload, resolve);
  });
}

function waitForState(socket, predicate, timeout = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off("state", handler);
      reject(new Error("Hết thời gian chờ state"));
    }, timeout);
    function handler(state) {
      if (!predicate(state)) return;
      clearTimeout(timer);
      socket.off("state", handler);
      resolve(state);
    }
    socket.on("state", handler);
  });
}

test("host tạo phòng, hai người join và bắt đầu realtime", async (t) => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}`;
  const host = createClient(url, { transports: ["websocket"] });
  const p1 = createClient(url, { transports: ["websocket"] });
  const p2 = createClient(url, { transports: ["websocket"] });

  t.after(async () => {
    for (const room of rooms.values()) clearTimeout(room.timer);
    host.close();
    p1.close();
    p2.close();
    rooms.clear();
    await new Promise((resolve) => server.close(resolve));
  });

  await Promise.all(
    [host, p1, p2].map(
      (socket) =>
        new Promise((resolve) =>
          socket.connected ? resolve() : socket.once("connect", resolve),
        ),
    ),
  );

  const created = await emitAck(host, "host:create", undefined);
  assert.equal(created.ok, true);
  assert.equal(created.code.length, 5);

  const joined1 = await emitAck(p1, "player:join", {
    code: created.code,
    nickname: "An",
    teamNumber: 1,
  });
  const joined2 = await emitAck(p2, "player:join", {
    code: created.code,
    nickname: "Bình",
    teamNumber: 2,
  });
  assert.equal(joined1.ok, true);
  assert.equal(joined2.ok, true);

  const playingState = waitForState(p1, (state) => state.phase === "policy");
  const started = await emitAck(host, "host:start", {
    code: created.code,
    hostToken: created.hostToken,
  });
  assert.equal(started.ok, true);
  const state = await playingState;
  assert.equal(state.playersCount, 2);
  assert.equal(state.event.id, "consumer-boom");
});

test("phòng nhận đủ 8 đại diện, mỗi đội một người và chặn người thứ 9", async (t) => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}`;
  const host = createClient(url, { transports: ["websocket"] });
  const clients = Array.from({ length: 9 }, () =>
    createClient(url, { transports: ["websocket"] }),
  );

  t.after(async () => {
    host.close();
    for (const client of clients) client.close();
    rooms.clear();
    await new Promise((resolve) => server.close(resolve));
  });

  await Promise.all(
    [host, ...clients].map(
      (socket) =>
        new Promise((resolve) =>
          socket.connected ? resolve() : socket.once("connect", resolve),
        ),
    ),
  );

  const created = await emitAck(host, "host:create", undefined);
  const results = await Promise.all(
    clients.slice(0, 8).map((client, index) =>
      emitAck(client, "player:join", {
        code: created.code,
        nickname: `Người ${index + 1}`,
        teamNumber: index + 1,
      }),
    ),
  );
  assert.equal(results.filter((result) => result.ok).length, 8);

  const room = rooms.get(created.code);
  assert.equal(room.players.size, 8);
  assert.deepEqual(
    room.teams.map((team) => team.players.length),
    Array(8).fill(1),
  );

  const overflow = await emitAck(clients[8], "player:join", {
    code: created.code,
    nickname: "Người 9",
    teamNumber: 1,
  });
  assert.equal(overflow.ok, false);
  assert.match(overflow.message, /đủ 8/i);
});
