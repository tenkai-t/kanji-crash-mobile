(function(root,factory){const api=factory(root.KanjiTraits||(typeof require==='function'?require('./character-traits.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiOnlineRules=api;})(typeof window!=='undefined'?window:globalThis,function(Traits){
 'use strict';
 const level=10,budget=16;
 const validRule=value=>value==='balanced'||value==='free';
 const roomRule=room=>validRule(room?.rule_set)?room.rule_set:validRule(room?.ruleSet)?room.ruleSet:room?.mode==='online'?'balanced':'free';
 const label=rule=>rule==='balanced'?'統一ルール':'自由ルール';
 const description=rule=>rule==='balanced'?'全員Lv.10・編成コスト16以内':'レベル・コスト制限なし・現在のレベルと装備ルビを使用';
 const costGuide='JIS第1水準 2・JIS第2水準 3・JIS第3水準 5・JIS第4水準 7・元素文字（JIS範囲外）5 ／ 特殊文字 +2・2個目以降の装備ルビ +1';
 function cost(item){const rarity=[0,2,3,5,7,5][item.jis]||7;return rarity+(Traits.get(item)?2:0)+Math.max(0,new Set(item.equippedReadings||[]).size-1);}
 const total=items=>items.reduce((sum,item)=>sum+cost(item),0);
 const rank=rating=>rating>=1800?'対人達人':rating>=1500?'対人上級':rating>=1300?'対人中級':'対人初級';
 const range=(waitSeconds)=>Math.min(2000,120+Math.floor(Math.max(0,waitSeconds))*25);
 return {level,budget,cost,total,rank,range,validRule,roomRule,label,description,costGuide};
});
