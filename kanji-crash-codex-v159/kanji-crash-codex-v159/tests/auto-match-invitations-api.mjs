import assert from 'node:assert/strict';
import {fixture} from './friend-server.mjs';
import Worker from '../dist/server/index.js';
import {createRequire} from 'node:module';
const readings=createRequire(import.meta.url)('../server/generated/readings.json');
const f=fixture({measure:true}),device=n=>String(n).padStart(32,'0'),key=n=>`user-${n}:${device(n)}`,online=n=>'online:'+key(n),profile=n=>({name:'招待テスト'+n,char:'一',frame:'plain',color:'gold',glow:'none'}),team={items:['一','山','小'].map(char=>({char,level:20,equippedReadings:[readings[char][0].replace(/[.・()（）-]/g,'')]})),formation:null};
async function call(n,path,method='GET',body){const r=await Worker.fetch(new Request('https://game.test'+path,{method,headers:{...(n?{'oai-authenticated-user-id':'user-'+n,'X-Kanji-Device':device(n)}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),f.env);const value=await r.json();return {status:r.status,value};}
async function ok(n,path,method='GET',body){const r=await call(n,path,method,body);assert.equal(r.status,200,JSON.stringify(r));return r.value;}
try{
 for(let n=1;n<=4;n++){await ok(n,'/api/profile','PUT',profile(n));await ok(n,'/api/cpu/score','POST',{rating:n===2?25000:1000,items:team.items});}
 for(const ruleSet of ['balanced','free']){
  const statsKey=n=>(ruleSet==='free'?'free:':'')+online(n);
  for(const [n,rating]of [[1,1500],[2,1520],[3,1570],[4,2200]]){await ok(n,'/api/online/stats?rule='+ruleSet);f.sqlite.prepare('UPDATE online_stats SET rating=? WHERE key=?').run(rating,statsKey(n));}
  for(const [n,rating]of [[2,1520],[3,1570],[4,2200]])f.sqlite.prepare('INSERT INTO online_queue (key,player,rating,joined_at,touched_at,rule_set) VALUES (?,?,?,?,?,?)').run(online(n),JSON.stringify({...team,profile:profile(n)}),rating,Date.now(),Date.now(),ruleSet);
  const result=await ok(1,'/api/online/queue','POST',{...team,ruleSet,rating:25000,cpuRating:1000});assert.equal(result.status,'matched');assert.equal(result.room.host.profile.name,profile(2).name,'nearest PvP player must win over closest CPU score');assert.equal(result.room.onlineStats.rating,1500);assert.equal(result.room.peerOnlineStats.rating,1520);
  assert.equal(f.sqlite.prepare('SELECT rating FROM cpu_scores WHERE key=?').get(online(1)).rating,1000);assert.equal(f.sqlite.prepare('SELECT rating FROM cpu_scores WHERE key=?').get(online(2)).rating,25000);
  f.sqlite.exec('DELETE FROM online_queue; DELETE FROM friend_rooms;');
 }
 const codes=await Promise.all([1,2,3].map(async n=>(await ok(n,'/api/friends')).code));await ok(1,'/api/friends/request','POST',{code:codes[1]});await ok(2,`/api/friends/${codes[0]}/accept`,'POST',{});
 const room=await call(1,'/api/friends/rooms','POST',{...team,ruleSet:'free',friendCode:codes[1]});assert.equal(room.status,201);
 f.resetMetrics();const notice=await ok(2,'/api/friends/invitations');assert.equal(notice.invitations.length,1);assert.equal(notice.invitations[0].code,room.value.code);assert.equal(notice.invitations[0].profile.name,profile(1).name);assert.equal(f.metrics.reads,1);assert.equal(f.metrics.rowsWritten,0);const plan=f.sqlite.prepare('EXPLAIN QUERY PLAN '+f.metrics.queries[0]).all(key(2),key(2),key(2),Date.now());assert(plan.some(row=>/idx_friend_connections_right/.test(row.detail)));assert(!plan.some(row=>/SCAN c\b/.test(row.detail)));assert.equal(JSON.stringify(notice).includes('user-'),false);
 assert.deepEqual((await ok(1,'/api/friends/invitations')).invitations,[]);assert.deepEqual((await ok(3,'/api/friends/invitations')).invitations,[]);assert.equal((await call(0,'/api/friends/invitations')).status,401);
 await ok(2,`/api/friends/rooms/${room.value.code}/join`,'POST',team);assert.deepEqual((await ok(2,'/api/friends/invitations')).invitations,[]);
 await ok(1,`/api/friends/rooms/${room.value.code}/leave`,'POST',{});
 const expired=await call(1,'/api/friends/rooms','POST',{...team,friendCode:codes[1]});assert.equal(expired.status,201);f.sqlite.prepare('UPDATE friend_rooms SET expires_at=? WHERE code=?').run(Date.now()-1,expired.value.code);assert.deepEqual((await ok(2,'/api/friends/invitations')).invitations,[]);
 console.log(JSON.stringify({cpuRPGap:24000,nearestPvPInBothRules:true,clientRatingIgnored:true,notificationReadOnly:true,privateInvitations:true,joinedAndExpiredRemoved:true}));
}finally{f.sqlite.close();}
