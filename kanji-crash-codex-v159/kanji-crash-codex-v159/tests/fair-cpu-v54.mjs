import assert from 'node:assert/strict';import {fixture} from './friend-server.mjs';import Worker from '../dist/server/index.js';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),C=require('../dist/cpu-skill-rules.js'),S=require('../dist/special-challenge.js'),Game=require('../server/game.cjs'),f=fixture(),device='a'.repeat(32);let serial=0;
async function call(user,path,method='GET',body){const r=await Worker.fetch(new Request('https://game.test'+path,{method,headers:{'oai-authenticated-user-id':user,'X-Kanji-Device':device,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),f.env);return{status:r.status,value:await r.json()};}
const event=(id='cpu-skill-basic',shots=2,survivors=3)=>({id:'fair_event_'+(++serial),items:C.chars.map((char,n)=>({char,shots:n===0?shots:0,kills:n===0?3:0,bestShot:n===0?3:0,survived:n<survivors})),outcome:'win',challenge:id,cleared:true,shots,survivors});
const save=async(user,e)=>{const r=await call(user,'/api/play-progress','POST',{events:[e]});assert.equal(r.status,200,JSON.stringify(r));return r.value;};
try{
 const db=[...Game.bases.values()],read=char=>Game.dictionary?.[char]||['イチ'];
 // Different owned levels, stats and chosen squads do not change the selected base difficulty.
 const realRead=char=>require('../server/generated/readings.json')[char].map(r=>r.replace(/[.・()（）-]/g,''));
 for(const level of [10,30,60,100]){const weak=C.team(db),strong=weak.map(i=>({...i,level:100}));let a=S.create(weak,db,realRead,Game.stats,()=>0,0,level),b=S.create(strong,db,realRead,Game.stats,()=>0,0,level);assert.deepEqual(a.enemies,b.enemies);assert.equal(a.level,level);for(let n=1;n<=12;n++){S.finish(a,true,{});a=S.advance(a,db,realRead,Game.stats,()=>0);assert.equal(a.difficultyLevel,level);assert.equal(a.level,Math.min(100,level+Math.floor(n/3)));assert.equal(a.multiplier,Math.ceil(1.35*(1+n*.03)*100)/100);}}
 for(const user of ['early','late'])assert.equal((await call(user,'/api/profile','PUT',{name:user,char:'一',frame:'plain',color:'gold',glow:'none'})).status,200);
 let e=event(),first=await save('early',e);await save('early',e);assert.equal(first.cpuSkillRecords[0].score,1390);
 await save('early',event());await save('early',event('cpu-skill-basic',10,1));assert.equal((await call('early','/api/play-progress')).value.cpuSkillRecords[0].score,1390);
 for(const user of ['early','late'])for(const c of C.stages)await save(user,event(c.id));
 f.sqlite.prepare('INSERT INTO cpu_scores (key,rating,profile,team,updated_at) VALUES (?,?,?,?,?)').run('online:early:'+device,999999,JSON.stringify({name:'early',char:'一',frame:'plain',color:'gold',glow:'none'}),'[]',1);
 const r=await call('late','/api/leaderboard?rule=cpu-skill&season=legacy');assert.equal(r.status,200);assert.equal(r.value.entries.length,2);assert(r.value.entries.every(e=>e.score===4170&&e.position===1&&e.clearedStages===3));assert(!JSON.stringify(r.value).includes('999999'));
 const wrong=event();wrong.items[0].char='木';assert.equal((await call('late','/api/play-progress','POST',{events:[wrong]})).status,400);
 const bad=event();bad.survivors=2;assert.equal((await call('late','/api/play-progress','POST',{events:[bad]})).status,400);
 console.log('Fixed trial difficulty, gradual streak scaling, three best scores, nonaccumulating retries, equal ranks and no cumulative point advantage passed');
}finally{f.sqlite.close();}
