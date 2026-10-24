const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const L=require('../dist/level-rules.js'),I=require('../dist/inventory-rules.js'),R=require('../dist/kanji-rules.js'),A=require('../dist/reading-abilities.js'),E=require('../dist/endless-rules.js'),S=require('../dist/special-challenge.js'),D=require('../dist/deck-recommendation.js'),M=require('../dist/match-recommendation.js'),Game=require('../server/game.cjs');
const html=fs.readFileSync(require.resolve('../dist/index.html'),'utf8'),db=JSON.parse(html.match(/const KANJI_DATABASE\s*=\s*(\[.*?\]);/s)[1]),dictionary={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../dist/readings.js'),'utf8'),dictionary);
const read=char=>[...new Set((dictionary.window.KANJI_READINGS[char]||[]).map(r=>r.replace(/[.・()（）-]/g,'')).filter(r=>/^[ぁ-ゖァ-ヺー]+$/.test(r)))],stats=item=>R.getStats(item,A.bonusForReadings(item.equippedReadings||[]),A.resolveAll(item));
assert.equal(L.max,100);
for(const oldLevel of [101,150,100000]){const item={level:oldLevel,exp:987,locked:true,unlockedReadings:['ア'],equippedReadings:['ア'],instanceId:'inst_kept'};L.normalize(item);assert.deepEqual(item,{level:100,exp:0,locked:true,unlockedReadings:['ア'],equippedReadings:['ア'],instanceId:'inst_kept'});}
const boundary={level:99,exp:9899};L.applyExp(boundary,L.totalExp(boundary)+1);assert.deepEqual(boundary,{level:100,exp:0});L.applyExp(boundary,L.totalExp(boundary)+1e12);assert.deepEqual(boundary,{level:100,exp:0});
for(const base of db){assert.deepEqual(R.getStats({...base,level:100}),R.getStats({...base,level:100000}));const preview=R.growthPreview({...base,level:100});assert(preview.max&&preview.power===0&&preview.weight===0);}
const secret=db.find(i=>i.char==='𠂉');assert.equal(read(secret.char).length,0);
const pools=Object.fromEntries([1,2,3,4].map(jis=>[jis,db.filter(i=>i.jis===jis)]));
const make=(char,id,level=1)=>I.normalize({...db.find(i=>i.char===char),instanceId:id,level,exp:0,ruby:read(char)[0]||'',unlockedReadings:read(char).slice(0,1)},read);
for(const mode of ['manual','bulk']){
 const state={inventory:[make('一','inst_a',100),make('山','inst_b',100)],deck:[]},plan=mode==='manual'?I.manualPlan(state,'inst_a','inst_b'):I.buildPlan(state,'synthesis','all',read);
 const result=I.executePlan(state,plan,{getReadings:read,pools:{1:[secret]},rng:()=>.9,createId:()=>`inst_${mode}`}),item=result.inventory[0];assert.equal(item.char,'𠂉');assert.equal(item.level,100);assert.equal(item.exp,0);assert.equal(item.ruby,'');assert.deepEqual(item.equippedReadings,[]);assert.deepEqual(item.unlockedReadings,[]);
}
const pair={inventory:[make('𠂉','inst_a',100),make('𠂉','inst_b',100)],deck:[]},fused=I.executePlan(pair,I.duplicatePlan(pair,'inst_a'),{getReadings:read,pools}).inventory[0];assert.equal(fused.level,100);assert.equal(fused.exp,0);assert.deepEqual(fused.equippedReadings,[]);
const secrets=db.filter(i=>!read(i.char).length),team=secrets.slice(0,3).map((i,n)=>make(i.char,`inst_secret_${n}`,100));
assert.equal(secrets.length,8);assert.equal(D.recommend(team,read,stats).length,3);assert.equal(M.recommend(team,read,stats,'free').length,3);
const mixed=[make('𠂉','inst_s',100),make('一','inst_a',100),make('山','inst_b',100)];assert.equal(M.recommend(mixed,read,stats,'balanced').length,3);
const raw={items:team.map(({char,level,equippedReadings})=>({char,level,equippedReadings}))},host=Game.roster(raw);assert(host.items.every(i=>i.level===100&&!i.equippedReadings.length));
assert.throws(()=>Game.roster({...raw,items:raw.items.map(i=>({...i,level:101}))}),/編成/);assert.throws(()=>Game.roster({...raw,items:raw.items.map(i=>({...i,equippedReadings:['ア']}))}),/ルビ/);
assert.throws(()=>Game.roster({items:mixed.map(i=>({...i,equippedReadings:[]}))}),/ルビ/);
const state=Game.initial(host,host,()=>0),next=Game.play(state,{id:'secret',key:state.turn*3,dx:0,dy:1,power:.001,spin:.3},state.turn,()=>1);assert(next.pieces.every(i=>Number.isFinite(i.x)&&Number.isFinite(i.y)&&i.data.level===100));
const run=E.create(mixed);run.wave=1000;assert(E.enemyItems(run,pools,()=>0).every(i=>i.level===150));assert.equal(S.create(mixed,db,read,stats,()=>0,200,100).level,100);
console.log(JSON.stringify({maxLevel:100,catalogue:db.length,secrets:secrets.length,legacyMigration:true,expAndFusionCapped:true,secretManualAndBulk:true,secretRecommendations:true,secretServerBattle:true,enemyLevelCap:true}));
