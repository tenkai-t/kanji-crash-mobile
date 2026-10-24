import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import Worker from '../dist/server/index.js';
import {fixture} from './friend-server.mjs';
const require=createRequire(import.meta.url),f=fixture(),Game=require('../server/game.cjs'),S=require('../dist/avatar-style.js'),H=require('../dist/honor-icons.js'),dictionary=require('../server/generated/readings.json');
const device=n=>String(n).padStart(32,'0');
async function call(n,path,method='GET',body,auth=true){const r=await Worker.fetch(new Request('https://game.test'+path,{method,headers:{...(auth?{'oai-authenticated-user-id':'owner'}:{}),'X-Kanji-Device':device(n),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),f.env);return {status:r.status,value:await r.json()};}
const profile=n=>({name:'フレンド'+n,char:'木',frame:'plain',color:'gold',glow:'none',honorId:'',appearance:S.defaults});
try{
 for(const n of [1,2,3])assert.equal((await call(n,'/api/profile','PUT',profile(n))).status,200);
 const c2=(await call(2,'/api/friends')).value.code,c1=(await call(1,'/api/friends')).value.code;
 assert.equal((await call(1,`/api/friends/${c2}/cpu`)).status,403);
 await call(1,'/api/friends/request','POST',{code:c2});assert.equal((await call(1,`/api/friends/${c2}/cpu`)).status,403);await call(2,`/api/friends/${c1}/accept`,'POST',{});
 assert.equal((await call(1,`/api/friends/${c2}/cpu`)).status,404);
 const chars=['木','火','盾'],items=chars.map((char,n)=>({instanceId:'inst_other_'+n,char,level:[12,55,100][n],equippedReadings:Game.roster({items:Array.from({length:3},()=>({char,level:1,equippedReadings:[...new Set(dictionary[char].map(r=>r.replace(/[.・()（）\s-]/g,'')))].slice(0,1)})),formation:null}).items[0].equippedReadings}));
 const team=Game.roster({items,formation:null}),formation=team.formation.map((p,n)=>({...p,angle:n*.3}));assert.equal((await call(2,'/api/friends/setup','PUT',{items,formation})).status,200);
 const read=await call(1,`/api/friends/${c2}/cpu`);assert.equal(read.status,200);assert.equal(read.value.cpuDifficulty,'hard');assert.deepEqual(read.value.team.items.map(i=>i.level),[12,55,100]);assert.deepEqual(read.value.team.items.map(i=>i.equippedReadings),items.map(i=>i.equippedReadings));assert.deepEqual(read.value.team.formation,formation);assert.equal(read.value.profile.name,profile(2).name);assert(!('presets' in read.value.profile));assert(!('achievementProgress' in read.value.profile));assert(!('key' in read.value));assert(!('inventory' in read.value));
 const initial=Game.initial(read.value.team,read.value.team,()=>.1);assert.deepEqual(initial.medals,{comeback:[false,false],abilities:[[],[]],kills:[[0,0,0],[0,0,0]]});assert.equal(initial.pieces[3].x,200-formation[0].x*184);assert.equal(initial.pieces[3].y,200-formation[0].y*184);assert.equal(initial.pieces[3].angle,formation[0].angle+Math.PI);
 items[0].level=99;await call(2,'/api/friends/setup','PUT',{items,formation});assert.equal((await call(1,`/api/friends/${c2}/cpu`)).value.team.items[0].level,99);
 assert.equal((await call(3,`/api/friends/${c2}/cpu`)).status,403);assert.equal((await call(1,`/api/friends/${c2}/cpu`,'GET',undefined,false)).status,401);
 const badge={...profile(1),appearance:{...S.defaults,badge:'friendship-bronze'}};assert.equal((await call(1,'/api/profile','PUT',badge)).status,400);assert.equal((await call(1,'/api/profile','PUT',{...badge,achievementProgress:{friendsCpuDefeated:4}})).status,400);assert.equal((await call(1,'/api/profile','PUT',{...badge,achievementProgress:{friendsCpuDefeated:5}})).status,200);assert.equal((await call(1,'/api/profile')).value.profile.appearance.badge,'friendship-bronze');assert.equal((await call(3,'/api/profile','PUT',badge)).status,400);
 await call(1,'/api/achievements','POST',{progress:{friendsCpuDefeated:0},profile:badge});assert.equal((await call(1,'/api/profile')).value.achievementProgress.friendsCpuDefeated,5);
 await call(1,`/api/friends/${c2}/remove`,'POST',{});assert.equal((await call(1,`/api/friends/${c2}/cpu`)).status,403);
 console.log('PASS accepted-friend authorization, isolated devices, offline CPU roster, exact growth/rubies/formation, latest saved growth, no private inventory, badge profile gating and permanent unlocks');
}finally{f.sqlite.close();}
