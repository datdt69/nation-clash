const test=require("node:test");const assert=require("node:assert/strict");
const{createTeam}=require("../game-engine");const{createGame,tick,setInput,setCommand,buy,balance,BASES}=require("../shield-engine");
function setup(count=2){const teams=Array.from({length:8},(_,i)=>createTeam(i));for(let i=0;i<count;i++)teams[i].players.push({id:`p${i}`,nickname:`P${i}`});return{teams,game:createGame(teams,1000)}}
test("tám đội có tám khu spawn khác nhau",()=>{const{teams,game}=setup(8);assert.equal(game.bases.length,8);assert.equal(new Set(game.bases.map(b=>`${b.x}-${b.y}`)).size,8);assert.equal(Object.keys(game.commanders).length,8)});
test("mỗi chỉ huy khởi đầu ba NPC và có thể mua thêm",()=>{const{teams,game}=setup(1),id=teams[0].id;assert.equal(game.soldiers[id].length,3);assert.equal(buy(game,id,"recruit").ok,true);assert.equal(game.soldiers[id].length,4)});
test("input di chuyển chỉ huy realtime",()=>{const{teams,game}=setup(1),c=game.commanders[teams[0].id],before=c.x;setInput(game,teams[0].id,1,0);tick(game,teams,.1,1100);assert.ok(c.x>before)});
test("ba lệnh follow defend attack được cập nhật",()=>{const{teams,game}=setup(1),id=teams[0].id;assert.equal(setCommand(game,id,"defend"),true);assert.ok(game.commanders[id].anchor);assert.equal(setCommand(game,id,"attack"),true)});
test("đứng đủ lâu trong điểm sẽ chiếm cho chính đội",()=>{const{teams,game}=setup(1),id=teams[0].id,z=game.zones[0],c=game.commanders[id];c.x=z.x;c.y=z.y;for(const s of game.soldiers[id]){s.x=z.x;s.y=z.y}for(let i=0;i<30;i++)tick(game,teams,.1,1100+i*100);assert.equal(z.owner,id)});
test("GDP bỏ xa an sinh gây bất bình và giảm tốc",()=>{const e={gdp:90,welfare:20,regulation:65};const ef=balance(e);assert.equal(ef.id,"unrest");assert.ok(ef.speed<1);assert.ok(ef.respawn>1)});
test("an sinh vượt nguồn lực gây thâm hụt",()=>{assert.equal(balance({gdp:15,welfare:90,regulation:55}).id,"deficit")});
test("điều tiết thấp gây hỗn loạn chiếm cờ",()=>{const ef=balance({gdp:75,welfare:65,regulation:15});assert.equal(ef.id,"chaos");assert.ok(ef.capture<1)});
