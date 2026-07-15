const WIDTH=2600,HEIGHT=1600,MATCH_SECONDS=Number(process.env.MATCH_SECONDS||480);
const COLORS=["#ff5d73","#4da6ff","#ffd166","#65e6a5","#c77dff","#ff914d","#52e5ff","#f875c7"];
const BASES=[{x:150,y:150},{x:1300,y:120},{x:2450,y:150},{x:2480,y:800},{x:2450,y:1450},{x:1300,y:1480},{x:150,y:1450},{x:120,y:800}];
const ZONES=[
 ["g1","MỎ VÀNG","gdp",650,270],["g2","NHÀ MÁY","gdp",1950,270],["g3","THƯƠNG CẢNG","gdp",1300,800],
 ["w1","BỆNH VIỆN","welfare",650,800],["w2","TRƯỜNG HỌC","welfare",1950,800],["w3","KHU DÂN CƯ","welfare",1300,1230],
 ["r1","ỦY BAN","regulation",650,1330],["r2","TRUNG TÂM ĐIỀU TIẾT","regulation",1950,1330],["r3","NGÂN HÀNG NHÀ NƯỚC","regulation",1300,370],
 ["m1","CAO ĐIỂM", "military",420,520],["m2","CAO ĐIỂM", "military",2180,1080],["m3","QUẢNG TRƯỜNG", "military",1300,1050]
].map(([id,label,type,x,y])=>({id,label,type,x,y,r:type==="military"?62:82}));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const active=teams=>teams.filter(t=>t.players.length);
function log(g,text,color="#fff"){g.activity.unshift({id:`${Date.now()}-${Math.random()}`,text,color});g.activity=g.activity.slice(0,8)}
function balance(e){
 const hi=Math.max(e.gdp,e.welfare,e.regulation),lo=Math.min(e.gdp,e.welfare,e.regulation),gap=hi-lo;
 let effect={id:"balanced",label:"ĐỒNG THUẬN",desc:"Kinh tế cân bằng: toàn quân +8%",speed:1.08,income:1.05,capture:1.08,respawn:1};
 if(gap<18)return effect;
 if(e.gdp===hi&&e.welfare===lo)return{id:"unrest",label:"BẤT BÌNH",desc:"GDP bỏ xa an sinh: quân chậm, hồi sinh lâu",speed:.72,income:1,capture:.85,respawn:1.45};
 if(e.welfare===hi&&e.gdp===lo)return{id:"deficit",label:"THÂM HỤT",desc:"An sinh vượt nguồn lực: ngân sách đang chảy",speed:1,income:.45,capture:1,respawn:.9};
 if(e.regulation===lo)return{id:"chaos",label:"HỖN LOẠN",desc:"Thiếu điều tiết: chiếm và giữ cờ yếu",speed:.9,income:.9,capture:.55,respawn:1.2};
 if(e.regulation===hi&&e.gdp===lo)return{id:"bureaucracy",label:"QUAN LIÊU",desc:"Điều tiết lấn át sản xuất: thu nhập giảm",speed:.85,income:.55,capture:1.15,respawn:1};
 return{id:"strained",label:"MẤT CÂN ĐỐI",desc:"Các trụ cột chênh lệch: hiệu suất giảm",speed:.88,income:.8,capture:.85,respawn:1.15};
}
function unit(id,teamId,x,y,kind="soldier",level=1){const maxHp=kind==="commander"?120:50+level*12;return{id,teamId,x,y,kind,level,hp:maxHp,maxHp,alive:true,respawnAt:0}}
function createGame(teams,now=Date.now()){
 const commanders={},soldiers={},economies={};
 active(teams).forEach((t,i)=>{const b=BASES[i];t.gameIndex=i;commanders[t.id]={...unit(`c-${t.id}`,t.id,b.x,b.y,"commander"),input:{x:0,y:0},command:"follow",anchor:null};soldiers[t.id]=Array.from({length:3},(_,n)=>unit(`s-${t.id}-${n}`,t.id,b.x+(n-1)*24,b.y+45));economies[t.id]={teamId:t.id,color:COLORS[i],name:t.players[0].nickname,money:80,gdp:25,welfare:25,regulation:25,welfareBoost:0,regulationBoost:0,territory:0,kills:0,spent:0,effect:null};});
 return{width:WIDTH,height:HEIGHT,commanders,soldiers,economies,bases:active(teams).map((t,i)=>({teamId:t.id,...BASES[i],color:COLORS[i]})),zones:ZONES.map(z=>({...z,owner:null,claim:null,progress:0})),startedAt:now,endsAt:now+MATCH_SECONDS*1000,activity:[],nextIncomeAt:now+1000};
}
function nearestEnemy(g,u,max=300){let best=null,d0=max;for(const [tid,c] of Object.entries(g.commanders)){if(tid===u.teamId||!c.alive)continue;const d=dist(u,c);if(d<d0){best=c;d0=d}}for(const [tid,list] of Object.entries(g.soldiers)){if(tid===u.teamId)continue;for(const s of list)if(s.alive&&dist(u,s)<d0){best=s;d0=dist(u,s)}}return best}
function move(u,t,speed,dt){const dx=t.x-u.x,dy=t.y-u.y,l=Math.hypot(dx,dy)||1;u.x=clamp(u.x+dx/l*speed*dt,20,WIDTH-20);u.y=clamp(u.y+dy/l*speed*dt,20,HEIGHT-20)}
function respawn(g,u,now){const b=g.bases.find(x=>x.teamId===u.teamId);u.x=b.x+(Math.random()-.5)*60;u.y=b.y+(Math.random()-.5)*60;u.hp=u.maxHp;u.alive=true;u.respawnAt=0}
function hit(g,a,t,dt,now){t.hp-=18*(1+a.level*.22)*dt;if(t.hp>0)return;t.hp=0;t.alive=false;const ef=balance(g.economies[t.teamId]);t.respawnAt=now+(t.kind==="commander"?4500:3000)*ef.respawn;g.economies[a.teamId].money+=8;g.economies[a.teamId].kills++;}
function formation(c,i){return{x:c.x+(i%3-1)*34,y:c.y+48+Math.floor(i/3)*34}}
function update(g,c,dt,now){const e=g.economies[c.teamId],ef=balance(e);e.effect=ef;if(!c.alive){if(now>=c.respawnAt)respawn(g,c,now);return}const l=Math.hypot(c.input.x,c.input.y)||1;c.x=clamp(c.x+c.input.x/l*175*ef.speed*dt,20,WIDTH-20);c.y=clamp(c.y+c.input.y/l*175*ef.speed*dt,20,HEIGHT-20);const enemy=nearestEnemy(g,c,35);if(enemy)hit(g,c,enemy,dt,now);g.soldiers[c.teamId].forEach((s,i)=>{if(!s.alive){if(now>=s.respawnAt)respawn(g,s,now);return}const near=nearestEnemy(g,s,34);if(near)return hit(g,s,near,dt,now);let target=c.command==="follow"?formation(c,i):c.command==="defend"?(c.anchor||c):nearestEnemy(g,s,600);if(!target&&c.command==="attack")target=g.zones.find(z=>z.owner!==c.teamId);if(target&&dist(s,target)>18)move(s,target,(c.command==="attack"?132:115)*ef.speed,dt)})}
function capture(g,dt){for(const z of g.zones){const counts={};for(const [tid,c] of Object.entries(g.commanders))if(c.alive&&dist(c,z)<z.r)counts[tid]=(counts[tid]||0)+2;for(const [tid,list] of Object.entries(g.soldiers))for(const s of list)if(s.alive&&dist(s,z)<z.r)counts[tid]=(counts[tid]||0)+1;const lead=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];if(!lead){z.progress=Math.max(0,z.progress-4*dt);continue}const [tid,n]=lead;if(Object.values(counts).filter(v=>v===n).length>1)continue;if(z.claim!==tid){z.claim=tid;z.progress=0}z.progress+=n*11*balance(g.economies[tid]).capture*dt;if(z.progress>=100){const old=z.owner;z.owner=tid;z.progress=100;if(old!==tid)log(g,`${g.economies[tid].name} chiếm ${z.label}`,g.economies[tid].color)}}}
function income(g,now){if(now<g.nextIncomeAt)return;g.nextIncomeAt=now+1000;for(const e of Object.values(g.economies)){const owned=g.zones.filter(z=>z.owner===e.teamId),gdp=owned.filter(z=>z.type==="gdp").length,w=owned.filter(z=>z.type==="welfare").length,r=owned.filter(z=>z.type==="regulation").length;e.gdp=clamp(20+gdp*22,5,100);e.welfare=clamp(20+w*22+e.welfareBoost,5,100);e.regulation=clamp(20+r*22+e.regulationBoost,5,100);e.territory=owned.length;const ef=balance(e);e.effect=ef;e.money+=Math.max(0,4+e.gdp*.18)*ef.income;if(ef.id==="deficit")e.money=Math.max(0,e.money-5)}}
function buy(g,teamId,item){const e=g.economies[teamId],c=g.commanders[teamId];if(!e||!c)return{ok:false,message:"Không tìm thấy đội"};const defs={recruit:{cost:45},elite:{cost:70},welfare:{cost:55},regulation:{cost:55}};const d=defs[item];if(!d)return{ok:false,message:"Vật phẩm không hợp lệ"};if(item==="recruit"&&g.soldiers[teamId].length>=12)return{ok:false,message:"Đã đủ 12 quân"};if(e.money<d.cost)return{ok:false,message:"Chưa đủ tiền"};e.money-=d.cost;e.spent+=d.cost;if(item==="recruit"){const b=g.bases.find(x=>x.teamId===teamId);g.soldiers[teamId].push(unit(`s-${teamId}-${Date.now()}`,teamId,b.x,b.y));}if(item==="elite")for(const s of g.soldiers[teamId]){s.level=Math.min(4,s.level+1);s.maxHp+=10;s.hp=Math.min(s.maxHp,s.hp+10)}if(item==="welfare"){e.welfareBoost+=14;e.welfare=clamp(e.welfare+14,0,100)}if(item==="regulation"){e.regulationBoost+=14;e.regulation=clamp(e.regulation+14,0,100)}log(g,`${e.name} đầu tư ${item}`,e.color);return{ok:true}}
function tick(g,teams,dt,now=Date.now()){if(now>=g.endsAt)return{finished:true};for(const c of Object.values(g.commanders))update(g,c,dt,now);capture(g,dt);income(g,now);return{finished:false}}
function setInput(g,id,x,y){const c=g.commanders[id];if(!c)return false;c.input={x:clamp(Number(x)||0,-1,1),y:clamp(Number(y)||0,-1,1)};return true}
function setCommand(g,id,cmd){const c=g.commanders[id];if(!c||!["follow","defend","attack"].includes(cmd))return false;c.command=cmd;if(cmd==="defend")c.anchor={x:c.x,y:c.y};return true}
function winner(g){return Object.values(g.economies).sort((a,b)=>(b.territory*25+b.money+Math.min(b.gdp,b.welfare,b.regulation)*2)-(a.territory*25+a.money+Math.min(a.gdp,a.welfare,a.regulation)*2))[0]?.teamId}
const factionFor=i=>COLORS[i%8];
module.exports={WIDTH,HEIGHT,MATCH_SECONDS,COLORS,BASES,ZONES,createGame,tick,setInput,setCommand,buy,winner,factionFor,balance};
