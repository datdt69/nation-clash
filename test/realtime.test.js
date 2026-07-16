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

function waitForState(socket, predicate, timeout = 3_000) {
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

async function connect(socket) {
  if (socket.connected) return;
  await new Promise((resolve) => socket.once("connect", resolve));
}

test("host tạo phòng, hai đội vào và giao dịch realtime", async (t) => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const host = createClient(url, { transports: ["websocket"] });
  const first = createClient(url, { transports: ["websocket"] });
  const second = createClient(url, { transports: ["websocket"] });

  t.after(async () => {
    host.close();
    first.close();
    second.close();
    rooms.clear();
    await new Promise((resolve) => server.close(resolve));
  });

  await Promise.all([host, first, second].map(connect));
  const created = await emitAck(host, "host:create");
  assert.equal(created.ok, true);
  assert.equal(created.code.length, 5);
  assert.match(created.qrDataUrl, /^data:image\/png;base64,/);

  const joinedFirst = await emitAck(first, "player:join", { code: created.code, nickname: "Đội Alpha" });
  const joinedSecond = await emitAck(second, "player:join", { code: created.code, nickname: "Đội Beta" });
  assert.equal(joinedFirst.ok, true);
  assert.equal(joinedSecond.ok, true);

  const firstPlaying = waitForState(first, (state) => state.status === "playing");
  const secondPlaying = waitForState(second, (state) => state.status === "playing");
  const started = await emitAck(host, "host:start", { code: created.code, hostToken: created.hostToken });
  assert.equal(started.ok, true);
  const [firstState, secondState] = await Promise.all([firstPlaying, secondPlaying]);
  assert.equal(firstState.game.markets.length, 8);
  assert.equal(firstState.game.portfolio.teamId, joinedFirst.teamId);
  assert.equal(secondState.game.portfolio.teamId, joinedSecond.teamId);

  const tradeState = waitForState(second, (state) => state.game?.tradeTape[0]?.teamId === joinedFirst.teamId);
  const bought = await emitAck(first, "player:trade", {
    code: created.code,
    playerToken: joinedFirst.playerToken,
    symbol: "VNX",
    side: "buy",
    quantity: 10,
  });
  assert.equal(bought.ok, true);
  const afterTrade = await tradeState;
  assert.equal(afterTrade.game.tradeTape[0].symbol, "VNX");
  assert.equal(afterTrade.game.tradeTape[0].quantity, 10);
  assert.equal(afterTrade.game.portfolio.teamId, joinedSecond.teamId);
});

test("phòng nhận tối đa 8 đội và chặn đội thứ 9", async (t) => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const host = createClient(url, { transports: ["websocket"] });
  const clients = Array.from({ length: 9 }, () => createClient(url, { transports: ["websocket"] }));

  t.after(async () => {
    host.close();
    for (const client of clients) client.close();
    rooms.clear();
    await new Promise((resolve) => server.close(resolve));
  });

  await Promise.all([host, ...clients].map(connect));
  const created = await emitAck(host, "host:create");
  const joined = await Promise.all(
    clients.slice(0, 8).map((client, index) => emitAck(client, "player:join", {
      code: created.code,
      nickname: `Đội ${index + 1}`,
    })),
  );
  assert.equal(joined.filter((result) => result.ok).length, 8);
  assert.equal(rooms.get(created.code).players.size, 8);

  const overflow = await emitAck(clients[8], "player:join", { code: created.code, nickname: "Đội 9" });
  assert.equal(overflow.ok, false);
  assert.match(overflow.message, /đủ 8/i);
});
