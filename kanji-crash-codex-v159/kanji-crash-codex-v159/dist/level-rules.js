(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiLevels=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const max=100,cpuMax=150,legacyMax=100000,maxTotal=50*max*(max-1);
 const clamp=value=>Math.max(1,Math.min(max,Math.floor(Number(value)||1)));
 const clampCpu=value=>Math.max(1,Math.min(cpuMax,Math.floor(Number(value)||1)));
 function normalize(item){item.level=clamp(item.level);item.exp=item.level===max?0:Math.max(0,Math.floor(Number(item.exp)||0));return item;}
 function totalExp(item){const level=clamp(item.level);return Math.min(maxTotal,50*level*(level-1)+Math.max(0,Number(item.exp)||0));}
 function applyExp(item,total){total=Math.max(0,Math.min(maxTotal,Math.floor(Number(total)||0)));item.level=clamp(Math.floor((1+Math.sqrt(1+total/12.5))/2));item.exp=item.level===max?0:total-50*item.level*(item.level-1);return item;}
 return{max,cpuMax,clampCpu,legacyMax,maxTotal,clamp,normalize,totalExp,applyExp};
});
