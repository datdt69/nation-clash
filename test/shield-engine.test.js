const test=require("node:test");const assert=require("node:assert/strict");
const{createTeam}=require("../game-engine");const{createGame,tick,setInput,setCommand,factionFor}=require("../shield-engine");
function setup(count=2){const teams=Array.from({length:8},(_,i)=>createTeam(i));for(let i=0;i<count;i++)teams[i].players.push({id:`p${i}`,nickname:`P${i}`});return{teams,game:createGame(teams,1000)}}
test("người vào được chia xen kẽ hai phe",()=>{assert.equal(factionFor(0),"red");assert.equal(factionFor(1),"blue");assert.equal(factionFor(2),"red")});
test("mỗi chỉ huy có năm NPC",()=>{const{teams,game}=setup();assert.equal(Object.keys(game.commanders).length,2);assert.equal(game.soldiers[teams[0].id].length,5)});
test("input di chuyển chỉ huy realtime",()=>{const{teams,game}=setup(1),c=game.commanders[teams[0].id],before=c.x;setInput(game,teams[0].id,1,0);tick(game,teams,.1,1100);assert.ok(c.x>before)});
test("ba lệnh follow defend attack được cập nhật rõ ràng",()=>{const{teams,game}=setup(1),id=teams[0].id;assert.equal(setCommand(game,id,"defend"),true);assert.equal(game.commanders[id].command,"defend");assert.ok(game.commanders[id].anchor);assert.equal(setCommand(game,id,"attack"),true)});
test("đủ quân đứng trong cứ điểm sẽ chiếm cho phe",()=>{const{teams,game}=setup(1),id=teams[0].id,z=game.zones[0],c=game.commanders[id];c.x=z.x;c.y=z.y;for(const s of game.soldiers[id]){s.x=z.x;s.y=z.y}for(let i=0;i<12;i++)tick(game,teams,.1,1100+i*100);assert.equal(z.owner,"red")});
test("giữ ba trụ cân bằng tăng điểm chiến thắng nhanh",()=>{const{teams,game}=setup(1);game.factions.red.gdp=45;game.factions.red.welfare=40;game.factions.red.stability=40;const before=game.factions.red.victory;tick(game,teams,1,2000);assert.ok(game.factions.red.victory>=before+3)});
