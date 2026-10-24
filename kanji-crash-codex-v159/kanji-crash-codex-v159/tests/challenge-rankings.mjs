import assert from 'node:assert/strict';
import {fixture} from './friend-server.mjs';
import Worker from '../dist/server/index.js';
const f=fixture(),device=n=>String(n).padStart(32,'0');let calls=0;const realNow=Date.now;let now=realNow();Date.now=()=>now;
const items=[{char:'一',level:8,equippedReadings:['イチ']},{char:'山',level:12,equippedReadings:['サン']},{char:'小',level:30,equippedReadings:['ショウ']}];
async function call(n,path,method='GET',body,deviceNumber=n,extra={}){
 // These ordering assertions read after the shared snapshot expires; cache races have a separate suite.
 if(path.startsWith('/api/leaderboard'))now+=30001;const response=await Worker.fetch(new Request('https://game.test'+path,{method,headers:{...(n?{'oai-authenticated-user-id':'challenge-'+n,'X-Kanji-Device':device(deviceNumber)}:{}),...extra,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),f.env);calls++;return {status:response.status,value:await response.json()};}
const okay=result=>{assert.equal(result.status,200,JSON.stringify(result));return result.value;};
const score=(mode,wins,kills=0,team=items)=>({mode,wins,kills,items:team});
try{
 assert.deepEqual(okay(await call(0,'/api/leaderboard?rule=endless')).entries,[]);assert.deepEqual(okay(await call(0,'/api/leaderboard?rule=trial')).entries,[]);
 assert.equal((await call(0,'/api/challenges/score','POST',score('trial',5))).status,401);assert.equal((await call(0,'/api/challenges/records')).status,401);
 for(let n=1;n<=14;n++){okay(await call(n,'/api/profile','PUT',{name:'挑戦者'+n,char:'一',frame:'plain',color:'gold',glow:'none'}));okay(await call(n,'/api/challenges/score','POST',score('endless',n,n*3)));okay(await call(n,'/api/challenges/score','POST',score('trial',15-n)));}
 const endless=okay(await call(0,'/api/leaderboard?rule=endless')),trial=okay(await call(0,'/api/leaderboard?rule=trial'));assert.equal(endless.entries.length,10);assert.deepEqual(endless.entries.map(r=>r.wins),[14,13,12,11,10,9,8,7,6,5]);assert.equal(trial.entries[0].profile.name,'挑戦者1');assert.deepEqual(trial.entries.map(r=>r.wins),[14,13,12,11,10,9,8,7,6,5]);assert(endless.entries.every(r=>r.items.length===3&&!('rating'in r)&&!('key'in r)&&!JSON.stringify(r).includes('challenge-')));
 for(const input of [score('bad',1),score('trial',-1),score('trial',1,1),score('endless',1,7),score('trial',1000001),score('endless',0,0),{...score('endless',1,3),estimated:'true'},score('trial',1,0,[{char:'?',level:1,equippedReadings:['イチ']}]),score('trial',1,0,[{char:'一',level:1,equippedReadings:['にせよみ']}])])assert.equal((await call(1,'/api/challenges/score','POST',input)).status,400,JSON.stringify(input));
 assert.equal((await call(1,'/api/challenges/score','POST',score('trial',20),1,{Origin:'https://other.test'})).status,403);
 const stronger=okay(await call(2,'/api/challenges/score','POST',score('endless',14,43)));assert.equal(stronger.record.kills,43);assert.equal(okay(await call(0,'/api/leaderboard?rule=endless')).entries[0].profile.name,'挑戦者2');
 okay(await call(2,'/api/challenges/score','POST',score('endless',2,6)));assert.equal(okay(await call(2,'/api/challenges/records')).records.find(r=>r.mode==='endless').wins,14);
 const concurrent=await Promise.all([call(3,'/api/challenges/score','POST',score('trial',60)),call(3,'/api/challenges/score','POST',score('trial',40))]);concurrent.forEach(okay);assert.equal(okay(await call(3,'/api/challenges/records')).records.find(r=>r.mode==='trial').wins,60);
 const acrossDevices=okay(await call(2,'/api/challenges/records','GET',undefined,999));assert.deepEqual(acrossDevices.records,[]);assert.equal(okay(await call(4,'/api/challenges/records')).records.find(r=>r.mode==='endless').wins,4);
 const legacy={...score('endless',70,210,[]),estimated:true};okay(await call(4,'/api/challenges/score','POST',legacy));let rank=okay(await call(0,'/api/leaderboard?rule=endless'));assert.equal(rank.entries[0].estimated,true);assert.deepEqual(rank.entries[0].items,[]);okay(await call(4,'/api/challenges/score','POST',score('endless',70,210)));rank=okay(await call(0,'/api/leaderboard?rule=endless'));assert.equal(rank.entries[0].estimated,false);assert.equal(rank.entries[0].items.length,3);
 okay(await call(4,'/api/profile','PUT',{name:'新しい名前',char:'山',frame:'double',color:'cyan',glow:'soft'}));okay(await call(4,'/api/challenges/score','POST',score('endless',1,3)));rank=okay(await call(0,'/api/leaderboard?rule=endless'));assert.equal(rank.entries[0].profile.name,'新しい名前');assert.equal(rank.entries[0].wins,70);assert.deepEqual(rank.entries[0].items,items);
 assert.equal(okay(await call(1,'/api/online/stats')).rating,1200);assert.deepEqual(okay(await call(0,'/api/leaderboard?rule=cpu')).entries,[]);
 const query=f.sqlite.prepare('EXPLAIN QUERY PLAN SELECT wins,kills FROM challenge_scores WHERE mode=? AND (wins>0 OR kills>0) ORDER BY wins DESC,kills DESC,updated_at ASC,key ASC LIMIT 10').all('endless');assert(query.some(row=>row.detail.includes('idx_challenge_scores_ranking')));
 console.log(JSON.stringify({calls,publicActualTop10:true,streakThenKills:true,separateTrials:true,deviceScoped:true,monotonicConcurrent:true,legacyPreserved:true,recordedLetters:true,noIdentityLeak:true,validation:true,RPUnchanged:true,indexUsed:true}));
}finally{Date.now=realNow;f.sqlite.close();}
