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
let selectedSymbol = "VNX";
let orderSide = "buy";
let orderQuantity = 10;
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
    ["🇺🇸", "USX", "182,40", "+1,28%"],
    ["🇻🇳", "VNX", "96,80", "+0,74%"],
    ["🇩🇪", "DEX", "158,60", "−0,32%"],
    ["🇨🇳", "CNX", "124,50", "+1,04%"],
    ["🇯🇵", "JPX", "146,80", "+0,61%"],
    ["🇱🇦", "LAX", "72,60", "+0,22%"],
    ["🇬🇧", "UKX", "131,20", "−0,47%"],
    ["🇨🇺", "CBX", "68,40", "+0,18%"],
  ];
  return `<main class="landing-screen screen">
    <section class="landing-hero">
      <div class="landing-topline">${brand()}<span class="live-chip">Giá cập nhật mỗi giây</span></div>
      <div class="landing-copy">
        <p class="eyebrow">8 đội · 8 thị trường · 1 cuộc đua</p>
        <h1>Đọc biến động.<br><span>Chốt quyết định.</span></h1>
        <p>Giao dịch cổ phiếu quốc gia mô phỏng, phản ứng với các cú sốc kinh tế và khám phá cách hai mô hình thị trường xử lý cùng một vấn đề.</p>
      </div>
      <div class="ticker-cloud" aria-hidden="true">
        ${demos.map(([flag, symbol, price, change]) => `<article class="ticker-demo"><span>${flag}</span><b>${symbol}</b><small><span>${price}</span><em>${change}</em></small></article>`).join("")}
      </div>
    </section>
    <section class="landing-entry">
      <div class="entry-card panel">
        <p class="eyebrow">Tham gia thị trường</p>
        <h2>${roomFromUrl ? `Phòng ${escapeHtml(roomFromUrl)}` : "Vào bằng mã phòng"}</h2>
        <p>Mỗi thiết bị đại diện cho một đội và được cấp 100.000 vốn mô phỏng.</p>
        <form id="join-form" autocomplete="off">
          <div class="field"><label for="room-code">Mã phòng</label><input id="room-code" name="code" maxlength="5" value="${escapeHtml(roomFromUrl)}" placeholder="VD: K7M2P" autocapitalize="characters" required></div>
          <div class="field"><label for="team-name">Tên đội</label><input id="team-name" name="nickname" maxlength="22" placeholder="VD: Sói Phố Wall" required></div>
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
  const connected = team.players.some((member) => member.connected);
  return `<article class="team-slot ${joined ? "joined" : ""}" style="--team-color:${safeColor(team.color)}">
    <span class="team-number">${String(index + 1).padStart(2, "0")}</span>
    <div><b>${joined ? escapeHtml(team.name) : "Đang chờ đội vào"}</b><small>${joined ? (connected ? "Đã kết nối · sẵn sàng" : "Mất kết nối · giữ chỗ") : "Quét QR hoặc nhập mã phòng"}</small></div>
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
  const joinUrl = hostMeta.joinUrl || `${location.origin}/?room=${state.code}`;
  return `<main class="lobby-screen screen">
    ${lobbyHeader(true)}
    <section class="lobby-main">
      <div class="join-display panel">
        <div class="qr-shell">${hostMeta.qrDataUrl ? `<img src="${hostMeta.qrDataUrl}" alt="Mã QR vào phòng ${escapeHtml(state.code)}">` : ""}</div>
        <div class="join-copy"><p class="eyebrow">Quét để tham gia</p><h1>Vào phòng bằng điện thoại</h1><strong class="room-code-large">${escapeHtml(state.code)}</strong><p>Mỗi đội dùng một thiết bị. Người chơi có thể mua và bán cả tám mã trong suốt trận.</p><div class="join-link"><code>${escapeHtml(joinUrl)}</code><button class="icon-button" data-act="copy" aria-label="Sao chép">⧉</button></div></div>
      </div>
      <div class="teams-panel panel">
        <div class="panel-heading"><div><p class="eyebrow">Danh sách tham gia</p><h2>Các đội trên sàn</h2></div><span class="player-count"><strong>${state.playersCount}</strong> / 8 đội</span></div>
        <div class="team-grid">${state.teams.map(teamSlot).join("")}</div>
      </div>
    </section>
    <footer class="lobby-footer">
      <div class="lobby-rules"><span><b>01</b> Giá chạy mỗi giây</span><span><b>02</b> 1–3 sự kiện mỗi phút</span><span><b>03</b> Giàu nhất sau 10 phút thắng</span></div>
      <button class="primary-button start-market" data-act="start" ${state.playersCount < 2 ? "disabled" : ""}>Mở thị trường · ${state.playersCount}/8 đội</button>
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
    <footer class="lobby-footer"><div class="lobby-rules"><span><b>01</b> Theo dõi sự kiện</span><span><b>02</b> Chọn mã</span><span><b>03</b> Mua thấp, bán cao</span></div><span class="status-chip">${state.playersCount}/8 đội đã vào</span></footer>
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
    ? events.map((event) => `<article class="event-card"><span class="event-icon">${escapeHtml(event.icon)}</span><div><small>${escapeHtml(event.tag)}</small><b>${escapeHtml(event.title)}</b><p>${escapeHtml(event.description)}</p></div></article>`).join("")
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
  return `<svg class="market-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Biểu đồ giá ${escapeHtml(market.symbol)}">
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
      <div class="market-identity"><span class="market-flag">${market.flag}</span><div class="market-name"><b>${escapeHtml(market.symbol)} <span>${escapeHtml(market.country)}</span></b><small>${escapeHtml(market.modelName)} · biểu đồ 2 phút gần nhất</small></div></div>
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
    <span class="quote-name"><b>${escapeHtml(market.symbol)} · ${escapeHtml(market.country)}</b><small>${market.model === "capitalist" ? "Tư bản chủ nghĩa" : "Định hướng XHCN"}</small></span>
    <span class="quote-values"><b class="quote-price">${formatPrice(market.price)}</b><small class="${down ? "down" : ""}">${formatSigned(market.changePct, "%")}</small></span>
  </button>`;
}

function quotesPanel() {
  return `<section class="quotes-panel panel"><div class="side-heading"><b>Danh sách thị trường</b><small>8 mã mô phỏng</small></div><div class="quotes-list">${state.game.markets.map(quoteCard).join("")}</div></section>`;
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
    <div class="order-tabs"><button class="order-tab buy ${orderSide === "buy" ? "active" : ""}" data-side="buy">MUA</button><button class="order-tab sell ${orderSide === "sell" ? "active" : ""}" data-side="sell">BÁN</button></div>
    <div class="order-symbol-row"><b>${market.flag} ${escapeHtml(market.symbol)} · ${formatPrice(market.price)}</b><small>Đang có: ${integerFormat.format(portfolio.holdings[market.symbol] || 0)}</small></div>
    <div class="quantity-row"><label for="order-quantity">Số lượng</label><div class="quantity-control"><button data-act="quantity" data-step="-1" aria-label="Giảm">−</button><input id="order-quantity" type="number" inputmode="numeric" min="1" max="9999" value="${escapeHtml(orderQuantity)}"><button data-act="quantity" data-step="1" aria-label="Tăng">+</button></div></div>
    <div class="quick-orders"><button data-quick="0.25">25%</button><button data-quick="0.5">50%</button><button data-quick="1">Tối đa</button></div>
    <div class="order-summary"><span>Ước tính · phí 0,15%</span><b data-order-estimate>${formatMoney(orderEstimate())}</b></div>
    <button class="submit-order ${orderSide === "sell" ? "sell" : ""}" data-act="trade" ${invalid ? "disabled" : ""}>${tradePending ? "ĐANG KHỚP LỆNH..." : `${orderSide === "buy" ? "MUA" : "BÁN"} ${quantity > 0 ? integerFormat.format(quantity) : 0} ${escapeHtml(market.symbol)}`}</button>
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

function render() {
  cancelAnimationFrame(clockFrame);
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

app.addEventListener("submit", (event) => {
  if (event.target.id !== "join-form") return;
  event.preventDefault();
  const form = new FormData(event.target);
  const code = String(form.get("code") || "").trim().toUpperCase();
  const nickname = String(form.get("nickname") || "").trim();
  socket.emit("player:join", { code, nickname }, (result) => {
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
    if (tradePending) return;
    tradePending = true;
    render();
    socket.emit("player:trade", {
      code: player.code,
      playerToken: player.playerToken,
      symbol: selectedSymbol,
      side: orderSide,
      quantity: Number(orderQuantity),
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
});

socket.on("state", (nextState) => {
  state = nextState;
  serverOffset = Number(nextState.serverNow || Date.now()) - Date.now();
  if (state.game && !state.game.markets.some((market) => market.symbol === selectedSymbol)) {
    selectedSymbol = state.game.markets[0]?.symbol || "VNX";
  }
  render();
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
