const WIDTH=1400,HEIGHT=820,MATCH_SECONDS=Number(process.env.MATCH_SECONDS||360);
const FACTIONS={red:{id:"red",name:"Liên minh Đỏ",color:"#ff5d73",base:{x:115,y:410}},blue:{id:"blue",name:"Liên minh Xanh",color:"#4da6ff",base:{x:1285,y:410}}};
const ZONES=[
 {id:"production",label:"KHU SẢN XUẤT",short:"GDP",color:"#ffd166",x:700,y:165,r:78,resource:"gdp"},
 {id:"welfare",label:"KHU PHÚC LỢI",short:"AN SINH",color:"#55e6ff",x:700,y:410,r:78,resource:"welfare"},
 {id:"regulation",label:"KHU ĐIỀU TIẾT",short:"ỔN ĐỊNH",color:"#b9ff66",x:700,y:655,r:78,resource:"stability"},
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const factionFor=index=>index%2===0?"red":"blue";
function activeTeams(teams){return teams.filter(t=>t.players.length)}
function log(game,text,color="#fff"){game.activity.unshift({id:`${Date.now()}-${Math.random()}`,text,color});game.activity=game.activity.slice(0,7)}
function unit(id,faction,x,y,kind="soldier"){return{id,faction,x,y,hp:kind==="commander"?100:55,maxHp:kind==="commander"?100:55,alive:true,respawnAt:0,kind,vx:0,vy:0}}
function createGame(teams,now=Date.now()){
 const commanders={},soldiers={};let redN=0,blueN=0;
 for(const team of activeTeams(teams)){const faction=factionFor(team.index),base=FACTIONS[faction].base,row=faction==="red"?redN++:blueN++,y=base.y+(row-1.5)*70,x=base.x+(faction==="red"?0:0);commanders[team.id]={...unit(`c-${team.id}`,faction,x,y,"commander"),teamId:team.id,playerId:team.players[0].id,input:{x:0,y:0},command:"follow",anchor:null,kills:0};soldiers[team.id]=Array.from({length:5},(_,i)=>unit(`s-${team.id}-${i}`,faction,x+(faction==="red"?-25:25)+(i%2)*18,y-36+Math.floor(i/2)*30));}
 return{width:WIDTH,height:HEIGHT,commanders,soldiers,zones:ZONES.map(z=>({...z,owner:null,progress:0})),factions:{red:{gdp:20,welfare:20,stability:20,victory:0},blue:{gdp:20,welfare:20,stability:20,victory:0}},startedAt:now,endsAt:now+MATCH_SECONDS*1000,activity:[],event:null,nextEventAt:now+90000};
}
function nearestEnemy(game,source,max=260){let best=null,bestD=max;for(const c of Object.values(game.commanders)){if(c.faction===source.faction||!c.alive)continue;const d=distance(source,c);if(d<bestD){best=c;bestD=d}}for(const list of Object.values(game.soldiers))for(const s of list){if(s.faction===source.faction||!s.alive)continue;const d=distance(source,s);if(d<bestD){best=s;bestD=d}}return best}
function moveToward(u,target,speed,dt){const dx=target.x-u.x,dy=target.y-u.y,len=Math.hypot(dx,dy)||1;u.vx=dx/len*speed;u.vy=dy/len*speed;u.x=clamp(u.x+u.vx*dt,18,WIDTH-18);u.y=clamp(u.y+u.vy*dt,18,HEIGHT-18)}
function respawn(u,game,now){const base=FACTIONS[u.faction].base;u.x=base.x+(Math.random()-.5)*60;u.y=base.y+(Math.random()-.5)*180;u.hp=u.maxHp;u.alive=true;u.respawnAt=0}
function damage(attacker,target,dt,now){target.hp-=22*dt;if(target.hp<=0){target.hp=0;target.alive=false;target.respawnAt=now+(target.kind==="commander"?3500:2500);if(attacker.kind==="commander")attacker.kills++;}}
function updateCommander(c,dt,now,game){if(!c.alive){if(now>=c.respawnAt)respawn(c,game,now);return}const len=Math.hypot(c.input.x,c.input.y)||1;if(c.input.x||c.input.y){c.x=clamp(c.x+c.input.x/len*165*dt,20,WIDTH-20);c.y=clamp(c.y+c.input.y/len*165*dt,20,HEIGHT-20)}const enemy=nearestEnemy(game,c,35);if(enemy)damage(c,enemy,dt,now)}
function formationPoint(c,index){const angle=(index-2)*.42,behind=c.faction==="red"?-1:1;return{x:c.x-behind*55+Math.cos(angle)*24,y:c.y+Math.sin(angle)*78}}
function attackTarget(game,s){const enemy=nearestEnemy(game,s,420);if(enemy)return enemy;const contested=game.zones.find(z=>z.owner!==s.faction)||game.zones[1];return contested}
function updateSoldier(s,c,index,dt,now,game){if(!s.alive){if(now>=s.respawnAt)respawn(s,game,now);return}let target;if(c.command==="follow")target=formationPoint(c,index);else if(c.command==="defend")target=c.anchor||c;else target=attackTarget(game,s);const enemy=nearestEnemy(game,s,32);if(enemy)damage(s,enemy,dt,now);else if(target&&distance(s,target)>18)moveToward(s,target,c.command==="attack"?125:112,dt)}
function capture(game,dt){for(const z of game.zones){let red=0,blue=0;for(const c of Object.values(game.commanders))if(c.alive&&distance(c,z)<z.r)(c.faction==="red"?red++:blue++);for(const list of Object.values(game.soldiers))for(const s of list)if(s.alive&&distance(s,z)<z.r)(s.faction==="red"?red++:blue++);const delta=(red-blue)*18*dt;if(delta)z.progress=clamp(z.progress+delta,-100,100);else z.progress*=Math.max(0,1-dt*.15);const before=z.owner;if(z.progress>=100)z.owner="red";if(z.progress<=-100)z.owner="blue";if(before!==z.owner&&z.owner)log(game,`${FACTIONS[z.owner].name} chiếm ${z.label}`,FACTIONS[z.owner].color)}}
function economy(game,dt){for(const z of game.zones){if(z.owner)game.factions[z.owner][z.resource]+=1.35*dt}for(const id of ["red","blue"]){const e=game.factions[id],balanced=e.gdp>=40&&e.welfare>=32&&e.stability>=32;if(balanced)e.victory+=3*dt;else e.victory+=Math.min(e.gdp,e.welfare,e.stability)*.012*dt}}
function triggerEvent(game,now){game.event={title:"KHỦNG HOẢNG TOÀN CẦU",text:"Phe thiếu ổn định mất một phần GDP",endsAt:now+9000};for(const id of ["red","blue"]){const e=game.factions[id];if(e.stability<32)e.gdp=Math.max(0,e.gdp-8)}game.nextEventAt=now+90000;log(game,"Khủng hoảng kiểm tra sức chống chịu","#ff5d73")}
function tick(game,teams,dt,now=Date.now()){if(now>=game.endsAt)return{finished:true};if(game.event&&now>=game.event.endsAt)game.event=null;if(now>=game.nextEventAt)triggerEvent(game,now);for(const c of Object.values(game.commanders)){updateCommander(c,dt,now,game);game.soldiers[c.teamId].forEach((s,i)=>updateSoldier(s,c,i,dt,now,game))}capture(game,dt);economy(game,dt);return{finished:false}}
function setInput(game,teamId,x,y){const c=game.commanders[teamId];if(!c)return false;c.input={x:clamp(Number(x)||0,-1,1),y:clamp(Number(y)||0,-1,1)};return true}
function setCommand(game,teamId,command){const c=game.commanders[teamId];if(!c||!["follow","defend","attack"].includes(command))return false;c.command=command;if(command==="defend")c.anchor={x:c.x,y:c.y};return true}
function winner(game){return game.factions.red.victory>=game.factions.blue.victory?"red":"blue"}
module.exports={WIDTH,HEIGHT,MATCH_SECONDS,FACTIONS,ZONES,createGame,tick,setInput,setCommand,winner,factionFor};
