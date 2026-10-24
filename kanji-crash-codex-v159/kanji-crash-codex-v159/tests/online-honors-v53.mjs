import assert from 'node:assert/strict';import {fixture} from './friend-server.mjs';import Worker from '../dist/server/index.js';
const f=fixture(),device='1'.repeat(32),key='owner:'+device,plain={name:'対人枠',char:'一',frame:'plain',color:'gold',glow:'none'};
async function call(path,method='GET',body){const r=await Worker.fetch(new Request('https://game.test'+path,{method,headers:{'oai-authenticated-user-id':'owner','X-Kanji-Device':device,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),f.env);return {status:r.status,value:await r.json()};}
try{
assert.equal((await call('/api/profile','PUT',plain)).status,200);
assert.equal((await call('/api/profile','PUT',{...plain,honorId:'online-rp-1400',achievementProgress:{highestOnlineRP:2600}})).status,400);
f.sqlite.prepare('INSERT INTO online_stats (key,rating) VALUES (?,?)').run('free:online:'+key,1800);
let r=await call('/api/online/stats?rule=free');assert.equal(r.value.achievementProgress.highestOnlineRP,1800);
assert.equal((await call('/api/profile','PUT',{...plain,honorId:'online-rp-1800'})).status,200);
f.sqlite.prepare('UPDATE online_stats SET rating=1000 WHERE key=?').run('free:online:'+key);
r=await call('/api/profile');assert.equal(r.value.achievementProgress.highestOnlineRP,1800);assert.equal(r.value.profile.honorId,'online-rp-1800');
assert.equal((await call('/api/profile','PUT',{...plain,honorId:'online-rp-2000',achievementProgress:{highestOnlineRP:2000}})).status,400);
console.log('Online RP frames: server authority, exact threshold, free mode and permanent unlock passed');
}finally{f.sqlite.close();}
