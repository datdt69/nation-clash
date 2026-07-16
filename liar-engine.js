const HAND_SIZE=8,TURN_MS=30000,REVEAL_MS=6500;
const TARGETS=[
 {id:"growth",name:"TĂNG TRƯỞNG",icon:"↗",color:"#ffd166"},
 {id:"welfare",name:"AN SINH",icon:"♥",color:"#59e3c2"},
 {id:"regulation",name:"ĐIỀU TIẾT",icon:"⚖",color:"#68a9ff"},
];
const CARD_TYPES={
 private:{name:"Doanh nghiệp tư nhân",short:"TƯ NHÂN",icon:"◆",category:"growth",desc:"Lợi nhuận nhanh, cạnh tranh mạnh"},
 state:{name:"Doanh nghiệp nhà nước",short:"NHÀ NƯỚC",icon:"★",category:"regulation",desc:"Giữ ngành thiết yếu, ổn định thị trường"},
 fdi:{name:"Doanh nghiệp vốn ngoại",short:"VỐN NGOẠI",icon:"◎",category:"growth",desc:"Có vốn và công nghệ nhưng dễ phát sinh phụ thuộc"},
 coop:{name:"Hợp tác xã",short:"HỢP TÁC XÃ",icon:"⬡",category:"welfare",desc:"Việc làm và phân phối công bằng"},
 public:{name:"Đầu tư công",short:"ĐẦU TƯ CÔNG",icon:"▦",category:"regulation",desc:"Tạo hạ tầng nhưng tiêu tốn ngân sách"},
 social:{name:"An sinh xã hội",short:"AN SINH",icon:"♥",category:"welfare",desc:"Giảm bất bình đẳng, cần ngân sách"},
 tax:{name:"Thuế & điều tiết",short:"THUẾ",icon:"⚖",category:"regulation",desc:"Hạn chế mất cân đối và tạo nguồn thu"},
 balance:{name:"Lợi ích hài hòa",short:"CÂN BẰNG",icon:"✦",category:"wild",desc:"Lá đặc biệt: hợp lệ với mọi mục tiêu"},
};
const CARD_COUNTS={private:10,state:7,fdi:10,coop:10,public:7,social:10,tax:6,balance:4};
const DECK_SIZE=Object.values(CARD_COUNTS).reduce((sum,n)=>sum+n,0);
const FINISH_BONUSES={1:25,2:18,3:12,4:7};
const CRISES=[
 {id:"inflation",name:"LẠM PHÁT",icon:"↑",desc:"Giá tăng làm giảm sức mua và nguồn lực",delta:{gdp:-6,budget:-12,welfare:-4,stability:-3}},
 {id:"unemployment",name:"THẤT NGHIỆP",icon:"⌁",desc:"Sản xuất giảm và đời sống khó khăn",delta:{gdp:-12,budget:-3,welfare:-10,stability:-4}},
 {id:"deficit",name:"THÂM HỤT NGÂN SÁCH",icon:"−",desc:"Nguồn lực thực hiện chính sách suy yếu",delta:{gdp:-3,budget:-15,welfare:-4,stability:-5}},
 {id:"inequality",name:"BẤT BÌNH ĐẲNG",icon:"≠",desc:"Tăng trưởng không chuyển thành phúc lợi",delta:{gdp:-2,budget:-3,welfare:-14,stability:-8}},
 {id:"distrust",name:"SUY GIẢM NIỀM TIN",icon:"!",desc:"Xã hội mất niềm tin vào thị trường",delta:{gdp:-4,budget:-4,welfare:-5,stability:-16}},
 {id:"strike",name:"ĐÌNH CÔNG",icon:"✊",desc:"Bất ổn làm đình trệ hoạt động kinh tế",delta:{gdp:-10,budget:-6,welfare:-6,stability:-8}},
];
const clamp=v=>Math.max(0,Math.min(150,Math.round(v)));
const active=teams=>teams.filter(t=>t.players.length);
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function makeDeck(){let n=0,deck=[];for(const type of Object.keys(CARD_TYPES))for(let i=0;i<CARD_COUNTS[type];i++)deck.push({id:`card-${++n}-${Math.random().toString(36).slice(2,7)}`,type,...CARD_TYPES[type]});return shuffle(deck)}
function score(e){return Object.values(e.stats).reduce((sum,n)=>sum+n,0)}
function applyDelta(e,d){for(const k of ["gdp","budget","welfare","stability"])e.stats[k]=clamp(e.stats[k]+(d[k]||0))}
function crisisText(c){return Object.entries(c.delta).map(([k,v])=>`${({gdp:"Sản lượng",budget:"Ngân sách",welfare:"An sinh",stability:"Ổn định"})[k]} ${v}`).join(" · ")}
function createGame(teams,{now=Date.now()}={}){
 const seats=active(teams).map(t=>t.id),deck=makeDeck(),economies={};
 for(const t of active(teams))economies[t.id]={teamId:t.id,name:t.players[0].nickname,color:t.color,hand:deck.splice(0,HAND_SIZE),stats:{gdp:100,budget:100,welfare:100,stability:100},crises:[],place:null,finishBonus:0,effect:{id:"safe",name:"CHƯA GẶP KHỦNG HOẢNG",desc:"Bốn chỉ số đang ở mức 100"}};
 return{seats,economies,deck,round:1,target:TARGETS[0],turnIndex:0,turnNumber:1,phase:"turn",pile:[],history:[],reveal:null,pendingFinish:null,placements:[],turnEndsAt:now+TURN_MS,startedAt:now};
}
function currentId(game){return game.seats[game.turnIndex]}
function previousPlay(game){return game.pile[game.pile.length-1]||null}
function unfinished(game){return game.seats.filter(id=>!game.economies[id].place)}
function nextActiveIndex(game,from=game.turnIndex){for(let step=1;step<=game.seats.length;step++){const i=(from+step)%game.seats.length;if(!game.economies[game.seats[i]].place)return i}return from}
function confirmFinish(game,teamId,now=Date.now()){
 const e=game.economies[teamId];if(!e||e.place)return null;const place=game.placements.length+1,bonus=FINISH_BONUSES[place]||0;e.place=place;e.finishBonus=bonus;if(bonus)applyDelta(e,{gdp:bonus,budget:bonus,welfare:bonus,stability:bonus});e.effect={id:"finished",name:`VỀ ĐÍCH HẠNG ${place}`,desc:bonus?`Thưởng +${bonus} cho mỗi chỉ số`:"Không có thưởng thứ hạng"};game.placements.push({teamId,place,bonus,at:now});game.history.unshift({type:"finish",teamId,place,bonus});if(game.pendingFinish===teamId)game.pendingFinish=null;return{teamId,place,bonus};
}
function play(game,teamId,cardIds,now=Date.now()){
 if(game.phase!=="turn")return{ok:false,message:"Đang công bố kết quả"};if(currentId(game)!==teamId)return{ok:false,message:"Chưa tới lượt đội bạn"};
 if(game.pendingFinish&&unfinished(game).length===2)return{ok:false,message:"Chỉ còn 2 đội: bắt buộc tố đội vừa hết bài"};
 const e=game.economies[teamId],ids=[...new Set(cardIds||[])];if(ids.length<1||ids.length>3)return{ok:false,message:"Chọn từ 1 đến 3 lá"};const cards=ids.map(id=>e.hand.find(c=>c.id===id));if(cards.some(c=>!c))return{ok:false,message:"Bài không hợp lệ"};
 let confirmed=null;if(game.pendingFinish&&game.pendingFinish!==teamId)confirmed=confirmFinish(game,game.pendingFinish,now);
 e.hand=e.hand.filter(c=>!ids.includes(c.id));const p={id:`play-${Date.now()}-${Math.random()}`,teamId,count:cards.length,cards,targetId:game.target.id,at:now};game.pile.push(p);game.history.unshift({type:"play",teamId,count:cards.length,target:game.target.name});game.history=game.history.slice(0,16);if(!e.hand.length)game.pendingFinish=teamId;
 if(unfinished(game).length===1&&game.pendingFinish===teamId){confirmFinish(game,teamId,now);game.phase="finished";return{ok:true,confirmed,finished:true}}
 game.turnIndex=nextActiveIndex(game,game.turnIndex);game.turnNumber++;game.turnEndsAt=now+TURN_MS;return{ok:true,confirmed};
}
function randomCrisis(lastId){const pool=CRISES.filter(c=>c.id!==lastId);return pool[Math.floor(Math.random()*pool.length)]||CRISES[0]}
function challenge(game,teamId,now=Date.now()){
 if(game.phase!=="turn"||currentId(game)!==teamId)return{ok:false,message:"Chưa tới lượt tố"};const p=previousPlay(game);if(!p)return{ok:false,message:"Chưa có ai đánh bài để tố"};
 const truthful=p.cards.every(c=>c.category===game.target.id||c.category==="wild"),loserId=truthful?teamId:p.teamId,winnerId=truthful?p.teamId:teamId,loser=game.economies[loserId];let finish=null,autoFinish=null;
 if(game.pendingFinish===p.teamId)finish=confirmFinish(game,p.teamId,now);if(finish&&unfinished(game).length===1)autoFinish=confirmFinish(game,unfinished(game)[0],now);
 const crisis=randomCrisis(loser.crises.at(-1)?.id);applyDelta(loser,crisis.delta);loser.crises.push(crisis);loser.effect={id:"crisis",name:crisis.name,desc:crisisText(crisis)};
 game.reveal={challengerId:teamId,accusedId:p.teamId,truthful,loserId,winnerId,cards:p.cards,crisis,finish,autoFinish,resumeTeamId:unfinished(game).length?(loser.place?unfinished(game)[0]:loserId):null,endsAt:now+REVEAL_MS};game.phase="reveal";game.history.unshift({type:"challenge",challengerId:teamId,accusedId:p.teamId,truthful,loserId});return{ok:true,truthful,loserId,finish,autoFinish};
}
function nextMarket(game,now=Date.now()){
 if(!unfinished(game).length){game.phase="finished";return{finished:true}}const resume=game.reveal?.resumeTeamId;game.round++;game.pile=[];game.reveal=null;game.pendingFinish=null;game.target=TARGETS[(game.round-1)%TARGETS.length];const idx=game.seats.indexOf(resume);game.turnIndex=idx>=0&&!game.economies[resume].place?idx:nextActiveIndex(game,Math.max(0,idx));game.phase="turn";game.turnEndsAt=now+TURN_MS;return{finished:false}
}
function tick(game,now=Date.now()){
 if(game.phase==="finished")return{finished:true};if(game.phase==="reveal"&&now>=game.reveal.endsAt)return nextMarket(game,now);if(game.phase==="turn"&&now>=game.turnEndsAt){if(previousPlay(game))challenge(game,currentId(game),now);else{const e=game.economies[currentId(game)],c=e.hand[0];if(c)play(game,currentId(game),[c.id],now)}}return{finished:game.phase==="finished"}
}
function winner(game){return Object.values(game.economies).sort((a,b)=>score(b)-score(a)||((a.place||99)-(b.place||99)))[0]?.teamId}
function publicState(game,viewerTeamId=null){
 const economies={};for(const [id,e] of Object.entries(game.economies))economies[id]={teamId:id,name:e.name,color:e.color,handCount:e.hand.length,stats:e.stats,crises:e.crises,place:e.place,finishBonus:e.finishBonus,effect:e.effect,score:score(e)};
 const leaderboard=Object.values(economies).sort((a,b)=>b.score-a.score||((a.place||99)-(b.place||99))).map((e,i)=>({...e,rank:i+1,qualified:i<4}));
 const targetCount=Object.entries(CARD_COUNTS).reduce((sum,[type,n])=>sum+(CARD_TYPES[type].category===game.target.id?n:0),0);
 return{seats:game.seats,economies,round:game.round,target:game.target,turnTeamId:currentId(game),turnNumber:game.turnNumber,phase:game.phase,pile:game.pile.map(p=>({id:p.id,teamId:p.teamId,count:p.count,targetId:p.targetId})),history:game.history,reveal:game.reveal,placements:game.placements,leaderboard,finishBonuses:FINISH_BONUSES,turnEndsAt:game.turnEndsAt,deckSize:DECK_SIZE,undealtCount:game.deck.length,cardCounts:CARD_COUNTS,targetCount,maxTruthful:targetCount+CARD_COUNTS.balance,forcedChallenge:Boolean(game.pendingFinish&&unfinished(game).length===2),hand:viewerTeamId?game.economies[viewerTeamId]?.hand||[]:null};
}
module.exports={HAND_SIZE,TURN_MS,TARGETS,CARD_TYPES,CARD_COUNTS,DECK_SIZE,FINISH_BONUSES,CRISES,createGame,currentId,play,challenge,tick,winner,publicState,score,confirmFinish};
