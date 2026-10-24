(function(root,factory){const api=factory(root.KanjiPlayRecords||(typeof require==='function'?require('./play-records.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiPracticeRecommendation=api;})(typeof window!=='undefined'?window:globalThis,function(Records){
 'use strict';
 function recommend(id,inventory,getReadings,getStats,countStrokes){
  const challenge=Records.get(id==='all-killed'?'intact':id);if(id==='three-elements'){const best=[...new Set(inventory.map(i=>i.attr))].map(attr=>inventory.filter(i=>i.attr===attr).map(item=>({item,score:getStats({...item,level:10,equippedReadings:getReadings(item)}).power})).sort((a,b)=>b.score-a.score)[0]).filter(Boolean).sort((a,b)=>b.score-a.score).slice(0,3);return best.length===3?{team:best.map(v=>v.item),reason:''}:{team:[],reason:'異なる属性の所持文字が3体必要です。'};}if(!challenge||challenge.kind!=='condition')return{team:[],reason:'条件付きチャレンジを選んでください。'};
  const seen=new Set(),weights=id==='intact'?[.3,.7]:id==='swift'?[.8,.2]:[.55,.45],candidates=[];
  for(const item of inventory){if(!item.instanceId||seen.has(item.instanceId)||id==='first-tier'&&item.jis!==1)continue;seen.add(item.instanceId);const strokes=countStrokes(item);if(id==='few-strokes'&&strokes>10)continue;
   const equippedReadings=id==='no-ruby'?[]:getReadings(item).slice(),stats=getStats({...item,level:10,exp:0,ruby:equippedReadings[0]||'',equippedReadings,teamLink:undefined});
   candidates.push({item,strokes,score:stats.power*weights[0]+stats.weight*weights[1]});
  }
  const limit=id==='few-strokes'?12:0;
  function choose(pool){const states=Array.from({length:4},()=>Array(limit+1).fill(null));states[0][0]={team:[],score:0};
   for(const c of pool)for(let size=2;size>=0;size--)for(let sum=0;sum<=limit;sum++){const previous=states[size][sum],nextSum=sum+(limit?c.strokes:0);if(!previous||nextSum>limit)continue;const score=previous.score+c.score,old=states[size+1][nextSum];if(!old||score>old.score)states[size+1][nextSum]={team:[...previous.team,c.item],score};}
   return states[3].filter(Boolean).sort((a,b)=>b.score-a.score)[0];
  }
  const groups=id==='one-element'?[...new Set(candidates.map(c=>c.item.attr))].map(attr=>candidates.filter(c=>c.item.attr===attr)):[candidates],best=groups.map(choose).filter(Boolean).sort((a,b)=>b.score-a.score)[0];
  if(!best)return{team:[],reason:id==='first-tier'?'JIS第1水準の所持文字が3体必要です。':id==='few-strokes'?'合計12画以下になる所持文字3体がありません。':id==='one-element'?'同じ属性の所持文字が3体必要です。':'所持文字が3体必要です。'};
  const reason=Records.condition(id==='all-killed'?'intact':id,best.team,countStrokes);return reason?{team:[],reason}:{team:best.team,reason:''};
 }
 return{recommend};
});
