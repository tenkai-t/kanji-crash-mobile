import assert from 'node:assert/strict';
import {fixture} from './friend-server.mjs';
import Worker from '../dist/server/index.js';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),Game=require('../server/game.cjs'),f=fixture(),device=n=>String(n).padStart(32,'0');let calls=0;
const dictionary=require('../server/generated/readings.json'),readingList=char=>[...new Set((dictionary[char]||[]).map(r=>r.replace(/[・()（）.]/g,'').replace(/^-/,'').replace(/-$/,'')))].filter(r=>/^[ぁ-ゖァ-ヺー]+$/.test(r));
const team=(chars=['一','山','小'],ruleSet='free')=>({ruleSet,items:chars.map((char,n)=>({char,level:3+n*8,equippedReadings:readingList(char).slice(0,2)})),formation:null});
async function call(n,path,method='GET',body){const r=await Worker.fetch(new Request('https://game.test'+path,{method,headers:{'oai-authenticated-user-id':'rules-'+n,'X-Kanji-Device':device(n),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),f.env);calls++;return {status:r.status,value:await r.json()};}
const okay=r=>{assert.equal(r.status,200,JSON.stringify(r));return r.value;};
const rares=[...Game.bases.values()].filter(i=>i.jis===4&&readingList(i.char).length).slice(0,3).map(i=>i.char),expensive=team(rares);
const normalized=room=>assert([...room.host.items,...room.guest.items].every(i=>i.level===10));
function finish(code){const row=f.sqlite.prepare('SELECT state FROM friend_rooms WHERE code=?').get(code),state=JSON.parse(row.state);state.finished=true;state.winner=0;state.reason='判定';f.sqlite.prepare("UPDATE friend_rooms SET state=?,status='finished' WHERE code=?").run(JSON.stringify(state),code);}
async function start(room,a,b){for(const n of [a,b])room=okay(await call(n,`/api/friends/rooms/${room.code}/ready`,'POST',{revision:room.revision,lineupRevision:room.lineupRevision,round:room.round,ready:true}));return room;}
try{
 for(let n=1;n<=4;n++)okay(await call(n,'/api/profile','PUT',{name:'ルール'+n,char:'一',frame:'plain',color:'gold',glow:'none'}));
 assert.equal((await call(1,'/api/online/queue','POST',team(undefined,'bad'))).status,400);
 assert.equal((await call(1,'/api/friends/rooms','POST',team(undefined,'bad'))).status,400);
 assert.equal((await call(1,'/api/online/stats?rule=bad')).status,400);
 assert.equal((await call(1,'/api/online/queue','POST',{...expensive,ruleSet:'balanced'})).status,400);
 assert.equal(okay(await call(1,'/api/online/queue','POST',team())).status,'waiting');
 assert.equal(okay(await call(2,'/api/online/queue','POST',team(undefined,'balanced'))).status,'waiting');
 assert.equal(okay(await call(1,'/api/online/queue')).ruleSet,'free');
 let free=await start(okay(await call(3,'/api/online/queue','POST',expensive)).room,1,3);assert.equal(free.ruleSet,'free');assert.deepEqual(free.host.items.map(i=>i.level),[3,11,19]);assert.deepEqual(free.host.items.map(i=>i.equippedReadings),team().items.map(i=>i.equippedReadings));assert(free.state.pieces.slice(0,3).every(p=>p.data.readingAbilities.length===p.data.equippedReadings.length));
 assert.equal(okay(await call(2,'/api/online/queue')).status,'waiting');
 const balanced=await start(okay(await call(4,'/api/online/queue','POST',team(undefined,'balanced'))).room,2,4);assert.equal(balanced.ruleSet,'balanced');normalized(balanced);assert.equal((await call(1,`/api/friends/rooms/${balanced.code}/rules`)).status,403);
 const balancedBefore=okay(await call(1,'/api/online/stats'));okay(await call(3,`/api/friends/rooms/${free.code}/leave`,'POST',{}));const freeRecord=okay(await call(1,'/api/online/stats?rule=free'));assert.equal(freeRecord.wins,1);assert.equal(freeRecord.rating,1212);assert.deepEqual(okay(await call(1,'/api/online/stats')),balancedBefore);for(let n=0;n<3;n++)okay(await call(1,`/api/friends/rooms/${free.code}`));assert.deepEqual(okay(await call(1,'/api/online/stats?rule=free')),freeRecord);
 assert.equal((await call(1,'/api/friends/rooms','POST',{...expensive,ruleSet:'balanced'})).status,400);
 const created=await call(1,'/api/friends/rooms','POST',team(undefined,'balanced'));assert.equal(created.status,201);const code=created.value.code;assert.equal(created.value.ruleSet,'balanced');assert.deepEqual(okay(await call(3,`/api/friends/rooms/${code}/rules`)),{ruleSet:'balanced',status:'waiting'});
 assert.equal((await call(2,`/api/friends/rooms/${code}/join`,'POST',expensive)).status,400);
 const joined=await start(okay(await call(2,`/api/friends/rooms/${code}/join`,'POST',team())),1,2);normalized(joined);assert.equal(joined.ruleSet,'balanced');
 finish(code);assert.equal((await call(1,`/api/friends/rooms/${code}/roster`,'POST',{round:1,team:expensive})).status,400);const prepared=okay(await call(1,`/api/friends/rooms/${code}/rematch`,'POST',{round:1}));assert.equal((await call(1,`/api/friends/rooms/${code}/roster`,'POST',{round:prepared.round,revision:prepared.revision,team:expensive})).status,400);
 okay(await call(1,`/api/friends/rooms/${code}/rematch`,'POST',{round:1,team:team()}));const rematch=okay(await call(2,`/api/friends/rooms/${code}/rematch`,'POST',{round:1,team:team()}));assert.equal(rematch.round,2);normalized(rematch);assert.equal(rematch.ruleSet,'balanced');
 const freeCreated=await call(1,'/api/friends/rooms','POST',expensive);assert.equal(freeCreated.status,201);free=await start(okay(await call(2,`/api/friends/rooms/${freeCreated.value.code}/join`,'POST',team(undefined,'balanced'))),1,2);assert.equal(free.ruleSet,'free');assert.deepEqual(free.guest.items.map(i=>i.level),[3,11,19]);assert.deepEqual(free.guest.items.map(i=>i.equippedReadings),team().items.map(i=>i.equippedReadings));
 finish(free.code);const stronger=team();stronger.items[0].level=50;okay(await call(1,`/api/friends/rooms/${free.code}/rematch`,'POST',{round:1,team:stronger}));free=okay(await call(2,`/api/friends/rooms/${free.code}/rematch`,'POST',{round:1,team:team()}));free=okay(await call(1,`/api/friends/rooms/${free.code}/roster`,'POST',{round:free.round,revision:free.revision,team:stronger}));assert.equal(free.host.items[0].level,50);
 f.sqlite.prepare("UPDATE friend_rooms SET rule_set='legacy' WHERE code IN (?,?)").run(balanced.code,free.code);assert.equal(okay(await call(2,`/api/friends/rooms/${balanced.code}`)).ruleSet,'balanced');assert.equal(okay(await call(1,`/api/friends/rooms/${free.code}`)).ruleSet,'free');
 console.log(JSON.stringify({calls,sameRuleOnly:true,freeLevelsAndRubies:true,freeNoCostLimit:true,normalizedLevels:true,budgetOnJoinAndRematch:true,immutableRoomRules:true,separateRatings:true,resultExactlyOnce:true,legacyCompatible:true}));
}finally{f.sqlite.close();}
