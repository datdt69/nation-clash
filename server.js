const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const http = require("node:http");
const QRCode = require("qrcode");
const { Server } = require("socket.io");
const { createTeam, serializeTeam } = require("./game-engine");
const { createGame, tick, setInput, setCommand, buy, winner } = require("./shield-engine");

const PORT = Number(process.env.PORT || 3000);
const app = express();
app.set("trust proxy", true);
app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.json({ ok: true, rooms: rooms.size }));
app.get("/{*splat}", (_req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
const server = http.createServer(app);
const io = new Server(server, { transports: ["websocket", "polling"] });
const rooms = new Map();

const token = (n = 18) => crypto.randomBytes(n).toString("base64url");
function roomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do { code = Array.from({length:5}, () => chars[crypto.randomInt(chars.length)]).join(""); } while (rooms.has(code));
  return code;
}
const clean = value => String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 22);
const activeTeams = room => room.teams.filter(t => t.players.length);
const findPlayer = (room, playerToken) => [...room.players.values()].find(p => p.token === playerToken);

function state(room, host = false, viewerTeamId = null) {
  return {
    code: room.code, status: room.status, playersCount: room.players.size, maxPlayers: 8,
    teams: room.teams.map(team => serializeTeam(team, host)),
    game: room.game || null,
    champions: room.champions,
  };
}
function emitState(room) {
  io.to(`${room.code}:host`).emit("state", state(room, true));
  for (const player of room.players.values()) {
    if (player.connected) io.to(player.socketId).emit("state", state(room, false, player.teamId));
  }
}
function finish(room) {
  room.status = "finished";
  const teams = activeTeams(room);
  room.champions = { teamId: winner(room.game) };
  emitState(room);
}
function start(room) {
  if (!room.players.size) throw new Error("Cần ít nhất 1 đại diện");
  room.status = "playing";
  room.champions = null;
  room.game = createGame(room.teams);
  emitState(room);
}

io.on("connection", socket => {
  socket.on("host:create", async (callback = () => {}) => {
    try {
      const code = roomCode();
      const proto = String(socket.handshake.headers["x-forwarded-proto"] || "http").split(",")[0];
      const host = socket.handshake.headers["x-forwarded-host"] || socket.handshake.headers.host;
      const joinUrl = `${proto}://${host}/?room=${code}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl,{margin:1,width:360});
      const room = { code, hostToken: token(), joinUrl, qrDataUrl, players: new Map(), teams: Array.from({length:8}, (_,i) => createTeam(i)), status:"lobby", game:null, champions:null, createdAt:Date.now() };
      rooms.set(code, room);
      socket.join(`${code}:host`);
      callback({ ok:true, code, hostToken:room.hostToken, joinUrl, qrDataUrl });
      emitState(room);
    } catch (error) { callback({ok:false,message:error.message}); }
  });
  socket.on("host:resume", ({code,hostToken}={}, cb=()=>{}) => {
    const room=rooms.get(String(code||"").toUpperCase());
    if(!room||room.hostToken!==hostToken) return cb({ok:false,message:"Không thể khôi phục host"});
    socket.join(`${room.code}:host`); cb({ok:true,code:room.code,joinUrl:room.joinUrl,qrDataUrl:room.qrDataUrl}); emitState(room);
  });
  socket.on("host:start", ({code,hostToken}={},cb=()=>{}) => {
    const room=rooms.get(String(code||"").toUpperCase()); if(!room||room.hostToken!==hostToken)return cb({ok:false,message:"Không có quyền"});
    try{start(room);cb({ok:true});}catch(e){cb({ok:false,message:e.message});}
  });
  socket.on("host:end", ({code,hostToken}={},cb=()=>{}) => { const room=rooms.get(String(code||"").toUpperCase()); if(!room||room.hostToken!==hostToken)return cb({ok:false}); finish(room);cb({ok:true}); });
  socket.on("player:join", ({code,nickname,playerToken}={},cb=()=>{}) => {
    const room=rooms.get(String(code||"").trim().toUpperCase()); const name=clean(nickname);
    if(!room)return cb({ok:false,message:"Không tìm thấy phòng"}); if(!name)return cb({ok:false,message:"Nhập tên trước đã"});
    let player=playerToken?findPlayer(room,playerToken):null;
    if(player){player.connected=true;player.socketId=socket.id;player.nickname=name;}
    else{
      if(room.status!=="lobby")return cb({ok:false,message:"Trận đã bắt đầu"}); if(room.players.size>=8)return cb({ok:false,message:"Đủ 8 đại diện"});
      const team=room.teams.find(t=>!t.players.length); player={id:token(8),token:token(),nickname:name,teamId:team.id,connected:true,socketId:socket.id}; room.players.set(player.id,player); team.players.push(player);
    }
    socket.data.player={roomCode:room.code,playerId:player.id}; socket.join(`${room.code}:players`);
    cb({ok:true,playerToken:player.token,playerId:player.id,teamId:player.teamId}); emitState(room);
  });
  socket.on("player:input", ({code,playerToken,x,y}={}) => { const room=rooms.get(String(code||"").toUpperCase()); const player=room&&findPlayer(room,playerToken); if(room?.status==="playing"&&player)setInput(room.game,player.teamId,x,y); });
  socket.on("player:command", ({code,playerToken,command}={},cb=()=>{}) => { const room=rooms.get(String(code||"").toUpperCase()); const player=room&&findPlayer(room,playerToken); if(room?.status!=="playing"||!player)return cb({ok:false});cb({ok:setCommand(room.game,player.teamId,command)});emitState(room); });
  socket.on("player:buy", ({code,playerToken,item}={},cb=()=>{}) => { const room=rooms.get(String(code||"").toUpperCase()); const player=room&&findPlayer(room,playerToken); if(room?.status!=="playing"||!player)return cb({ok:false,message:"Trận chưa bắt đầu"});const result=buy(room.game,player.teamId,item);cb(result);emitState(room); });
  socket.on("disconnect",()=>{const id=socket.data.player;const room=id&&rooms.get(id.roomCode);const player=room?.players.get(id.playerId);if(player){player.connected=false;emitState(room);}});
});

let last=Date.now();
setInterval(()=>{
  const now=Date.now(),dt=Math.min(.05,(now-last)/1000);last=now;
  for(const room of rooms.values()) if(room.status==="playing") { if(tick(room.game,room.teams,dt,now).finished) finish(room); else emitState(room); }
},100).unref();
setInterval(()=>{for(const [code,room] of rooms)if(Date.now()-room.createdAt>3*60*60*1000)rooms.delete(code);},1800000).unref();

if(require.main===module)server.listen(PORT,"0.0.0.0",()=>console.log(`Vietnam 2045 tại http://localhost:${PORT}`));
module.exports={app,server,rooms};
