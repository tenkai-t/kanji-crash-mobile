(function(root,factory){const api=factory(root.KanjiAvatarStyle||(typeof require==='function'?require('./avatar-style.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiRankEmblems=api;})(typeof window!=='undefined'?window:globalThis,function(Style){
 'use strict';
 const tiers=[{min:1000,title:'初級',glyph:'初',frame:'jade',color:'#9fc6b4'},{min:1400,title:'中級',glyph:'中',frame:'ocean',color:'#9ad8dd'},{min:1800,title:'上級',glyph:'上',frame:'moon',color:'#cbd4dd'},{min:2200,title:'達人',glyph:'達',frame:'emperor',color:'#d6bd82'},{min:2600,title:'漢字王',glyph:'王',frame:'sovereign',color:'#f1d28e'}];
 const get=rating=>tiers.slice().reverse().find(t=>rating>=t.min)||tiers[0];let sequence=0;
 function paint(el,rating){if(!el)return;const tier=get(rating);if(el.dataset.rankTier===tier.title)return;el.dataset.rankTier=tier.title;el.style.setProperty('--rank-metal',tier.color);el.setAttribute('role','img');el.setAttribute('aria-label',tier.title+'の段位章');el.innerHTML=Style.frameSvg(tier.frame,'rank-metal-'+(++sequence))+`<span class="rank-emblem-glyph kanji-font" aria-hidden="true">${tier.glyph}</span>`;}
 return{tiers,get,paint};
});
