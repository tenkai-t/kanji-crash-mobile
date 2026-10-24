(function(root,factory){const api=factory(root.KanjiReadAbilities||(typeof require==='function'?require('./reading-abilities.js'):null),root.KanjiLevels||(typeof require==='function'?require('./level-rules.js'):null),root.KanjiTraits||(typeof require==='function'?require('./character-traits.js'):null),root.KanjiTrialThemes||(typeof require==='function'?require('./special-trial-themes.js'):null),root.KanjiFormation||(typeof require==='function'?require('./formation-rules.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiSpecialChallenge=api;})(typeof window!=='undefined'?window:globalThis,function(Readings,Levels,Traits,Themes,Formation){
 'use strict';
 const presetSquads=[{name:'貫矢と結束',chars:['矢','盾','合']},{name:'衝撃と旋風',chars:['大','山','回']},{name:'すり抜け連撃',chars:['小','一','十']},{name:'堅牢な陣',chars:['凹','粘','口']},{name:'風と孤高',chars:['風','弾','独']}];
 function squadsFor(database=null){const chars=[...new Set(Traits.catalogue.map(t=>t.char))].filter(char=>!database||database.some(i=>i.char===char)),available=new Set(chars),squads=presetSquads.filter(s=>s.chars.every(c=>available.has(c))).map(s=>({...s,chars:s.chars.slice()})),covered=new Set(squads.flatMap(s=>s.chars)),extra=chars.filter(c=>!covered.has(c));for(let n=0;n<extra.length;n+=3){const team=extra.slice(n,n+3);for(const char of chars){if(team.length===3)break;if(!team.includes(char))team.push(char);}if(team.length===3)squads.push({name:team.join('・')+'の試練',chars:team});}return squads;}
 function readingsFor(item,getReadings,themePriorities=null){
  const trait=Traits.get(item),defensive=trait?.trialRole==='defense'||'盾口凹粘'.includes(item.char),support=trait?.trialRole==='support'||item.char==='合';
  const defaults=defensive?['anchor','guard','counter','sturdy','dodge','brake','return','charge','resonance','strike','chase','magnet','glide','backwater']:support?['resonance','charge','guard','anchor','counter','sturdy','magnet','strike','chase','brake','dodge','return','backwater','glide']:['charge','strike','chase','magnet','counter','resonance','anchor','guard','brake','dodge','sturdy','return','backwater','glide'];
  const priorities=themePriorities?[...themePriorities,...defaults.filter(id=>!themePriorities.includes(id))]:defaults;
  const words=[...new Set(getReadings(item.char))].map((ruby,index)=>({ruby,index,ability:Readings.resolve({...item,ruby})})).sort((a,b)=>priorities.indexOf(a.ability?.id)-priorities.indexOf(b.ability?.id)||a.index-b.index);
  const selected=[],seen=new Set();for(const word of words){if(seen.has(word.ability?.id))continue;selected.push(word.ruby);seen.add(word.ability?.id);if(selected.length===3)break;}
  for(const word of words)if(selected.length<3&&!selected.includes(word.ruby))selected.push(word.ruby);
  return{unlocked:words.map(w=>w.ruby),equipped:selected};
 }
 function create(team,database,getReadings,getStats,rng=Math.random,streak=0,difficultyLevel=10,themeId=null){
  if(!team.length)throw Error('team');
  difficultyLevel=[10,30,60,100].includes(difficultyLevel)?difficultyLevel:10;
  const squads=squadsFor(database);if(!squads.length)throw Error('特殊文字を3種類登録してください。');
  const theme=themeId?Themes.get(themeId,database):null;if(themeId&&!theme)throw Error('theme');
  const squad=theme||squads[Math.max(0,Math.min(squads.length-1,Math.floor(rng()*squads.length)))],level=theme?difficultyLevel:Math.min(Levels.max,difficultyLevel+Math.floor(streak/3));
  const enemies=squad.chars.map(char=>{const base=database.find(i=>i.char===char);if(!base)throw Error('special');const words=readingsFor(base,getReadings,theme?.priorities);return{...base,level,ruby:words.equipped[0]||'',rubyUnlocked:words.equipped.length>0,readingEquipped:words.equipped.length>0,unlockedReadings:words.unlocked,equippedReadings:words.equipped};});
  const multiplier=Math.ceil(1.35*(1+(theme?0:Math.min(1000000,streak)*.03))*100)/100;
  return{...(theme?{themeId:theme.id,hint:theme.hint,shotTarget:theme.shotTarget,enemyFormation:Formation.fit(enemies,theme.points).points,started:false}:{}),difficultyLevel,streak,finished:false,won:false,name:squad.name,level,multiplier,enemies:enemies.map(i=>({...i,battleMultiplier:multiplier})),team:team.map(i=>({...i,unlockedReadings:i.unlockedReadings?.slice(),equippedReadings:i.equippedReadings?.slice()}))};
 }
 function finish(run,won,state,metrics={}){if(run.finished)return false;run.finished=true;run.won=won===true;if(run.won){run.streak=Math.min(1000000,run.streak+1);state.specialTrialLevelBest=Math.max(state.specialTrialLevelBest||0,run.level);state.specialTrialWins=Math.min(1000000,(state.specialTrialWins||0)+1);if(run.themeId)Themes.record(state,run.themeId,run.difficultyLevel,true,metrics.shots||0,metrics.survivors||0);else state.specialTrialBest=Math.max(state.specialTrialBest||0,run.streak);}return true;}
 function advance(run,database,getReadings,getStats,rng=Math.random,state=null){if(!run?.finished||!run.won)return null;const theme=run.themeId?Themes.nextTheme(run,state,database):null;if(run.themeId&&!theme)return null;const next=create(run.team,database,getReadings,getStats,rng,run.streak,run.difficultyLevel||10,theme?.id||null);next.formation=run.formation?.map(p=>({...p}));return next;}
 return{get squads(){return squadsFor();},squadsFor,readingsFor,create,finish,advance};
});
