const CARD_TYPES = {
  market: { id: "market", label: "THỊ TRƯỜNG", icon: "↗", color: "#ffd166", meaning: "Cạnh tranh và động lực tăng trưởng" },
  social: { id: "social", label: "AN SINH", icon: "♥", color: "#55e6ff", meaning: "Tiến bộ và công bằng xã hội" },
  state: { id: "state", label: "NHÀ NƯỚC", icon: "★", color: "#ff6b7d", meaning: "Điều tiết và hạ tầng thiết yếu" },
  wild: { id: "wild", label: "ĐỔI MỚI", icon: "◆", color: "#b9ff66", meaning: "Có thể thay cho mọi loại lá" },
};
const CLAIMS = ["market", "social", "state", "market", "state", "social"];
const MAX_ROUNDS = 6;

function makeDeck(seed = 0) {
  const cards = [];
  for (const type of ["market", "social", "state"]) for (let i = 0; i < 16; i += 1) cards.push({ id: `${type}-${seed}-${i}`, type });
  for (let i = 0; i < 8; i += 1) cards.push({ id: `wild-${seed}-${i}`, type: "wild" });
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = (i * 17 + seed * 13 + 7) % (i + 1);
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function activeTeamIds(teams) { return teams.filter(t => t.players.length).map(t => t.id); }

function createGame(teams, now = Date.now()) {
  const ids = activeTeamIds(teams);
  const game = {
    round: 0, maxRounds: MAX_ROUNDS, required: CLAIMS[0], order: ids,
    turnIndex: 0, hands: {}, pile: [], lastPlay: null, credibility: {}, scores: {},
    phase: "turn", deadline: now + 12000, reveal: null, activity: [], national: { market: 0, social: 0, state: 0 }, playsThisRound: 0,
  };
  ids.forEach(id => { game.credibility[id] = 3; game.scores[id] = 0; });
  deal(game);
  return game;
}

function deal(game) {
  const deck = makeDeck(game.round + 1);
  game.hands = {};
  game.order.forEach(id => { game.hands[id] = deck.splice(0, 6); });
  game.pile = []; game.lastPlay = null; game.playsThisRound = 0; game.turnIndex = game.round % Math.max(1, game.order.length);
}

function currentTeam(game) { return game.order[game.turnIndex % game.order.length]; }
function nextTurn(game) { game.turnIndex = (game.turnIndex + 1) % game.order.length; game.deadline = Date.now() + 12000; }
function log(game, text, teamId = null) { game.activity.unshift({ id: `${Date.now()}-${Math.random()}`, text, teamId }); game.activity = game.activity.slice(0, 7); }

function play(game, teamId, cardIds, now = Date.now()) {
  if (game.phase !== "turn" || currentTeam(game) !== teamId) return { ok: false, message: "Chưa đến lượt" };
  const ids = [...new Set(cardIds || [])].slice(0, 3);
  if (!ids.length) return { ok: false, message: "Chọn từ 1 đến 3 lá" };
  const hand = game.hands[teamId] || [];
  const cards = ids.map(id => hand.find(card => card.id === id));
  if (cards.some(card => !card)) return { ok: false, message: "Lá bài không hợp lệ" };
  game.hands[teamId] = hand.filter(card => !ids.includes(card.id));
  const entry = { teamId, cards, count: cards.length };
  game.pile.push(entry); game.lastPlay = entry; game.playsThisRound += 1;
  log(game, `${teamId} úp ${cards.length} lá và tuyên bố: ${CARD_TYPES[game.required].label}`, teamId);
  nextTurn(game); game.deadline = now + 15000;
  return { ok: true };
}

function challenge(game, challengerId, now = Date.now()) {
  if (game.phase !== "turn" || currentTeam(game) !== challengerId || !game.lastPlay) return { ok: false, message: "Không thể tố lúc này" };
  const accused = game.lastPlay.teamId;
  const truthful = game.lastPlay.cards.every(card => card.type === game.required || card.type === "wild");
  const loser = truthful ? challengerId : accused;
  const winner = truthful ? accused : challengerId;
  game.credibility[loser] = Math.max(0, game.credibility[loser] - 1);
  game.scores[loser] -= 4; game.scores[winner] += 8;
  game.reveal = { challengerId, accusedId: accused, cards: game.lastPlay.cards, truthful, loser, winner };
  game.phase = "reveal"; game.deadline = now + 4500;
  log(game, truthful ? `${accused} nói thật — ${challengerId} tố nhầm!` : `${accused} bị bắt quả tang nói dối!`, winner);
  return { ok: true, truthful, loser };
}

function resolveRound(game, now = Date.now()) {
  const counts = { market: 0, social: 0, state: 0 };
  for (const entry of game.pile) for (const card of entry.cards) {
    if (card.type !== "wild") counts[card.type] += 1;
    if (card.type === game.required || card.type === "wild") game.scores[entry.teamId] += 2;
  }
  for (const type of Object.keys(counts)) game.national[type] += counts[type];
  const balanced = Object.values(counts).every(value => value > 0);
  if (balanced) {
    game.order.forEach(id => game.scores[id] += 4);
    log(game, "Ba trụ cùng xuất hiện: toàn bộ nền kinh tế nhận thưởng cân bằng");
  }
  game.round += 1;
  if (game.round >= game.maxRounds) { game.phase = "finished"; game.deadline = null; return { finished: true }; }
  game.required = CLAIMS[game.round]; game.phase = "turn"; game.reveal = null; deal(game); game.deadline = now + 12000;
  return { finished: false };
}

function advance(game, now = Date.now()) {
  if (game.phase === "reveal" && now >= game.deadline) return resolveRound(game, now);
  if (game.phase === "turn" && now >= game.deadline) {
    if (game.playsThisRound >= 6) return resolveRound(game, now);
    const id = currentTeam(game), hand = game.hands[id];
    if (!hand.length) return resolveRound(game, now);
    play(game, id, [hand[0].id], now);
  }
  if (game.phase === "turn" && game.order.every(id => !game.hands[id].length)) return resolveRound(game, now);
  return { finished: game.phase === "finished" };
}

function serialize(game, viewerTeamId = null, host = false) {
  const hands = {};
  for (const id of game.order) hands[id] = id === viewerTeamId ? game.hands[id] : { count: game.hands[id]?.length || 0 };
  return {
    round: game.round, maxRounds: game.maxRounds, required: game.required, order: game.order,
    currentTeamId: currentTeam(game), hands, pileCount: game.pile.reduce((sum,p)=>sum+p.count,0), playsThisRound: game.playsThisRound,
    lastPlay: game.lastPlay ? { teamId: game.lastPlay.teamId, count: game.lastPlay.count } : null,
    credibility: game.credibility, scores: game.scores, phase: game.phase, deadline: game.deadline,
    reveal: game.reveal, activity: game.activity, national: game.national,
  };
}

module.exports = { CARD_TYPES, MAX_ROUNDS, createGame, play, challenge, advance, resolveRound, currentTeam, serialize };
