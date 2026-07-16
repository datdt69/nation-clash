const socket = io({ transports: ["websocket", "polling"] });
const app = document.querySelector("#app");
const roomFromUrl = new URLSearchParams(location.search).get("room")?.trim().toUpperCase() || "";

const load = (key) => {
  try {
    return JSON.parse(sessionStorage.getItem(key));
  } catch {
    return null;
  }
};
const save = (key, value) => sessionStorage.setItem(key, JSON.stringify(value));
const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;",
})[character]);
const safeColor = (value) => (/^#[0-9a-f]{6}$/i.test(String(value || "")) ? value : "#58e08f");
const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const integerFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

let host = load("marketHost");
let player = load("marketPlayer");
let view = host ? "host" : player ? "player" : "landing";
let state = null;
let hostMeta = {};
let selectedSymbol = "VNE";
let orderSide = "buy";
let orderQuantity = 10;
let ticketView = "order";
let tradePending = false;
let clockFrame = 0;
let serverOffset = 0;

function brand() {
  return `<div class="brand">
    <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
    <span class="brand-copy"><b>Sàn Kinh Tế</b><small>Thị trường mô phỏng realtime</small></span>
  </div>`;
}

function formatPrice(value) {
  return numberFormat.format(Number(value || 0));
}

function formatMoney(value) {
  return `${numberFormat.format(Number(value || 0))} đ`;
}

function formatSigned(value, suffix = "") {
  const number = Number(value || 0);
  return `${number >= 0 ? "+" : ""}${numberFormat.format(number)}${suffix}`;
}

function formatDuration(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1_000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function showToast(message, type = "") {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`.trim();
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 2_700);
}

function landing() {
  const demos = [
    ["🇺🇸", "UST", "182,40", "+1,28%"],
    ["🇻🇳", "VNE", "96,80", "+0,74%"],
    ["🇩🇪", "DEM", "158,60", "−0,32%"],
    ["🇨🇳", "CNE", "124,50", "+1,04%"],
    ["🇯🇵", "JPA", "146,80", "+0,61%"],
    ["🇱🇦", "LAA", "72,60", "+0,22%"],
    ["🇬🇧", "UKF", "131,20", "−0,47%"],
    ["🇨🇺", "CUB", "68,40", "+0,18%"],
  ];
  return `<main class="landing-screen screen">
    <section class="landing-hero">
      <div class="landing-topline">${brand()}<span class="live-chip">Giá cập nhật mỗi giây</span></div>
      <div class="landing-copy">
        <p class="eyebrow">8 đội · tối đa 56 người · 8 ngành</p>
        <h1>Đọc biến động.<br><span>Chốt quyết định.</span></h1>
        <p>Giao dịch tám ngành nghề của tám quốc gia, phản ứng với các cú sốc kinh tế và khám phá cách hai mô hình thị trường xử lý cùng một vấn đề.</p>
      </div>
      <div class="ticker-cloud" aria-hidden="true">
        ${demos.map(([flag, symbol, price, change]) => `<article class="ticker-demo"><span>${flag}</span><b>${symbol}</b><small><span>${price}</span><em>${change}</em></small></article>`).join("")}
      </div>
    </section>
    <section class="landing-entry">
      <div class="entry-card panel">
        <p class="eyebrow">Tham gia thị trường</p>
        <h2>${roomFromUrl ? `Phòng ${escapeHtml(roomFromUrl)}` : "Vào bằng mã phòng"}</h2>
        <p>Mỗi người chọn một trong tám đội. Tối đa 7 người cùng dùng chung danh mục và 100.000 vốn của đội.</p>
        <form id="join-form" autocomplete="off">
          <div class="field"><label for="room-code">Mã phòng</label><input id="room-code" name="code" maxlength="5" value="${escapeHtml(roomFromUrl)}" placeholder="VD: K7M2P" autocapitalize="characters" required></div>
          <div class="field"><label for="player-name">Tên người chơi</label><input id="player-name" name="nickname" maxlength="22" placeholder="VD: Minh Anh" required></div>
          <div class="field"><label for="team-choice">Chọn đội</label><select id="team-choice" name="teamId" required>${Array.from({ length: 8 }, (_, index) => `<option value="team-${index + 1}">Đội ${index + 1}</option>`).join("")}</select></div>
          <button class="primary-button" type="submit">Vào sàn giao dịch →</button>
        </form>
        <div class="entry-divider">HOẶC</div>
        <button class="secondary-button host-create" data-act="create">Tạo phòng cho người điều khiển</button>
        <div class="simulation-note">Các mã, mức giá và phản ứng chính sách đều là dữ liệu mô phỏng phục vụ trò chơi, không phải thông tin đầu tư.</div>
      </div>
    </section>
  </main>`;
}

function loading() {
  return `<main class="player-lobby-main screen"><section class="player-wait-card panel"><div class="wait-visual"><span>↗</span></div><div class="wait-copy"><p class="eyebrow">Đang kết nối</p><h1>Đang lấy dữ liệu phòng...</h1><p>Máy chủ đang đồng bộ lại trạng thái thị trường của bạn.</p></div></section></main>`;
}

function teamSlot(team, index) {
  const joined = Boolean(team.players.length);
  const connected = team.players.filter((member) => member.connected).length;
  const memberNames = team.players.slice(0, 3).map((member) => escapeHtml(member.nickname)).join(", ");
  return `<article class="team-slot ${joined ? "joined" : ""}" style="--team-color:${safeColor(team.color)}">
    <span class="team-number">${String(index + 1).padStart(2, "0")}</span>
    <div><b>${escapeHtml(team.name)} <em>${team.players.length}/7</em></b><small>${joined ? `${connected} online · ${memberNames}${team.players.length > 3 ? ` +${team.players.length - 3}` : ""}` : "Đang chờ người chơi chọn đội"}</small></div>
    <i class="team-online" aria-hidden="true"></i>
  </article>`;
}

function lobbyHeader(isHost) {
  return `<header class="app-header">
    ${brand()}
    <div class="header-actions">
      <span class="room-chip"><span>Mã phòng</span><b>${escapeHtml(state.code)}</b></span>
      ${isHost ? `<button class="secondary-button" data-act="copy">Sao chép đường dẫn</button>` : ""}
      <button class="icon-button" data-act="fullscreen" aria-label="Toàn màn hình">⛶</button>
    </div>
  </header>`;
}

function hostLobby() {
  return `<main class="lobby-screen screen">
    ${lobbyHeader(true)}
    <section class="lobby-main">
      <div class="join-display panel">
        <div class="qr-shell">${hostMeta.qrDataUrl ? `<img src="${hostMeta.qrDataUrl}" alt="Mã QR vào phòng ${escapeHtml(state.code)}">` : ""}</div>
        <div class="join-copy compact"><p class="eyebrow">Quét để tham gia</p><strong class="room-code-large">${escapeHtml(state.code)}</strong></div>
      </div>
      <div class="teams-panel panel">
        <div class="panel-heading"><div><p class="eyebrow">Danh sách tham gia</p><h2>8 đội trên sàn</h2></div><span class="player-count"><strong>${state.playersCount}</strong> / 56 người</span></div>
        <div class="team-grid">${state.teams.map(teamSlot).join("")}</div>
      </div>
    </section>
    <footer class="lobby-footer">
      <div class="lobby-rules"><span><b>01</b> Giá chạy mỗi giây</span><span><b>02</b> 1–3 sự kiện mỗi phút</span><span><b>03</b> Giàu nhất sau 10 phút thắng</span></div>
      <button class="primary-button start-market" data-act="start" ${state.playersCount < 1 ? "disabled" : ""}>Mở thị trường · ${state.playersCount}/56 người</button>
    </footer>
  </main>`;
}

function playerLobby() {
  const team = state.teams.find((entry) => entry.id === player?.teamId) || state.teams[0];
  return `<main class="lobby-screen screen">
    ${lobbyHeader(false)}
    <section class="player-lobby-main">
      <div class="player-wait-card panel">
        <div class="wait-visual"><span>↗</span></div>
        <div class="wait-copy"><p class="eyebrow">Đã vào phòng ${escapeHtml(state.code)}</p><h1>Chờ thị trường mở cửa</h1><p>Giữ màn hình này. Khi người điều khiển bắt đầu, tài khoản và biểu đồ sẽ tự động xuất hiện.</p><div class="wait-team" style="--team-color:${safeColor(team.color)}"><i></i><div><small>TÀI KHOẢN CỦA BẠN</small><b>${escapeHtml(team.name)}</b></div></div></div>
      </div>
    </section>
    <footer class="lobby-footer"><div class="lobby-rules"><span><b>01</b> Theo dõi sự kiện</span><span><b>02</b> Chọn ngành</span><span><b>03</b> Quản lý danh mục</span></div><span class="status-chip">${state.playersCount}/56 người đã vào</span></footer>
  </main>`;
}

function marketBySymbol(symbol = selectedSymbol) {
  return state?.game?.markets.find((market) => market.symbol === symbol) || state?.game?.markets[0];
}

function tradingHeader() {
  const game = state.game;
  const myTeam = state.teams.find((team) => team.id === player?.teamId);
  return `<header class="trade-header">
    ${brand()}
    <div class="header-center">
      <span class="room-chip"><span>Phòng</span><b>${escapeHtml(state.code)}</b></span>
      <div class="game-clock-wrap"><small>Đóng cửa sau</small><b class="game-clock" data-countdown-end="${game.endsAt}">--:--</b></div>
    </div>
    <div class="header-actions">
      ${view === "player" ? `<div class="account-chip"><small>Tài khoản đội</small><b>${escapeHtml(myTeam?.name || player?.nickname || "")}</b></div>` : `<span class="header-status"><i class="connection-dot"></i><small>Màn điều khiển</small></span>`}
      <button class="icon-button" data-act="fullscreen" aria-label="Toàn màn hình">⛶</button>
      ${view === "host" ? `<button class="danger-button" data-act="end">Kết thúc trận</button>` : ""}
    </div>
  </header>`;
}

function eventStrip() {
  const game = state.game;
  const events = game.activeEvents;
  const content = events.length
    ? events.map((event) => `<article class="event-card"><span class="event-icon">${escapeHtml(event.icon)}</span><div><small>${escapeHtml(event.tag)}</small><b>${escapeHtml(event.title)}</b><p>${escapeHtml(event.description)}</p><div class="event-impacts">${event.affected.map((impact) => `<span class="${impact.direction}">${impact.flag} ${escapeHtml(impact.sector)} · ${escapeHtml(impact.country)}: <b>${escapeHtml(impact.label)}</b></span>`).join("")}</div></div></article>`).join("")
    : `<article class="event-empty"><span class="event-icon">⌛</span><div><b>Thị trường đang tự điều chỉnh</b><small>Chưa có cú sốc mới. Giá vẫn biến động theo cung và cầu.</small></div></article>`;
  return `<section class="event-strip">
    <div class="event-label"><p class="eyebrow">Bản tin thị trường</p><b>${events.length ? `Đợt sự kiện ${game.eventRound}` : "Chờ sự kiện đầu"}</b><small>Sự kiện tiếp theo: <span class="next-event" data-countdown-end="${game.nextEventAt}">--:--</span></small></div>
    <div class="event-cards">${content}</div>
  </section>`;
}

function chartSvg(market) {
  const history = market.history?.length ? market.history : [{ at: Date.now(), price: market.price }];
  const width = 1_000;
  const height = 410;
  const left = 22;
  const right = 88;
  const top = 22;
  const bottom = 35;
  const prices = history.map((point) => Number(point.price));
  let minimum = Math.min(...prices);
  let maximum = Math.max(...prices);
  const padding = Math.max((maximum - minimum) * 0.18, market.price * 0.006, 0.7);
  minimum -= padding;
  maximum += padding;
  const range = maximum - minimum || 1;
  const x = (index) => left + (index / Math.max(1, history.length - 1)) * (width - left - right);
  const y = (price) => top + ((maximum - price) / range) * (height - top - bottom);
  const points = history.map((point, index) => [x(index), y(point.price)]);
  const path = points.map(([pointX, pointY], index) => `${index ? "L" : "M"}${pointX.toFixed(2)},${pointY.toFixed(2)}`).join(" ");
  const lastPoint = points.at(-1);
  const areaPath = `${path} L${lastPoint[0].toFixed(2)},${height - bottom} L${left},${height - bottom} Z`;
  const rising = market.changePct >= 0;
  const color = rising ? "#58e08f" : "#ff6b76";
  const gradientId = `area-${market.symbol}`;
  const lines = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    const lineY = top + ratio * (height - top - bottom);
    const label = maximum - ratio * range;
    return `<line class="chart-grid-line" x1="${left}" y1="${lineY}" x2="${width - right}" y2="${lineY}"></line><text class="chart-label" x="${width - right + 12}" y="${lineY + 5}">${escapeHtml(formatPrice(label))}</text>`;
  }).join("");
  const firstTime = new Date(history[0].at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const lastTime = new Date(history.at(-1).at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `<svg class="market-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Biểu đồ giá ngành ${escapeHtml(market.sector)} của ${escapeHtml(market.country)}">
    <defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.28"></stop><stop offset="100%" stop-color="${color}" stop-opacity="0"></stop></linearGradient></defs>
    ${lines}
    <path d="${areaPath}" fill="url(#${gradientId})"></path>
    <path class="chart-line" d="${path}" stroke="${color}"></path>
    <circle class="chart-last-dot" cx="${lastPoint[0]}" cy="${lastPoint[1]}" r="5" fill="#0d1318" stroke="${color}"></circle>
    <text class="chart-label" x="${left}" y="${height - 9}">${escapeHtml(firstTime)}</text>
    <text class="chart-label" x="${width - right}" y="${height - 9}" text-anchor="end">${escapeHtml(lastTime)}</text>
  </svg>`;
}

function tradeTape() {
  const transaction = state.game.tradeTape[0];
  return `<div class="trade-tape"><div class="trade-tape-header">Lệnh gần nhất trên toàn sàn</div>${transaction ? `<div class="tape-row"><span class="tape-side ${transaction.side === "sell" ? "sell" : ""}">${transaction.side === "buy" ? "MUA" : "BÁN"}</span><b>${escapeHtml(transaction.symbol)}</b><span>${escapeHtml(transaction.teamName)} · ${integerFormat.format(transaction.quantity)} cổ phiếu</span><strong>${formatPrice(transaction.price)}</strong></div>` : `<div class="tape-row"><span class="muted">Chưa có giao dịch nào được khớp.</span></div>`}</div>`;
}

function insightCard() {
  const insight = state.game.eventHistory[0];
  return `<div class="insight-card"><small>${insight ? "Phân tích sau biến động" : "Cơ chế đang được ẩn"}</small><p>${insight ? escapeHtml(insight.analysis) : "Tác động cụ thể của sự kiện không được công bố trong lúc diễn ra. Hãy quan sát đường giá để suy luận."}</p></div>`;
}

function chartPanel() {
  const market = marketBySymbol();
  const down = market.changePct < 0;
  return `<section class="chart-panel panel">
    <div class="chart-heading">
      <div class="market-identity"><span class="market-flag">${market.flag}</span><div class="market-name"><b>${escapeHtml(market.sector)} <span>${escapeHtml(market.country)}</span></b><small>${escapeHtml(market.symbol)} · ${escapeHtml(market.modelName)} · biểu đồ 2 phút</small></div></div>
      <div class="headline-price"><strong class="price">${formatPrice(market.price)}</strong><span class="change ${down ? "down" : ""}">${formatSigned(market.changePct, "%")}</span></div>
    </div>
    <div class="chart-wrap">${chartSvg(market)}</div>
    <div class="chart-footer">${tradeTape()}${insightCard()}</div>
  </section>`;
}

function quoteCard(market) {
  const down = market.changePct < 0;
  return `<button class="quote-card ${market.symbol === selectedSymbol ? "selected" : ""}" data-symbol="${escapeHtml(market.symbol)}">
    <span class="quote-flag">${market.flag}</span>
    <span class="quote-name"><b>${escapeHtml(market.sector)} · ${escapeHtml(market.country)}</b><small>${escapeHtml(market.symbol)} · ${market.model === "capitalist" ? "Tư bản chủ nghĩa" : "Định hướng XHCN"}</small></span>
    <span class="quote-values"><b class="quote-price">${formatPrice(market.price)}</b><small class="${down ? "down" : ""}">${formatSigned(market.changePct, "%")}</small></span>
  </button>`;
}

function quotesPanel() {
  return `<section class="quotes-panel panel"><div class="side-heading"><b>8 ngành giao dịch</b><small>Ghi rõ quốc gia</small></div><div class="quotes-list">${state.game.markets.map(quoteCard).join("")}</div></section>`;
}

function leaderboardPanel() {
  return `<section class="leaderboard-panel panel"><div class="side-heading"><b>Xếp hạng tài sản</b><small>Cập nhật trực tiếp</small></div><div class="leaderboard-list">${state.game.leaderboard.map((entry) => {
    const down = entry.profit < 0;
    return `<article class="rank-row ${entry.teamId === player?.teamId ? "me" : ""}" style="--team-color:${safeColor(entry.color)}"><span class="rank-number">#${entry.rank}</span><i class="rank-color"></i><div class="rank-team"><b>${escapeHtml(entry.teamName)}</b><small>${entry.trades} giao dịch</small></div><div class="rank-value"><b>${formatMoney(entry.netWorth)}</b><small class="${down ? "down" : ""}">${formatSigned(entry.profitPct, "%")}</small></div></article>`;
  }).join("")}</div></section>`;
}

function maxOrderQuantity() {
  const market = marketBySymbol();
  const portfolio = state.game.portfolio;
  if (!portfolio || !market) return 0;
  if (orderSide === "sell") return portfolio.holdings[market.symbol] || 0;
  return Math.max(0, Math.floor(portfolio.cash / (market.price * (1 + state.game.feeRate))));
}

function orderEstimate() {
  const quantity = Math.max(0, Number(orderQuantity) || 0);
  const market = marketBySymbol();
  const gross = quantity * market.price;
  const fee = gross * state.game.feeRate;
  return orderSide === "buy" ? gross + fee : Math.max(0, gross - fee);
}

function positionsPanel(portfolio) {
  if (!portfolio.positions.length) {
    return `<div class="empty-portfolio"><span>◇</span><b>Danh mục đang trống</b><small>Mua một ngành để theo dõi giá vốn và lãi/lỗ tại đây.</small></div>`;
  }
  return `<div class="positions-list">${portfolio.positions.map((position) => `<article class="position-card" data-position-symbol="${escapeHtml(position.symbol)}">
    <div class="position-main"><span>${position.flag}</span><div><b>${escapeHtml(position.sector)} · ${escapeHtml(position.country)}</b><small>${escapeHtml(position.symbol)} · ${integerFormat.format(position.quantity)} cổ phiếu</small></div><strong class="position-market-value">${formatMoney(position.marketValue)}</strong></div>
    <div class="position-details"><span>Tiền đã mua <b>${formatMoney(position.invested)}</b></span><span>Giá vốn <b>${formatPrice(position.averageCost)}</b></span><span>Giá hiện tại <b class="position-current">${formatPrice(position.currentPrice)}</b></span><span class="position-profit ${position.unrealizedProfit < 0 ? "down" : "up"}">Lãi/lỗ <b>${formatSigned(position.unrealizedProfit, " đ")} · ${formatSigned(position.unrealizedPct, "%")}</b></span></div>
    <div class="position-actions"><button data-position-symbol="${escapeHtml(position.symbol)}">Mở lệnh bán</button><button class="quick-sell" data-quick-sell="${escapeHtml(position.symbol)}" data-quantity="${position.quantity}" ${tradePending ? "disabled" : ""}>Bán hết</button></div>
  </article>`).join("")}</div><div class="realized-profit">Lãi/lỗ đã chốt <b class="${portfolio.realizedProfit < 0 ? "down" : "up"}">${formatSigned(portfolio.realizedProfit, " đ")}</b></div>`;
}

function orderTicket() {
  const game = state.game;
  const portfolio = game.portfolio;
  const market = marketBySymbol();
  const boardEntry = game.leaderboard.find((entry) => entry.teamId === portfolio.teamId);
  const profit = boardEntry?.profit || 0;
  const quantity = Number(orderQuantity) || 0;
  const maximum = maxOrderQuantity();
  const invalid = quantity < 1 || quantity > maximum || tradePending;
  return `<section class="order-ticket panel">
    <div class="portfolio-strip">
      <div class="portfolio-stat"><small>Tổng tài sản</small><b>${formatMoney(portfolio.netWorth)}</b></div>
      <div class="portfolio-stat"><small>Tiền khả dụng</small><b>${formatMoney(portfolio.cash)}</b></div>
      <div class="portfolio-stat"><small>Lãi / lỗ</small><b class="${profit < 0 ? "down" : "up"}">${formatSigned(profit, " đ")}</b></div>
    </div>
    <div class="ticket-tabs"><button class="${ticketView === "order" ? "active" : ""}" data-ticket-view="order">Đặt lệnh</button><button class="${ticketView === "portfolio" ? "active" : ""}" data-ticket-view="portfolio">Danh mục <span>${portfolio.positions.length}</span></button></div>
    ${ticketView === "portfolio" ? positionsPanel(portfolio) : `<div class="order-form">
      <div class="order-tabs"><button class="order-tab buy ${orderSide === "buy" ? "active" : ""}" data-side="buy">MUA</button><button class="order-tab sell ${orderSide === "sell" ? "active" : ""}" data-side="sell">BÁN</button></div>
      <div class="order-symbol-row"><b>${market.flag} ${escapeHtml(market.sector)} · ${escapeHtml(market.country)}</b><small>${escapeHtml(market.symbol)} · Đang có ${integerFormat.format(portfolio.holdings[market.symbol] || 0)}</small></div>
      <div class="quantity-row"><label for="order-quantity">Số lượng</label><div class="quantity-control"><button data-act="quantity" data-step="-1" aria-label="Giảm">−</button><input id="order-quantity" type="number" inputmode="numeric" min="1" max="9999" value="${escapeHtml(orderQuantity)}"><button data-act="quantity" data-step="1" aria-label="Tăng">+</button></div></div>
      <div class="quick-orders"><button data-quick="0.25">25%</button><button data-quick="0.5">50%</button><button data-quick="1">Tối đa</button></div>
      <div class="order-summary"><span>Ước tính · phí 0,15%</span><b data-order-estimate>${formatMoney(orderEstimate())}</b></div>
      <button class="submit-order ${orderSide === "sell" ? "sell" : ""}" data-act="trade" ${invalid ? "disabled" : ""}>${tradePending ? "ĐANG KHỚP LỆNH..." : `${orderSide === "buy" ? "MUA" : "BÁN"} ${quantity > 0 ? integerFormat.format(quantity) : 0} ${escapeHtml(market.symbol)}`}</button>
    </div>`}
  </section>`;
}

function trading() {
  if (!marketBySymbol(selectedSymbol)) selectedSymbol = state.game.markets[0].symbol;
  const side = view === "host"
    ? `<aside class="side-panel host-side">${quotesPanel()}${leaderboardPanel()}</aside>`
    : `<aside class="side-panel">${quotesPanel()}${orderTicket()}</aside>`;
  return `<main class="trading-screen screen">${tradingHeader()}${eventStrip()}<section class="market-workspace">${chartPanel()}${side}</section></main>`;
}

function finishScreen() {
  const board = state.game.leaderboard;
  const winner = board[0];
  const myResult = board.find((entry) => entry.teamId === player?.teamId);
  return `<main class="finish-screen screen">
    <header class="app-header">${brand()}<div class="header-actions"><span class="room-chip"><span>Phòng</span><b>${escapeHtml(state.code)}</b></span><button class="primary-button" data-act="home">Về trang chủ</button></div></header>
    <section class="finish-main">
      <article class="winner-panel panel" style="--winner-color:${safeColor(winner.color)}"><div><div class="trophy">◆</div><p class="eyebrow">Dẫn đầu thị trường</p><h1>${escapeHtml(winner.teamName)}</h1><strong class="winner-worth">${formatMoney(winner.netWorth)}</strong><p>Kết thúc với ${formatSigned(winner.profitPct, "%")} so với vốn ban đầu sau ${winner.trades} giao dịch.</p></div><div class="winner-note">Xếp hạng dựa trên tiền mặt cộng giá trị toàn bộ cổ phiếu tại thời điểm thị trường đóng cửa.${myResult ? ` Đội bạn đứng hạng ${myResult.rank}.` : ""}</div></article>
      <section class="final-ranking panel"><div class="panel-heading"><div><p class="eyebrow">Kết quả cuối cùng</p><h2>Bảng tài sản các đội</h2></div><span class="player-count"><strong>${board.length}</strong> đội</span></div><div class="final-list" style="--rows:${board.length}">${board.map((entry) => `<article class="final-row ${entry.teamId === player?.teamId ? "me" : ""}" style="--team-color:${safeColor(entry.color)}"><span class="final-rank">#${entry.rank}</span><i class="rank-color"></i><div class="final-team"><b>${escapeHtml(entry.teamName)}</b><small>${entry.trades} giao dịch · phí đã tính trong tài sản</small></div><span class="final-profit ${entry.profit < 0 ? "down" : ""}">${formatSigned(entry.profitPct, "%")}</span><strong class="final-worth">${formatMoney(entry.netWorth)}</strong></article>`).join("")}</div></section>
    </section>
  </main>`;
}

function patchQuotes() {
  for (const market of state.game.markets) {
    const quote = document.querySelector(`.quote-card[data-symbol="${market.symbol}"]`);
    if (!quote) continue;
    quote.classList.toggle("selected", market.symbol === selectedSymbol);
    const price = quote.querySelector(".quote-price");
    const change = quote.querySelector(".quote-values small");
    if (price) price.textContent = formatPrice(market.price);
    if (change) {
      change.textContent = formatSigned(market.changePct, "%");
      change.classList.toggle("down", market.changePct < 0);
    }
  }
}

function patchOrderTicket() {
  const portfolio = state.game.portfolio;
  if (!portfolio) return;
  const market = marketBySymbol();
  const boardEntry = state.game.leaderboard.find((entry) => entry.teamId === portfolio.teamId);
  const profit = boardEntry?.profit || 0;
  const stats = document.querySelectorAll(".portfolio-stat b");
  if (stats.length === 3) {
    stats[0].textContent = formatMoney(portfolio.netWorth);
    stats[1].textContent = formatMoney(portfolio.cash);
    stats[2].textContent = formatSigned(profit, " đ");
    stats[2].classList.toggle("down", profit < 0);
    stats[2].classList.toggle("up", profit >= 0);
  }
  const symbol = document.querySelector(".order-symbol-row b");
  const holding = document.querySelector(".order-symbol-row small");
  if (symbol) symbol.textContent = `${market.flag} ${market.sector} · ${market.country}`;
  if (holding) holding.textContent = `${market.symbol} · Đang có ${integerFormat.format(portfolio.holdings[market.symbol] || 0)}`;
  const estimate = document.querySelector("[data-order-estimate]");
  if (estimate) estimate.textContent = formatMoney(orderEstimate());
  const submit = document.querySelector('[data-act="trade"]');
  const quantity = Number(orderQuantity) || 0;
  if (submit) {
    submit.disabled = quantity < 1 || quantity > maxOrderQuantity() || tradePending;
    submit.textContent = tradePending
      ? "ĐANG KHỚP LỆNH..."
      : `${orderSide === "buy" ? "MUA" : "BÁN"} ${quantity > 0 ? integerFormat.format(quantity) : 0} ${selectedSymbol}`;
  }
  for (const position of portfolio.positions) {
    const card = document.querySelector(`.position-card[data-position-symbol="${position.symbol}"]`);
    if (!card) continue;
    const marketValue = card.querySelector(".position-market-value");
    const current = card.querySelector(".position-current");
    const profitNode = card.querySelector(".position-profit");
    if (marketValue) marketValue.textContent = formatMoney(position.marketValue);
    if (current) current.textContent = formatPrice(position.currentPrice);
    if (profitNode) {
      profitNode.classList.toggle("down", position.unrealizedProfit < 0);
      profitNode.classList.toggle("up", position.unrealizedProfit >= 0);
      const value = profitNode.querySelector("b");
      if (value) value.textContent = `${formatSigned(position.unrealizedProfit, " đ")} · ${formatSigned(position.unrealizedPct, "%")}`;
    }
  }
}

function patchTrading(previousGame) {
  const workspace = document.querySelector(".market-workspace");
  const workspaceScroll = workspace?.scrollTop || 0;
  const chart = document.querySelector(".chart-panel");
  if (!chart) return render();
  chart.outerHTML = chartPanel();
  patchQuotes();
  if (view === "host") {
    const ranking = document.querySelector(".leaderboard-panel");
    if (ranking) ranking.outerHTML = leaderboardPanel();
  } else {
    const previousPositions = previousGame?.portfolio?.positions?.map((position) => position.symbol).join(",") || "";
    const nextPositions = state.game.portfolio?.positions?.map((position) => position.symbol).join(",") || "";
    if (previousPositions !== nextPositions) {
      const ticket = document.querySelector(".order-ticket");
      if (ticket) ticket.outerHTML = orderTicket();
    } else {
      patchOrderTicket();
    }
  }
  if (
    previousGame?.eventRound !== state.game.eventRound
    || previousGame?.activeEvents?.length !== state.game.activeEvents.length
  ) {
    const events = document.querySelector(".event-strip");
    if (events) events.outerHTML = eventStrip();
  }
  if (workspace) workspace.scrollTop = workspaceScroll;
}

function render() {
  cancelAnimationFrame(clockFrame);
  const previousWorkspace = document.querySelector(".market-workspace");
  const previousQuotes = document.querySelector(".quotes-list");
  const scrollState = {
    workspaceTop: previousWorkspace?.scrollTop || 0,
    quotesTop: previousQuotes?.scrollTop || 0,
    quotesLeft: previousQuotes?.scrollLeft || 0,
  };
  const active = document.activeElement;
  const restoreInput = active?.id === "order-quantity" ? {
    start: active.selectionStart,
    end: active.selectionEnd,
  } : null;

  if (view === "landing") app.innerHTML = landing();
  else if (!state) app.innerHTML = loading();
  else if (state.status === "lobby") app.innerHTML = view === "host" ? hostLobby() : playerLobby();
  else if (state.status === "finished") app.innerHTML = finishScreen();
  else app.innerHTML = trading();

  const nextWorkspace = document.querySelector(".market-workspace");
  const nextQuotes = document.querySelector(".quotes-list");
  if (nextWorkspace) nextWorkspace.scrollTop = scrollState.workspaceTop;
  if (nextQuotes) {
    nextQuotes.scrollTop = scrollState.quotesTop;
    nextQuotes.scrollLeft = scrollState.quotesLeft;
  }

  if (restoreInput) {
    const input = document.querySelector("#order-quantity");
    if (input) {
      input.focus({ preventScroll: true });
      input.setSelectionRange?.(restoreInput.start, restoreInput.end);
    }
  }
  startClock();
}

function startClock() {
  let previousSecond = -1;
  const frame = () => {
    const now = Date.now() + serverOffset;
    const second = Math.floor(now / 1_000);
    if (second !== previousSecond) {
      previousSecond = second;
      document.querySelectorAll("[data-countdown-end]").forEach((element) => {
        element.textContent = formatDuration(Number(element.dataset.countdownEnd) - now);
      });
    }
    clockFrame = requestAnimationFrame(frame);
  };
  frame();
}

async function copyJoinLink() {
  const link = hostMeta.joinUrl || `${location.origin}/?room=${state.code}`;
  try {
    await navigator.clipboard.writeText(link);
    showToast("Đã sao chép đường dẫn vào phòng");
  } catch {
    showToast(link);
  }
}

function sendTrade({ symbol = selectedSymbol, side = orderSide, quantity = Number(orderQuantity) } = {}) {
  if (tradePending) return;
  tradePending = true;
  render();
  socket.emit("player:trade", {
    code: player.code,
    playerToken: player.playerToken,
    symbol,
    side,
    quantity: Number(quantity),
  }, (result) => {
    tradePending = false;
    if (!result.ok) {
      showToast(result.message, "error");
      render();
      return;
    }
    const transaction = result.transaction;
    showToast(`Đã ${transaction.side === "buy" ? "mua" : "bán"} ${integerFormat.format(transaction.quantity)} ${transaction.symbol}`);
    render();
  });
}

app.addEventListener("submit", (event) => {
  if (event.target.id !== "join-form") return;
  event.preventDefault();
  const form = new FormData(event.target);
  const code = String(form.get("code") || "").trim().toUpperCase();
  const nickname = String(form.get("nickname") || "").trim();
  const teamId = String(form.get("teamId") || "");
  socket.emit("player:join", { code, nickname, teamId }, (result) => {
    if (!result.ok) return showToast(result.message, "error");
    player = { code, nickname, ...result };
    host = null;
    save("marketPlayer", player);
    sessionStorage.removeItem("marketHost");
    view = "player";
    history.replaceState(null, "", `/?room=${encodeURIComponent(code)}`);
    render();
  });
});

app.addEventListener("input", (event) => {
  if (event.target.id !== "order-quantity") return;
  orderQuantity = event.target.value;
  const estimate = document.querySelector("[data-order-estimate]");
  if (estimate) estimate.textContent = formatMoney(orderEstimate());
  const submit = document.querySelector('[data-act="trade"]');
  const quantity = Number(orderQuantity) || 0;
  if (submit) {
    submit.disabled = quantity < 1 || quantity > maxOrderQuantity() || tradePending;
    submit.textContent = `${orderSide === "buy" ? "MUA" : "BÁN"} ${quantity > 0 ? integerFormat.format(quantity) : 0} ${selectedSymbol}`;
  }
});

app.addEventListener("click", async (event) => {
  const quickSell = event.target.closest("[data-quick-sell]");
  if (quickSell) {
    sendTrade({ symbol: quickSell.dataset.quickSell, side: "sell", quantity: Number(quickSell.dataset.quantity) });
    return;
  }

  const ticketTab = event.target.closest("[data-ticket-view]");
  if (ticketTab) {
    ticketView = ticketTab.dataset.ticketView;
    render();
    return;
  }

  const position = event.target.closest("[data-position-symbol]");
  if (position) {
    selectedSymbol = position.dataset.positionSymbol;
    orderSide = "sell";
    orderQuantity = Math.max(1, state.game.portfolio.holdings[selectedSymbol] || 1);
    ticketView = "order";
    render();
    return;
  }

  const quote = event.target.closest("[data-symbol]");
  if (quote) {
    selectedSymbol = quote.dataset.symbol;
    const maximum = maxOrderQuantity();
    if (Number(orderQuantity) > maximum && maximum > 0) orderQuantity = maximum;
    render();
    return;
  }

  const sideButton = event.target.closest("[data-side]");
  if (sideButton) {
    orderSide = sideButton.dataset.side;
    orderQuantity = Math.min(Math.max(1, Number(orderQuantity) || 1), Math.max(1, maxOrderQuantity()));
    render();
    return;
  }

  const quickButton = event.target.closest("[data-quick]");
  if (quickButton) {
    const maximum = maxOrderQuantity();
    orderQuantity = maximum ? Math.max(1, Math.floor(maximum * Number(quickButton.dataset.quick))) : 0;
    render();
    return;
  }

  const button = event.target.closest("[data-act]");
  if (!button) return;
  const action = button.dataset.act;

  if (action === "fullscreen") {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
    return;
  }
  if (action === "home") {
    sessionStorage.removeItem("marketHost");
    sessionStorage.removeItem("marketPlayer");
    location.href = "/";
    return;
  }
  if (action === "copy") return copyJoinLink();
  if (action === "create") {
    socket.emit("host:create", (result) => {
      if (!result.ok) return showToast(result.message, "error");
      host = { code: result.code, hostToken: result.hostToken };
      hostMeta = result;
      player = null;
      save("marketHost", host);
      sessionStorage.removeItem("marketPlayer");
      view = "host";
      render();
    });
    return;
  }
  if (action === "start") {
    socket.emit("host:start", host, (result) => {
      if (!result.ok) showToast(result.message, "error");
    });
    return;
  }
  if (action === "end") {
    if (!confirm("Đóng thị trường và chốt bảng xếp hạng ngay?")) return;
    socket.emit("host:end", host, (result) => {
      if (!result.ok) showToast(result.message || "Không thể kết thúc trận", "error");
    });
    return;
  }
  if (action === "quantity") {
    const step = Number(button.dataset.step) || 0;
    orderQuantity = Math.min(9_999, Math.max(1, (Number(orderQuantity) || 1) + step));
    render();
    return;
  }
  if (action === "trade") {
    sendTrade();
  }
});

socket.on("state", (nextState) => {
  const previousState = state;
  const canPatch = previousState?.status === "playing"
    && nextState.status === "playing"
    && Boolean(document.querySelector(".trading-screen"));
  state = nextState;
  serverOffset = Number(nextState.serverNow || Date.now()) - Date.now();
  if (state.game && !state.game.markets.some((market) => market.symbol === selectedSymbol)) {
    selectedSymbol = state.game.markets[0]?.symbol || "VNE";
  }
  if (canPatch) patchTrading(previousState.game);
  else render();
});

socket.on("connect", () => {
  if (host) {
    socket.emit("host:resume", host, (result) => {
      if (result.ok) {
        hostMeta = { ...hostMeta, ...result };
        view = "host";
      } else {
        host = null;
        state = null;
        view = "landing";
        sessionStorage.removeItem("marketHost");
        showToast(result.message, "error");
      }
      render();
    });
  } else if (player) {
    socket.emit("player:join", player, (result) => {
      if (result.ok) {
        player = { ...player, ...result };
        save("marketPlayer", player);
        view = "player";
      } else {
        player = null;
        state = null;
        view = "landing";
        sessionStorage.removeItem("marketPlayer");
        showToast(result.message, "error");
      }
      render();
    });
  }
});

socket.on("disconnect", () => render());

render();
