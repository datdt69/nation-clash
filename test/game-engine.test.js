const test = require("node:test");
const assert = require("node:assert/strict");
const { createTeam, serializeTeam } = require("../game-engine");

test("tạo đúng tám màu đội và mã đội ổn định", () => {
  const teams = Array.from({ length: 8 }, (_, index) => createTeam(index));
  assert.equal(new Set(teams.map((team) => team.color)).size, 8);
  assert.deepEqual(teams.map((team) => team.id), [
    "team-1",
    "team-2",
    "team-3",
    "team-4",
    "team-5",
    "team-6",
    "team-7",
    "team-8",
  ]);
});

test("trạng thái công khai chỉ chứa thông tin kết nối cần thiết", () => {
  const team = createTeam(0);
  team.name = "Nhóm Alpha";
  team.players.push({ id: "p1", nickname: "Nhóm Alpha", connected: true, token: "secret" });
  const state = serializeTeam(team);
  assert.equal(state.name, "Nhóm Alpha");
  assert.equal(state.players[0].connected, true);
  assert.equal(state.players[0].token, undefined);
});
