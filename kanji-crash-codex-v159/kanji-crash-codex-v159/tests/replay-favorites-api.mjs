import assert from 'node:assert/strict';
import {fixture} from './friend-server.mjs';
import Worker from '../dist/server/index.js';
import Replay from '../dist/replay-records.js';
import Game from '../server/game.cjs';
import * as Replays from '../server/replays.mjs';
import dictionary from '../server/generated/readings.json' with {type:'json'};
const f=fixture(),device='a'.repeat(32),team=Game.roster({items:['一','二','三'].map(char=>({char,level:10,equippedReadings:[dictionary[char][0].replace(/[.・()（）\s-]/g,'')]}))}),state=Game.initial(team,team,()=>0),r=Replays.begin({code:'ABCD2345',mode:'friend'},state,{...team,profile:{name:'保存者'}},{...team,profile:{name:'相手'}},1,Date.now()-100000);
r.id='cpu_favorite';r.mode='classic';Replay.finish(r,0,'判定',r.initial);
async function call(user,path,method='GET',body,extra={}){const res=await Worker.fetch(new Request('https://game.test'+path,{method,headers:{'oai-authenticated-user-id':user,'X-Kanji-Device':device,...extra,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),f.env);return{status:res.status,value:await res.json()};}
const ok=v=>{assert.equal(v.status,200,JSON.stringify(v));return v.value;};
try{
 ok(await call('a','/api/replays','POST',{replay:r}));ok(await call('a','/api/replays/'+r.id+'/favorite','PUT',{favorite:true}));
 assert.equal((await call('b','/api/replays/'+r.id+'/favorite','PUT',{favorite:true})).status,404);
 assert.equal((await call('a','/api/replays/'+r.id+'/favorite','PUT',{favorite:'yes'})).status,400);
 assert.equal((await call('a','/api/replays/'+r.id+'/favorite','PUT',{favorite:false},{Origin:'https://evil.test'})).status,403);
 for(let n=0;n<24;n++)ok(await call('a','/api/replays','POST',{replay:{...r,id:'cpu_new_'+n,createdAt:r.createdAt+n+1}}));
 const saved=ok(await call('a','/api/replays'));assert.equal(saved.replays.length,21);assert.equal(saved.replays.filter(r=>r.favorite).length,1);assert(!JSON.stringify(saved).includes('frames'));assert.equal((await call('a','/api/replays/'+r.id,'GET',undefined,{'X-Kanji-Device':'b'.repeat(32)})).status,404);
 for(let n=1;n<50;n++)ok(await call('a','/api/replays','POST',{replay:{...r,id:'cpu_fav_'+n},favorite:true}));
 assert.equal((await call('a','/api/replays','POST',{replay:{...r,id:'cpu_limit'},favorite:true})).status,409);assert.equal((await call('a','/api/replays/cpu_new_23/favorite','PUT',{favorite:true})).status,409);
 ok(await call('a','/api/replays/cpu_fav_1/favorite','PUT',{favorite:false}));ok(await call('a','/api/replays/cpu_new_23/favorite','PUT',{favorite:true}));
 ok(await call('a','/api/replays','POST',{replay:r}));assert.equal(ok(await call('a','/api/replays/'+r.id)).favorite,true);
 const plan=f.sqlite.prepare('EXPLAIN QUERY PLAN SELECT summary,favorite FROM battle_replays WHERE key=? ORDER BY favorite DESC,created_at DESC,id DESC LIMIT 70').all('online:a');assert(plan.some(p=>p.detail.includes('idx_battle_replays_favorites')));
 console.log(JSON.stringify({favoritesSurvive24NewMatches:true,accountPrivate:true,crossDevice:true,limit50:true,retryPreservesFavorite:true,indexedList:true}));
}finally{f.sqlite.close();}
