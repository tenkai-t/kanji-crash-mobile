import assert from 'node:assert/strict';
import Worker from '../dist/server/index.js';
import {fixture} from './friend-server.mjs';
const f=fixture({measure:true}),device='1'.repeat(32);let calls=0;
async function call(user,path,method='GET',body,extra={}){const r=await Worker.fetch(new Request('https://game.test'+path,{method,headers:{...(user?{'oai-authenticated-user-id':user}:{}),'X-Kanji-Device':device,...extra,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),f.env);calls++;return{status:r.status,value:await r.json()};}
const event=(id,char='木')=>({id,items:[{char,shots:1,kills:3,bestShot:3,survived:true}],outcome:'win',challenge:'shot-chain',cleared:true,shots:1,survivors:1});
try{
 assert.equal((await call(null,'/api/play-progress')).status,401);assert.equal((await call('a','/api/play-progress','POST',{events:[event('event_cross')]},{Origin:'https://evil.test'})).status,403);
 const empty=await call('a','/api/play-progress');assert.equal(empty.status,200);assert.deepEqual(empty.value.progress,{usage:{},challenges:{}});
 assert.equal((await call('a','/api/play-progress','POST',{events:[event('event_bad','fake')]})).status,400);assert.equal((await call('a','/api/play-progress','POST',{events:[event('event_same'),event('event_same')]})).status,400);
 const attempts=await Promise.all([call('a','/api/play-progress','POST',{events:[event('event_concurrent')]}),call('a','/api/play-progress','POST',{events:[event('event_concurrent')]})]);assert(attempts.every(r=>r.status===200));let p=(await call('a','/api/play-progress')).value.progress;assert.equal(p.usage['木'].plays,1);assert.equal(p.challenges['shot-chain'].clears,1);
 f.resetMetrics();assert.equal((await call('a','/api/play-progress','POST',{events:[event('event_concurrent')]})).status,200);assert.equal(f.metrics.writeStatements,0);
 await call('a','/api/play-progress','POST',{events:[event('event_other')]},{'X-Kanji-Device':'2'.repeat(32)});p=(await call('a','/api/play-progress')).value.progress;assert.equal(p.usage['木'].plays,2);assert.equal(p.usage['木'].kills,6);assert.equal(p.challenges['shot-chain'].attempts,2);assert.equal(p.challenges['shot-chain'].bestShots,1);assert.deepEqual((await call('b','/api/play-progress')).value.progress,{usage:{},challenges:{}});
 const query=f.sqlite.prepare('EXPLAIN QUERY PLAN SELECT char FROM play_usage WHERE key=?').all('online:a');assert(query.some(r=>r.detail.includes('INDEX')));console.log(JSON.stringify({calls,privateRecords:true,crossOriginRejected:true,duplicateNoWrites:true,concurrentOnce:true,multipleDevices:true,indexed:true}));
}finally{f.sqlite.close();}
