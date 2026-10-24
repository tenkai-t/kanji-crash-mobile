import assert from 'node:assert/strict';
import {fixture} from './friend-server.mjs';
import Worker from '../dist/server/index.js';
import {candidateQuery} from '../server/online.mjs';
const f=fixture({measure:true}),realNow=Date.now,device=n=>String(n).padStart(32,'0');let now=realNow(),calls=0;Date.now=()=>now;
const items=[{char:'一',level:8,equippedReadings:['イチ']},{char:'山',level:12,equippedReadings:['サン']},{char:'小',level:30,equippedReadings:['ショウ']}],team={items,ruleSet:'balanced'};
async function call(n,path,method='GET',body){const response=await Worker.fetch(new Request('https://game.test'+path,{method,headers:{...(n?{'oai-authenticated-user-id':'perf-'+n,'X-Kanji-Device':device(n)}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),{...f.env});calls++;const text=await response.text();assert.equal(response.status,200,text);return {value:JSON.parse(text),bytes:Buffer.byteLength(text)};}
const get=async(...args)=>(await call(...args)).value;
async function start(n,room){return get(n,`/api/friends/rooms/${room.code}/ready`,'POST',{revision:room.revision,ready:true});}
try{
 for(let n=1;n<=8;n++)await get(n,'/api/profile','PUT',{name:'負荷確認'+n,char:'一',frame:'plain',color:'gold',glow:'none'});
 await get(1,'/api/online/queue','POST',team);let room=(await get(2,'/api/online/queue','POST',team)).room;
 const prep=await get(1,`/api/friends/rooms/${room.code}?since=${room.revision}`);assert(prep.unchanged&&!('state'in prep));
 room=await start(1,room);assert(!(await get(2,`/api/friends/rooms/${room.code}?since=${prep.revision}`)).unchanged);room=await start(2,room);
 const full=await call(1,`/api/friends/rooms/${room.code}`);f.resetMetrics();let light;
 // Both players check every second for 15 seconds: clocks still checked, heartbeats coalesced.
 for(let second=0;second<15;second++){now+=1000;for(const n of [1,2]){light=await call(n,`/api/friends/rooms/${room.code}?since=${room.revision}`);assert(light.value.unchanged);}}
 const heartbeatWrites=f.metrics.rowsWritten;assert.equal(heartbeatWrites,10);assert(light.bytes<full.bytes*.1);assert(!f.metrics.queries.some(sql=>sql.includes('FROM online_stats')));
 const actor=room.state.turn?2:1,shot={id:device(101),revision:room.revision,key:room.state.turn*3,dx:0,dy:room.state.turn?1:-1,power:.001,spin:.7};room=await get(actor,`/api/friends/rooms/${room.code}/shot`,'POST',shot);
 const changed=await get(actor===1?2:1,`/api/friends/rooms/${room.code}?since=${room.revision-1}`);assert(changed.state&&changed.revision===room.revision&&!changed.unchanged);
 assert.equal((await get(actor,`/api/friends/rooms/${room.code}/shot`,'POST',shot)).revision,room.revision);
 room=await get(1,`/api/friends/rooms/${room.code}/leave`,'POST',{});const settled=f.sqlite.prepare('SELECT * FROM online_results WHERE code=?').get(room.code);assert.equal(settled.applied,1);
 f.resetMetrics();await Promise.all(Array.from({length:100},(_,n)=>get(n%2+1,`/api/friends/rooms/${room.code}`)));assert.equal(f.metrics.writeStatements,0);assert.equal(f.sqlite.prepare('SELECT count(*) AS n FROM online_results').get().n,1);
 // Deadline changes without a revision still arrive in the light heartbeat response.
 await get(6,'/api/online/queue','POST',team);let reconnect=(await get(7,'/api/online/queue','POST',team)).room;reconnect=await start(6,reconnect);reconnect=await start(7,reconnect);const reconnectActor=reconnect.state.turn?7:6;now+=40000;
 const grace=await get(reconnectActor,`/api/friends/rooms/${reconnect.code}?since=${reconnect.revision}`);assert(grace.unchanged&&grace.deadline>now&&grace.deadline<=now+5000);now=grace.deadline+1;
 const timeout=await get(reconnectActor,`/api/friends/rooms/${reconnect.code}?since=${reconnect.revision}`);assert(!timeout.unchanged&&timeout.status==='finished'&&timeout.state.reason==='持ち時間切れ');
 const score={mode:'endless',wins:8,kills:24,items};await get(1,'/api/challenges/score','POST',score);await get(1,'/api/cpu/score','POST',{rating:1250,items});const updated=f.sqlite.prepare('SELECT updated_at FROM challenge_scores WHERE key=?').get('online:perf-1:'+device(1)).updated_at;now+=1000;
 f.resetMetrics();for(let n=0;n<20;n++){await get(1,'/api/challenges/score','POST',score);await get(1,'/api/cpu/score','POST',{rating:1250,items});await get(1,'/api/profile','PUT',{name:'負荷確認1',char:'一',frame:'plain',color:'gold',glow:'none'});}assert.equal(f.metrics.writeStatements,0);assert.equal(f.metrics.rowsWritten,0);assert.equal(f.sqlite.prepare('SELECT updated_at FROM challenge_scores WHERE key=?').get('online:perf-1:'+device(1)).updated_at,updated);
 f.resetMetrics();const cold=await Promise.all(Array.from({length:50},()=>get(0,'/api/leaderboard?rule=endless')));assert(cold.every(r=>r.entries[0].wins===8));assert.equal(f.metrics.queries.filter(sql=>sql.includes('FROM challenge_scores WHERE mode=')).length,1);
 f.resetMetrics();const hot=await Promise.all(Array.from({length:200},()=>get(0,'/api/leaderboard?rule=endless')));assert(hot.every(r=>r.generatedAt===cold[0].generatedAt));assert.equal(f.metrics.writeStatements,0);assert.equal(f.metrics.reads,200);
 await get(1,'/api/challenges/score','POST',{...score,wins:9,kills:27});assert.equal((await get(0,'/api/leaderboard?rule=endless')).entries[0].wins,8);now+=30001;f.resetMetrics();const refreshed=await Promise.all(Array.from({length:50},()=>get(0,'/api/leaderboard?rule=endless')));assert(refreshed.every(r=>[8,9].includes(r.entries[0].wins)));assert.equal((await get(0,'/api/leaderboard?rule=endless')).entries[0].wins,9);assert.equal(f.metrics.queries.filter(sql=>sql.includes('FROM challenge_scores WHERE mode=')).length,1);
 // 1,000 irrelevant waiting players must not enter the indexed RP window.
 const insert=f.sqlite.prepare('INSERT INTO online_queue (key,player,rating,joined_at,touched_at,rule_set) VALUES (?,?,?,?,?,?)'),player=JSON.stringify({profile:{name:'索引',char:'一',frame:'plain',color:'gold',glow:'none'},items:room.host.items,cost:6});
 for(let n=0;n<1000;n++)insert.run('far-'+n,player,10000+n,now,now,'balanced');
 insert.run('near',player,1205,now,now,'balanced');insert.run('wrong-rule',player,1200,now,now,'free');insert.run('expired',player,1200,now-50000,now-50000,'balanced');
 for(const lower of [true,false]){const query=candidateQuery(lower),args=['balanced',1200,lower?-800:3200,now-45000,'online:perf-3',1200,120,now],plan=f.sqlite.prepare('EXPLAIN QUERY PLAN '+query).all(...args);assert(plan.some(r=>r.detail.includes('SEARCH online_queue USING INDEX idx_online_queue_rating')&&r.detail.includes('rating')));assert(f.sqlite.prepare(query).all(...args).length<=12);}
 let matched=await get(3,'/api/online/queue','POST',team);assert.equal(matched.room.host.profile.name,'索引');assert.equal(f.sqlite.prepare('SELECT room_code FROM online_queue WHERE key=?').get('near').room_code,matched.room.code);
 insert.run('long-wait',player,2100,now-40000,now,'balanced');matched=await get(4,'/api/online/queue','POST',team);assert.equal(f.sqlite.prepare('SELECT room_code FROM online_queue WHERE key=?').get('long-wait').room_code,matched.room.code);
 // Queue keepalive writes at most once per 10s while selection checks continue.
 f.sqlite.prepare('DELETE FROM online_queue WHERE key=?').run('expired');const waiting=await get(5,'/api/online/queue','POST',team);assert.equal(waiting.status,'waiting');f.resetMetrics();for(let n=0;n<9;n++){now+=1000;assert.equal((await get(5,'/api/online/queue')).status,'waiting');}assert.equal(f.metrics.writeStatements,0);now+=1000;await get(5,'/api/online/queue');assert.equal(f.metrics.rowsWritten,1);
 console.log(JSON.stringify({calls,fullBytes:full.bytes,unchangedBytes:light.bytes,reductionPercent:Math.round((1-light.bytes/full.bytes)*100),heartbeatWritesPer30Checks:heartbeatWrites,settled100ReadsNoWrites:true,repeated60SavesNoRowsWritten:true,cold50RequestsOneRefresh:true,hot200Requests200PrimaryKeyReads:true,expired50RequestsOneRefresh:true,indexed1000WaitingPlayers:true,longWaitStillMatches:true,queueKeepalive10s:true}));
}finally{Date.now=realNow;f.sqlite.close();}
