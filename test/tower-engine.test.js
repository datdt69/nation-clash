const test = require("node:test");
const assert = require("node:assert/strict");
const { createTeam } = require("../game-engine");
const { createGame, tick, place, triggerEvent, developmentScore } = require("../tower-engine");

function setup(count = 1) {
  const teams = Array.from({ length: 8 }, (_, index) => createTeam(index));
  for (let i = 0; i < count; i += 1) teams[i].players.push({ id: `p${i}`, nickname: `P${i}` });
  return { teams, game: createGame(teams, 1000) };
}

test("khối chuyển động ngang theo thời gian", () => {
  const { teams, game } = setup();
  const tower = game.towers[teams[0].id];
  const before = tower.current.x;
  tick(game, teams, .1, 1100);
  assert.notEqual(tower.current.x, before);
});

test("chạm đúng vị trí đặt được khối và tăng chiều cao", () => {
  const { teams, game } = setup();
  const tower = game.towers[teams[0].id];
  tower.current.x = tower.blocks[0].x;
  const result = place(game, teams[0].id, 1100);
  assert.equal(result.ok, true);
  assert.equal(tower.level, 1);
  assert.equal(tower.blocks.length, 2);
});

test("tháp chạy theo GDP nhưng thiếu cân bằng mất tầng khi khủng hoảng", () => {
  const { teams, game } = setup();
  const tower = game.towers[teams[0].id];
  for (let i = 0; i < 5; i += 1) {
    tower.current.x = tower.blocks.at(-1).x;
    place(game, teams[0].id, 1100 + i);
  }
  tower.gdp = 50; tower.welfare = 10; tower.stability = 10;
  const before = tower.level;
  triggerEvent(game, teams, 2000);
  assert.equal(tower.level, before - 2);
});

test("điểm phát triển thưởng cho nền kinh tế cân bằng", () => {
  const { teams, game } = setup();
  const tower = game.towers[teams[0].id];
  tower.level = 10; tower.gdp = 50; tower.welfare = 50; tower.stability = 50;
  const balanced = developmentScore(tower);
  tower.welfare = 5; tower.stability = 5;
  assert.ok(balanced > developmentScore(tower));
});
