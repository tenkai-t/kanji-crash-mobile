import Replay from '../dist/replay-records.js';
import Game from './game.cjs';
import Traits from '../dist/character-traits.js';
// Each participant keeps replay history under its own device identity.
const owner=(key,mode)=>mode==='online'?key:'online:'+key;
const fail=(text,status=400)=>{throw Object.assign(Error(text),{status});};
export function begin(room,state,host,guest,round,now){
 const bodies=state.pieces.map(p=>{const b=Traits.createBody(p.data,p.x,p.y,1,{},p.angle);b.gameData=p.data;return b;});
 return Replay.create({id:`match_${room.code}_${round}`,createdAt:now,mode:room.mode==='online'?'online':'friend',label:(room.mode==='online'?'オンライン対戦':'フレンド対戦')+'・第'+round+'戦',names:[host.profile.name,guest.profile.name],side:0},bodies.map((b,n)=>Replay.piece(b,n<3?0:1,{x:200,y:200},184)),Replay.snapshot(bodies,{x:200,y:200},184));
}
const frame=(pieces,time,ratio,metadata)=>[time,ratio,pieces.map((p,n)=>[Replay.round(p.x),Replay.round(p.y),Replay.round(p.angle),p.data.isOut?1:0,metadata[n].radius])];
export function append(log,next,side,shot){
 if(!log)return null;const r=JSON.parse(log),raw=next.replay,frames=raw.frames.map((p,n)=>[Math.round(n*2200/(raw.frames.length-1)),raw.ratioBefore,p.map((v,i)=>[...v.map((x,k)=>k===3?x:Replay.round(x)),r.pieces[i].radius])]),final=frame(next.pieces,2200,next.pressure.ratio,r.pieces);
 frames.push(final);r.turns.push({side,key:shot.key,spin:shot.spin,duration:2200,frames,events:raw.events.map(e=>({key:e.key,name:e.name,color:e.color,t:Math.min(2200,Math.round(e.tick*1000/60))}))});r.final=final;return JSON.stringify(r);
}
async function restoreDeviceMatches(db,key){const count=await db.first('SELECT COUNT(*) AS n FROM battle_replays WHERE key=? AND favorite=0',key),slots=Replay.limit-count.n;if(slots<=0)return;const legacyKey=key.slice(0,-33),raw=key.slice(7);const rows=await db.all("SELECT b.payload,r.host_key,r.guest_key,r.mode FROM battle_replays b JOIN friend_rooms r ON r.code=substr(b.id,7,8) WHERE b.key=? AND b.id LIKE 'match_%' AND (r.host_key=? OR r.guest_key=? OR r.host_key=? OR r.guest_key=?) AND NOT EXISTS (SELECT 1 FROM battle_replays d WHERE d.key=? AND d.id=b.id) ORDER BY b.created_at DESC,b.id DESC LIMIT ?",legacyKey,key,key,raw,raw,key,slots);for(const row of rows){const r=JSON.parse(row.payload),side=owner(row.host_key,row.mode)===key?0:1;if(Replay.valid(r,c=>Game.bases.has(c)))await db.batch(queries(key,{...r,side}));}}
export async function list(db,key){await restoreDeviceMatches(db,key);return{replays:(await db.all('SELECT summary,favorite FROM battle_replays WHERE key=? ORDER BY favorite DESC,created_at DESC,id DESC LIMIT ?',key,Replay.limit+Replay.favoriteLimit)).map(v=>({...JSON.parse(v.summary),favorite:!!v.favorite}))};}
export async function read(db,key,id){let row=await db.first('SELECT payload,favorite FROM battle_replays WHERE key=? AND id=?',key,id);if(!row){await restoreDeviceMatches(db,key);row=await db.first('SELECT payload,favorite FROM battle_replays WHERE key=? AND id=?',key,id);}if(!row)fail('リプレイが見つかりません。',404);return{replay:JSON.parse(row.payload),favorite:!!row.favorite};}
const prune=key=>['DELETE FROM battle_replays WHERE key=? AND favorite=0 AND id NOT IN (SELECT id FROM battle_replays WHERE key=? AND favorite=0 ORDER BY created_at DESC,id DESC LIMIT ?)',key,key,Replay.limit];
function queries(key,r,favorite=false){return[['INSERT OR IGNORE INTO battle_replays (key,id,created_at,summary,payload,favorite) SELECT ?,?,?,?,?,? WHERE ?=0 OR (SELECT COUNT(*) FROM battle_replays WHERE key=? AND favorite=1)<?',key,r.id,r.createdAt,JSON.stringify(Replay.summary(r)),JSON.stringify(r),Number(favorite),Number(favorite),key,Replay.favoriteLimit],prune(key)];}
export async function setFavorite(db,key,id,input){
 if(typeof input.favorite!=='boolean')fail('お気に入りの設定を確認してください。');
 const row=await db.first('SELECT favorite FROM battle_replays WHERE key=? AND id=?',key,id);if(!row)fail('リプレイが見つかりません。',404);
 if(!!row.favorite===input.favorite)return{saved:true,favorite:input.favorite};
 const result=await db.run('UPDATE battle_replays SET favorite=? WHERE key=? AND id=? AND (?=0 OR (SELECT COUNT(*) FROM battle_replays WHERE key=? AND favorite=1)<?)',Number(input.favorite),key,id,Number(input.favorite),key,Replay.favoriteLimit);
 if(!result.meta.changes)fail(`お気に入りは${Replay.favoriteLimit}対局まで保存できます。`,409);
 await db.batch([prune(key)]);return{saved:true,favorite:input.favorite};
}
export async function save(db,key,input){
 const r=input.replay;if(input.favorite!==undefined&&typeof input.favorite!=='boolean')fail('お気に入りの設定を確認してください。');if(!Replay.valid(r,c=>Game.bases.has(c))||!r.id.startsWith('cpu_')||!r.complete||['friend','online'].includes(r.mode)||r.createdAt>Date.now()+60000)fail('リプレイの記録を確認してください。');
 if(new TextEncoder().encode(JSON.stringify(r)).length>Replay.maxBytes)fail('リプレイが大きすぎます。',413);
 if(!await db.first('SELECT id FROM battle_replays WHERE key=? AND id=?',key,r.id)){await db.batch(queries(key,r,input.favorite===true));if(input.favorite&&!await db.first('SELECT id FROM battle_replays WHERE key=? AND id=?',key,r.id))fail(`お気に入りは${Replay.favoriteLimit}対局まで保存できます。`,409);}return{saved:true,id:r.id};
}
export async function saveRoom(db,room,now){
 if(room.replay_saved||room.status!=='finished'||!room.replay_log||!room.state)return !!room.replay_saved;
 const state=JSON.parse(room.state),r=JSON.parse(room.replay_log);if(!state.finished)return false;
 Replay.finish(r,state.winner,state.reason,frame(state.pieces,0,state.pressure.ratio,r.pieces));
 const q=[];for(const [side,key]of [room.host_key,room.guest_key].entries()){if(key)q.push(...queries(owner(key,room.mode),{...r,side}));}
 q.push(['UPDATE friend_rooms SET replay_saved=1 WHERE code=? AND round=? AND status=\'finished\'',room.code,room.round||1]);await db.batch(q);return true;
}
