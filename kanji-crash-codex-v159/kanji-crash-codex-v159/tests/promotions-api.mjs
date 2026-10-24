import assert from 'node:assert/strict';
import {fixture} from './friend-server.mjs';
import Worker from '../dist/server/index.js';
const f=fixture();
async function call(path,method='GET',body){const r=await Worker.fetch(new Request('https://game.test'+path,{method,headers:{'oai-authenticated-user-id':'promotion-owner','X-Kanji-Device':'3'.repeat(32),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),f.env);const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
const event=id=>({id:'event_'+id,items:[{char:'木',shots:1,kills:3,bestShot:3,survived:true}],outcome:'win',challenge:id,cleared:true,shots:1,survivors:3});
try{
 for(let rank=1;rank<=4;rank++){const events=['boss','mission'].map(kind=>event(`rank-${rank}-${kind}${kind==='mission'&&rank===3?'-v3':kind==='mission'&&rank===4?'-v2':''}`));await call('/api/play-progress','POST',{events});await call('/api/play-progress','POST',{events});}
 const records=await call('/api/play-progress');assert.equal(Object.keys(records.progress.challenges).length,8);assert(Object.values(records.progress.challenges).every(c=>c.clears===1&&c.attempts===1));
 await call('/api/profile','PUT',{name:'試験の達人',char:'木',frame:'plain',color:'gold',glow:'none'});
 await call('/api/achievements','POST',{progress:{highestRating:2700,highestCpuRank:4,cpuPromotionVersion:1}});const p=await call('/api/profile');assert.equal(p.achievementProgress.highestCpuRank,4);assert.equal(p.achievementProgress.cpuPromotionVersion,1);
 await call('/api/achievements','POST',{progress:{highestRating:1000,highestCpuRank:0,cpuPromotionVersion:1}});assert.equal((await call('/api/profile')).achievementProgress.highestCpuRank,4);
 console.log(JSON.stringify({eightTrialsSaved:true,retriesIdempotent:true,qualificationAccountRestore:true,qualificationPermanent:true}));
}finally{f.sqlite.close();}
