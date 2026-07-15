const test = require("node:test");
const assert = require("node:assert/strict");
const { createTeam } = require("../game-engine");
const { makeArena, setInput, tick, BASES } = require("../arena-engine");

function teams(count = 2) {
  return Array.from({ length: 8 }, (_, index) => {
    const team = createTeam(index);
    if (index < count) team.players.push({ id: `p${index}`, nickname: `P${index}` });
    return team;
  });
}

test("người chơi di chuyển realtime theo input", () => {
  const list = teams(1);
  const arena = makeArena(list, 1000);
  const before = arena.players.p0.x;
  setInput(arena, "p0", { x: 1, y: 0 }, 1000);
  tick(arena, list, 0.1, 1100);
  assert.ok(arena.players.p0.x > before);
});

test("mang tài nguyên về căn cứ làm tăng chỉ số và quỹ công", () => {
  const list = teams(1);
  const arena = makeArena(list, 1000);
  const player = arena.players.p0;
  player.carry = ["capital", "labor", "tech"];
  [player.x, player.y] = BASES[0];
  tick(arena, list, 0.05, 1100);
  assert.equal(player.carry.length, 0);
  assert.equal(arena.publicFund, 3);
  assert.ok(list[0].gdp > 20);
  assert.ok(list[0].welfare > 20);
});

test("dash vào đối thủ làm rơi hàng", () => {
  const list = teams(2);
  const arena = makeArena(list, 1000);
  const a = arena.players.p0, b = arena.players.p1;
  a.x = b.x = 500; a.y = b.y = 400; b.carry = ["capital", "labor", "tech", "capital"];
  setInput(arena, "p0", { x: 1, y: 0, dash: true }, 1000);
  tick(arena, list, 0.01, 1050);
  assert.ok(b.carry.length < 4);
});
