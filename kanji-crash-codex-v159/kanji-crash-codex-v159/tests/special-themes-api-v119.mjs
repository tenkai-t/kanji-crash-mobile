import assert from 'node:assert/strict';
import {fixture} from './friend-server.mjs';
import Worker from '../dist/server/index.js';
const f=fixture(),device=n=>String(n).padStart(32,'0');let calls=0;
async function call(n,path,method='GET',body){calls++;const r=await Worker.fetch(new Request('https://game.test'+path,{method,headers:{'oai-authenticated-user-id':'owner','X-Kanji-Device':device(n),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),f.env);return{status:r.status,value:await r.json()};}
const plain={name:'試練の人',char:'盾',frame:'double',color:'gold',glow:'none',honorId:''};
try{
 assert.equal((await call(1,'/api/profile','PUT',{...plain,honorId:'trial-crown',presets:[{...plain,honorId:'prism'}]})).status,200);const old=(await call(1,'/api/profile')).value.profile;assert.equal(old.honorId,'');assert.equal(old.presets[0].honorId,'');assert.equal(old.name,plain.name);
 assert.equal((await call(1,'/api/leaderboard?rule=trial')).status,400);assert.equal((await call(1,'/api/challenges/score','POST',{mode:'trial',wins:10,kills:0,estimated:false,items:[]})).status,400);
 assert.equal((await call(1,'/api/challenges/score','POST',{mode:'endless',wins:3,kills:9,estimated:false,items:[]})).status,200);assert.equal((await call(1,'/api/leaderboard?rule=endless')).value.entries.length,1);assert.equal((await call(1,'/api/challenges/records')).value.records.length,1);
 assert.equal((await call(1,'/api/profile','PUT',{...plain,appearance:{badge:'trial-iron-gold'}})).status,400);
 assert.equal((await call(1,'/api/achievements','POST',{progress:{trialThemeIronLevel:100},profile:plain})).status,200);assert.equal((await call(1,'/api/profile','PUT',{...plain,appearance:{badge:'trial-iron-gold'}})).status,200);assert.equal((await call(1,'/api/profile')).value.profile.appearance.badge,'trial-iron-gold');
 assert.equal((await call(2,'/api/profile','PUT',{...plain,appearance:{badge:'trial-iron-gold'}})).status,400);assert.equal((await call(2,'/api/profile')).value.profile,null);await call(1,'/api/achievements','POST',{progress:{trialThemeIronLevel:0},profile:plain});assert.equal((await call(1,'/api/profile')).value.achievementProgress.trialThemeIronLevel,100);
 console.log(JSON.stringify({calls,retiredFrameMigration:true,trialLeaderboardRetired:true,endlessUnaffected:true,newMedalValidation:true,deviceIsolation:true,permanentMedals:true}));
}finally{f.sqlite.close();}
