const MATCH_SECONDS = Number(process.env.MATCH_SECONDS || 360);
const WORLD_WIDTH = 1000;
const BASE_WIDTH = 420;
const BLOCK_HEIGHT = 34;

const TYPES = [
  { id: "production", label: "Sản xuất", icon: "🏭", color: "#ffb347" },
  { id: "welfare", label: "Phúc lợi", icon: "❤", color: "#55e6ff" },
  { id: "market", label: "Thị trường", icon: "↗", color: "#ff5d73" },
  { id: "infrastructure", label: "Hạ tầng công", icon: "◆", color: "#a98bff" },
  { id: "green", label: "Ổn định", icon: "●", color: "#b9ff66" },
];

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const getType = id => TYPES.find(type => type.id === id) || TYPES[0];

function nextType(level) {
  const sequence = ["production", "market", "welfare", "production", "infrastructure", "market", "green"];
  return sequence[level % sequence.length];
}

function movingBlock(tower) {
  const previous = tower.blocks[tower.blocks.length - 1];
  const widthBonus = tower.nextWidthBonus || 0;
  tower.nextWidthBonus = 0;
  return {
    x: tower.level % 2 ? 20 : WORLD_WIDTH - previous.width - 20,
    width: clamp(previous.width + widthBonus, 55, BASE_WIDTH),
    y: tower.level * BLOCK_HEIGHT,
    dir: tower.level % 2 ? 1 : -1,
    speed: Math.min(390, 175 + tower.level * 7),
    type: nextType(tower.level),
  };
}

function createTower(team, playerId) {
  const foundation = { x: (WORLD_WIDTH - BASE_WIDTH) / 2, width: BASE_WIDTH, y: 0, type: "foundation" };
  const tower = {
    teamId: team.id, playerId, blocks: [foundation], current: null,
    level: 0, combo: 0, bestCombo: 0, misses: 0,
    gdp: 10, welfare: 10, stability: 10,
    flash: null, shakeUntil: 0, nextWidthBonus: 0,
  };
  tower.current = movingBlock(tower);
  return tower;
}

function createGame(teams, now = Date.now()) {
  const towers = {};
  for (const team of teams.filter(team => team.players.length)) {
    towers[team.id] = createTower(team, team.players[0].id);
    team.gdp = 10; team.welfare = 10; team.stability = 10; team.score = 0;
  }
  return {
    towers, startedAt: now, endsAt: now + MATCH_SECONDS * 1000,
    eventIndex: 0, nextEventAt: now + 60000, event: null,
    publicProgress: 0, activity: [],
  };
}

function log(game, text, color = "#fff") {
  game.activity.unshift({ id: `${Date.now()}-${Math.random()}`, text, color });
  game.activity = game.activity.slice(0, 6);
}

function tick(game, teams, dt, now = Date.now()) {
  if (now >= game.endsAt) return { finished: true };
  for (const tower of Object.values(game.towers)) {
    const block = tower.current;
    block.x += block.dir * block.speed * dt;
    if (block.x <= 0) { block.x = 0; block.dir = 1; }
    if (block.x + block.width >= WORLD_WIDTH) { block.x = WORLD_WIDTH - block.width; block.dir = -1; }
    if (tower.flash && now > tower.flash.until) tower.flash = null;
  }
  if (game.event && now >= game.event.endsAt) game.event = null;
  if (now >= game.nextEventAt) triggerEvent(game, teams, now);
  syncTeams(game, teams);
  return { finished: false };
}

function applyBlockEffect(game, tower, typeId) {
  if (typeId === "production") tower.gdp += 5;
  if (typeId === "market") { tower.gdp += 7; tower.stability = Math.max(0, tower.stability - 1); }
  if (typeId === "welfare") { tower.welfare += 6; tower.nextWidthBonus += 12; }
  if (typeId === "infrastructure") {
    tower.stability += 6; tower.nextWidthBonus += 20; game.publicProgress += 1;
  }
  if (typeId === "green") { tower.welfare += 2; tower.stability += 6; }
  if (game.publicProgress >= Math.max(3, Object.keys(game.towers).length)) {
    game.publicProgress = 0;
    for (const item of Object.values(game.towers)) {
      item.nextWidthBonus += 18; item.stability += 2;
    }
    log(game, "Đầu tư công mở rộng nền móng cho tất cả đội", "#a98bff");
  }
}

function place(game, teamId, now = Date.now()) {
  const tower = game.towers[teamId];
  if (!tower || !tower.current) return { ok: false };
  const current = tower.current;
  const previous = tower.blocks[tower.blocks.length - 1];
  const left = Math.max(current.x, previous.x);
  const right = Math.min(current.x + current.width, previous.x + previous.width);
  const overlap = right - left;
  if (overlap <= 0) {
    tower.misses += 1; tower.combo = 0;
    tower.flash = { text: "TRƯỢT!", color: "#ff5d73", until: now + 900 };
    current.x = current.dir > 0 ? 0 : WORLD_WIDTH - current.width;
    return { ok: false, miss: true };
  }
  const accuracy = overlap / current.width;
  const placed = { x: left, width: overlap, y: tower.level * BLOCK_HEIGHT, type: current.type };
  tower.blocks.push(placed); tower.level += 1;
  tower.combo = accuracy > .92 ? tower.combo + 1 : 0;
  tower.bestCombo = Math.max(tower.bestCombo, tower.combo);
  if (accuracy > .97) tower.nextWidthBonus += 7;
  applyBlockEffect(game, tower, current.type);
  tower.flash = { text: accuracy > .97 ? "HOÀN HẢO!" : `+${Math.round(accuracy * 100)}%`, color: accuracy > .92 ? "#b9ff66" : "#fff", until: now + 650 };
  tower.current = movingBlock(tower);
  return { ok: true, accuracy, level: tower.level };
}

function triggerEvent(game, teams, now) {
  const events = [
    { title: "Khủng hoảng thị trường", text: "Tháp chạy theo GDP nhưng thiếu ổn định bị thu hẹp." },
    { title: "Áp lực bất bình đẳng", text: "Phúc lợi thấp làm mất hai tầng tăng trưởng." },
    { title: "Đứt gãy chuỗi cung ứng", text: "Hạ tầng và ổn định quyết định sức chống chịu." },
  ];
  const event = events[game.eventIndex++ % events.length];
  game.event = { ...event, endsAt: now + 7000 };
  game.nextEventAt = now + 60000;
  for (const tower of Object.values(game.towers)) {
    const imbalance = tower.gdp - Math.min(tower.welfare, tower.stability);
    if (imbalance > 15 && tower.blocks.length > 3) {
      const removed = Math.min(2, tower.blocks.length - 1);
      tower.blocks.splice(-removed, removed);
      tower.level -= removed; tower.combo = 0; tower.shakeUntil = now + 1200;
      const top = tower.blocks[tower.blocks.length - 1];
      tower.current.width = Math.min(tower.current.width, top.width);
      tower.current.y = tower.level * BLOCK_HEIGHT;
    } else {
      tower.stability += 2;
    }
  }
  log(game, event.title, "#ff5d73");
  syncTeams(game, teams);
}

function developmentScore(tower) {
  const balance = Math.min(tower.gdp, tower.welfare, tower.stability);
  return Math.round(tower.level * 10 + balance * 2 + tower.bestCombo * 3 - tower.misses * 2);
}

function syncTeams(game, teams) {
  for (const team of teams) {
    const tower = game.towers[team.id];
    if (!tower) continue;
    team.gdp = tower.gdp; team.welfare = tower.welfare; team.stability = tower.stability;
    team.score = developmentScore(tower);
  }
}

module.exports = { MATCH_SECONDS, WORLD_WIDTH, BLOCK_HEIGHT, TYPES, createGame, tick, place, triggerEvent, developmentScore };
