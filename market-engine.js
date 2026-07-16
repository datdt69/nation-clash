const STARTING_CASH = 100_000;
const GAME_DURATION_MS = 10 * 60_000;
const EVENT_INTERVAL_MS = 60_000;
const PRICE_TICK_MS = 1_000;
const HISTORY_LIMIT = 120;
const TRADING_FEE_RATE = 0.0015;

const MODELS = {
  capitalist: {
    id: "capitalist",
    name: "Thị trường tư bản chủ nghĩa",
    short: "Tư bản chủ nghĩa",
    volatility: 0.0028,
    stabilizer: 0.006,
  },
  socialist: {
    id: "socialist",
    name: "Thị trường định hướng xã hội chủ nghĩa",
    short: "Định hướng XHCN",
    volatility: 0.0019,
    stabilizer: 0.012,
  },
};

const MARKET_DEFINITIONS = [
  { symbol: "USX", country: "Hoa Kỳ", flag: "🇺🇸", model: "capitalist", openPrice: 182.4, liquidity: 5_800, sensitivity: 1.12 },
  { symbol: "JPX", country: "Nhật Bản", flag: "🇯🇵", model: "capitalist", openPrice: 146.8, liquidity: 5_200, sensitivity: 0.91 },
  { symbol: "DEX", country: "Đức", flag: "🇩🇪", model: "capitalist", openPrice: 158.6, liquidity: 5_400, sensitivity: 0.96 },
  { symbol: "UKX", country: "Anh", flag: "🇬🇧", model: "capitalist", openPrice: 131.2, liquidity: 4_900, sensitivity: 1.03 },
  { symbol: "VNX", country: "Việt Nam", flag: "🇻🇳", model: "socialist", openPrice: 96.8, liquidity: 4_100, sensitivity: 1.08 },
  { symbol: "CNX", country: "Trung Quốc", flag: "🇨🇳", model: "socialist", openPrice: 124.5, liquidity: 5_700, sensitivity: 1.02 },
  { symbol: "LAX", country: "Lào", flag: "🇱🇦", model: "socialist", openPrice: 72.6, liquidity: 3_400, sensitivity: 0.88 },
  { symbol: "CBX", country: "Cuba", flag: "🇨🇺", model: "socialist", openPrice: 68.4, liquidity: 3_100, sensitivity: 0.84 },
];

const EVENT_CATALOG = [
  {
    id: "global-recession",
    icon: "↘",
    tag: "KHỦNG HOẢNG",
    title: "Suy thoái toàn cầu lan rộng",
    description: "Đơn hàng giảm mạnh, thất nghiệp tăng và niềm tin của doanh nghiệp suy yếu.",
    analysis: "Thị trường tư bản phản ứng nhanh và mạnh theo kỳ vọng nhà đầu tư; nhóm định hướng XHCN giảm sốc bằng đầu tư công và công cụ bình ổn.",
    effects: {
      capitalist: { momentum: -0.0058, volatility: 1.75 },
      socialist: { momentum: -0.0032, volatility: 1.25 },
    },
  },
  {
    id: "technology-wave",
    icon: "⌁",
    tag: "CÔNG NGHỆ",
    title: "Làn sóng công nghệ mới",
    description: "Năng suất tăng nhanh, vốn đầu tư đổ vào doanh nghiệp công nghệ và tự động hóa.",
    analysis: "Cơ chế vốn tư nhân giúp nhóm tư bản hấp thụ cơ hội nhanh; nhóm định hướng XHCN tăng chậm hơn nhưng ưu tiên lan tỏa công nghệ vào ngành chiến lược.",
    symbols: ["USX", "JPX", "CNX", "VNX"],
    spillover: 0.28,
    effects: {
      capitalist: { momentum: 0.0052, volatility: 1.45 },
      socialist: { momentum: 0.0038, volatility: 1.16 },
    },
  },
  {
    id: "banking-panic",
    icon: "!",
    tag: "TÀI CHÍNH",
    title: "Tin đồn rút tiền tại ngân hàng",
    description: "Tâm lý hoảng loạn lan nhanh, dòng tiền tìm nơi trú ẩn và thanh khoản co lại.",
    analysis: "Ngân hàng định hướng lợi nhuận chịu áp lực rút vốn tức thời; sở hữu và điều phối nhà nước có thể chặn lây lan nhưng làm tăng gánh nặng cứu trợ.",
    effects: {
      capitalist: { momentum: -0.0066, volatility: 2.05 },
      socialist: { momentum: -0.0035, volatility: 1.32 },
    },
  },
  {
    id: "public-investment",
    icon: "▦",
    tag: "ĐẦU TƯ CÔNG",
    title: "Gói hạ tầng quy mô lớn được công bố",
    description: "Vốn được đưa vào giao thông, năng lượng và dịch vụ thiết yếu để kích thích tổng cầu.",
    analysis: "Nhóm định hướng XHCN huy động nguồn lực công trực tiếp và giữ ổn định dài hạn; nhóm tư bản hưởng lợi qua hợp đồng và hiệu ứng lan tỏa.",
    effects: {
      capitalist: { momentum: 0.0018, volatility: 1.08 },
      socialist: { momentum: 0.0046, volatility: 0.82 },
    },
  },
  {
    id: "tax-cut",
    icon: "%",
    tag: "THUẾ",
    title: "Chính sách giảm thuế doanh nghiệp",
    description: "Lợi nhuận kỳ vọng tăng, doanh nghiệp có thêm vốn để mở rộng sản xuất và tuyển dụng.",
    analysis: "Doanh nghiệp tư nhân phản ứng rất nhanh với động lực lợi nhuận; nhóm định hướng XHCN hưởng lợi ít hơn vì còn cân đối ngân sách và mục tiêu xã hội.",
    effects: {
      capitalist: { momentum: 0.005, volatility: 1.28 },
      socialist: { momentum: 0.0017, volatility: 1.04 },
    },
  },
  {
    id: "welfare-package",
    icon: "＋",
    tag: "AN SINH",
    title: "Mở rộng gói an sinh và trợ cấp việc làm",
    description: "Thu nhập của nhóm dễ tổn thương được bảo vệ, sức mua trong nước dần phục hồi.",
    analysis: "Nhóm định hướng XHCN coi an sinh là mục tiêu trực tiếp và công cụ giữ cầu; nhóm tư bản cân nhắc thêm chi phí thuế và ngân sách.",
    effects: {
      capitalist: { momentum: 0.0005, volatility: 0.94 },
      socialist: { momentum: 0.0037, volatility: 0.72 },
    },
  },
  {
    id: "interest-rate-hike",
    icon: "↑",
    tag: "LÃI SUẤT",
    title: "Ngân hàng trung ương tăng lãi suất",
    description: "Chi phí vay vốn tăng để kiềm chế lạm phát, dòng tiền đầu cơ bắt đầu rút khỏi thị trường.",
    analysis: "Thị trường vốn phát triển phản ứng mạnh với giá tiền; nhóm định hướng XHCN kết hợp tín dụng chỉ đạo nên biên độ ngắn hạn thường được nén lại.",
    effects: {
      capitalist: { momentum: -0.0046, volatility: 1.55 },
      socialist: { momentum: -0.0024, volatility: 1.12 },
    },
  },
  {
    id: "foreign-capital",
    icon: "⇄",
    tag: "HỘI NHẬP",
    title: "Dòng vốn quốc tế tăng đột biến",
    description: "Nhà đầu tư nước ngoài tìm kiếm thị trường mới, kéo theo công nghệ và chuỗi cung ứng.",
    analysis: "Nhóm tư bản mở cửa dòng vốn rộng và tăng nhanh; nhóm định hướng XHCN chọn lọc lĩnh vực để cân bằng tăng trưởng với tự chủ kinh tế.",
    symbols: ["VNX", "LAX", "DEX", "UKX"],
    spillover: 0.35,
    effects: {
      capitalist: { momentum: 0.0044, volatility: 1.4 },
      socialist: { momentum: 0.0033, volatility: 1.12 },
    },
  },
  {
    id: "supply-shock",
    icon: "≋",
    tag: "NGUỒN CUNG",
    title: "Chuỗi cung ứng bị đứt gãy",
    description: "Nguyên liệu khan hiếm, chi phí vận chuyển tăng và nhiều nhà máy phải giảm công suất.",
    analysis: "Giá cả thị trường truyền tín hiệu thiếu hụt rất nhanh; nhóm định hướng XHCN can thiệp vào hàng thiết yếu để đổi biên lợi nhuận lấy ổn định.",
    effects: {
      capitalist: { momentum: -0.0042, volatility: 1.62 },
      socialist: { momentum: -0.0028, volatility: 1.18 },
    },
  },
  {
    id: "export-boom",
    icon: "↗",
    tag: "XUẤT KHẨU",
    title: "Nhu cầu xuất khẩu tăng mạnh",
    description: "Đơn hàng quốc tế tăng, sản xuất mở rộng và dự trữ ngoại tệ được cải thiện.",
    analysis: "Cả hai mô hình cùng hưởng lợi; khác biệt nằm ở cách lợi ích được phân phối giữa doanh nghiệp, ngân sách và các mục tiêu xã hội.",
    symbols: ["VNX", "CNX", "JPX", "DEX"],
    spillover: 0.3,
    effects: {
      capitalist: { momentum: 0.0042, volatility: 1.2 },
      socialist: { momentum: 0.004, volatility: 0.94 },
    },
  },
  {
    id: "anti-monopoly",
    icon: "⚖",
    tag: "ĐIỀU TIẾT",
    title: "Siết hành vi độc quyền trên thị trường",
    description: "Doanh nghiệp lớn bị kiểm soát giá và buộc mở thêm không gian cạnh tranh cho đối thủ nhỏ.",
    analysis: "Lợi nhuận ngắn hạn có thể giảm, nhưng cạnh tranh và phúc lợi người tiêu dùng được củng cố; mức can thiệp khác nhau giữa hai mô hình.",
    effects: {
      capitalist: { momentum: -0.0018, volatility: 1.25 },
      socialist: { momentum: 0.0015, volatility: 0.84 },
    },
  },
  {
    id: "consumer-boom",
    icon: "◆",
    tag: "TIÊU DÙNG",
    title: "Sức mua trong nước bùng nổ",
    description: "Niềm tin người tiêu dùng tăng, bán lẻ và dịch vụ ghi nhận lượng cầu vượt dự báo.",
    analysis: "Cạnh tranh tư nhân giúp nguồn cung phản ứng nhanh; điều tiết định hướng XHCN cố giữ tăng trưởng đi cùng ổn định giá và tiếp cận hàng hóa.",
    effects: {
      capitalist: { momentum: 0.0048, volatility: 1.32 },
      socialist: { momentum: 0.0034, volatility: 0.9 },
    },
  },
];

const roundPrice = (value) => Math.round(value * 100) / 100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const safeRandom = (random) => clamp(Number(random()) || 0, 0, 0.999999);

function seededHistory(definition, now) {
  const seed = definition.symbol.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const history = [];
  for (let offset = -24; offset <= 0; offset += 1) {
    const wave = offset === 0 ? 0 : Math.sin((offset + seed) * 0.63) * 0.0025;
    history.push({ at: now + offset * PRICE_TICK_MS, price: roundPrice(definition.openPrice * (1 + wave)) });
  }
  return history;
}

function createMarket(definition, now) {
  const model = MODELS[definition.model];
  return {
    ...definition,
    modelName: model.name,
    price: definition.openPrice,
    fundamental: definition.openPrice,
    changePct: 0,
    volume: 0,
    orderPressure: 0,
    eventMomentum: 0,
    eventVolatility: 1,
    volatility: model.volatility,
    stabilizer: model.stabilizer,
    history: seededHistory(definition, now),
  };
}

function createPortfolio(team) {
  return {
    teamId: team.id,
    teamName: team.name,
    color: team.color,
    cash: STARTING_CASH,
    holdings: Object.fromEntries(MARKET_DEFINITIONS.map((market) => [market.symbol, 0])),
    feesPaid: 0,
    trades: 0,
  };
}

function createGame(teams, options = {}) {
  const now = Number(options.now ?? Date.now());
  const durationMs = Number(options.durationMs || GAME_DURATION_MS);
  const eventIntervalMs = Number(options.eventIntervalMs || EVENT_INTERVAL_MS);
  const activeTeams = teams.filter((team) => team.players?.length);
  if (activeTeams.length < 2) throw new Error("Cần ít nhất 2 đội để mở thị trường");

  return {
    phase: "trading",
    startedAt: now,
    endsAt: now + durationMs,
    durationMs,
    eventIntervalMs,
    nextEventAt: now + eventIntervalMs,
    lastTickAt: now,
    eventRound: 0,
    tradeSequence: 0,
    markets: MARKET_DEFINITIONS.map((market) => createMarket(market, now)),
    portfolios: Object.fromEntries(activeTeams.map((team) => [team.id, createPortfolio(team)])),
    activeEvents: [],
    eventHistory: [],
    tradeTape: [],
    rankings: [],
  };
}

function getMarket(game, symbol) {
  return game.markets.find((market) => market.symbol === String(symbol || "").toUpperCase());
}

function recordPrice(market, at) {
  const last = market.history.at(-1);
  const point = { at, price: market.price };
  if (last && Math.floor(last.at / PRICE_TICK_MS) === Math.floor(at / PRICE_TICK_MS)) market.history[market.history.length - 1] = point;
  else market.history.push(point);
  if (market.history.length > HISTORY_LIMIT) market.history.splice(0, market.history.length - HISTORY_LIMIT);
}

function updateMarketPrice(market, now, random) {
  const model = MODELS[market.model];
  const noise = (safeRandom(random) * 2 - 1) * market.volatility * market.eventVolatility;
  const meanReversion = ((market.fundamental - market.price) / market.fundamental) * model.stabilizer;
  const demand = clamp(market.orderPressure, -1.5, 1.5) * (market.model === "socialist" ? 0.0011 : 0.00155);
  const microDrift = (safeRandom(random) - 0.485) * 0.00018;
  const percentMove = clamp(noise + meanReversion + demand + market.eventMomentum + microDrift, -0.08, 0.08);

  market.price = roundPrice(Math.max(5, market.price * (1 + percentMove)));
  market.changePct = roundPrice(((market.price - market.openPrice) / market.openPrice) * 100);
  market.orderPressure *= 0.72;
  market.eventMomentum *= 0.92;
  market.eventVolatility += (1 - market.eventVolatility) * 0.08;
  recordPrice(market, now);
}

function archiveEvents(game, at) {
  if (!game.activeEvents.length) return;
  for (const event of game.activeEvents) {
    game.eventHistory.unshift({
      id: event.id,
      icon: event.icon,
      tag: event.tag,
      title: event.title,
      analysis: event.analysis,
      resolvedAt: at,
    });
  }
  game.eventHistory = game.eventHistory.slice(0, 8);
  game.activeEvents = [];
}

function applyEvent(game, event, at) {
  for (const market of game.markets) {
    const direct = !event.symbols || event.symbols.includes(market.symbol);
    const multiplier = (direct ? 1 : event.spillover || 0) * market.sensitivity;
    if (!multiplier) continue;
    const effect = event.effects[market.model];
    market.eventMomentum += effect.momentum * multiplier;
    market.eventVolatility += (effect.volatility - 1) * multiplier;
  }

  return {
    id: event.id,
    icon: event.icon,
    tag: event.tag,
    title: event.title,
    description: event.description,
    analysis: event.analysis,
    startedAt: at,
    endsAt: at + game.eventIntervalMs,
  };
}

function triggerEvents(game, at, random = Math.random) {
  archiveEvents(game, at);
  const count = 1 + Math.floor(safeRandom(random) * 3);
  const pool = [...EVENT_CATALOG];
  const selected = [];
  for (let index = 0; index < count && pool.length; index += 1) {
    const selectedIndex = Math.floor(safeRandom(random) * pool.length);
    selected.push(pool.splice(selectedIndex, 1)[0]);
  }
  game.eventRound += 1;
  game.activeEvents = selected.map((event) => applyEvent(game, event, at));
  return game.activeEvents;
}

function portfolioValue(game, portfolio) {
  const stockValue = game.markets.reduce(
    (total, market) => total + (portfolio.holdings[market.symbol] || 0) * market.price,
    0,
  );
  return roundPrice(portfolio.cash + stockValue);
}

function leaderboard(game) {
  return Object.values(game.portfolios)
    .map((portfolio) => {
      const netWorth = portfolioValue(game, portfolio);
      return {
        teamId: portfolio.teamId,
        teamName: portfolio.teamName,
        color: portfolio.color,
        netWorth,
        profit: roundPrice(netWorth - STARTING_CASH),
        profitPct: roundPrice(((netWorth - STARTING_CASH) / STARTING_CASH) * 100),
        trades: portfolio.trades,
      };
    })
    .sort((a, b) => b.netWorth - a.netWorth || a.teamName.localeCompare(b.teamName, "vi"))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function finishGame(game, at = Date.now()) {
  if (game.phase === "finished") return game.rankings;
  archiveEvents(game, at);
  game.phase = "finished";
  game.endsAt = Math.min(game.endsAt, at);
  game.rankings = leaderboard(game);
  return game.rankings;
}

function tick(game, now = Date.now(), random = Math.random) {
  if (!game || game.phase === "finished") return { changed: false, finished: true };
  const target = Math.min(Number(now), game.endsAt);
  let changed = false;
  let guard = 0;

  while (game.lastTickAt + PRICE_TICK_MS <= target && guard < 1_000) {
    game.lastTickAt += PRICE_TICK_MS;
    while (game.nextEventAt <= game.lastTickAt && game.nextEventAt < game.endsAt) {
      triggerEvents(game, game.nextEventAt, random);
      game.nextEventAt += game.eventIntervalMs;
    }
    for (const market of game.markets) updateMarketPrice(market, game.lastTickAt, random);
    changed = true;
    guard += 1;
  }

  if (Number(now) >= game.endsAt) {
    finishGame(game, game.endsAt);
    return { changed: true, finished: true };
  }
  return { changed, finished: false };
}

function trade(game, teamId, order = {}, now = Date.now()) {
  if (!game || game.phase !== "trading") return { ok: false, message: "Thị trường đã đóng cửa" };
  const portfolio = game.portfolios[teamId];
  if (!portfolio) return { ok: false, message: "Không tìm thấy tài khoản của đội" };
  const market = getMarket(game, order.symbol);
  if (!market) return { ok: false, message: "Mã cổ phiếu không hợp lệ" };
  const side = order.side === "sell" ? "sell" : order.side === "buy" ? "buy" : null;
  const quantity = Number(order.quantity);
  if (!side) return { ok: false, message: "Chọn lệnh mua hoặc bán" };
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 9_999) {
    return { ok: false, message: "Số lượng phải từ 1 đến 9.999" };
  }

  const executionPrice = market.price;
  const gross = roundPrice(executionPrice * quantity);
  const fee = roundPrice(gross * TRADING_FEE_RATE);
  if (side === "buy") {
    const total = roundPrice(gross + fee);
    if (portfolio.cash + 0.001 < total) return { ok: false, message: "Không đủ vốn để đặt lệnh mua" };
    portfolio.cash = roundPrice(portfolio.cash - total);
    portfolio.holdings[market.symbol] += quantity;
  } else {
    if (portfolio.holdings[market.symbol] < quantity) return { ok: false, message: "Không đủ cổ phiếu để bán" };
    portfolio.cash = roundPrice(portfolio.cash + gross - fee);
    portfolio.holdings[market.symbol] -= quantity;
  }

  const direction = side === "buy" ? 1 : -1;
  const rawImpact = (quantity / market.liquidity) * 0.034 + Math.log10(quantity + 1) * 0.00035;
  const modelDamping = market.model === "socialist" ? 0.72 : 1;
  const impact = clamp(rawImpact * modelDamping, 0.00015, 0.018);
  market.price = roundPrice(Math.max(5, market.price * (1 + direction * impact)));
  market.changePct = roundPrice(((market.price - market.openPrice) / market.openPrice) * 100);
  market.orderPressure += direction * (quantity / market.liquidity);
  market.volume += quantity;
  portfolio.feesPaid = roundPrice(portfolio.feesPaid + fee);
  portfolio.trades += 1;
  recordPrice(market, Number(now));

  const transaction = {
    id: `trade-${++game.tradeSequence}`,
    teamId,
    teamName: portfolio.teamName,
    side,
    symbol: market.symbol,
    quantity,
    price: executionPrice,
    fee,
    at: Number(now),
  };
  game.tradeTape.unshift(transaction);
  game.tradeTape = game.tradeTape.slice(0, 18);
  return { ok: true, transaction };
}

function publicMarket(market) {
  return {
    symbol: market.symbol,
    country: market.country,
    flag: market.flag,
    model: market.model,
    modelName: market.modelName,
    price: market.price,
    openPrice: market.openPrice,
    changePct: market.changePct,
    volume: market.volume,
    history: market.history,
  };
}

function publicState(game, viewerTeamId = null) {
  if (!game) return null;
  const viewer = viewerTeamId ? game.portfolios[viewerTeamId] : null;
  return {
    phase: game.phase,
    startedAt: game.startedAt,
    endsAt: game.endsAt,
    nextEventAt: game.nextEventAt,
    eventIntervalMs: game.eventIntervalMs,
    eventRound: game.eventRound,
    startingCash: STARTING_CASH,
    feeRate: TRADING_FEE_RATE,
    markets: game.markets.map(publicMarket),
    activeEvents: game.activeEvents.map(({ analysis, ...event }) => event),
    eventHistory: game.eventHistory,
    tradeTape: game.tradeTape,
    leaderboard: game.phase === "finished" && game.rankings.length ? game.rankings : leaderboard(game),
    portfolio: viewer
      ? {
          teamId: viewer.teamId,
          cash: viewer.cash,
          holdings: { ...viewer.holdings },
          feesPaid: viewer.feesPaid,
          trades: viewer.trades,
          netWorth: portfolioValue(game, viewer),
        }
      : null,
  };
}

function winner(game) {
  return (game.rankings.length ? game.rankings : leaderboard(game))[0]?.teamId || null;
}

module.exports = {
  MODELS,
  MARKET_DEFINITIONS,
  EVENT_CATALOG,
  STARTING_CASH,
  GAME_DURATION_MS,
  EVENT_INTERVAL_MS,
  TRADING_FEE_RATE,
  createGame,
  tick,
  trade,
  triggerEvents,
  portfolioValue,
  leaderboard,
  finishGame,
  publicState,
  winner,
};
