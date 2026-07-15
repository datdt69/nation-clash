const WIDTH = 1400, HEIGHT = 820;
const MATCH_SECONDS = Number(process.env.MATCH_SECONDS || 360);
const SPEED = 145, TURN_SPEED = 2.75;
const MISSIONS = {
  growth: { label: "Hàng sản xuất", color: "#ffd166", icon: "▣", gdp: 5, welfare: 0, stability: 0 },
  welfare: { label: "Thuốc & an sinh", color: "#55e6ff", icon: "♥", gdp: 1, welfare: 5, stability: 1 },
  infrastructure: { label: "Thiết bị hạ tầng", color: "#b9ff66", icon: "◆", gdp: 2, welfare: 1, stability: 5 },
};
const NODES = [
  { id:"f1",kind:"source",type:"growth",x:260,y:200,label:"NHÀ MÁY" },
  { id:"m1",kind:"target",type:"growth",x:1140,y:620,label:"THỊ TRƯỜNG" },
  { id:"f2",kind:"source",type:"welfare",x:1160,y:190,label:"KHO DƯỢC" },
  { id:"m2",kind:"target",type:"welfare",x:220,y:650,label:"BỆNH VIỆN" },
  { id:"f3",kind:"source",type:"infrastructure",x:700,y:130,label:"TRUNG TÂM CÔNG" },
  { id:"m3",kind:"target",type:"infrastructure",x:700,y:690,label:"HẠ TẦNG" },
];
const SPAWNS=[[130,130],[700,90],[1270,130],[1310,410],[1270,700],[700,745],[130,700],[90,410]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function active(teams){return teams.filter(t=>t.players.length)}
function score(team){return Math.round(team.gdp*.42+team.welfare*.33+team.stability*.25)}

function createGame(teams,now=Date.now()){
 const riders={};
 for(const team of active(teams)){
  const [x,y]=SPAWNS[team.index];
  riders[team.id]={teamId:team.id,playerId:team.players[0].id,x,y,angle:team.index*Math.PI/4,input:0,trail:[],cargo:null,missionIndex:team.index%3,alive:true,respawnAt:0,deliveries:0,combo:0,flash:null};
  team.gdp=10;team.welfare=10;team.stability=10;team.score=10;
 }
 return{width:WIDTH,height:HEIGHT,riders,nodes:NODES,startedAt:now,endsAt:now+MATCH_SECONDS*1000,publicFund:0,publicLevel:0,event:null,nextEventAt:now+75000,activity:[]};
}
function log(game,text,color="#fff"){game.activity.unshift({id:`${Date.now()}-${Math.random()}`,text,color});game.activity=game.activity.slice(0,6)}
function resetRider(rider,team,now){const [x,y]=SPAWNS[team.index];rider.x=x;rider.y=y;rider.angle=team.index*Math.PI/4;rider.trail=[];rider.cargo=null;rider.alive=false;rider.respawnAt=now+1200;rider.combo=0;rider.flash={text:"VA CHẠM — HỒI SINH",color:"#ff5d73",until:now+1500}}
function collide(game,rider){
 if(rider.x<18||rider.x>WIDTH-18||rider.y<18||rider.y>HEIGHT-18)return true;
 for(const other of Object.values(game.riders)){
  const skip=other===rider?12:0;
  for(let i=0;i<other.trail.length-skip;i+=2){const p=other.trail[i];if(Math.hypot(rider.x-p.x,rider.y-p.y)<11)return true}
 }
 return false;
}
function handleNode(game,rider,team,teams){
 if(!rider.cargo){
  const wanted=Object.keys(MISSIONS)[rider.missionIndex%3];
  const source=game.nodes.find(n=>n.kind==="source"&&n.type===wanted);
  if(dist(rider,source)<48){rider.cargo=wanted;rider.flash={text:`ĐÃ NHẬN ${MISSIONS[wanted].label.toUpperCase()}`,color:MISSIONS[wanted].color,until:Date.now()+1000}}
  return;
 }
 const target=game.nodes.find(n=>n.kind==="target"&&n.type===rider.cargo);
 if(dist(rider,target)<52){
  const m=MISSIONS[rider.cargo];team.gdp+=m.gdp;team.welfare+=m.welfare;team.stability+=m.stability;rider.deliveries++;rider.combo++;team.score=score(team);game.publicFund++;
  rider.flash={text:`GIAO THÀNH CÔNG · COMBO x${rider.combo}`,color:m.color,until:Date.now()+1100};log(game,`${team.name} hoàn thành ${m.label}`,team.color);
  rider.cargo=null;rider.missionIndex=(rider.missionIndex+1)%3;
  if(game.publicFund>=Math.max(5,Object.keys(game.riders).length)){game.publicFund=0;game.publicLevel++;for(const t of active(teams)){t.stability+=2}log(game,"Quỹ chung nâng cấp hạ tầng cho toàn thị trường","#a98bff")}
 }
}
function event(game,teams,now){game.event={title:"BIẾN ĐỘNG THỊ TRƯỜNG",text:"Đội thiếu ổn định bị giảm tốc trong 10 giây",endsAt:now+10000};game.nextEventAt=now+75000;for(const t of active(teams)){if(t.stability<18)t.gdp=Math.max(0,t.gdp-4)}log(game,"Biến động kiểm tra sức chống chịu","#ff5d73")}
function tick(game,teams,dt,now=Date.now()){
 if(now>=game.endsAt)return{finished:true};if(game.event&&now>=game.event.endsAt)game.event=null;if(now>=game.nextEventAt)event(game,teams,now);
 for(const team of active(teams)){const r=game.riders[team.id];if(!r)continue;if(!r.alive){if(now>=r.respawnAt)r.alive=true;else continue}r.angle+=r.input*TURN_SPEED*dt;const penalty=game.event&&team.stability<18?.72:1;r.x+=Math.cos(r.angle)*SPEED*penalty*dt;r.y+=Math.sin(r.angle)*SPEED*penalty*dt;r.trail.push({x:r.x,y:r.y});if(r.trail.length>240)r.trail.shift();if(collide(game,r)){resetRider(r,team,now);continue}handleNode(game,r,team,teams);if(r.flash&&now>r.flash.until)r.flash=null;team.score=score(team)}return{finished:false};
}
function input(game,teamId,direction){const r=game.riders[teamId];if(!r)return false;r.input=clamp(Number(direction)||0,-1,1);return true}
function objective(game,teamId){const r=game.riders[teamId];if(!r)return null;const type=r.cargo||Object.keys(MISSIONS)[r.missionIndex%3];const node=game.nodes.find(n=>n.type===type&&n.kind===(r.cargo?"target":"source"));return{type,kind:r.cargo?"deliver":"pickup",node}}
module.exports={WIDTH,HEIGHT,MATCH_SECONDS,MISSIONS,NODES,createGame,tick,input,objective,score};
