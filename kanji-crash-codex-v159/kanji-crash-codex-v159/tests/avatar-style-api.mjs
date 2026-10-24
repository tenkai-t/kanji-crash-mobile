import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fixture} from './friend-server.mjs';
import Worker from '../dist/server/index.js';
const require=createRequire(import.meta.url),H=require('../dist/honor-icons.js'),S=require('../dist/avatar-style.js'),f=fixture(),dictionary=require('../server/generated/readings.json');let calls=0;
const device=n=>String(n).padStart(32,'0');
async function call(n,path,method='GET',body){calls++;const r=await Worker.fetch(new Request('https://game.test'+path,{method,headers:{'oai-authenticated-user-id':'owner','X-Kanji-Device':device(n),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),f.env);return{status:r.status,value:await r.json()};}
const plain={name:'墨の人',char:'盾',frame:'double',color:'gold',glow:'none',honorId:''},unlocks=H.progress({highestRating:4000,bestEndless:100,trialWins:3,bestTrialStreak:25,completedCollections:8,collectedCharacters:30,collectedWater:10,collectedWood:10,clearedConditions:6,clearedOneShots:3,intactClears:10}),appearance={...S.defaults,background:'asanoha',backgroundTone:'paper',finish:'emboss',glyphColor:'ink',frameTone:'celadon',motion:'orbit',badge:'one-shot'},preset={char:'盾',frame:'double',color:'celadon',glow:'none',honorId:'master-seal',appearance};
const team={items:['一','回','盾'].map(char=>({char,level:1,equippedReadings:[...new Set(dictionary[char].map(r=>r.replace(/[.・()（）\s-]/g,'')))].slice(0,1)})),formation:null};
try{
 assert.equal((await call(1,'/api/profile','PUT',plain)).status,200);assert.deepEqual((await call(1,'/api/profile')).value.profile,plain);
 assert.equal((await call(1,'/api/profile','PUT',{...plain,appearance:{badge:'one-shot'}})).status,400);
 assert.equal((await call(1,'/api/profile','PUT',{...plain,appearance:{motion:'fast'}})).status,400);
 const full={...plain,color:'celadon',honorId:'master-seal',appearance,presets:[preset,{...preset,char:'一',honorId:'jade'},null]};
 assert.equal((await call(1,'/api/profile','PUT',{...full,achievementProgress:unlocks})).status,200);assert.deepEqual((await call(1,'/api/profile')).value.profile,full);
 assert.equal((await call(1,'/api/profile','PUT',{...full,presets:[preset,preset,preset,preset]})).status,400);assert.equal((await call(1,'/api/profile','PUT',{...full,presets:[{...preset,char:'bad'}]})).status,400);assert.equal((await call(1,'/api/profile','PUT',{...full,appearance:{...appearance,unknown:'bad'}})).status,400);
 assert.deepEqual((await call(1,'/api/profile')).value.profile,full);
 // Achievement sync and old clients cannot erase saved custom settings.
 await call(1,'/api/achievements','POST',{progress:{highestRating:900},profile:plain});await call(1,'/api/profile','PUT',{...plain,honorId:'jade'});const preserved=(await call(1,'/api/profile')).value;assert.deepEqual(preserved.profile.appearance,appearance);assert.deepEqual(preserved.profile.presets,full.presets);assert.deepEqual(preserved.achievementProgress,unlocks);
 assert.equal((await call(2,'/api/profile')).value.profile,null);assert.equal((await call(2,'/api/profile','PUT',{...plain,name:'青の人'})).status,200);
 const created=await call(1,'/api/friends/rooms','POST',team);assert.equal(created.status,201);const joined=await call(2,`/api/friends/rooms/${created.value.code}/join`,'POST',team);assert.equal(joined.status,200);assert.deepEqual(joined.value.host.profile.appearance,appearance);assert(!('presets' in joined.value.host.profile));assert(!('achievementProgress' in joined.value.host.profile));
 assert.equal((await call(1,'/api/cpu/score','POST',{rating:2000,items:team.items})).status,200);const board=(await call(1,'/api/leaderboard?rule=cpu')).value;assert.equal(board.entries.length,1);assert.deepEqual(board.entries[0].profile.appearance,appearance);assert(!('presets' in board.entries[0].profile));
 const ownCode=(await call(1,'/api/friends')).value.code;await call(2,'/api/friends/request','POST',{code:ownCode});const friends=(await call(2,'/api/friends')).value;assert.deepEqual(friends.entries[0].profile.appearance,appearance);assert(!('presets' in friends.entries[0].profile));
 console.log(JSON.stringify({calls,legacyProfile:true,settingsAndPresetsStored:true,invalidAndLockedRejected:true,syncPreservesSettings:true,friendAndRankingAppearance:true,privatePresets:true}));
}finally{f.sqlite.close();}
