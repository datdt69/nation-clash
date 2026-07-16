const test = require("node:test");
const assert = require("node:assert/strict");
const { createTeam } = require("../game-engine");
const {
  MARKET_DEFINITIONS,
  MARKET_LINKS,
  EVENT_IMPACT_MULTIPLIER,
  STARTING_CASH,
  EVENT_INTERVAL_MS,
  FIRST_EVENT_DELAY_MS,
  createGame,
  tick,
  trade,
  triggerEvents,
  portfolioValue,
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

test("có đúng 12 ngành gắn với 12 quốc gia", () => {
  assert.equal(MARKET_DEFINITIONS.length, 12);
  assert.equal(MARKET_DEFINITIONS.filter((market) => market.model === "capitalist").length, 8);
  assert.equal(MARKET_DEFINITIONS.filter((market) => market.model === "socialist").length, 4);
  assert.equal(new Set(MARKET_DEFINITIONS.map((market) => market.symbol)).size, 12);
  assert.equal(new Set(MARKET_DEFINITIONS.map((market) => market.country)).size, 12);
  assert.ok(MARKET_DEFINITIONS.every((market) => market.sector));
  assert.ok(MARKET_LINKS.length >= 20);
});

test("mỗi người có 100.000 vốn và danh mục riêng", () => {
  const { game } = setup(2);
  const player = publicState(game, "p0");
  const host = publicState(game);
  assert.equal(player.portfolio.cash, STARTING_CASH);
  assert.equal(Object.keys(player.portfolio.holdings).length, 12);
  assert.equal(host.portfolio, null);
  assert.equal(player.leaderboard.length, 2);
});

test("hai người cùng đội có ví riêng và đội xếp hạng theo tài sản trung bình", () => {
  const teams = Array.from({ length: 8 }, (_, index) => createTeam(index));
  teams[0].players.push({ id: "a", nickname: "An" }, { id: "b", nickname: "Bình" });
  teams[1].players.push({ id: "c", nickname: "Chi" });
  const game = createGame(teams, { now: 1_000 });
  trade(game, "a", { symbol: "VNE", side: "buy", quantity: 10 }, 2_000);
  assert.equal(game.portfolios.b.cash, STARTING_CASH);
  game.portfolios.a.cash += 2_000;
  const team = leaderboard(game).find((entry) => entry.teamId === "team-1");
  const expectedAverage = (portfolioValue(game, game.portfolios.a) + portfolioValue(game, game.portfolios.b)) / 2;
  assert.equal(team.members, 2);
  assert.equal(team.netWorth, Math.round(expectedAverage * 100) / 100);
});

test("xếp hạng công bằng khi các đội có số thành viên khác nhau", () => {
  const teams = Array.from({ length: 8 }, (_, index) => createTeam(index));
  teams[0].players.push({ id: "solo", nickname: "Một người" });
  teams[1].players.push({ id: "pair-a", nickname: "Hai A" }, { id: "pair-b", nickname: "Hai B" });
  const game = createGame(teams, { now: 1_000 });
  game.portfolios.solo.cash += 10_000;
  game.portfolios["pair-a"].cash += 20_000;
  const board = leaderboard(game);
  const solo = board.find((entry) => entry.teamId === "team-1");
  const pair = board.find((entry) => entry.teamId === "team-2");
  assert.equal(solo.members, 1);
  assert.equal(pair.members, 2);
  assert.equal(solo.profitPct, 10);
  assert.equal(pair.profitPct, 10);
  assert.equal(solo.netWorth, pair.netWorth);
});

test("ENDING tính cùng một phần trăm cho đội 1, 3 và 7 người dù tổng vốn khác nhau", () => {
  const teams = Array.from({ length: 8 }, (_, index) => createTeam(index));
  const sizes = [1, 3, 7];
  sizes.forEach((size, teamIndex) => {
    for (let member = 0; member < size; member += 1) {
      teams[teamIndex].players.push({ id: `fair-${teamIndex}-${member}`, nickname: `T${teamIndex}-${member}` });
    }
  });
  const game = createGame(teams, { now: 1_000 });
  const gains = [
    [8_500],
    [20_000, 5_500, 0],
    [30_000, 20_000, 10_000, 5_000, 0, -2_500, -3_000],
  ];
  gains.forEach((teamGains, teamIndex) => {
    teamGains.forEach((gain, member) => {
      game.portfolios[`fair-${teamIndex}-${member}`].cash += gain;
    });
  });
  finishGame(game, 5_000);
  const board = leaderboard(game);
  for (const [index, size] of sizes.entries()) {
    const entry = board.find((item) => item.teamId === teams[index].id);
    assert.equal(entry.members, size);
    assert.equal(entry.netWorth, 108_500);
    assert.equal(entry.profitPct, 8.5);
  }
  assert.equal(new Set(board.map((entry) => entry.profitPct)).size, 1);
});

test("lệnh mua cập nhật tiền, cổ phiếu và đẩy giá lên", () => {
  const { game } = setup(2);
  const market = game.markets.find((entry) => entry.symbol === "VNE");
  const beforePrice = market.price;
  const result = trade(game, "p0", { symbol: "VNE", side: "buy", quantity: 20 }, 2_000);
  assert.equal(result.ok, true);
  assert.equal(game.portfolios.p0.holdings.VNE, 20);
  assert.ok(game.portfolios.p0.cash < STARTING_CASH);
  assert.ok(market.price > beforePrice);
  assert.equal(game.tradeTape[0].side, "buy");
  assert.equal(market.buyVolume, 20);
  assert.equal(market.sellVolume, 0);
  assert.equal(market.tradeCount, 1);
  assert.equal(market.lastTradePrice, result.transaction.price);
});

test("nhiều lệnh cùng chiều trong 6 giây tạo hiệu ứng đám đông mạnh dần", () => {
  const { game } = setup(3);
  const first = trade(game, "p0", { symbol: "VNE", side: "buy", quantity: 50 }, 2_000);
  const second = trade(game, "p1", { symbol: "VNE", side: "buy", quantity: 50 }, 3_000);
  const third = trade(game, "p2", { symbol: "VNE", side: "buy", quantity: 50 }, 4_000);
  assert.equal(first.ok, true);
  assert.ok(second.transaction.impactPct >= first.transaction.impactPct);
  assert.ok(third.transaction.impactPct >= second.transaction.impactPct);
  assert.equal(third.transaction.crowdLevel, 3);
});

test("bốn người all-in không thể bẻ giá vượt quá xu hướng sự kiện", () => {
  const { game } = setup(4);
  const market = game.markets.find((entry) => entry.symbol === "VNE");
  const before = market.price;
  const quantities = [];
  for (let index = 0; index < 4; index += 1) {
    const quantity = Math.floor(game.portfolios[`p${index}`].cash / (market.price * (1 + 0.0015)));
    quantities.push(quantity);
    const result = trade(game, `p${index}`, { symbol: "VNE", side: "buy", quantity }, 2_000 + index * 200);
    assert.equal(result.ok, true);
  }
  const buyMove = (market.price - before) / before;
  assert.ok(buyMove > 0);
  assert.ok(buyMove < 0.035);
  const peak = market.price;
  for (let index = 0; index < 4; index += 1) {
    const result = trade(game, `p${index}`, { symbol: "VNE", side: "sell", quantity: quantities[index] }, 4_000 + index * 200);
    assert.equal(result.ok, true);
  }
  const sellMove = (peak - market.price) / peak;
  assert.ok(sellMove > 0);
  assert.ok(sellMove < 0.035);
});

test("50 người cùng all-in chỉ tạo áp lực thanh khoản hữu hạn", () => {
  const teams = Array.from({ length: 8 }, (_, index) => createTeam(index));
  for (let index = 0; index < 50; index += 1) {
    teams[index % teams.length].players.push({ id: `crowd-${index}`, nickname: `Người ${index + 1}` });
  }
  const game = createGame(teams, { now: 1_000 });
  const market = game.markets.find((entry) => entry.symbol === "VNE");
  const before = market.price;
  for (let index = 0; index < 50; index += 1) {
    const accountId = `crowd-${index}`;
    const quantity = Math.floor(game.portfolios[accountId].cash / (market.price * (1 + 0.0015)));
    assert.equal(trade(game, accountId, { symbol: "VNE", side: "buy", quantity }, 2_000 + index * 20).ok, true);
  }
  assert.ok((market.price - before) / before < 0.08);
  assert.ok(market.orderPressure <= 1.2);
});

test("giá luôn nằm trong biên dao động của phiên dù news kéo dài", () => {
  const { game } = setup(3, { durationMs: 10 * 60_000 });
  let seed = 7;
  const random = () => {
    seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
    return seed / 4_294_967_296;
  };
  tick(game, game.endsAt, random);
  for (const market of game.markets) {
    const band = market.model === "socialist" ? 0.18 : 0.25;
    assert.ok(market.price >= market.openPrice * (1 - band) - 0.01);
    assert.ok(market.price <= market.openPrice * (1 + band) + 0.01);
  }
});

test("phiên 10 phút có breakout kỹ thuật vượt 5% nhưng không mất kiểm soát", () => {
  let beyondFive = 0;
  let total = 0;
  let sessionPeak = 0;
  for (let run = 1; run <= 10; run += 1) {
    const { game } = setup(1, { durationMs: 10 * 60_000, eventIntervalMs: 60_000 });
    let seed = (run * 987_654_321) >>> 0;
    const random = () => {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
      return seed / 4_294_967_296;
    };
    tick(game, game.endsAt, random);
    const moves = game.markets.map((market) => Math.abs(market.changePct));
    beyondFive += moves.filter((move) => move > 5).length;
    total += moves.length;
    sessionPeak = Math.max(sessionPeak, ...moves);
  }
  assert.ok(beyondFive / total >= 0.2);
  assert.ok(sessionPeak >= 7);
  assert.ok(sessionPeak <= 25);
});

test("lịch sử OHLC lưu high-low để nến có râu từ biến động nội kỳ", () => {
  const { game } = setup(1);
  const market = game.markets[0];
  assert.ok(market.history.some((point) => point.high > point.price || point.low < point.price));
  const before = market.history.at(-1);
  trade(game, "p0", { symbol: market.symbol, side: "buy", quantity: 10 }, before.at + 100);
  const after = market.history.at(-1);
  assert.ok(after.high >= after.price);
  assert.ok(after.low <= after.price);
});

test("lịch sử mở cửa sideway ngẫu nhiên, không chạy theo vòng cung hình sin", () => {
  const { game } = setup(1);
  for (const market of game.markets) {
    const directions = market.history.slice(1).map((point, index) => (
      Math.sign(point.price - market.history[index].price)
    )).filter(Boolean);
    let reversals = 0;
    let longestRun = 0;
    let run = 0;
    let previous = 0;
    for (const direction of directions) {
      if (previous && direction !== previous) {
        reversals += 1;
        run = 0;
      }
      run += 1;
      longestRun = Math.max(longestRun, run);
      previous = direction;
    }
    assert.ok(reversals >= 30, `${market.symbol} thiếu nhịp đảo chiều`);
    assert.ok(longestRun <= 12, `${market.symbol} chạy một chiều quá lâu`);
  }
});

test("lệnh mua mã nguồn truyền áp lực sang ngành liên quan", () => {
  const { game } = setup(2);
  const energy = game.markets.find((market) => market.symbol === "VNE");
  const machinery = game.markets.find((market) => market.symbol === "DEM");
  const before = machinery.orderPressure;
  const result = trade(game, "p0", { symbol: "VNE", side: "buy", quantity: 200 }, 2_000);
  assert.equal(result.ok, true);
  assert.ok(energy.orderPressure > 0);
  assert.ok(machinery.orderPressure > before);
});

test("không cho bán khống hoặc mua vượt quá số vốn", () => {
  const { game } = setup(2);
  const short = trade(game, "p0", { symbol: "UST", side: "sell", quantity: 1 });
  const tooLarge = trade(game, "p0", { symbol: "UST", side: "buy", quantity: 9_999 });
  assert.equal(short.ok, false);
  assert.match(short.message, /không đủ cổ phiếu/i);
  assert.equal(tooLarge.ok, false);
  assert.match(tooLarge.message, /không đủ vốn/i);
});

test("đợt đầu sinh một sự kiện và giấu hệ số tác động", () => {
  const { game } = setup(2);
  const result = tick(game, 1_000 + EVENT_INTERVAL_MS, () => 0);
  const state = publicState(game, "p0");
  assert.equal(result.changed, true);
  assert.equal(state.eventRound, 1);
  assert.equal(state.activeEvents.length, 1);
  assert.equal(state.activeEvents[0].affected, undefined);
  assert.equal(state.activeEvents[0].effects, undefined);
  assert.equal(state.activeEvents[0].analysis, undefined);
});

test("sự kiện đầu xuất hiện sớm để người chơi có tín hiệu giao dịch", () => {
  const { game } = setup(1);
  tick(game, 1_000 + FIRST_EVENT_DELAY_MS - 1, () => 0);
  assert.equal(game.activeEvents.length, 0);
  tick(game, 1_000 + FIRST_EVENT_DELAY_MS, () => 0.999);
  assert.equal(game.activeEvents.length, 1);
  assert.equal(game.eventRound, 1);
});

test("mật độ tin tăng dần thay vì dội ba sự kiện ngay khi mở phiên", () => {
  assert.equal(EVENT_INTERVAL_MS, 90_000);
  const { game } = setup(1, { durationMs: 6 * EVENT_INTERVAL_MS });
  tick(game, 1_000 + FIRST_EVENT_DELAY_MS, () => 0.999);
  assert.equal(game.activeEvents.length, 1);
  tick(game, 1_000 + FIRST_EVENT_DELAY_MS + EVENT_INTERVAL_MS, () => 0.999);
  assert.equal(game.activeEvents.length, 2);
  tick(game, 1_000 + FIRST_EVENT_DELAY_MS + 2 * EVENT_INTERVAL_MS, () => 0.999);
  assert.equal(game.activeEvents.length, 3);
  tick(game, 1_000 + FIRST_EVENT_DELAY_MS + 3 * EVENT_INTERVAL_MS, () => 0.999);
  assert.equal(game.activeEvents.length, 3);
});

test("từ đợt ba phân phối số tin theo các ngưỡng 20%, 50% và 30%", () => {
  for (const [roll, expected] of [[0.1, 1], [0.5, 2], [0.9, 3]]) {
    const { game } = setup(1);
    game.eventRound = 2;
    triggerEvents(game, 2_000, () => roll);
    assert.equal(game.activeEvents.length, expected);
  }
});

test("sự kiện lớn được khuếch đại để dẫn dắt xu hướng thị trường", () => {
  assert.equal(EVENT_IMPACT_MULTIPLIER, 1.8);
  const { game } = setup(1);
  const before = game.markets.reduce((sum, market) => sum + Math.abs(market.eventMomentum), 0);
  tick(game, 1_000 + EVENT_INTERVAL_MS, () => 0);
  const after = game.markets.reduce((sum, market) => sum + Math.abs(market.eventMomentum), 0);
  assert.ok(after > before);
});

test("event 5 phút vẫn giữ động lượng đáng kể sau 2 phút", () => {
  const eventIntervalMs = 5 * 60_000;
  const { game } = setup(1, { durationMs: 10 * 60_000, eventIntervalMs });
  tick(game, 1_000 + eventIntervalMs, () => 0);
  const initial = game.markets.reduce((sum, market) => sum + Math.abs(market.eventMomentum), 0);
  tick(game, 1_000 + eventIntervalMs + 2 * 60_000, () => 0.5);
  const later = game.markets.reduce((sum, market) => sum + Math.abs(market.eventMomentum), 0);
  assert.ok(later > initial * 0.25);
});

test("danh mục ghi giá vốn, tiền đã mua và lãi lỗ chưa chốt", () => {
  const { game } = setup(1);
  const bought = trade(game, "p0", { symbol: "VNE", side: "buy", quantity: 10 }, 2_000);
  assert.equal(bought.ok, true);
  game.markets.find((market) => market.symbol === "VNE").price += 5;
  const position = publicState(game, "p0").portfolio.positions[0];
  assert.equal(position.symbol, "VNE");
  assert.equal(position.quantity, 10);
  assert.ok(position.invested > 0);
  assert.ok(position.averageCost > 0);
  assert.ok(position.unrealizedProfit > 0);
});

test("bán hết xóa vị thế và ghi lãi lỗ đã chốt", () => {
  const { game } = setup(1);
  trade(game, "p0", { symbol: "UST", side: "buy", quantity: 10 }, 2_000);
  game.markets.find((market) => market.symbol === "UST").price += 8;
  const sold = trade(game, "p0", { symbol: "UST", side: "sell", quantity: 10 }, 3_000);
  const portfolio = publicState(game, "p0").portfolio;
  const market = publicState(game, "p0").markets.find((entry) => entry.symbol === "UST");
  assert.equal(sold.ok, true);
  assert.equal(portfolio.positions.length, 0);
  assert.ok(portfolio.realizedProfit > 0);
  assert.equal(market.buyVolume, 10);
  assert.equal(market.sellVolume, 10);
  assert.equal(market.tradeCount, 2);
});

test("một người vẫn có thể mở thị trường", () => {
  const { game } = setup(1);
  assert.equal(game.phase, "trading");
  assert.equal(Object.keys(game.portfolios).length, 1);
});

test("phân tích chỉ xuất hiện sau khi sự kiện cũ kết thúc", () => {
  const { game } = setup(2, { durationMs: 4 * EVENT_INTERVAL_MS });
  tick(game, 1_000 + EVENT_INTERVAL_MS, () => 0);
  assert.equal(publicState(game).eventHistory.length, 0);
  tick(game, 1_000 + 2 * EVENT_INTERVAL_MS, () => 0);
  const state = publicState(game);
  assert.equal(state.eventHistory.length, 1);
  assert.match(state.eventHistory[0].analysis, /ngành|Hoa Kỳ/i);
});

test("kết thúc trận xếp hạng theo phần trăm tài sản trung bình", () => {
  const { game } = setup(3);
  game.portfolios.p1.cash += 5_000;
  finishGame(game, 5_000);
  const board = leaderboard(game);
  assert.equal(game.phase, "finished");
  assert.equal(board[0].teamId, "team-2");
  assert.equal(board[0].rank, 1);
});
