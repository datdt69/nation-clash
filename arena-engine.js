const WIDTH = 1400;
const HEIGHT = 820;
const PLAYER_RADIUS = 19;
const MATCH_SECONDS = Number(process.env.MATCH_SECONDS || 420);

const RESOURCE_TYPES = {
  capital: { color: "#ffd166", label: "Vốn", gdp: 3, welfare: 0, stability: 0 },
  labor: { color: "#55e6ff", label: "Lao động", gdp: 1, welfare: 3, stability: 0 },
  tech: { color: "#b9ff66", label: "Công nghệ", gdp: 2, welfare: 0, stability: 2 },
};

const BASES = [
  [110, 110], [700, 90], [1290, 110], [1310, 410],
  [1290, 710], [700, 730], [110, 710], [90, 410],
];

const ZONES = [
  { id: "factory", x: 425, y: 250, r: 72, label: "Khu sản xuất", color: "#ff8c61", bonus: "gdp" },
  { id: "cooperative", x: 975, y: 250, r: 72, label: "Hợp tác xã", color: "#55e6ff", bonus: "welfare" },
  { id: "innovation", x: 425, y: 570, r: 72, label: "Trung tâm đổi mới", color: "#b9ff66", bonus: "stability" },
  { id: "public-grid", x: 975, y: 570, r: 72, label: "Hạ tầng công", color: "#a98bff", public: true },
];

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function score(team) {
  return Math.round(team.gdp * 0.4 + team.welfare * 0.35 + team.stability * 0.25);
}

function makeArena(teams, now = Date.now()) {
  const active = teams.filter((team) => team.players.length);
  const players = {};
  for (const team of active) {
    const [x, y] = BASES[team.index];
    const representative = team.players[0];
    players[representative.id] = {
      id: representative.id, teamId: team.id, nickname: representative.nickname,
      x, y, vx: 0, vy: 0, carry: [], input: { x: 0, y: 0 },
      dashUntil: 0, dashReadyAt: 0, lastHitAt: 0,
    };
    team.gdp = 20; team.welfare = 20; team.stability = 20;
    team.delivered = 0; team.captures = 0;
  }
  const arena = {
    width: WIDTH, height: HEIGHT, players, resources: [], zones: ZONES.map(z => ({ ...z, owner: null, progress: 0, contender: null })),
    publicFund: 0, startedAt: now, endsAt: now + MATCH_SECONDS * 1000,
    nextSpawnAt: now, nextShockAt: now + 75000, shock: null, activity: [], seq: 0,
  };
  for (let i = 0; i < 42; i += 1) spawnResource(arena);
  return arena;
}

function spawnResource(arena, type) {
  const keys = Object.keys(RESOURCE_TYPES);
  const selected = type || keys[arena.seq++ % keys.length];
  arena.resources.push({
    id: `r-${arena.seq}-${Math.random().toString(36).slice(2, 7)}`,
    type: selected,
    x: 180 + Math.random() * (WIDTH - 360),
    y: 150 + Math.random() * (HEIGHT - 300),
  });
}

function log(arena, text, color = "#ffffff") {
  arena.activity.unshift({ id: `${Date.now()}-${arena.seq++}`, text, color });
  arena.activity = arena.activity.slice(0, 7);
}

function applyDelivery(arena, player, team, teams) {
  const base = BASES[team.index];
  if (Math.hypot(player.x - base[0], player.y - base[1]) > 62 || !player.carry.length) return;
  const count = player.carry.length;
  for (const type of player.carry) {
    const resource = RESOURCE_TYPES[type];
    team.gdp += resource.gdp;
    team.welfare += resource.welfare;
    team.stability += resource.stability;
  }
  team.delivered += count;
  arena.publicFund += count;
  player.carry = [];
  log(arena, `${team.name} giao ${count} nguồn lực`, team.color);
  if (arena.publicFund >= 24) {
    arena.publicFund -= 24;
    for (const item of teams.filter(t => t.players.length)) {
      item.gdp += 2; item.welfare += 4; item.stability += 4;
    }
    log(arena, "Quỹ chung xây hạ tầng: tất cả đội cùng hưởng lợi", "#a98bff");
  }
}

function knockCargo(arena, attacker, victim, teams, now) {
  if (now < victim.lastHitAt + 900 || !victim.carry.length) return;
  const dropped = victim.carry.splice(0, Math.ceil(victim.carry.length / 2));
  victim.lastHitAt = now;
  dropped.forEach((type, index) => arena.resources.push({
    id: `drop-${arena.seq++}`, type,
    x: clamp(victim.x + (index - 1) * 18, 30, WIDTH - 30),
    y: clamp(victim.y + (Math.random() - .5) * 40, 30, HEIGHT - 30),
  }));
  const a = teams.find(t => t.id === attacker.teamId);
  const v = teams.find(t => t.id === victim.teamId);
  log(arena, `${a.name} đánh rơi hàng của ${v.name}`, a.color);
}

function updateZones(arena, teams, dt) {
  for (const zone of arena.zones) {
    if (zone.public) continue;
    const inside = Object.values(arena.players).filter(p => Math.hypot(p.x - zone.x, p.y - zone.y) < zone.r);
    const teamIds = [...new Set(inside.map(p => p.teamId))];
    if (teamIds.length === 1) {
      const contender = teamIds[0];
      if (zone.contender !== contender) { zone.contender = contender; zone.progress = 0; }
      zone.progress += dt * 28;
      if (zone.progress >= 100 && zone.owner !== contender) {
        zone.owner = contender; zone.progress = 100;
        const team = teams.find(t => t.id === contender);
        team.captures += 1;
        log(arena, `${team.name} chiếm ${zone.label}`, team.color);
      }
    } else if (!teamIds.length) {
      zone.progress = Math.max(zone.owner ? 100 : 0, zone.progress - dt * 10);
      zone.contender = zone.owner;
    }
  }
}

function applyZoneIncome(arena, teams, dt) {
  for (const zone of arena.zones.filter(z => z.owner)) {
    const team = teams.find(t => t.id === zone.owner);
    if (!team) continue;
    team[zone.bonus] += dt * 0.42;
  }
}

function triggerShock(arena, teams, now) {
  const low = teams.filter(t => t.players.length).sort((a,b) => a.stability - b.stability)[0];
  arena.shock = { title: "Đứt gãy chuỗi cung ứng", endsAt: now + 15000 };
  for (const team of teams.filter(t => t.players.length)) {
    if (team.stability < 35) team.gdp = Math.max(0, team.gdp - 8);
  }
  if (low) { low.welfare += 5; log(arena, `Quỹ dự phòng hỗ trợ ${low.name} vượt cú sốc`, "#a98bff"); }
  arena.nextShockAt = now + 75000;
}

function tick(arena, teams, dt, now = Date.now()) {
  if (now >= arena.endsAt) return { finished: true };
  if (arena.shock && now >= arena.shock.endsAt) arena.shock = null;
  if (now >= arena.nextShockAt) triggerShock(arena, teams, now);
  if (now >= arena.nextSpawnAt) {
    if (arena.resources.length < 55) { spawnResource(arena); spawnResource(arena); }
    arena.nextSpawnAt = now + 900;
  }
  const players = Object.values(arena.players);
  for (const player of players) {
    const length = Math.hypot(player.input.x, player.input.y) || 1;
    const speed = now < player.dashUntil ? 420 : 205;
    player.vx = player.input.x / length * speed;
    player.vy = player.input.y / length * speed;
    player.x = clamp(player.x + player.vx * dt, PLAYER_RADIUS, WIDTH - PLAYER_RADIUS);
    player.y = clamp(player.y + player.vy * dt, PLAYER_RADIUS, HEIGHT - PLAYER_RADIUS);
    for (let i = arena.resources.length - 1; i >= 0 && player.carry.length < 8; i -= 1) {
      if (distance(player, arena.resources[i]) < 30) player.carry.push(arena.resources.splice(i, 1)[0].type);
    }
    const team = teams.find(t => t.id === player.teamId);
    applyDelivery(arena, player, team, teams);
  }
  for (let i = 0; i < players.length; i += 1) for (let j = i + 1; j < players.length; j += 1) {
    if (distance(players[i], players[j]) < PLAYER_RADIUS * 2.2) {
      if (now < players[i].dashUntil) knockCargo(arena, players[i], players[j], teams, now);
      if (now < players[j].dashUntil) knockCargo(arena, players[j], players[i], teams, now);
    }
  }
  updateZones(arena, teams, dt);
  applyZoneIncome(arena, teams, dt);
  for (const team of teams) team.score = score(team);
  return { finished: false };
}

function setInput(arena, playerId, input, now = Date.now()) {
  const player = arena.players[playerId];
  if (!player) return false;
  player.input = { x: clamp(Number(input.x) || 0, -1, 1), y: clamp(Number(input.y) || 0, -1, 1) };
  if (input.dash && now >= player.dashReadyAt) {
    player.dashUntil = now + 340;
    player.dashReadyAt = now + 2400;
  }
  return true;
}

function serializeArena(arena) {
  return {
    width: arena.width, height: arena.height, players: arena.players,
    resources: arena.resources, zones: arena.zones, publicFund: arena.publicFund,
    endsAt: arena.endsAt, shock: arena.shock, activity: arena.activity,
  };
}

module.exports = { WIDTH, HEIGHT, MATCH_SECONDS, RESOURCE_TYPES, BASES, ZONES, makeArena, tick, setInput, score, serializeArena };
