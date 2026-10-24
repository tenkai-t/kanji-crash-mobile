import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fixture} from './friend-server.mjs';
import Worker from '../dist/server/index.js';
const require=createRequire(import.meta.url),Game=require('../server/game.cjs'),Links=require('../dist/team-links.js'),Rules=require('../dist/kanji-rules.js'),dictionary=require('../server/generated/readings.json'),f=fixture();let calls=0;
const device=n=>String(n).padStart(32,'0');
const team=(ruleSet,chars)=>({ruleSet,items:chars.map((char,n)=>({char,level:20+n,equippedReadings:[dictionary[char][0].replace(/[.・()（）\s-]/g,'')],teamLink:'flame'})),formation:null});
async function call(n,path,method='GET',body){const response=await Worker.fetch(new Request('https://game.test'+path,{method,headers:{'oai-authenticated-user-id':'adventure-'+n,'X-Kanji-Device':device(n),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),f.env);calls++;return {status:response.status,value:await response.json()};}
const okay=r=>{assert.equal(r.status,200,JSON.stringify(r));return r.value;};
async function start(room,a,b){for(const n of [a,b])room=okay(await call(n,`/api/friends/rooms/${room.code}/ready`,'POST',{revision:room.revision,lineupRevision:room.lineupRevision,round:room.round,ready:true}));return room;}
function verify(room){
 assert.equal(room.status,'playing');assert.equal(room.host.profile.honorId,'collector-leaf');
 const linked=room.state.pieces.slice(0,3),plain=room.state.pieces.slice(3);assert(linked.every(p=>p.data.teamLink==='forest'));assert(plain.every(p=>!p.data.teamLink));
 for(const p of linked){const unlinked=Game.stats({...p.data,teamLink:undefined}),stats=Game.stats(p.data);assert.equal(stats.weight,Math.round(unlinked.weight*1.04));assert.equal(stats.power,unlinked.power);assert.equal(p.baseMass,Rules.getPhysics(stats).mass);}
 assert(room.state.pieces.every(p=>p.data.level===(room.ruleSet==='balanced'?10:20+p.key%3)));
}
try{
 const profile={name:'収集家',char:'木',frame:'plain',color:'gold',glow:'none',honorId:'collector-leaf'};
 for(let n=1;n<=8;n++)okay(await call(n,'/api/profile','PUT',{...profile,name:'参加者'+n,honorId:''}));
 assert.equal((await call(1,'/api/profile','PUT',profile)).status,400);
 for(const n of [1,3,5,7]){
  okay(await call(n,'/api/achievements','POST',{progress:{completedCollections:2}}));okay(await call(n,'/api/profile','PUT',profile));
  okay(await call(n,'/api/achievements','POST',{progress:{completedCollections:0}}));
  const saved=okay(await call(n,'/api/profile'));assert.equal(saved.profile.honorId,'collector-leaf');assert.equal(saved.achievementProgress.completedCollections,2);
 }
 for(const [kind,ruleSet,a,b]of [['friend','balanced',1,2],['friend','free',3,4],['online','balanced',5,6],['online','free',7,8]]){
  const host=team(ruleSet,Links.get('forest').chars),guest=team(ruleSet,['一','口','小']);let room;
  if(kind==='friend'){const created=await call(a,'/api/friends/rooms','POST',host);assert.equal(created.status,201);room=okay(await call(b,`/api/friends/rooms/${created.value.code}/join`,'POST',guest));}
  else{assert.equal(okay(await call(a,'/api/online/queue','POST',host)).status,'waiting');room=okay(await call(b,'/api/online/queue','POST',guest)).room;}
  room=await start(room,a,b);verify(room);const side=room.state.turn,actor=side?b:a,p=room.state.pieces[side*3],shot={id:device(100+a),revision:room.revision,key:p.key,dx:200-p.x,dy:200-p.y,power:.001,spin:0};
  room=okay(await call(actor,`/api/friends/rooms/${room.code}/shot`,'POST',shot));assert(room.state.pieces.slice(0,3).every(p=>p.data.teamLink==='forest'));
  const resumed=okay(await call(a,`/api/friends/rooms/${room.code}`));assert.deepEqual(resumed.state,room.state);okay(await call(b,`/api/friends/rooms/${room.code}/leave`,'POST',{}));
 }
 console.log(JSON.stringify({calls,collectionFrameStored:true,monotonicUnlock:true,friendRules:2,onlineRules:2,derivedLinkStats:true,forgedLinkIgnored:true,shotAndResume:true}));
}finally{f.sqlite.close();}
