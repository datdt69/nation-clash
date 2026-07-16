const test = require("node:test");
const assert = require("node:assert/strict");
const { createTeam } = require("../game-engine");
const {
  MARKET_DEFINITIONS,
  STARTING_CASH,
  EVENT_INTERVAL_MS,
  createGame,
  tick,
  trade,
  publicState,
  finishGame,
  leaderboard,
} = require("../market-engine");

function setup(teamCount = 3, options = {}) {
  const teams = Array.from({ length: 8 }, (_, index) => createTeam(index));
  for (let index = 0; index < teamCount; index += 1) {
    teams[index].name = `Đội ${index + 1}`;
    teams[index].players.push({ id: `p${index}`, nickname: teams[index].name });
  }
  return { teams, game: createGame(teams, { now: 1_000, ...options }) };
}

test("có đúng 8 mã mô phỏng, chia đều hai mô hình", () => {
  assert.equal(MARKET_DEFINITIONS.length, 8);
  assert.equal(MARKET_DEFINITIONS.filter((market) => market.model === "capitalist").length, 4);
  assert.equal(MARKET_DEFINITIONS.filter((market) => market.model === "socialist").length, 4);
  assert.equal(new Set(MARKET_DEFINITIONS.map((market) => market.symbol)).size, 8);
});

test("mỗi đội có 100.000 vốn và danh mục riêng", () => {
  const { game } = setup(2);
  const player = publicState(game, "team-1");
  const host = publicState(game);
  assert.equal(player.portfolio.cash, STARTING_CASH);
  assert.equal(Object.keys(player.portfolio.holdings).length, 8);
  assert.equal(host.portfolio, null);
  assert.equal(player.leaderboard.length, 2);
});

test("lệnh mua cập nhật tiền, cổ phiếu và đẩy giá lên", () => {
  const { game } = setup(2);
  const market = game.markets.find((entry) => entry.symbol === "VNX");
  const beforePrice = market.price;
  const result = trade(game, "team-1", { symbol: "VNX", side: "buy", quantity: 20 }, 2_000);
  assert.equal(result.ok, true);
  assert.equal(game.portfolios["team-1"].holdings.VNX, 20);
  assert.ok(game.portfolios["team-1"].cash < STARTING_CASH);
  assert.ok(market.price > beforePrice);
  assert.equal(game.tradeTape[0].side, "buy");
});

test("không cho bán khống hoặc mua vượt quá số vốn", () => {
  const { game } = setup(2);
  const short = trade(game, "team-1", { symbol: "USX", side: "sell", quantity: 1 });
  const tooLarge = trade(game, "team-1", { symbol: "USX", side: "buy", quantity: 9_999 });
  assert.equal(short.ok, false);
  assert.match(short.message, /không đủ cổ phiếu/i);
  assert.equal(tooLarge.ok, false);
  assert.match(tooLarge.message, /không đủ vốn/i);
});

test("đúng phút thứ nhất sinh 1-3 sự kiện và giấu hệ số tác động", () => {
  const { game } = setup(2);
  const result = tick(game, 1_000 + EVENT_INTERVAL_MS, () => 0);
  const state = publicState(game, "team-1");
  assert.equal(result.changed, true);
  assert.equal(state.eventRound, 1);
  assert.equal(state.activeEvents.length, 1);
  assert.equal(state.activeEvents[0].effects, undefined);
  assert.equal(state.activeEvents[0].analysis, undefined);
});

test("phân tích chỉ xuất hiện sau khi sự kiện cũ kết thúc", () => {
  const { game } = setup(2, { durationMs: 4 * EVENT_INTERVAL_MS });
  tick(game, 1_000 + EVENT_INTERVAL_MS, () => 0);
  assert.equal(publicState(game).eventHistory.length, 0);
  tick(game, 1_000 + 2 * EVENT_INTERVAL_MS, () => 0);
  const state = publicState(game);
  assert.equal(state.eventHistory.length, 1);
  assert.match(state.eventHistory[0].analysis, /thị trường/i);
});

test("kết thúc trận xếp hạng theo tổng tài sản", () => {
  const { game } = setup(3);
  game.portfolios["team-2"].cash += 5_000;
  finishGame(game, 5_000);
  const board = leaderboard(game);
  assert.equal(game.phase, "finished");
  assert.equal(board[0].teamId, "team-2");
  assert.equal(board[0].rank, 1);
});
