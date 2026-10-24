const assert=require('node:assert/strict'),I=require('../dist/inventory-rules.js');
const dictionary={A:['ア','イ','ウ','エ','オ'],B:['カ','キ'],C:['ク'],S:[]},read=c=>dictionary[c];
const make=(id,char='A',extra={})=>I.normalize({instanceId:id,id:char,char,jis:1,level:1,exp:0,ruby:read(char)[0]||'',...extra},read);
const state={deck:['hero','other-deck'],inventory:[make('hero','A',{level:50,locked:true}),...Array.from({length:8},(_,n)=>make('a'+n)),make('protected','A',{locked:true}),make('other-deck','A'),make('b-hero','B',{level:100}),make('b-copy','B'),make('b-extra','B'),make('c1','C'),make('c2','C'),make('s1','S'),make('s2','S')],coins:999,rating:1555};
const before=JSON.stringify(state),plan=I.rubyUnlockPlan(state,read),out=I.executePlan(state,plan,{getReadings:read});
assert.equal(JSON.stringify(state),before);assert.equal(plan.characterCount,2);assert.equal(plan.unlockedCount,5);assert.equal(plan.operations.length,5);
assert.deepEqual(out.consumed,['a0','a1','a2','a3','b-copy']);
const hero=out.inventory.find(i=>i.instanceId==='hero');assert.deepEqual(hero.unlockedReadings,read('A'));assert.deepEqual(hero.equippedReadings,read('A'));assert(hero.locked);assert.equal(I.totalExp(hero),I.totalExp(state.inventory[0])+160);
for(const id of ['protected','other-deck','a4','a5','a6','a7','b-hero','b-extra','c1','c2','s1','s2'])assert(out.inventory.some(i=>i.instanceId===id));
assert.equal(out.inventory.find(i=>i.instanceId==='b-hero').level,100);assert.equal(out.inventory.find(i=>i.instanceId==='b-hero').exp,0);
// Preserve the most-grown copy even when a different protected copy receives rubies.
const preserve={deck:['active'],inventory:[make('grown','A',{level:80}),make('active','A',{level:3}),make('low'),make('spare')]},p=I.rubyUnlockPlan(preserve,read);
assert(p.operations.every(o=>o.keepId==='active'&&o.materialId!=='grown'));assert.equal(p.operations.length,2);
// Transfer a material's unlocked rubies, then stop without consuming surplus.
const transfer={deck:[],inventory:[make('kept','A',{level:15,unlockedReadings:['ア','イ'],equippedReadings:['ア']}),make('rich','A',{unlockedReadings:read('A'),equippedReadings:['ア']}),make('spare2','A',{level:2})]},t=I.rubyUnlockPlan(transfer,read),r=I.executePlan(transfer,t,{getReadings:read});
assert.equal(t.operations.length,1);assert.equal(t.unlockedCount,3);assert.equal(r.results[0].newReading,null);assert.deepEqual(r.inventory[0].equippedReadings,['ア','ウ','エ','オ']);assert(r.inventory.some(i=>i.instanceId==='spare2'));
assert.equal(I.rubyUnlockPlan({deck:[],inventory:[make('complete','A',{unlockedReadings:read('A')}),make('complete2','A',{unlockedReadings:read('A')})]},read).operations.length,0);
assert.equal(I.rubyUnlockPlan({deck:[],inventory:[make('locked','A',{locked:true}),make('locked2','A',{locked:true})]},read).operations.length,0);
assert.equal(I.rubyUnlockPlan({deck:[],inventory:[]},read).operations.length,0);
const stale=I.rubyUnlockPlan(preserve,read);preserve.inventory.find(i=>i.instanceId==='low').locked=true;assert.throws(()=>I.executePlan(preserve,stale,{getReadings:read}),/stale/);
// Exercise uneven inventory sizes and mixed protected/unlocked/complete copies.
let seed=77;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
for(let n=0;n<100;n++){
 const inv=Array.from({length:5+Math.floor(random()*60)},(_,j)=>{const char=['A','B','C','S'][Math.floor(random()*4)],all=read(char),words=all.slice(0,Math.floor(random()*(all.length+1)));return make('i'+j,char,{level:1+Math.floor(random()*100),unlockedReadings:words,locked:random()<.3});}),sample={inventory:inv,deck:inv.filter(()=>random()<.15).map(i=>i.instanceId)},q=I.rubyUnlockPlan(sample,read);
 if(!q.operations.length)continue;
 const result=I.executePlan(sample,q,{getReadings:read}),targets=new Set(q.operations.map(o=>o.keepId));let added=0;
 for(const id of targets){const a=inv.find(i=>i.instanceId===id),b=result.inventory.find(i=>i.instanceId===id);added+=I.unlocked(b,read).length-I.unlocked(a,read).length;assert(I.unlocked(b,read).every(ruby=>read(b.char).includes(ruby)));assert(I.totalExp(b)>=I.totalExp(a));}
 assert.equal(added,q.unlockedCount);
 for(const char of Object.keys(dictionary)){const members=inv.filter(i=>i.char===char);if(!members.length)continue;const best=members.slice().sort((a,b)=>I.totalExp(b)-I.totalExp(a)||I.unlocked(b,read).length-I.unlocked(a,read).length)[0];assert(result.inventory.some(i=>i.instanceId===best.instanceId));}
 assert(q.operations.every(o=>o.type==='duplicate'&&!I.protectedItem(inv.find(i=>i.instanceId===o.materialId),sample.deck)));
}
console.log(JSON.stringify({oneBatch:true,locksAndDeckProtected:true,mostGrownRetained:true,autoEquipped:true,surplusRetained:true,secretsAndCompleteSkipped:true,transferredReadingsCounted:true,staleRejected:true,mixedInventories:100}));
