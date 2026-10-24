(function(root,factory){const api=factory(root.KanjiTraits||(typeof require==='function'?require('./character-traits.js'):null),root.KanjiInventory||(typeof require==='function'?require('./inventory-rules.js'):null),root.KanjiCodex||(typeof require==='function'?require('./codex-rules.js'):null),root.KanjiGoals||(typeof require==='function'?require('./collection-goals.js'):null),root.KanjiElementCharacters||(typeof require==='function'?require('./element-characters.js'):null),root.KanjiFishCharacters||(typeof require==='function'?require('./fish-characters.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiCollection=api;})(typeof window!=='undefined'?window:globalThis,function(Traits,Inventory,Codex,Goals,Elements,Fish){
 'use strict';
 const defaults={special:true,rareMin:3,synthesisDuplicates:true,recipeMaterials:true,elementSingle:false,fishSingle:false};
 const isRecipeMaterial=item=>Goals.recipes.some(r=>r.materials.includes(typeof item==='string'?item:item.char));
 function settings(value){return{elementSingle:value?.elementSingle===true,fishSingle:value?.fishSingle===true,special:typeof value?.special==='boolean'?value.special:defaults.special,rareMin:[0,2,3,4].includes(value?.rareMin)?value.rareMin:defaults.rareMin,synthesisDuplicates:typeof value?.synthesisDuplicates==='boolean'?value.synthesisDuplicates:defaults.synthesisDuplicates,recipeMaterials:typeof value?.recipeMaterials==='boolean'?value.recipeMaterials:defaults.recipeMaterials};}
 function eligible(item,policy){policy=settings(policy);return (policy.special&&!!Traits.get(item))||(policy.rareMin>0&&(item.jis===5?3:item.jis)>=policy.rareMin)||(policy.synthesisDuplicates&&(item.synthesisDuplicate===true||item.rubyMaterialDuplicate===true))||(policy.recipeMaterials&&isRecipeMaterial(item));}
 function singleCopyTarget(item,policy){policy=settings(policy);return policy.elementSingle&&Elements.has(item.char)||policy.fishSingle&&Fish.has(item.char);}
 function reconcileSingleCopies(state,incoming=null){const policy=settings(state.autoLockSettings),groups=new Map(),items=incoming&&!state.inventory.includes(incoming)?[...state.inventory,incoming]:state.inventory;
  for(const i of items){if(i.singleCopyLocked){i.singleCopyLocked=false;if(i.autoLocked&&!eligible(i,policy)){i.locked=false;i.autoLocked=false;}}if(singleCopyTarget(i,policy)){if(!groups.has(i.char))groups.set(i.char,[]);groups.get(i.char).push(i);}}
  for(const group of groups.values()){const manual=group.filter(i=>i.locked&&!i.autoLocked);const candidates=(manual.length?manual:group.filter(i=>!i.autoLockExempt)).slice().sort((a,b)=>Inventory.totalExp(b)-Inventory.totalExp(a)||(b.unlockedReadings?.length||0)-(a.unlockedReadings?.length||0));const keep=candidates[0];if(!keep||manual.length)continue;if(!keep.locked){keep.locked=true;keep.autoLocked=true;}if(keep.autoLocked)keep.singleCopyLocked=true;}
  return state;
 }
 function autoLock(item,policy){
  if(!item.autoLockExempt&&eligible(item,policy)&&!item.locked){item.locked=true;item.autoLocked=true;}
  item.autoLockProcessed=true;return item;
 }
 function record(state,item){
  Codex.record(state,item);
  if(!Traits.get(item))return;
  state.specialDiscoveries=Array.isArray(state.specialDiscoveries)?state.specialDiscoveries:[];
  if(!state.specialDiscoveries.includes(item.char))state.specialDiscoveries.push(item.char);
 }
 function register(state,item,getReadings){if(getReadings)item.rubyMaterialDuplicate=state.inventory.some(i=>i.char===item.char&&Inventory.unlocked(i,getReadings).length<getReadings(i.char).length);autoLock(item,state.autoLockSettings);record(state,item);reconcileSingleCopies(state,item);return item;}
 function synthesisResult(item,policy,remaining,getReadings){
  item.synthesisDuplicate=remaining.some(i=>i.char===item.char&&Inventory.unlocked(i,getReadings).length<getReadings(i.char).length);
  autoLock(item,policy);reconcileSingleCopies({inventory:remaining,autoLockSettings:policy},item);return item;
 }
 function initialize(state){
  state.autoLockSettings=settings(state.autoLockSettings);
  state.specialDiscoveries=[...new Set((Array.isArray(state.specialDiscoveries)?state.specialDiscoveries:[]).filter(c=>!!Traits.get(c)))];
  for(const item of state.inventory){if(!item.autoLockProcessed)autoLock(item,state.autoLockSettings);record(state,item);}
  reconcileSingleCopies(state);return state;
 }
 function applySettings(state,value){state.autoLockSettings=settings(value);for(const item of state.inventory)autoLock(item,state.autoLockSettings);reconcileSingleCopies(state);}
 function toggleLock(item){item.locked=!item.locked;item.autoLocked=false;item.singleCopyLocked=false;item.autoLockExempt=!item.locked;item.autoLockProcessed=true;}
 function unlockMany(items){let count=0;for(const item of items){if(!item.locked)continue;item.locked=false;item.autoLocked=false;item.singleCopyLocked=false;item.autoLockExempt=false;item.autoLockProcessed=true;count++;}return count;}
 function duplicateUnlockTargets(state,getReadings){const groups=new Map();for(const item of state.inventory){if(!groups.has(item.char))groups.set(item.char,[]);groups.get(item.char).push(item);}const targets=[];for(const group of groups.values()){const grown=group.slice().sort((a,b)=>Inventory.totalExp(b)-Inventory.totalExp(a)||Inventory.unlocked(b,getReadings).length-Inventory.unlocked(a,getReadings).length)[0];targets.push(...group.filter(i=>i!==grown&&i.locked&&i.autoLocked===true&&!state.deck.includes(i.instanceId)));}return targets;}
 function validSave(state){
  if(state.inventory!==undefined&&!Array.isArray(state.inventory))return false;
  if(state.autoLockSettings!==undefined){const p=state.autoLockSettings;if(['elementSingle','fishSingle'].some(k=>p?.[k]!==undefined&&typeof p[k]!=='boolean'))return false;if(!p||typeof p.special!=='boolean'||![0,2,3,4].includes(p.rareMin)||(p.synthesisDuplicates!==undefined&&typeof p.synthesisDuplicates!=='boolean')||(p.recipeMaterials!==undefined&&typeof p.recipeMaterials!=='boolean'))return false;}
  if(state.specialDiscoveries!==undefined&&(!Array.isArray(state.specialDiscoveries)||state.specialDiscoveries.length>Traits.catalogue.length||state.specialDiscoveries.some(c=>typeof c!=='string'||!Traits.get(c))||new Set(state.specialDiscoveries).size!==state.specialDiscoveries.length))return false;
  return (state.inventory||[]).every(i=>['singleCopyLocked','autoLockProcessed','autoLockExempt','autoLocked','synthesisDuplicate','rubyMaterialDuplicate'].every(k=>i[k]===undefined||typeof i[k]==='boolean'));
 }
 return{defaults,settings,singleCopyTarget,reconcileSingleCopies,isRecipeMaterial,eligible,autoLock,synthesisResult,record,register,initialize,applySettings,toggleLock,unlockMany,duplicateUnlockTargets,validSave};
});
