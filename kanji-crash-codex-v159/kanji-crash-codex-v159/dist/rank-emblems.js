(function(root,factory){const api=factory(root.KanjiAvatarStyle||(typeof require==='function'?require('./avatar-style.js'):null),root.KanjiPromotions||(typeof require==='function'?require('./promotion-rules.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiRankEmblems=api;})(typeof window!=='undefined'?window:globalThis,function(Style,Promotions){
 'use strict';
 const ornaments=[{glyph:'初',frame:'jade',color:'#9fc6b4'},{glyph:'中',frame:'ocean',color:'#9ad8dd'},{glyph:'上',frame:'moon',color:'#cbd4dd'},{glyph:'達',frame:'emperor',color:'#d6bd82'},{glyph:'王',frame:'sovereign',color:'#f1d28e'}];
 const tiers=Promotions.tiers.map((tier,index)=>({...ornaments[index],min:tier.min,title:tier.title}));
 const get=rating=>tiers.slice().reverse().find(t=>rating>=t.min)||tiers[0];let sequence=0;
 function paint(el,rating){if(!el)return;const tier=get(rating);if(el.dataset.rankTier===tier.title)return;el.dataset.rankTier=tier.title;el.style.setProperty('--rank-metal',tier.color);el.setAttribute('role','img');el.setAttribute('aria-label',tier.title+'の段位章');el.innerHTML=Style.frameSvg(tier.frame,'rank-metal-'+(++sequence))+`<span class="rank-emblem-glyph kanji-font" aria-hidden="true">${tier.glyph}</span>`;}
 return{tiers,get,paint};
});
