import assert from 'node:assert/strict';
import {fixture} from './friend-server.mjs';
import Worker from '../dist/server/index.js';
const f=fixture(),device=n=>String(n).padStart(32,'0'),items=[{char:'𠂉',level:100,equippedReadings:[]},{char:'一',level:100,equippedReadings:['イチ']},{char:'山',level:100,equippedReadings:['サン']}];let calls=0;
async function call(n,path,method='GET',body){
 const headers={...(n?{'oai-authenticated-user-id':'secret-'+n,'X-Kanji-Device':device(n)}:{}),...(body?{'Content-Type':'application/json'}:{})};
 const response=await Worker.fetch(new Request('https://game.test'+path,{method,headers,...(body?{body:JSON.stringify(body)}:{})}),f.env);
 calls++;return{status:response.status,value:await response.json()};
}
const okay=result=>{assert([200,201].includes(result.status),JSON.stringify(result));return result.value;};
try{
 for(const n of [1,2])okay(await call(n,'/api/profile','PUT',{name:'秘密'+n,char:'𠂉',frame:'plain',color:'violet',glow:'none'}));
 const bad=items.map(i=>({...i,level:101}));assert.equal((await call(1,'/api/friends/rooms','POST',{items:bad,ruleSet:'free'})).status,400);
 assert.equal((await call(1,'/api/friends/rooms','POST',{items:items.map(i=>({...i,equippedReadings:[]})),ruleSet:'free'})).status,400);
 const setup={items:items.map((i,n)=>({...i,instanceId:'inst_secret_'+n})),formation:null};okay(await call(1,'/api/friends/setup','PUT',setup));assert.deepEqual(okay(await call(1,'/api/friends/setup')).setup.items,setup.items);
 let room=okay(await call(1,'/api/friends/rooms','POST',{items,ruleSet:'free'}));room=okay(await call(2,`/api/friends/rooms/${room.code}/join`,'POST',{items}));
 for(const n of [1,2])room=okay(await call(n,`/api/friends/rooms/${room.code}/ready`,'POST',{revision:room.revision,lineupRevision:room.lineupRevision,round:room.round,ready:true}));assert.equal(room.status,'playing');
 const side=room.state.turn,actor=side?2:1;room=okay(await call(actor,`/api/friends/rooms/${room.code}/shot`,'POST',{id:device(1000),revision:room.revision,key:side*3,dx:0,dy:side?1:-1,power:.001,spin:.2}));assert(room.state.pieces.every(i=>i.data.level===100));assert.equal(room.state.pieces[0].data.char,'𠂉');assert.deepEqual(room.state.pieces[0].data.equippedReadings,[]);
 okay(await call(1,`/api/friends/rooms/${room.code}/leave`,'POST',{}));
 for(const ruleSet of ['balanced','free']){okay(await call(1,'/api/online/queue','POST',{items,ruleSet}));const match=okay(await call(2,'/api/online/queue','POST',{items,ruleSet}));assert.equal(match.status,'matched');assert(match.room.host.items.every(i=>i.level===(ruleSet==='balanced'?10:100)));assert.deepEqual(match.room.host.items[0].equippedReadings,[]);okay(await call(1,`/api/friends/rooms/${match.room.code}/leave`,'POST',{}));}
 const record={mode:'endless',wins:1,kills:3,items};okay(await call(1,'/api/challenges/score','POST',record));const rank=okay(await call(0,'/api/leaderboard?rule=endless'));assert.equal(rank.entries[0].items[0].char,'𠂉');assert.deepEqual(rank.entries[0].items[0].equippedReadings,[]);
 // An old stored snapshot is displayed at Lv.100, retaining its record.
 const row=f.sqlite.prepare('SELECT payload FROM leaderboard_snapshots WHERE rule=?').get('endless'),payload=JSON.parse(row.payload);payload.entries[0].items[0].level=100000;f.sqlite.prepare('UPDATE leaderboard_snapshots SET payload=? WHERE rule=?').run(JSON.stringify(payload),'endless');const migrated=okay(await call(0,'/api/leaderboard?rule=endless'));assert.equal(migrated.entries[0].items[0].level,100);assert.equal(migrated.entries[0].wins,1);
 console.log(JSON.stringify({calls,secretFriendSetup:true,secretFriendBattle:true,secretBothOnlineRules:true,maxLevelRejected:true,normalStillRequiresRuby:true,secretChallengeRanking:true,legacyRankingClamped:true}));
}finally{f.sqlite.close();}
