import assert from 'node:assert/strict';
import Worker from '../dist/server/index.js';
import {fixture} from './friend-server.mjs';
import Content from '../dist/one-shot-content.js';
const f=fixture({measure:true}),events=Content.stages.slice(3).map((c,n)=>({id:'event_stage43_'+n,items:[{char:'十',shots:1,kills:3,bestShot:3,survived:true}],outcome:'win',challenge:c.id,cleared:true,shots:1,survivors:1}));
async function call(user,device,method='GET',body){const r=await Worker.fetch(new Request('https://game.test/api/play-progress',{method,headers:{'oai-authenticated-user-id':user,'X-Kanji-Device':device,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),f.env);assert.equal(r.status,200);return r.json();}
try{
 const first=await call('stages-owner','a'.repeat(32),'POST',{events});assert.equal(Object.keys(first.progress.challenges).length,5);assert(Content.stages.slice(3).every(c=>first.progress.challenges[c.id].clears===1));
 f.resetMetrics();const duplicate=await call('stages-owner','a'.repeat(32),'POST',{events});assert.deepEqual(duplicate.progress,first.progress);assert.equal(f.metrics.writeStatements,0);
 assert.deepEqual((await call('stages-owner','b'.repeat(32))).progress,first.progress);assert.deepEqual((await call('different-owner','b'.repeat(32))).progress,{usage:{},challenges:{}});
 await call('stages-owner','a'.repeat(32),'POST',{events:[{...events[4],id:'event_stage43_retry',outcome:'loss',cleared:false}]});const retry=await call('stages-owner','a'.repeat(32));assert.equal(retry.progress.challenges['shot-sovereign'].attempts,2);assert.equal(retry.progress.challenges['shot-sovereign'].clears,1);
 console.log(JSON.stringify({fiveNewStagesStored:true,retryIdempotent:true,accountRestored:true,privateProgress:true,failedRetryKeepsClear:true}));
}finally{f.sqlite.close();}
