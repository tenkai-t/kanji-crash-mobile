(function(root,factory){const api=factory(root.KANJI_STROKES||(typeof require==='function'?require('./strokes.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiTurnOrder=api;})(typeof window!=='undefined'?window:globalThis,function(strokes){
 'use strict';
 function count(item){const char=typeof item==='string'?item:item?.char,n=strokes[char];if(!Number.isInteger(n)||n<1)throw Error('画数データがありません：'+char);return n;}
 const total=items=>items.reduce((sum,item)=>sum+count(item),0);
 function choose(player,cpu,rng=Math.random){const playerTotal=total(player),cpuTotal=total(cpu),tie=playerTotal===cpuTotal;return{playerTotal,cpuTotal,tie,playerFirst:tie?rng()<.5:playerTotal<cpuTotal};}
 return{count,total,choose};
});
