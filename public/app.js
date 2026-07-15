const socket = io();

const app = document.querySelector("#app");
const toast = document.querySelector("#toast");

const PHASE_LABELS = {
  lobby: "Phòng chờ",
  policy: "Chọn chính sách",
  duel: "Bắt tay hay chơi rắn",
  reveal: "Công bố kết quả",
  finished: "Kết thúc",
};

const POLICIES = [
  {
    id: "growth",
    icon: "⚡",
    name: "Tăng tốc sản xuất",
    hint: "GDP tăng nhanh, nhưng an sinh và ổn định chịu áp lực.",
  },
  {
    id: "welfare",
    icon: "❤",
    name: "Đầu tư an sinh",
    hint: "Củng cố con người, sức mua và công bằng xã hội.",
  },
  {
    id: "infrastructure",
    icon: "⬡",
    name: "Xây hạ tầng",
    hint: "Tăng sức chống chịu và tạo nền tảng dài hạn.",
  },
  {
    id: "speculation",
    icon: "🎲",
    name: "Đầu cơ mạo hiểm",
    hint: "Có thể thắng rất lớn hoặc mất cực nhanh.",
  },
];

let mode = "landing";
let roomState = null;
let hostSession = readSession("nationClashHost");
let playerSession = readSession("nationClashPlayer");
let hostMeta = null;
let selectedPolicy = null;
let selectedDuel = null;
let lastRoundSeen = -1;
let toastTimer = null;

function readSession(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function saveSession(key, value) {
  sessionStorage.setItem(key, JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function brand() {
  return `
    <div class="brand">
      <span class="brand-mark">N</span>
      <span>NATION CLASH</span>
    </div>`;
}

function activeTeams() {
  return (roomState?.teams || []).filter((team) => team.players.length > 0);
}

function myTeam() {
  return roomState?.teams.find((team) => team.id === playerSession?.teamId);
}

function findTeam(id) {
  return roomState?.teams.find((team) => team.id === id);
}

function secondsLeft() {
  if (!roomState?.deadline) return 0;
  return Math.max(0, Math.ceil((roomState.deadline - Date.now()) / 1000));
}

function timerHtml() {
  return `<div class="timer"><span class="timer-value">${secondsLeft()}</span><small>GIÂY</small></div>`;
}

function statsHtml(team) {
  if (!team) return "";
  return `
    <div class="stats-grid">
      <div class="stat-box"><span>GDP</span><strong>${team.gdp}</strong></div>
      <div class="stat-box"><span>An sinh</span><strong>${team.welfare}</strong></div>
      <div class="stat-box"><span>Ổn định</span><strong>${team.stability}</strong></div>
    </div>`;
}

function scoreListHtml() {
  const teams = [...activeTeams()].sort((a, b) => b.score - a.score);
  if (!teams.length) return `<div class="empty-state">Chưa có đội nào tham gia.</div>`;
  return `
    <div class="score-list">
      ${teams
        .map(
          (team, index) => `
            <div class="score-row">
              <span class="rank">#${index + 1}</span>
              <div class="score-team">
                <strong style="color:${team.color}">${escapeHtml(team.name)}</strong>
                <div class="mini-stats">
                  <span>GDP ${team.gdp}</span>
                  <span>AS ${team.welfare}</span>
                  <span>ÔĐ ${team.stability}</span>
                </div>
              </div>
              <span class="score-value">${team.score}</span>
            </div>`,
        )
        .join("")}
    </div>`;
}

function renderLanding() {
  const roomFromUrl = new URLSearchParams(location.search).get("room") || "";
  app.innerHTML = `
    <div class="landing">
      <div class="landing-wrap">
        <div class="hero-copy">
          <p class="eyebrow">Realtime classroom strategy</p>
          <h1>NATION<br /><span>CLASH</span></h1>
          <p>Sáu biến cố. Tám đội. Một lựa chọn khó: bắt tay để cùng mạnh lên hay chơi rắn để vượt mặt đối thủ?</p>
        </div>
        <div class="entry-grid">
          <section class="panel entry-card">
            <h2>Mở đấu trường</h2>
            <p>Tạo phòng, chiếu mã QR lên màn hình và điều khiển toàn bộ trận đấu.</p>
            <button class="btn btn-primary btn-block" data-action="create-room">Tạo phòng host →</button>
          </section>
          <section class="panel entry-card">
            <h2>Tham gia trận đấu</h2>
            <p>Mỗi nhóm cử đúng một đại diện. Ai vào trước được xếp vào đội có số thứ tự trước.</p>
            <form id="join-form">
              <div class="field">
                <label for="room-code">Mã phòng</label>
                <input id="room-code" class="code-input" maxlength="5" autocomplete="off" value="${escapeHtml(roomFromUrl)}" placeholder="VD: 7KX2P" required />
              </div>
              <div class="field">
                <label for="nickname">Tên người đại diện</label>
                <input id="nickname" maxlength="22" autocomplete="nickname" placeholder="Nhập tên đại diện" required />
              </div>
              <button class="btn btn-secondary btn-block" type="submit">Vào đấu trường</button>
            </form>
          </section>
        </div>
      </div>
    </div>`;
}

function teamLobbyCards() {
  return roomState.teams
    .map(
      (team) => `
        <article class="team-card" style="--team-color:${team.color}">
          <div class="team-card-head">
            <span class="team-name" style="color:${team.color}">${escapeHtml(team.name)}</span>
            <span class="member-count">${team.players.length}/1</span>
          </div>
          <div class="members">
            ${
              team.players.length
                ? team.players
                    .map(
                      (player) =>
                        `<span class="member">${escapeHtml(player.nickname)}</span>`,
                    )
                    .join("")
                : `<span class="member">Đang chờ…</span>`
            }
          </div>
        </article>`,
    )
    .join("");
}

function renderHostLobby() {
  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        ${brand()}
        <div class="room-pill">MÃ PHÒNG <strong>${roomState.code}</strong></div>
      </header>
      <div class="host-lobby">
        <section class="panel join-panel">
          <p class="eyebrow">Quét để tham gia</p>
          <div class="qr-frame"><img src="${hostMeta.qrDataUrl}" alt="QR tham gia phòng ${roomState.code}" /></div>
          <div class="giant-code">${roomState.code}</div>
          <p class="join-url">${escapeHtml(hostMeta.joinUrl)}</p>
          <button class="btn btn-secondary btn-block" data-action="copy-link">Sao chép link</button>
        </section>
        <section class="panel lobby-teams">
          <div class="section-heading">
            <div>
              <h2>${roomState.playersCount}/8 đại diện đã vào</h2>
              <p>Mỗi nhóm thảo luận trực tiếp và cử một người bấm quyết định.</p>
            </div>
            <button class="btn btn-primary" data-action="start-game" ${roomState.playersCount < 1 ? "disabled" : ""}>Bắt đầu trận đấu</button>
          </div>
          <div class="team-grid">${teamLobbyCards()}</div>
        </section>
      </div>
    </div>`;
}

function pairingsHtml() {
  if (!roomState.pairings?.length) return "";
  return `
    <div class="duel-grid">
      ${roomState.pairings
        .map((pair) => {
          const a = findTeam(pair.a);
          const b = findTeam(pair.b);
          return `
            <div class="duel-card">
              <strong style="color:${a?.color}">${escapeHtml(a?.name)}</strong>
              <span class="versus">VS</span>
              <strong style="color:${b?.color || "#9aa6c5"}">${escapeHtml(b?.name || "Miễn đấu")}</strong>
            </div>`;
        })
        .join("")}
    </div>`;
}

function hostPhaseContent() {
  const phase = roomState.phase;
  if (phase === "policy") {
    return `
      <div class="phase-callout">
        <h3>Các đội đang chọn đường đi</h3>
        <p>Mỗi thành viên bỏ phiếu bí mật. Phương án có nhiều phiếu nhất trở thành chính sách chung của đội.</p>
      </div>`;
  }
  if (phase === "duel") {
    return `
      <div class="phase-callout">
        <h3>Bắt tay hay chơi rắn?</h3>
        <p>Hai đội cùng bắt tay sẽ cùng có lợi. Một đội lật kèo sẽ ăn phần lớn. Nếu cả hai cùng chơi rắn, ổn định của cả hai giảm mạnh.</p>
      </div>
      ${pairingsHtml()}`;
  }
  if (phase === "reveal") {
    const notes = roomState.reveal?.notes || [];
    return `
      <div class="phase-callout">
        <h3>Thị trường đã phản ứng</h3>
        <p>Thứ hạng được tính từ 45% GDP, 30% an sinh và 25% ổn định.</p>
      </div>
      <div class="result-notes">
        ${notes.map((note) => `<div class="result-note">${escapeHtml(note)}</div>`).join("")}
      </div>`;
  }
  return "";
}

function renderHostGame() {
  if (roomState.phase === "finished") return renderHostFinished();
  const event = roomState.event;
  app.innerHTML = `
    <div class="shell">
      <header class="topbar">
        ${brand()}
        <div style="display:flex;gap:8px;align-items:center">
          <span class="phase-pill">VÒNG ${roomState.roundIndex + 1}/${roomState.totalRounds}</span>
          <span class="room-pill">PHÒNG <strong>${roomState.code}</strong></span>
        </div>
      </header>
      <div class="game-layout">
        <section class="panel stage">
          <span class="event-kicker">${escapeHtml(event?.kicker)}</span>
          <h1 class="event-title">${escapeHtml(event?.title)}</h1>
          <p class="event-description">${escapeHtml(event?.description)}</p>
          ${timerHtml()}
          ${hostPhaseContent()}
        </section>
        <aside class="panel scoreboard">
          <div class="section-heading">
            <div><h2>Bảng xếp hạng</h2><p>${escapeHtml(PHASE_LABELS[roomState.phase])}</p></div>
          </div>
          ${scoreListHtml()}
        </aside>
      </div>
      <div class="host-controls">
        <button class="btn btn-danger" data-action="end-game">Kết thúc</button>
        <button class="btn btn-secondary" data-action="next-phase">Bỏ qua thời gian →</button>
      </div>
    </div>`;
}

function renderHostFinished() {
  const growth = findTeam(roomState.champions?.growth);
  const development = findTeam(roomState.champions?.development);
  app.innerHTML = `
    <div class="shell">
      <header class="topbar">${brand()}<span class="phase-pill">KẾT QUẢ CHUNG CUỘC</span></header>
      <section class="panel stage">
        <p class="eyebrow">Sáu biến cố đã kết thúc</p>
        <h1 class="event-title">Giàu nhất chưa chắc phát triển tốt nhất.</h1>
        <div class="champion-grid">
          <article class="champion-card">
            <span>Quán quân tăng trưởng</span>
            <h2 style="color:${growth?.color}">${escapeHtml(growth?.name || "—")}</h2>
            <p>GDP cao nhất: <strong>${growth?.gdp || 0}</strong></p>
          </article>
          <article class="champion-card primary">
            <span>Quán quân phát triển toàn diện</span>
            <h2 style="color:${development?.color}">${escapeHtml(development?.name || "—")}</h2>
            <p>Điểm tổng hợp: <strong>${development?.score || 0}</strong></p>
          </article>
        </div>
        <div class="phase-callout">
          <h3>Điểm chốt bài</h3>
          <p>Kinh tế thị trường tạo cạnh tranh và động lực tăng trưởng. Định hướng XHCN thể hiện ở cách Nhà nước thiết lập luật chơi, giữ ổn định và gắn thành quả kinh tế với con người, tiến bộ và công bằng xã hội.</p>
        </div>
      </section>
    </div>`;
}

function renderPlayerLobby() {
  const team = myTeam();
  app.innerHTML = `
    <div class="player-shell">
      <header class="topbar">${brand()}<span class="room-pill"><strong>${roomState.code}</strong></span></header>
      <section class="panel player-hero">
        <p class="eyebrow">Đã vào đấu trường</p>
        <div class="team-identity" style="--team-color:${team?.color}">
          <span class="team-dot"></span>
          <div><small>ĐỘI CỦA BẠN</small><h2 style="margin:2px 0 0;color:${team?.color}">${escapeHtml(team?.name)}</h2></div>
        </div>
        <div class="phase-callout">
          <h3>Chờ host bắt đầu</h3>
          <p>Hãy ngồi gần đồng đội. Mỗi vòng cả đội sẽ phải hét chiến thuật, bỏ phiếu và quyết định có lật kèo đối thủ hay không.</p>
        </div>
        <div class="members" style="margin-top:14px">
          ${team?.players.map((player) => `<span class="member">${escapeHtml(player.nickname)}</span>`).join("")}
        </div>
      </section>
    </div>`;
}

function opponentFor(teamId) {
  const pairing = roomState.pairings?.find(
    (item) => item.a === teamId || item.b === teamId,
  );
  if (!pairing) return null;
  return findTeam(pairing.a === teamId ? pairing.b : pairing.a);
}

function policyActionsHtml() {
  return `
    <div class="action-grid">
      ${POLICIES.map(
        (policy) => `
          <button class="action-card ${selectedPolicy === policy.id ? "selected" : ""}" data-action="vote-policy" data-value="${policy.id}">
            <span class="action-icon">${policy.icon}</span>
            <strong>${policy.name}</strong>
            <small>${policy.hint}</small>
          </button>`,
      ).join("")}
    </div>`;
}

function duelActionsHtml() {
  const opponent = opponentFor(playerSession.teamId);
  if (!opponent) {
    return `<div class="phase-callout"><h3>Vòng này được miễn đấu</h3><p>Đội bạn giữ nguyên nguồn lực từ phần đối đầu.</p></div>`;
  }
  return `
    <div class="phase-callout">
      <h3>Đối thủ: <span style="color:${opponent.color}">${escapeHtml(opponent.name)}</span></h3>
      <p>Không đội nào nhìn thấy lựa chọn của đối phương cho tới khi hết giờ.</p>
    </div>
    <div class="duel-actions">
      <button class="duel-btn ${selectedDuel === "cooperate" ? "selected" : ""}" data-action="vote-duel" data-value="cooperate">
        <div><strong>🤝 BẮT TAY</strong><small>Cùng bắt tay: cả hai cùng có lợi</small></div><span>+ niềm tin</span>
      </button>
      <button class="duel-btn ${selectedDuel === "compete" ? "selected" : ""}" data-action="vote-duel" data-value="compete">
        <div><strong>⚔ CHƠI RẮN</strong><small>Ăn lớn nếu đối thủ tin mình</small></div><span>rủi ro cao</span>
      </button>
    </div>`;
}

function revealPlayerHtml(team) {
  const last = team?.lastRound;
  return `
    <div class="phase-callout">
      <h3>Đội đã chọn: ${escapeHtml(last?.policyName || "—")}</h3>
      <p>${escapeHtml(last?.eventNote || "Kết quả đang được tổng hợp trên bảng xếp hạng.")}</p>
    </div>
    <div class="result-notes">
      ${last?.duelNote ? `<div class="result-note">${escapeHtml(last.duelNote)}</div>` : ""}
      ${(roomState.reveal?.notes || []).map((note) => `<div class="result-note">${escapeHtml(note)}</div>`).join("")}
    </div>`;
}

function renderPlayerGame() {
  if (roomState.phase === "finished") return renderPlayerFinished();
  const team = myTeam();
  const event = roomState.event;
  app.innerHTML = `
    <div class="player-shell">
      <header class="topbar">
        <div class="team-identity" style="--team-color:${team?.color}">
          <span class="team-dot"></span><strong style="color:${team?.color}">${escapeHtml(team?.name)}</strong>
        </div>
        <span class="phase-pill">${roomState.roundIndex + 1}/${roomState.totalRounds}</span>
      </header>
      <section class="panel player-event">
        <span class="event-kicker">${escapeHtml(event?.kicker)}</span>
        <h1>${escapeHtml(event?.title)}</h1>
        <p>${escapeHtml(event?.description)}</p>
        ${statsHtml(team)}
        ${timerHtml()}
        ${roomState.phase === "policy" ? policyActionsHtml() : ""}
        ${roomState.phase === "duel" ? duelActionsHtml() : ""}
        ${roomState.phase === "reveal" ? revealPlayerHtml(team) : ""}
      </section>
    </div>`;
}

function renderPlayerFinished() {
  const team = myTeam();
  const growth = findTeam(roomState.champions?.growth);
  const development = findTeam(roomState.champions?.development);
  app.innerHTML = `
    <div class="player-shell">
      <header class="topbar">${brand()}<span class="phase-pill">HẾT TRẬN</span></header>
      <section class="panel player-event">
        <p class="eyebrow">Kết quả đội bạn</p>
        <h1 style="color:${team?.color}">${escapeHtml(team?.name)}</h1>
        ${statsHtml(team)}
        <div class="phase-callout">
          <h3>Điểm phát triển: ${team?.score || 0}</h3>
          <p>GDP chiếm 45%, an sinh 30% và ổn định 25%.</p>
        </div>
        <div class="result-notes">
          <div class="result-note">Tăng trưởng cao nhất: ${escapeHtml(growth?.name || "—")}</div>
          <div class="result-note">Phát triển toàn diện nhất: ${escapeHtml(development?.name || "—")}</div>
        </div>
      </section>
    </div>`;
}

function render() {
  if (mode === "landing" || !roomState) return renderLanding();
  if (mode === "host") {
    return roomState.status === "lobby" ? renderHostLobby() : renderHostGame();
  }
  if (mode === "player") {
    return roomState.status === "lobby" ? renderPlayerLobby() : renderPlayerGame();
  }
}

function createRoom() {
  socket.emit("host:create", (response) => {
    if (!response.ok) return showToast(response.message);
    hostSession = { code: response.code, hostToken: response.hostToken };
    hostMeta = { joinUrl: response.joinUrl, qrDataUrl: response.qrDataUrl };
    saveSession("nationClashHost", hostSession);
    mode = "host";
  });
}

function joinRoom(code, nickname) {
  const existingToken =
    playerSession?.code === code.toUpperCase() ? playerSession.playerToken : null;
  socket.emit(
    "player:join",
    { code, nickname, playerToken: existingToken },
    (response) => {
      if (!response.ok) return showToast(response.message);
      playerSession = {
        code: code.toUpperCase(),
        nickname,
        playerToken: response.playerToken,
        playerId: response.playerId,
        teamId: response.teamId,
      };
      saveSession("nationClashPlayer", playerSession);
      mode = "player";
    },
  );
}

app.addEventListener("submit", (event) => {
  if (event.target.id !== "join-form") return;
  event.preventDefault();
  const code = document.querySelector("#room-code").value.trim();
  const nickname = document.querySelector("#nickname").value.trim();
  joinRoom(code, nickname);
});

app.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  if (action === "create-room") return createRoom();
  if (action === "copy-link") {
    await navigator.clipboard.writeText(hostMeta.joinUrl);
    return showToast("Đã sao chép link tham gia");
  }
  if (action === "start-game") {
    socket.emit("host:start", hostSession, (response) => {
      if (!response.ok) showToast(response.message);
    });
    return;
  }
  if (action === "next-phase") {
    socket.emit("host:next", hostSession, (response) => {
      if (!response.ok) showToast(response.message);
    });
    return;
  }
  if (action === "end-game") {
    if (!confirm("Kết thúc trận đấu ngay?")) return;
    socket.emit("host:end", hostSession, (response) => {
      if (!response.ok) showToast(response.message);
    });
    return;
  }
  if (action === "vote-policy") {
    selectedPolicy = target.dataset.value;
    socket.emit("player:vote-policy", {
      code: playerSession.code,
      playerToken: playerSession.playerToken,
      policy: selectedPolicy,
    });
    return render();
  }
  if (action === "vote-duel") {
    selectedDuel = target.dataset.value;
    socket.emit("player:vote-duel", {
      code: playerSession.code,
      playerToken: playerSession.playerToken,
      choice: selectedDuel,
    });
    return render();
  }
});

socket.on("state", (state) => {
  roomState = state;
  if (lastRoundSeen !== state.roundIndex) {
    lastRoundSeen = state.roundIndex;
    selectedPolicy = null;
    selectedDuel = null;
  }
  render();
});

socket.on("app:error", ({ message }) => showToast(message));

socket.on("connect", () => {
  if (hostSession) {
    socket.emit("host:resume", hostSession, (response) => {
      if (response.ok) {
        mode = "host";
        hostMeta = { joinUrl: response.joinUrl, qrDataUrl: response.qrDataUrl };
      } else {
        hostSession = null;
        sessionStorage.removeItem("nationClashHost");
        render();
      }
    });
    return;
  }

  if (playerSession) {
    socket.emit(
      "player:join",
      {
        code: playerSession.code,
        nickname: playerSession.nickname,
        playerToken: playerSession.playerToken,
      },
      (response) => {
        if (response.ok) {
          mode = "player";
          playerSession = { ...playerSession, ...response };
          saveSession("nationClashPlayer", playerSession);
        } else {
          playerSession = null;
          sessionStorage.removeItem("nationClashPlayer");
          render();
        }
      },
    );
  }
});

setInterval(() => {
  document.querySelectorAll(".timer-value").forEach((element) => {
    element.textContent = secondsLeft();
  });
}, 250);

render();
