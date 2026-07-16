const HAND_SIZE=5,MAX_ROUNDS=8,TURN_MS=30000,REVEAL_MS=6500;
const TARGETS=[
 {id:"growth",name:"TĂNG TRƯỞNG",icon:"↗",color:"#ffd166"},
 {id:"welfare",name:"AN SINH",icon:"♥",color:"#59e3c2"},
 {id:"regulation",name:"ĐIỀU TIẾT",icon:"⚖",color:"#68a9ff"},
];
const CARD_TYPES={
 private:{name:"Doanh nghiệp tư nhân",short:"TƯ NHÂN",icon:"◆",category:"growth",desc:"Lợi nhuận nhanh, cạnh tranh mạnh",delta:{gdp:9,budget:5,welfare:-2,stability:-1}},
 state:{name:"Doanh nghiệp nhà nước",short:"NHÀ NƯỚC",icon:"★",category:"regulation",desc:"Giữ ngành thiết yếu, ổn định thị trường",delta:{gdp:4,budget:-2,welfare:3,stability:7}},
 fdi:{name:"Doanh nghiệp FDI",short:"FDI",icon:"◎",category:"growth",desc:"Vốn và công nghệ, có rủi ro phụ thuộc",delta:{gdp:11,budget:2,welfare:0,stability:-2}},
 coop:{name:"Hợp tác xã",short:"HỢP TÁC XÃ",icon:"⬡",category:"welfare",desc:"Việc làm và phân phối công bằng",delta:{gdp:4,budget:1,welfare:8,stability:3}},
 public:{name:"Đầu tư công",short:"ĐẦU TƯ CÔNG",icon:"▦",category:"regulation",desc:"Tạo hạ tầng nhưng tiêu tốn ngân sách",delta:{gdp:7,budget:-8,welfare:3,stability:5}},
 social:{name:"An sinh xã hội",short:"AN SINH",icon:"♥",category:"welfare",desc:"Giảm bất bình đẳng, cần ngân sách",delta:{gdp:0,budget:-6,welfare:11,stability:5}},
 tax:{name:"Thuế & điều tiết",short:"THUẾ",icon:"⚖",category:"regulation",desc:"Tạo ngân sách và sửa mất cân đối",delta:{gdp:-2,budget:9,welfare:3,stability:4}},
 balance:{name:"Lợi ích hài hòa",short:"CÂN BẰNG",icon:"✦",category:"wild",desc:"Lá đặc biệt: hợp lệ với mọi mục tiêu",delta:{gdp:3,budget:3,welfare:3,stability:3}},
};
const CARD_COUNTS={private:6,state:4,fdi:6,coop:6,public:4,social:6,tax:4,balance:4};
const DECK_SIZE=Object.values(CARD_COUNTS).reduce((sum,n)=>sum+n,0);
const CRISES=[
 {id:"inflation",name:"LẠM PHÁT",icon:"↑",desc:"Giá tăng làm xói mòn ngân sách và niềm tin",delta:{budget:-10,stability:-6}},
 {id:"unemployment",name:"THẤT NGHIỆP",icon:"⌁",desc:"Sản xuất và đời sống cùng suy giảm",delta:{gdp:-8,welfare:-9}},
 {id:"deficit",name:"THÂM HỤT NGÂN SÁCH",icon:"−",desc:"Nguồn lực chính sách bị thu hẹp",delta:{budget:-14,stability:-3}},
 {id:"inequality",name:"BẤT BÌNH ĐẲNG",icon:"≠",desc:"Tăng trưởng không chuyển thành phúc lợi",delta:{welfare:-12,stability:-7}},
 {id:"distrust",name:"SUY GIẢM NIỀM TIN",icon:"!",desc:"Khả năng phối hợp xã hội suy yếu",delta:{stability:-15}},
 {id:"strike",name:"ĐÌNH CÔNG",icon:"✊",desc:"Bất ổn làm đình trệ sản xuất",delta:{gdp:-9,budget:-5,stability:-7}},
];
const clamp=v=>Math.max(0,Math.min(120,Math.round(v)));
const active=teams=>teams.filter(t=>t.players.length);
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function makeDeck(){let n=0,deck=[];for(const type of Object.keys(CARD_TYPES))for(let i=0;i<CARD_COUNTS[type];i++)deck.push({id:`card-${++n}-${Math.random().toString(36).slice(2,7)}`,type,...CARD_TYPES[type]});return shuffle(deck)}
function draw(game,count){return game.deck.splice(0,Math.min(count,game.deck.length))}
function score(e,mode){if(mode==="capitalist")return Math.round(e.stats.gdp*.58+e.stats.budget*.42);const vals=Object.values(e.stats),spread=Math.max(...vals)-Math.min(...vals);return Math.round(vals.reduce((a,b)=>a+b,0)/4-spread*.55+e.domestic*1.5)}
function effect(e){const{s}=e,st=e.stats;if(st.gdp-st.welfare>=25)return{id:"inequality",name:"BẤT BÌNH ĐẲNG",desc:"GDP bỏ xa an sinh: ổn định bị trừ"};if(st.welfare-st.budget>=25)return{id:"fiscal",name:"ÁP LỰC NGÂN SÁCH",desc:"An sinh vượt nguồn lực: chính sách khó duy trì"};if(e.statePower-e.marketPower>=4)return{id:"crowding",name:"LẤN ÁT THỊ TRƯỜNG",desc:"Can thiệp quá mạnh: năng lực cạnh tranh giảm"};if(e.marketPower-e.statePower>=4)return{id:"laissez",name:"THỊ TRƯỜNG MẤT CÂN BẰNG",desc:"Lợi nhuận tăng nhưng an sinh và niềm tin giảm"};if(e.fdi>e.domestic+1)return{id:"dependent",name:"PHỤ THUỘC FDI",desc:"Năng lực trong nước không theo kịp vốn ngoài"};if(e.publicSpend>e.taxCapacity+1)return{id:"debt",name:"NỢ & THÂM HỤT",desc:"Chi công vượt năng lực thu ngân sách"};return{id:"balanced",name:"ĐANG CÂN BẰNG",desc:"Các động lực thị trường và mục tiêu xã hội hỗ trợ nhau"}}
function applyDelta(e,d){for(const k of ["gdp","budget","welfare","stability"])e.stats[k]=clamp(e.stats[k]+(d[k]||0))}
function applyCard(e,c){applyDelta(e,c.delta);if(["private","state","coop"].includes(c.type))e.domestic++;if(["private","fdi"].includes(c.type))e.marketPower++;if(["state","public","tax"].includes(c.type))e.statePower++;if(c.type==="fdi")e.fdi++;if(["public","social"].includes(c.type))e.publicSpend++;if(c.type==="tax")e.taxCapacity++}
function applyTradeoff(e){const x=effect(e);if(x.id==="inequality")applyDelta(e,{stability:-5});if(x.id==="fiscal")applyDelta(e,{budget:-4,welfare:-3});if(x.id==="crowding")applyDelta(e,{gdp:-6});if(x.id==="laissez")applyDelta(e,{welfare:-6,stability:-4});if(x.id==="dependent")applyDelta(e,{budget:-6,stability:-3});if(x.id==="debt")applyDelta(e,{budget:-8});e.effect=effect(e)}
function createGame(teams,{mode="socialist",now=Date.now()}={}){
 const seats=active(teams).map(t=>t.id),deck=makeDeck(),economies={};
 for(const t of active(teams))economies[t.id]={teamId:t.id,name:t.players[0].nickname,color:t.color,hand:[],stats:{gdp:50,budget:50,welfare:50,stability:50},crises:[],marketPower:0,statePower:0,domestic:0,fdi:0,publicSpend:0,taxCapacity:0,effect:{id:"balanced",name:"ĐANG CÂN BẰNG",desc:"Bốn chỉ số đang hỗ trợ nhau"}};
 const game={mode,seats,economies,deck,round:1,maxRounds:MAX_ROUNDS,target:TARGETS[0],turnIndex:0,turnNumber:1,phase:"turn",pile:[],history:[],reveal:null,turnEndsAt:now+TURN_MS,startedAt:now};
 deal(game);return game;
}
function deal(game){for(const e of Object.values(game.economies))e.hand=draw(game,HAND_SIZE)}
function currentId(game){return game.seats[game.turnIndex]}
function previousPlay(game){return game.pile[game.pile.length-1]||null}
function play(game,teamId,cardIds,now=Date.now()){
 if(game.phase!=="turn")return{ok:false,message:"Đang công bố kết quả"};if(currentId(game)!==teamId)return{ok:false,message:"Chưa tới lượt đội bạn"};
 const e=game.economies[teamId],ids=[...new Set(cardIds||[])];if(ids.length<1||ids.length>3)return{ok:false,message:"Chọn từ 1 đến 3 lá"};const cards=ids.map(id=>e.hand.find(c=>c.id===id));if(cards.some(c=>!c))return{ok:false,message:"Bài không hợp lệ"};
 e.hand=e.hand.filter(c=>!ids.includes(c.id));const p={id:`play-${Date.now()}-${Math.random()}`,teamId,count:cards.length,cards,targetId:game.target.id,at:now};game.pile.push(p);game.history.unshift({type:"play",teamId,count:cards.length,target:game.target.name});game.history=game.history.slice(0,10);game.turnIndex=(game.turnIndex+1)%game.seats.length;game.turnNumber++;game.turnEndsAt=now+TURN_MS;return{ok:true};
}
function challenge(game,teamId,now=Date.now()){
 if(game.phase!=="turn"||currentId(game)!==teamId)return{ok:false,message:"Chưa tới lượt tố"};const p=previousPlay(game);if(!p)return{ok:false,message:"Chưa có ai đánh bài để tố"};
 const truthful=p.cards.every(c=>c.category===game.target.id||c.category==="wild"),loserId=truthful?teamId:p.teamId,winnerId=truthful?p.teamId:teamId,loser=game.economies[loserId],crisis=CRISES[loser.crises.length%CRISES.length];
 for(const placed of game.pile)for(const c of placed.cards)applyCard(game.economies[placed.teamId],c);applyDelta(loser,crisis.delta);loser.crises.push(crisis);for(const e of Object.values(game.economies))applyTradeoff(e);
 game.reveal={challengerId:teamId,accusedId:p.teamId,truthful,loserId,winnerId,cards:p.cards,crisis,endsAt:now+REVEAL_MS};game.phase="reveal";game.history.unshift({type:"challenge",challengerId:teamId,accusedId:p.teamId,truthful,loserId});return{ok:true,truthful,loserId};
}
function nextRound(game,now=Date.now()){
 game.round++;if(game.round>game.maxRounds){game.phase="finished";return{finished:true}}const loserId=game.reveal?.loserId;game.pile=[];game.reveal=null;game.target=TARGETS[(game.round-1)%TARGETS.length];game.turnIndex=Math.max(0,game.seats.indexOf(loserId));game.deck=makeDeck();deal(game);game.phase="turn";game.turnEndsAt=now+TURN_MS;return{finished:false}
}
function tick(game,now=Date.now()){
 if(game.phase==="finished")return{finished:true};if(game.phase==="reveal"&&now>=game.reveal.endsAt)return nextRound(game,now);if(game.phase==="turn"&&now>=game.turnEndsAt){if(previousPlay(game))challenge(game,currentId(game),now);else{const e=game.economies[currentId(game)],c=e.hand[0];play(game,currentId(game),[c.id],now)}}return{finished:game.phase==="finished"}
}
function winner(game){return Object.values(game.economies).sort((a,b)=>score(b,game.mode)-score(a,game.mode))[0]?.teamId}
function setMode(gameOrRoom,mode){if(!["socialist","capitalist"].includes(mode))return false;gameOrRoom.mode=mode;return true}
function publicState(game,viewerTeamId=null){
 const economies={};for(const [id,e] of Object.entries(game.economies))economies[id]={teamId:id,name:e.name,color:e.color,handCount:e.hand.length,stats:e.stats,crises:e.crises,effect:e.effect,score:score(e,game.mode),domestic:e.domestic};
 return{mode:game.mode,seats:game.seats,economies,round:game.round,maxRounds:game.maxRounds,target:game.target,turnTeamId:currentId(game),turnNumber:game.turnNumber,phase:game.phase,pile:game.pile.map(p=>({id:p.id,teamId:p.teamId,count:p.count,targetId:p.targetId})),history:game.history,reveal:game.reveal,turnEndsAt:game.turnEndsAt,deckSize:DECK_SIZE,undealtCount:game.deck.length,cardCounts:CARD_COUNTS,maxTruthful:16,hand:viewerTeamId?game.economies[viewerTeamId]?.hand||[]:null};
}
module.exports={HAND_SIZE,MAX_ROUNDS,TURN_MS,TARGETS,CARD_TYPES,CARD_COUNTS,DECK_SIZE,CRISES,createGame,currentId,play,challenge,tick,winner,setMode,publicState,score,effect};
