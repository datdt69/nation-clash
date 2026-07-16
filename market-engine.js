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
  { symbol: "UST", sector: "Công nghệ", country: "Hoa Kỳ", flag: "🇺🇸", model: "capitalist", openPrice: 182.4, liquidity: 5_800, sensitivity: 1.12 },
  { symbol: "JPA", sector: "Ô tô", country: "Nhật Bản", flag: "🇯🇵", model: "capitalist", openPrice: 146.8, liquidity: 5_200, sensitivity: 0.91 },
  { symbol: "DEM", sector: "Chế tạo máy", country: "Đức", flag: "🇩🇪", model: "capitalist", openPrice: 158.6, liquidity: 5_400, sensitivity: 0.96 },
  { symbol: "UKF", sector: "Tài chính", country: "Anh", flag: "🇬🇧", model: "capitalist", openPrice: 131.2, liquidity: 4_900, sensitivity: 1.03 },
  { symbol: "VNE", sector: "Năng lượng", country: "Việt Nam", flag: "🇻🇳", model: "socialist", openPrice: 96.8, liquidity: 4_100, sensitivity: 1.08 },
  { symbol: "CNE", sector: "Thương mại điện tử", country: "Trung Quốc", flag: "🇨🇳", model: "socialist", openPrice: 124.5, liquidity: 5_700, sensitivity: 1.02 },
  { symbol: "LAA", sector: "Nông nghiệp", country: "Lào", flag: "🇱🇦", model: "socialist", openPrice: 72.6, liquidity: 3_400, sensitivity: 0.88 },
  { symbol: "CUB", sector: "Y tế & dược phẩm", country: "Cuba", flag: "🇨🇺", model: "socialist", openPrice: 68.4, liquidity: 3_100, sensitivity: 0.84 },
  { symbol: "KRS", sector: "Bán dẫn", country: "Hàn Quốc", flag: "🇰🇷", model: "capitalist", openPrice: 174.2, liquidity: 5_100, sensitivity: 1.14 },
  { symbol: "SAO", sector: "Dầu mỏ", country: "Ả Rập Xê Út", flag: "🇸🇦", model: "capitalist", openPrice: 112.7, liquidity: 4_700, sensitivity: 1.18 },
  { symbol: "SGL", sector: "Logistics", country: "Singapore", flag: "🇸🇬", model: "capitalist", openPrice: 138.5, liquidity: 4_600, sensitivity: 1.06 },
  { symbol: "BRF", sector: "Thực phẩm", country: "Brazil", flag: "🇧🇷", model: "capitalist", openPrice: 84.3, liquidity: 3_800, sensitivity: 0.94 },
];

// Một cú sốc ở mã nguồn truyền sang mã đích theo chuỗi cung ứng và dòng vốn.
// Hệ số âm mô phỏng chi phí đầu vào tăng; hệ số dương mô phỏng nhu cầu hoặc tâm lý lan tỏa.
const MARKET_LINKS = [
  ["SAO", "VNE", 0.62], ["SAO", "JPA", -0.24], ["SAO", "DEM", -0.2], ["SAO", "SGL", -0.3],
  ["VNE", "DEM", 0.18], ["VNE", "SGL", 0.16],
  ["KRS", "UST", 0.52], ["KRS", "JPA", 0.38], ["KRS", "CNE", 0.3],
  ["UST", "KRS", 0.4], ["UST", "CNE", 0.27],
  ["SGL", "CNE", 0.38], ["SGL", "JPA", 0.24], ["SGL", "DEM", 0.22], ["SGL", "LAA", 0.18], ["SGL", "BRF", 0.18],
  ["LAA", "BRF", 0.34], ["BRF", "CNE", 0.16], ["CNE", "SGL", 0.24],
  ["UKF", "UST", 0.2], ["UKF", "DEM", 0.18], ["UKF", "SGL", 0.16],
  ["CUB", "BRF", 0.1], ["BRF", "CUB", 0.12],
];

function linkedMarkets(symbol) {
  return MARKET_LINKS.filter(([source]) => source === symbol);
}

const EVENT_CATALOG = [
  {
    id: "global-recession",
    icon: "↘",
    tag: "KHỦNG HOẢNG",
    title: "Suy thoái toàn cầu lan rộng",
    description: "Đơn hàng giảm mạnh, thất nghiệp tăng và niềm tin của doanh nghiệp suy yếu.",
    analysis: "Công nghệ Hoa Kỳ, ô tô Nhật Bản, chế tạo máy Đức và tài chính Anh giảm mạnh theo kỳ vọng; các ngành được điều phối công tại Việt Nam, Lào và Cuba giảm nhẹ hơn.",
    impacts: [
      ["UST", -0.0062, 1.72, "Giảm mạnh"], ["JPA", -0.006, 1.66, "Giảm mạnh"],
      ["DEM", -0.0058, 1.62, "Giảm mạnh"], ["UKF", -0.0065, 1.9, "Giảm rất mạnh"],
      ["VNE", -0.003, 1.2, "Giảm nhẹ"], ["CNE", -0.0038, 1.28, "Giảm"],
      ["LAA", -0.0022, 1.12, "Giảm nhẹ"], ["CUB", -0.0016, 1.08, "Ít biến động"],
    ],
  },
  {
    id: "technology-wave",
    icon: "⌁",
    tag: "CÔNG NGHỆ",
    title: "Làn sóng công nghệ mới",
    description: "Năng suất tăng nhanh, vốn đầu tư đổ vào doanh nghiệp công nghệ và tự động hóa.",
    analysis: "Công nghệ Hoa Kỳ và thương mại điện tử Trung Quốc hưởng lợi trực tiếp; ô tô Nhật Bản và chế tạo máy Đức tăng nhờ nhu cầu tự động hóa.",
    impacts: [
      ["UST", 0.0065, 1.55, "Tăng rất mạnh"], ["KRS", 0.006, 1.52, "Tăng rất mạnh"], ["CNE", 0.0055, 1.28, "Tăng mạnh"],
      ["JPA", 0.0028, 1.18, "Tăng"], ["DEM", 0.0032, 1.2, "Tăng"],
    ],
  },
  {
    id: "banking-panic",
    icon: "!",
    tag: "TÀI CHÍNH",
    title: "Tin đồn rút tiền tại ngân hàng",
    description: "Tâm lý hoảng loạn lan nhanh, dòng tiền tìm nơi trú ẩn và thanh khoản co lại.",
    analysis: "Tài chính Anh chịu cú sốc trực tiếp; công nghệ Hoa Kỳ và các ngành thâm dụng vốn giảm theo thanh khoản, trong khi nông nghiệp Lào và y tế Cuba ít nhạy hơn.",
    impacts: [
      ["UKF", -0.008, 2.15, "Giảm rất mạnh"], ["UST", -0.0038, 1.45, "Giảm"],
      ["SGL", -0.0032, 1.34, "Giảm"],
      ["JPA", -0.0028, 1.3, "Giảm"], ["DEM", -0.0026, 1.28, "Giảm"],
      ["LAA", -0.0008, 1.03, "Ít ảnh hưởng"], ["CUB", -0.0005, 1.02, "Ít ảnh hưởng"],
    ],
  },
  {
    id: "public-investment",
    icon: "▦",
    tag: "ĐẦU TƯ CÔNG",
    title: "Gói hạ tầng quy mô lớn được công bố",
    description: "Vốn được đưa vào giao thông, năng lượng và dịch vụ thiết yếu để kích thích tổng cầu.",
    analysis: "Năng lượng Việt Nam và chế tạo máy Đức tăng nhờ hạ tầng; nông nghiệp Lào hưởng lợi từ logistics, còn tài chính Anh tăng nhẹ qua nhu cầu vốn.",
    impacts: [
      ["VNE", 0.006, 0.86, "Tăng rất mạnh"], ["DEM", 0.004, 1.12, "Tăng mạnh"],
      ["SGL", 0.0036, 1.08, "Tăng"], ["LAA", 0.0035, 0.9, "Tăng"], ["UKF", 0.0015, 1.05, "Tăng nhẹ"],
    ],
  },
  {
    id: "tax-cut",
    icon: "%",
    tag: "THUẾ",
    title: "Chính sách giảm thuế doanh nghiệp",
    description: "Lợi nhuận kỳ vọng tăng, doanh nghiệp có thêm vốn để mở rộng sản xuất và tuyển dụng.",
    analysis: "Công nghệ Hoa Kỳ, ô tô Nhật Bản, chế tạo máy Đức và tài chính Anh tăng nhanh vì lợi nhuận kỳ vọng cao hơn.",
    impacts: [
      ["UST", 0.0058, 1.34, "Tăng mạnh"], ["JPA", 0.0046, 1.25, "Tăng mạnh"],
      ["DEM", 0.0044, 1.22, "Tăng mạnh"], ["UKF", 0.005, 1.36, "Tăng mạnh"],
    ],
  },
  {
    id: "welfare-package",
    icon: "＋",
    tag: "AN SINH",
    title: "Mở rộng gói an sinh và trợ cấp việc làm",
    description: "Thu nhập của nhóm dễ tổn thương được bảo vệ, sức mua trong nước dần phục hồi.",
    analysis: "Y tế Cuba tăng trực tiếp; thương mại điện tử Trung Quốc và nông nghiệp Lào tăng theo sức mua, trong khi tài chính Anh gần như đi ngang.",
    impacts: [
      ["CUB", 0.0062, 0.82, "Tăng rất mạnh"], ["CNE", 0.0038, 0.92, "Tăng mạnh"],
      ["LAA", 0.0028, 0.86, "Tăng"], ["UKF", 0.0003, 0.96, "Ít ảnh hưởng"],
    ],
  },
  {
    id: "interest-rate-hike",
    icon: "↑",
    tag: "LÃI SUẤT",
    title: "Ngân hàng trung ương tăng lãi suất",
    description: "Chi phí vay vốn tăng để kiềm chế lạm phát, dòng tiền đầu cơ bắt đầu rút khỏi thị trường.",
    analysis: "Tài chính Anh và công nghệ Hoa Kỳ giảm mạnh; ô tô Nhật Bản, chế tạo máy Đức và thương mại điện tử Trung Quốc giảm vì chi phí vay tăng.",
    impacts: [
      ["UKF", -0.0068, 1.8, "Giảm rất mạnh"], ["UST", -0.0055, 1.58, "Giảm mạnh"],
      ["JPA", -0.0038, 1.38, "Giảm"], ["DEM", -0.0036, 1.34, "Giảm"],
      ["CNE", -0.0025, 1.16, "Giảm nhẹ"],
    ],
  },
  {
    id: "foreign-capital",
    icon: "⇄",
    tag: "HỘI NHẬP",
    title: "Dòng vốn quốc tế tăng đột biến",
    description: "Nhà đầu tư nước ngoài tìm kiếm thị trường mới, kéo theo công nghệ và chuỗi cung ứng.",
    analysis: "Năng lượng Việt Nam, chế tạo máy Đức và tài chính Anh hút vốn trực tiếp; nông nghiệp Lào tăng nhẹ nhờ đầu tư chuỗi cung ứng.",
    impacts: [
      ["VNE", 0.0052, 1.22, "Tăng mạnh"], ["DEM", 0.0046, 1.38, "Tăng mạnh"],
      ["UKF", 0.0048, 1.48, "Tăng mạnh, biến động cao"], ["LAA", 0.0024, 1.08, "Tăng nhẹ"],
    ],
  },
  {
    id: "supply-shock",
    icon: "≋",
    tag: "NGUỒN CUNG",
    title: "Chuỗi cung ứng bị đứt gãy",
    description: "Nguyên liệu khan hiếm, chi phí vận chuyển tăng và nhiều nhà máy phải giảm công suất.",
    analysis: "Ô tô Nhật Bản và chế tạo máy Đức giảm mạnh do thiếu linh kiện; thương mại điện tử Trung Quốc giảm theo logistics, còn năng lượng Việt Nam tăng vì giá đầu vào.",
    impacts: [
      ["JPA", -0.006, 1.75, "Giảm rất mạnh"], ["DEM", -0.0058, 1.68, "Giảm mạnh"],
      ["SGL", -0.0062, 1.72, "Giảm rất mạnh"], ["KRS", -0.0048, 1.55, "Giảm mạnh"],
      ["CNE", -0.0038, 1.28, "Giảm"], ["VNE", 0.0042, 1.3, "Tăng mạnh"], ["SAO", 0.005, 1.48, "Tăng mạnh"],
    ],
  },
  {
    id: "export-boom",
    icon: "↗",
    tag: "XUẤT KHẨU",
    title: "Nhu cầu xuất khẩu tăng mạnh",
    description: "Đơn hàng quốc tế tăng, sản xuất mở rộng và dự trữ ngoại tệ được cải thiện.",
    analysis: "Ô tô Nhật Bản, chế tạo máy Đức, thương mại điện tử Trung Quốc và nông nghiệp Lào tăng theo đơn hàng; năng lượng Việt Nam hưởng lợi gián tiếp.",
    impacts: [
      ["JPA", 0.0054, 1.22, "Tăng mạnh"], ["DEM", 0.0052, 1.2, "Tăng mạnh"],
      ["CNE", 0.0048, 1.08, "Tăng mạnh"], ["LAA", 0.0045, 0.94, "Tăng mạnh"],
      ["VNE", 0.002, 0.96, "Tăng nhẹ"],
    ],
  },
  {
    id: "anti-monopoly",
    icon: "⚖",
    tag: "ĐIỀU TIẾT",
    title: "Siết hành vi độc quyền trên thị trường",
    description: "Doanh nghiệp lớn bị kiểm soát giá và buộc mở thêm không gian cạnh tranh cho đối thủ nhỏ.",
    analysis: "Công nghệ Hoa Kỳ và thương mại điện tử Trung Quốc giảm vì biên lợi nhuận bị siết; người tiêu dùng và các ngành sản xuất hưởng lợi nhẹ từ cạnh tranh.",
    impacts: [
      ["UST", -0.0035, 1.35, "Giảm"], ["CNE", -0.003, 1.18, "Giảm"],
      ["JPA", 0.0012, 0.96, "Tăng nhẹ"], ["DEM", 0.001, 0.94, "Tăng nhẹ"],
    ],
  },
  {
    id: "consumer-boom",
    icon: "◆",
    tag: "TIÊU DÙNG",
    title: "Sức mua trong nước bùng nổ",
    description: "Niềm tin người tiêu dùng tăng, bán lẻ và dịch vụ ghi nhận lượng cầu vượt dự báo.",
    analysis: "Thương mại điện tử Trung Quốc, ô tô Nhật Bản và công nghệ Hoa Kỳ tăng theo cầu; nông nghiệp Lào và y tế Cuba tăng ổn định hơn.",
    impacts: [
      ["CNE", 0.006, 1.25, "Tăng rất mạnh"], ["JPA", 0.0045, 1.25, "Tăng mạnh"],
      ["UST", 0.0042, 1.3, "Tăng mạnh"], ["LAA", 0.0028, 0.88, "Tăng"],
      ["BRF", 0.0034, 1.02, "Tăng"], ["CUB", 0.0022, 0.86, "Tăng nhẹ"],
    ],
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
    averageCost: Object.fromEntries(MARKET_DEFINITIONS.map((market) => [market.symbol, 0])),
    realizedProfit: 0,
    feesPaid: 0,
    trades: 0,
  };
}

function createGame(teams, options = {}) {
  const now = Number(options.now ?? Date.now());
  const durationMs = Number(options.durationMs || GAME_DURATION_MS);
  const eventIntervalMs = Number(options.eventIntervalMs || EVENT_INTERVAL_MS);
  const activeTeams = teams.filter((team) => team.players?.length);
  if (activeTeams.length < 1) throw new Error("Cần ít nhất 1 người để mở thị trường");

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
      affected: event.affected,
      resolvedAt: at,
    });
  }
  game.eventHistory = game.eventHistory.slice(0, 8);
  game.activeEvents = [];
}

function applyEvent(game, event, at) {
  const affected = [];
  for (const [symbol, momentum, volatility, label] of event.impacts) {
    const market = getMarket(game, symbol);
    if (!market) continue;
    market.eventMomentum += momentum * market.sensitivity;
    market.eventVolatility += (volatility - 1) * market.sensitivity;
    affected.push({
      symbol: market.symbol,
      sector: market.sector,
      country: market.country,
      flag: market.flag,
      direction: momentum > 0 ? "up" : momentum < 0 ? "down" : "flat",
      label,
    });
    for (const [, targetSymbol, strength] of linkedMarkets(symbol)) {
      const target = getMarket(game, targetSymbol);
      if (target) target.eventMomentum += momentum * strength * 0.58;
    }
  }

  return {
    id: event.id,
    icon: event.icon,
    tag: event.tag,
    title: event.title,
    description: event.description,
    affected,
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
    const oldQuantity = portfolio.holdings[market.symbol];
    const oldCost = portfolio.averageCost[market.symbol] * oldQuantity;
    portfolio.cash = roundPrice(portfolio.cash - total);
    portfolio.holdings[market.symbol] += quantity;
    portfolio.averageCost[market.symbol] = roundPrice((oldCost + total) / (oldQuantity + quantity));
  } else {
    if (portfolio.holdings[market.symbol] < quantity) return { ok: false, message: "Không đủ cổ phiếu để bán" };
    portfolio.cash = roundPrice(portfolio.cash + gross - fee);
    portfolio.holdings[market.symbol] -= quantity;
    portfolio.realizedProfit = roundPrice(
      portfolio.realizedProfit + gross - fee - portfolio.averageCost[market.symbol] * quantity,
    );
    if (!portfolio.holdings[market.symbol]) portfolio.averageCost[market.symbol] = 0;
  }

  const direction = side === "buy" ? 1 : -1;
  const crowdWindowMs = 6_000;
  const recentSameSide = game.tradeTape.filter((transaction) => (
    transaction.symbol === market.symbol
    && transaction.side === side
    && Number(now) - transaction.at <= crowdWindowMs
  )).length;
  const recentOppositeSide = game.tradeTape.filter((transaction) => (
    transaction.symbol === market.symbol
    && transaction.side !== side
    && Number(now) - transaction.at <= crowdWindowMs
  )).length;
  const crowdMultiplier = clamp(1 + recentSameSide * 0.28 - recentOppositeSide * 0.08, 0.75, 3.25);
  const rawImpact = ((quantity / market.liquidity) * 0.095 + Math.log10(quantity + 1) * 0.00075) * crowdMultiplier;
  const modelDamping = market.model === "socialist" ? 0.72 : 1;
  const impact = clamp(rawImpact * modelDamping, 0.0003, 0.055);
  market.price = roundPrice(Math.max(5, market.price * (1 + direction * impact)));
  market.changePct = roundPrice(((market.price - market.openPrice) / market.openPrice) * 100);
  market.orderPressure += direction * (quantity / market.liquidity) * crowdMultiplier * 1.8;
  for (const [, targetSymbol, strength] of linkedMarkets(market.symbol)) {
    const target = getMarket(game, targetSymbol);
    if (target) target.orderPressure += direction * (quantity / market.liquidity) * crowdMultiplier * strength;
  }
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
    impactPct: roundPrice(impact * 100),
    crowdLevel: recentSameSide + 1,
    at: Number(now),
  };
  game.tradeTape.unshift(transaction);
  game.tradeTape = game.tradeTape.slice(0, 18);
  return { ok: true, transaction };
}

function publicMarket(market) {
  return {
    symbol: market.symbol,
    sector: market.sector,
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
    activeEvents: game.activeEvents.map(({ analysis, affected, ...event }) => event),
    eventHistory: game.eventHistory,
    tradeTape: game.tradeTape,
    leaderboard: game.phase === "finished" && game.rankings.length ? game.rankings : leaderboard(game),
    portfolio: viewer
      ? {
          teamId: viewer.teamId,
          cash: viewer.cash,
          holdings: { ...viewer.holdings },
          averageCost: { ...viewer.averageCost },
          realizedProfit: viewer.realizedProfit,
          feesPaid: viewer.feesPaid,
          trades: viewer.trades,
          netWorth: portfolioValue(game, viewer),
          positions: game.markets
            .filter((market) => viewer.holdings[market.symbol] > 0)
            .map((market) => {
              const quantity = viewer.holdings[market.symbol];
              const averageCost = viewer.averageCost[market.symbol];
              const invested = roundPrice(averageCost * quantity);
              const marketValue = roundPrice(market.price * quantity);
              const unrealizedProfit = roundPrice(marketValue - invested);
              return {
                symbol: market.symbol,
                sector: market.sector,
                country: market.country,
                flag: market.flag,
                quantity,
                averageCost,
                currentPrice: market.price,
                invested,
                marketValue,
                unrealizedProfit,
                unrealizedPct: invested ? roundPrice((unrealizedProfit / invested) * 100) : 0,
              };
            }),
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
  MARKET_LINKS,
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
