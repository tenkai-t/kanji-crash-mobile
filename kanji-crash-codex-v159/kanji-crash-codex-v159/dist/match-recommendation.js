(function(root,factory){const api=factory(root.KanjiOnlineRules||(typeof require==='function'?require('./online-rules.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiMatchRecommendation=api;})(typeof window!=='undefined'?window:globalThis,function(Rules){
 'use strict';
 const roles=['攻撃役','耐久役','補助役'],preferred=[['strike','chase','charge','backwater'],['anchor','guard','counter','dodge'],['resonance','return','magnet','brake','sturdy']];
 function recommend(inventory,getReadings,getStats,rule='balanced'){
  const balanced=rule==='balanced',pools=[[],[],[]],seen=new Set();let scale=1;
  for(const owned of inventory){if(!owned.instanceId||seen.has(owned.instanceId))continue;seen.add(owned.instanceId);const words=[...new Set(getReadings(owned.char,owned))];
   const item={...owned,level:balanced?Rules.level:owned.level||1},baseCost=Rules.cost({...item,equippedReadings:words.slice(0,1)}),maxCount=balanced?Math.min(words.length,Rules.budget-baseCost-4+1):words.length;if(maxCount<1&&words.length)continue;
   const readings=words.map((ruby,index)=>{const stats=getStats({...item,ruby,equippedReadings:[ruby]});return{ruby,index,abilities:(stats.readingAbilities||[stats.readingAbility]).filter(Boolean).map(a=>a.id),strength:stats.power+stats.weight};});
   for(let role=0;role<3;role++){
    const sorted=readings.slice().sort((a,b)=>Number(b.abilities.some(id=>preferred[role].includes(id)))-Number(a.abilities.some(id=>preferred[role].includes(id)))||b.strength-a.strength||a.index-b.index);
    const counts=!words.length?[0]:balanced?Array.from({length:maxCount},(_,n)=>n+1):[words.length];
    for(const count of counts){const equippedReadings=sorted.slice(0,count).map(w=>w.ruby),candidate={...item,ruby:equippedReadings[0]||'',equippedReadings},stats=getStats(candidate),abilityIds=(stats.readingAbilities||[stats.readingAbility]).filter(Boolean).map(a=>a.id),cost=Rules.cost(candidate),weights=[[.72,.28],[.28,.72],[.5,.5]][role],score=stats.power*weights[0]+stats.weight*weights[1];scale=Math.max(scale,(stats.power+stats.weight)/2);pools[role].push({instanceId:owned.instanceId,char:owned.char,level:owned.level||1,equippedReadings,role:roles[role],attr:owned.attr,abilityIds,cost,score:score*(abilityIds.some(id=>preferred[role].includes(id))?1.06:1)});}
   }
  }
  // Keep affordable choices at every cost, so a cheap third piece is never hidden by expensive candidates.
  for(let role=0;role<3;role++){const groups=new Map();for(const c of pools[role]){const cost=balanced?c.cost:0;if(!groups.has(cost))groups.set(cost,[]);groups.get(cost).push(c);}pools[role]=[...groups.values()].flatMap(list=>list.sort((a,b)=>b.score-a.score||a.instanceId.localeCompare(b.instanceId)).slice(0,balanced?8:24));}
  const synergy=team=>{const attrs=new Set(team.map(c=>c.attr)).size,abilities=new Set(team.flatMap(c=>c.abilityIds)).size;return scale*(attrs*.05+abilities*.025)+team.reduce((v,c)=>v+(c.abilityIds.includes('resonance')&&team.some(t=>t!==c&&t.attr===c.attr)?c.score*.06:0),0);};
  let beam=[{team:[],cost:0,base:0,score:0}];
  for(let role=0;role<3;role++){const groups=new Map();for(const state of beam)for(const c of pools[role]){if(state.team.some(t=>t.instanceId===c.instanceId))continue;const cost=state.cost+c.cost;if(balanced&&cost>Rules.budget)continue;const team=[...state.team,c],base=state.base+c.score,next={team,cost,base,score:base+synergy(team)},key=balanced?cost:0;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(next);}beam=[...groups.values()].flatMap(list=>list.sort((a,b)=>b.score-a.score).slice(0,80));if(!beam.length)return[];}
  return beam.sort((a,b)=>b.score-a.score)[0].team.map(c=>({...c,equippedReadings:c.equippedReadings.slice()}));
 }
 return {recommend};
});
