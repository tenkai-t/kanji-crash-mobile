import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fixture} from './friend-server.mjs';
import Worker from '../dist/server/index.js';
const require=createRequire(import.meta.url),Game=require('../server/game.cjs'),Read=require('../dist/reading-abilities.js'),H=require('../dist/honor-icons.js'),fs=require('node:fs');
const dictionary=JSON.parse(fs.readFileSync('server/generated/readings.json')),device=n=>String(n).padStart(32,'0'),f=fixture();let calls=0;
async function call(n,route,method='GET',body,headers={}){const response=await Worker.fetch(new Request('https://game.test'+route,{method,headers:{'oai-authenticated-user-id':'owner','X-Kanji-Device':device(n),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})}),f.env);calls++;return {status:response.status,value:await response.json()};}
const team=chars=>({items:chars.map(char=>({char,level:4,equippedReadings:[...new Set(dictionary[char].map(r=>r.replace(/[.・()（）\s-]/g,'')))].slice(0,3)})),formation:null});
try{
 for(const n of [1,2,3]){const p={name:['天海','友だち','外部'][n-1],char:['一','盾','回'][n-1],frame:'ornate',color:'cyan',glow:'bright',honorId:''};assert.equal((await call(n,'/api/profile','PUT',p)).status,200);assert.deepEqual((await call(n,'/api/profile')).value.profile,p);}
 assert.equal((await call(1,'/api/profile','PUT',{name:'<script>',char:'一',frame:'plain',color:'gold',glow:'none'})).status,400);
 assert.equal((await call(1,'/api/profile','PUT',{name:'あ'.repeat(17),char:'一',frame:'plain',color:'gold',glow:'none'})).status,400);
 assert.equal((await call(1,'/api/profile','PUT',{name:'a',char:'not-owned',frame:'plain',color:'gold',glow:'none'})).status,400);
 assert.equal((await call(1,'/api/profile','PUT',{name:'a',char:'一',frame:'plain',color:'gold',glow:'none'},{Origin:'https://evil.test'})).status,403);
 assert.equal((await Worker.fetch(new Request('https://game.test/api/profile',{headers:{'X-Kanji-Device':device(1)}}),f.env)).status,401);
 assert.equal((await call(1,'/api/friends/rooms','POST',{items:team(['一','回','盾']).items.slice(0,2)})).status,400);
 const iconProfile={name:'外部',char:'回',frame:'ornate',color:'cyan',glow:'bright',honorId:'jade'};
 assert.equal((await call(3,'/api/profile','PUT',iconProfile)).status,400);
 assert.equal((await call(3,'/api/achievements','POST',{progress:{highestRating:-1}})).status,400);
 const progress={highestRating:1400,bestEndless:3,trialWins:1,bestTrialStreak:0,completedCollections:0};assert.deepEqual((await call(3,'/api/achievements','POST',{progress})).value.achievementProgress,H.progress(progress));
 assert.equal((await call(3,'/api/profile','PUT',iconProfile)).status,200);
 await call(3,'/api/achievements','POST',{progress:{highestRating:900,bestEndless:0,trialWins:0}});let savedIcon=(await call(3,'/api/profile')).value;assert.equal(savedIcon.profile.honorId,'jade');assert.deepEqual(savedIcon.achievementProgress,H.progress(progress));
 const races=await Promise.all([call(3,'/api/achievements','POST',{progress:{highestRating:2600,bestEndless:10}}),call(3,'/api/profile','PUT',{...iconProfile,name:'記録保持'})]);assert(races.every(r=>r.status===200));savedIcon=(await call(3,'/api/profile')).value;assert.equal(savedIcon.profile.name,'記録保持');assert.deepEqual(savedIcon.achievementProgress,H.progress({highestRating:2600,bestEndless:10,trialWins:1}));
 assert.equal((await call(4,'/api/profile')).value.profile,null);
 const host=team(['一','回','盾']),guest=team(['小','風','合']),created=await call(1,'/api/friends/rooms','POST',host);assert.equal(created.status,201);const code=created.value.code;assert.match(code,/^[A-Z2-9]{8}$/);assert.equal(created.value.status,'waiting');
 assert.equal((await call(3,'/api/friends/rooms/'+code)).status,403);
 const joined=await call(2,`/api/friends/rooms/${code}/join`,'POST',guest);assert.equal(joined.status,200);assert.equal(joined.value.status,'preparing');assert.equal(joined.value.side,1);assert.equal(joined.value.revision,1);assert.equal((await call(3,`/api/friends/rooms/${code}/join`,'POST',guest)).status,409);
 assert.deepEqual((await call(1,`/api/friends/rooms/${code}`)).value.state,joined.value.state);
 let room=joined.value;for(const n of [1,2]){const ready=await call(n,`/api/friends/rooms/${code}/ready`,'POST',{revision:room.revision,lineupRevision:room.lineupRevision,round:room.round,ready:true});assert.equal(ready.status,200);room=ready.value;}assert.equal(room.status,'playing');const side=room.state.turn,wrong=side?1:2,actor=side?2:1,id=device(101),shot={id,revision:room.revision,key:side*3,dx:side?0:0,dy:side?1:-1,power:.35,spin:-1.375};
 assert.equal((await call(wrong,`/api/friends/rooms/${code}/shot`,'POST',shot)).status,409);
 assert.equal((await call(actor,`/api/friends/rooms/${code}/shot`,'POST',{...shot,key:(1-side)*3})).status,400);
 assert.equal((await call(actor,`/api/friends/rooms/${code}/shot`,'POST',{...shot,spin:3.01})).status,400);
 const played=await call(actor,`/api/friends/rooms/${code}/shot`,'POST',shot);assert.equal(played.status,200);room=played.value;assert.equal(room.revision,shot.revision+1);assert.equal(room.state.pressure.shots,1);assert.equal(room.state.replay.frames.length,34);assert.equal(room.state.lastShot.spin,-1.375);
 const replay=await call(actor,`/api/friends/rooms/${code}/shot`,'POST',shot);assert.equal(replay.status,200);assert.equal(replay.value.revision,shot.revision+1);assert.deepEqual(replay.value.state,room.state);
 assert.equal((await call(actor,`/api/friends/rooms/${code}/shot`,'POST',{...shot,id:device(102)})).status,409);
 if(!room.state.finished){const nextSide=room.state.turn,alive=room.state.pieces.find(p=>(p.key<3?0:1)===nextSide&&!p.data.isOut);const response=await call(nextSide?2:1,`/api/friends/rooms/${code}/shot`,'POST',{id:device(103),revision:room.revision,key:alive.key,dx:200-alive.x,dy:200-alive.y,power:.2,spin:3});assert.equal(response.status,200);assert.equal(response.value.revision,room.revision+1);assert.equal(response.value.state.pressure.shots,2);}
 const left=await call(1,`/api/friends/rooms/${code}/leave`,'POST',{});assert.equal(left.status,200);assert.equal(left.value.status,'finished');assert.equal((await call(2,`/api/friends/rooms/${code}`)).value.state.finished,true);
 const old=await call(3,'/api/friends/rooms','POST',host);f.sqlite.prepare('UPDATE friend_rooms SET expires_at=0 WHERE code=?').run(old.value.code);assert.equal((await call(3,`/api/friends/rooms/${old.value.code}`)).status,404);
 // Bounded match rule and snapshots survive JSON round trips for all special shapes.
 const s=Game.initial(Game.roster(host),Game.roster(guest),()=>.1),snapshot=JSON.stringify(s);const result=Game.play(s,{id:device(200),key:s.turn*3,dx:0,dy:s.turn?1:-1,power:.3,spin:-3},s.turn,()=>.5);assert.equal(JSON.stringify(s),snapshot);assert(result.pieces.every(p=>[p.x,p.y,p.angle,p.mass].every(Number.isFinite)));assert(result.pieces.every(p=>p.velocity.x===0&&p.velocity.y===0));
 const judge=JSON.parse(snapshot);judge.pressure.shots=35;const end=Game.play(judge,{id:device(201),key:judge.turn*3,dx:0,dy:judge.turn?1:-1,power:.01,spin:0},judge.turn,()=>.5);assert(end.finished);assert.equal(end.pressure.shots,36);
 console.log(JSON.stringify({server:true,calls,profilePersistence:true,lockedIcons:true,permanentAchievements:true,concurrentProfileWrites:true,roomMembership:true,turnGuard:true,idempotent:true,specialTraits:true,spin:true,reconnect:true,expiry:true,judgment:true}));
}finally{f.sqlite.close();}
