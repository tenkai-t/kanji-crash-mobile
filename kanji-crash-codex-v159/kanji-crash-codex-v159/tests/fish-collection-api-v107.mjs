import assert from 'node:assert/strict';
import Worker from '../dist/server/index.js';
import {fixture} from './friend-server.mjs';
const f=fixture(),profile={name:'魚の人',char:'鮎',frame:'double',color:'gold',glow:'none',honorId:'fish-complete'};
async function call(device,path,method='GET',body){const r=await Worker.fetch(new Request('https://game.test'+path,{method,headers:{'oai-authenticated-user-id':'owner','X-Kanji-Device':String(device).padStart(32,'0'),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),f.env);return {status:r.status,value:await r.json()};}
try{
 assert.equal((await call(1,'/api/profile','PUT',profile)).status,400);
 assert.equal((await call(1,'/api/profile','PUT',{...profile,achievementProgress:{collectedFish:152}})).status,400);
 assert.equal((await call(1,'/api/profile','PUT',{...profile,achievementProgress:{collectedFish:154}})).status,400);
 const saved=await call(1,'/api/profile','PUT',{...profile,achievementProgress:{collectedFish:153}});assert.equal(saved.status,200);assert.equal(saved.value.achievementProgress.collectedFish,153);assert.equal(saved.value.profile.honorId,'fish-complete');
 assert.equal((await call(1,'/api/profile')).value.profile.honorId,'fish-complete');
 const sync=await call(1,'/api/achievements','POST',{progress:{collectedFish:0},profile});assert.equal(sync.status,200);assert.equal(sync.value.achievementProgress.collectedFish,153);
 assert.equal((await call(2,'/api/profile','PUT',profile)).status,400);assert.equal((await call(2,'/api/profile')).value.profile,null);
 console.log('PASS fish collection honor API validates thresholds, saves and reloads, retains unlocks and isolates devices');
}finally{f.sqlite.close();}
