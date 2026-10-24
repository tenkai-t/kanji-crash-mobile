const assert=require('assert'),C=require('../dist/collection-rules.js'),I=require('../dist/inventory-rules.js'),T=require('../dist/character-traits.js');
const item=(char,jis=1,id=char)=>({char,jis,instanceId:'inst_'+id,level:4,exp:19,ruby:'ア',unlockedReadings:['ア'],locked:false});
const state={inventory:[item('一'),item('亜'),item('阿',2),item('愛',3),item('娃',4)],deck:[]};
C.initialize(state);assert.deepStrictEqual(state.inventory.map(i=>i.locked),[true,false,false,true,true]);assert.deepStrictEqual(state.specialDiscoveries,['一']);assert(state.inventory.every(i=>i.level===4&&i.exp===19&&i.ruby==='ア'));
const special=state.inventory[0];C.toggleLock(special);assert(!special.locked&&special.autoLockExempt);C.initialize(state);assert(!special.locked);C.applySettings(state,{special:true,rareMin:2});assert(!special.locked&&state.inventory[2].locked);
const copy=item('一',1,'copy');C.register(state,copy);state.inventory.push(copy);assert(copy.locked&&!copy.autoLockExempt);assert.equal(state.specialDiscoveries.length,1);
const plan=I.buildPlan(state,'synthesis','all',()=>['ア']);assert(!plan.operations.flatMap(o=>o.ids||[]).includes(copy.instanceId));
C.applySettings(state,{special:false,rareMin:0});assert(copy.locked,'turning off auto-lock must preserve all existing locks');const unlockedCopy=item('一',1,'new');C.register(state,unlockedCopy);assert(!unlockedCopy.locked);
state.inventory=state.inventory.filter(i=>i.char!=='一');C.initialize(state);assert(state.specialDiscoveries.includes('一'),'discovery survives using every owned copy');
const serialized=JSON.parse(JSON.stringify(state));assert(C.validSave(serialized));C.initialize(serialized);assert.deepStrictEqual(serialized,state);
for(const bad of [{autoLockSettings:{special:true,rareMin:1}},{specialDiscoveries:['不存在']},{specialDiscoveries:['一','一']},{inventory:[{autoLockExempt:'true'}]},{inventory:{}}])assert(!C.validSave(bad));
let sequence=0;const synthState={inventory:[item('亜',1,'a'),item('唖',1,'b')],deck:[]};C.initialize(synthState);
const outcome=I.executePlan(synthState,I.manualPlan(synthState,'inst_a','inst_b'),{getReadings:()=>['ア'],pools:{1:[{char:'小',jis:1}]},rng:()=>.9,createId:()=>`inst_result_${sequence++}`,onCreated:i=>C.autoLock(i,synthState.autoLockSettings)});
assert(outcome.inventory[0].locked&&outcome.inventory[0].autoLocked);synthState.inventory=outcome.inventory;C.record(synthState,outcome.inventory[0]);assert(synthState.specialDiscoveries.includes('小'));
// Synthesis duplicates protect only usable materials beside a surviving recipient.
const readings=()=>['ア','アイ'],policy={special:false,rareMin:0,synthesisDuplicates:true};
function synth(inventory,operations,output='亜',p=policy){let n=0;const current={inventory,deck:[]};return I.executePlan(current,{fingerprint:I.fingerprint(current),operations},{getReadings:readings,pools:{1:[{char:output,jis:1}]},rng:()=>.9,createId:()=>`inst_new_${++n}`,onCreated:(i,c)=>C.synthesisResult(i,p,c.inventory,readings)});}
const survivor=item('亜',1,'keep'),a=item('唖',1,'material_a'),b=item('娃',1,'material_b'),op={type:'synthesis',ids:[a.instanceId,b.instanceId]};survivor.locked=true;
let duplicate=synth([survivor,a,b],[op]);const made=duplicate.inventory.at(-1);assert(made.locked&&made.autoLocked&&made.synthesisDuplicate);assert.deepStrictEqual(made.unlockedReadings,['ア']);assert.deepStrictEqual(duplicate.inventory[0].unlockedReadings,['ア']);
assert.equal(I.duplicatePlan({inventory:duplicate.inventory,deck:[]},survivor.instanceId).operations.length,0);C.toggleLock(made);assert.equal(I.duplicatePlan({inventory:duplicate.inventory,deck:[]},survivor.instanceId).operations.length,1);C.initialize({inventory:duplicate.inventory,autoLockSettings:policy});assert(!made.locked&&made.autoLockExempt);
assert(!synth([survivor,a,b],[op],'亜',{...policy,synthesisDuplicates:false}).inventory.at(-1).locked);
assert(!synth([{...survivor,unlockedReadings:['ア','アイ']},a,b],[op]).inventory.at(-1).locked);
assert(!synth([a,b],[op],'唖').inventory.at(-1).locked,'consumed original cannot create a false duplicate');
const c=item('阿',1,'material_c'),d=item('愛',1,'material_d');duplicate=synth([a,b,c,d],[op,{type:'synthesis',ids:[c.instanceId,d.instanceId]}]);assert(!duplicate.inventory[0].locked&&duplicate.inventory[1].locked,'a second result can be a duplicate of an earlier surviving output');
const later=synth([{...survivor,locked:false},a,b,c,d],[op,{type:'synthesis',ids:[survivor.instanceId,c.instanceId]}]);assert(!later.inventory[0].synthesisDuplicate,'a recipient scheduled for consumption is excluded');
assert(C.settings({special:true,rareMin:3}).synthesisDuplicates);assert(!C.validSave({autoLockSettings:{special:true,rareMin:3,synthesisDuplicates:'yes'}}));assert(!C.validSave({inventory:[{synthesisDuplicate:'yes'}]}));
assert.equal(T.catalogue.length,15);console.log(JSON.stringify({legacyProtected:true,manualUnlockPersists:true,allAcquisitionsLocked:true,policyPreservesLocks:true,discoveryPersists:true,saveValidation:true,synthesisDuplicateProtection:true,consumedOriginalExcluded:true,sameBatchDuplicates:true}));

const bulk={inventory:[item('愛',3,'bulk')]};C.initialize(bulk);assert.equal(C.unlockMany(bulk.inventory),1);assert(!bulk.inventory[0].autoLockExempt);C.initialize(bulk);assert(!bulk.inventory[0].locked);const next=item('愛',3,'after');C.register(bulk,next);assert(next.locked);C.applySettings(bulk,bulk.autoLockSettings);assert(bulk.inventory[0].locked);
