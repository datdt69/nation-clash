const test = require("node:test");
const assert = require("node:assert/strict");
const {
  EVENTS,
  majority,
  applyPolicy,
  resolveDuel,
  calculateScore,
  createTeam,
} = require("../game-engine");

test("majority đếm phiếu và chọn phương án nhiều nhất", () => {
  const result = majority(
    ["growth", "welfare", "growth", "infrastructure", "growth"],
    ["growth", "welfare", "infrastructure", "speculation"],
  );
  assert.equal(result.winner, "growth");
  assert.equal(result.counts.growth, 3);
});

test("chính sách tăng trưởng thay đổi đủ ba chỉ số", () => {
  const team = createTeam(0);
  const result = applyPolicy(team, "growth", EVENTS[0], 0, 0);
  assert.equal(result.policy.id, "growth");
  assert.equal(team.gdp, 55);
  assert.equal(team.welfare, 37);
  assert.equal(team.stability, 38);
});

test("hai đội bắt tay cùng có lợi", () => {
  const a = createTeam(0);
  const b = createTeam(1);
  resolveDuel(a, b, "cooperate", "cooperate");
  assert.deepEqual(
    [a.gdp, a.welfare, a.stability],
    [45, 42, 42],
  );
  assert.deepEqual(
    [b.gdp, b.welfare, b.stability],
    [45, 42, 42],
  );
});

test("đội chơi rắn lấy lợi thế khi đối thủ bắt tay", () => {
  const a = createTeam(0);
  const b = createTeam(1);
  resolveDuel(a, b, "compete", "cooperate");
  assert.equal(a.gdp, 50);
  assert.equal(b.gdp, 37);
  assert.ok(a.stability > b.stability);
});

test("điểm phát triển không chỉ phụ thuộc GDP", () => {
  const richButFragile = { gdp: 90, welfare: 20, stability: 20 };
  const balanced = { gdp: 70, welfare: 70, stability: 70 };
  assert.ok(calculateScore(balanced) > calculateScore(richButFragile));
});

test("cú sốc thiên tai phạt đội thiếu ổn định", () => {
  const team = { gdp: 60, welfare: 50, stability: 30 };
  const effect = EVENTS[4].afterRound(team);
  assert.equal(effect.delta.gdp, -8);
  assert.match(effect.note, /thiếu ổn định/i);
});
