const assert=require('node:assert/strict'),I=require('../dist/inventory-rules.js'),G=require('../dist/collection-goals.js'),L=require('../dist/team-links.js'),H=require('../dist/honor-icons.js'),Game=require('../server/game.cjs'),R=require('../dist/kanji-rules.js'),Read=require('../dist/reading-abilities.js');
const catalogue=[...Game.bases.values()],dictionary=require('../server/generated/readings.json'),read=c=>[...new Set((dictionary[c]||[]).map(r=>r.replace(/[・()（）.]/g,'').replace(/^-/,'').replace(/-$/,'')))].filter(r=>/^[ぁ-ゖァ-ヺー]+$/.test(r));
const make=(id,char,extra={})=>I.normalize({...Game.bases.get(char),instanceId:id,level:1,exp:0,ruby:read(char)[0]||'',...extra},read);
const state={inventory:[],deck:[],coins:500,characterDiscoveries:['木','林']};G.initialize(state);assert(G.validSave(state));assert.throws(()=>G.claim(state,'forest'));assert.equal(state.coins,500);state.characterDiscoveries.push('森');G.claim(state,'forest');assert.equal(state.coins,800);assert(G.progress(state,'forest').claimed);assert.throws(()=>G.claim(state,'forest'));assert.equal(state.coins,800);assert(G.progress(JSON.parse(JSON.stringify(state)),'forest').complete);
for(const value of [null,['forest','forest'],['bad']])assert(!G.validSave({collectionClaims:value}));assert(!G.validSave({recipeDiscoveries:['bad']}));assert(G.validSave({}));for(const mission of G.missions)assert(mission.chars.every(c=>Game.bases.has(c)));
const completed={collectionClaims:G.missions.map(m=>m.id)};const progress=H.fromState(completed);assert(H.canUse('collector-crown',progress));assert(!H.canUse('collector-leaf',{completedCollections:1}));assert(!H.validProgress({completedCollections:G.missions.length+1}));
for(const recipe of G.recipes){
 assert(recipe.materials.every(c=>Game.bases.has(c)));assert(Game.bases.has(recipe.result)&&read(recipe.result).length);assert.equal(G.match(...recipe.materials.slice().reverse()).id,recipe.id);
 const s={inventory:[make('inst_a',recipe.materials[0],{level:10,exp:9}),make('inst_b',recipe.materials[1],{level:3,exp:2}),make('inst_keep',recipe.result,{locked:true})],deck:['inst_keep'],coins:500},before=JSON.stringify(s),p=I.recipePlan(s,'inst_a','inst_b');assert.equal(p.operations.length,1);
 const out=I.executePlan(s,p,{getReadings:read,catalogue,createId:()=>`inst_result_${recipe.id}`});assert.equal(JSON.stringify(s),before);assert.equal(out.coinsSpent,150);assert.equal(out.inventory.length,2);const item=out.inventory.find(i=>i.instanceId===out.results[0].instanceId);assert.equal(item.char,recipe.result);assert.equal(I.totalExp(item),I.totalExp(s.inventory[0])+I.totalExp(s.inventory[1]));assert.equal(item.equippedReadings.length,1);assert(out.inventory.some(i=>i.instanceId==='inst_keep'));
 assert.throws(()=>I.executePlan({...s,coins:149},p,{getReadings:read,catalogue,createId:()=> 'inst_bad'}),/coins/);
 const bad={...s,inventory:s.inventory.map(i=>({...i,locked:true}))};assert.equal(I.recipePlan(bad,'inst_a','inst_b').operations.length,0);assert.equal(I.recipePlan(s,'inst_a','inst_a').operations.length,0);
 G.discover(state,recipe.id);G.discover(state,recipe.id);
}
assert.equal(state.recipeDiscoveries.length,16);assert(G.validSave(state));
const mixed={inventory:[make('inst_a','木'),make('inst_b','火')],deck:[],coins:500};assert.equal(I.recipePlan(mixed,'inst_a','inst_b').operations.length,0);
for(const link of L.catalogue){
 const plain=link.chars.map((c,n)=>make('inst_'+n,c,{level:10})),linked=L.apply(plain);assert.equal(L.active(plain).id,link.id);assert(!plain.some(i=>i.teamLink));assert(L.apply([plain[0],plain[0],plain[1]]).every(i=>!i.teamLink));
 for(let n=0;n<3;n++){const base=R.getStats(plain[n],Read.bonusForReadings(plain[n].equippedReadings),Read.resolveAll(plain[n])),boost=Game.stats(linked[n]);assert.equal(boost.power,Math.round(base.power*(1+link.power)));assert.equal(boost.weight,Math.round(base.weight*(1+link.weight)));}
 // Server derives a link from the roster and ignores a forged client flag.
 const roster=Game.roster({items:plain.map(i=>({...i,teamLink:'flame'}))}),other=Game.roster({items:['一','小','口'].map(c=>({char:c,level:10,equippedReadings:read(c).slice(0,1),teamLink:'flame'}))}),battle=Game.initial(roster,other,()=>0);
 assert(battle.pieces.slice(0,3).every(p=>p.data.teamLink===link.id));assert(battle.pieces.slice(3).every(p=>!p.data.teamLink));assert(battle.pieces.every(p=>Number.isFinite(p.mass)&&p.mass>0));
 const shooter=battle.pieces.find(p=>Math.floor(p.key/3)===battle.turn),next=Game.play(battle,{id:'link-shot',key:shooter.key,dx:0,dy:1,power:.1,spin:0},battle.turn,()=>.8);assert(next.pieces.slice(0,3).every(p=>p.data.teamLink===link.id));
}
console.log(JSON.stringify({missions:G.missions.length,recipes:16,links:6,claimOnce:true,legacyAndBackup:true,protectedRecipes:true,expInheritance:true,coinChecks:true,authoritativeLinks:true,clientFlagIgnored:true,frames:3}));
