const test = require("node:test");
const assert = require("node:assert/strict");
const { createTeam } = require("../game-engine");
const { createGame, play, challenge, resolveRound, serialize } = require("../bluff-engine");

function setup(count = 2) {
  const teams = Array.from({ length: 8 }, (_, i) => createTeam(i));
  for (let i = 0; i < count; i += 1) teams[i].players.push({ id:`p${i}`, nickname:`P${i}` });
  return { teams, game:createGame(teams, 1000) };
}

test("mỗi đội nhận sáu lá nhưng chỉ thấy tay bài của mình", () => {
  const { teams, game } = setup();
  const view = serialize(game, teams[0].id);
  assert.equal(view.hands[teams[0].id].length, 6);
  assert.equal(view.hands[teams[1].id].count, 6);
});

test("đến lượt được úp tối đa ba lá", () => {
  const { teams, game } = setup();
  const id=teams[0].id, cards=game.hands[id].slice(0,2).map(c=>c.id);
  assert.equal(play(game,id,cards,1100).ok,true);
  assert.equal(game.lastPlay.count,2);
  assert.equal(game.hands[id].length,4);
});

test("tố đúng người nói dối làm người nói dối mất uy tín", () => {
  const { teams, game } = setup();
  const a=teams[0].id,b=teams[1].id;
  const falseCard={id:"forced-lie",type:game.required==="market"?"social":"market"};
  game.hands[a][0]=falseCard;
  play(game,a,[falseCard.id],1100);
  const result=challenge(game,b,1200);
  assert.equal(result.truthful,false);
  assert.equal(game.credibility[a],2);
});

test("tố nhầm người nói thật khiến người tố mất uy tín", () => {
  const { teams, game } = setup();
  const a=teams[0].id,b=teams[1].id;
  const trueCard=game.hands[a].find(c=>c.type===game.required||c.type==="wild");
  play(game,a,[trueCard.id],1100);
  const result=challenge(game,b,1200);
  assert.equal(result.truthful,true);
  assert.equal(game.credibility[b],2);
});

test("vòng có đủ ba trụ thưởng điểm cân bằng cho tất cả", () => {
  const { teams, game } = setup();
  game.pile=[{teamId:teams[0].id,cards:[{type:"market"},{type:"social"},{type:"state"}],count:3}];
  resolveRound(game,2000);
  assert.ok(game.scores[teams[0].id]>=4);
  assert.ok(game.scores[teams[1].id]>=4);
});
