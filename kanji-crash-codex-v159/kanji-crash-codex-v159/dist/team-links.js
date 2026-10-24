(function(root,factory){const api=factory(root.KanjiAdventureContent||(typeof require==='function'?require('./adventure-content.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiTeamLinks=api;})(typeof window!=='undefined'?window:globalThis,function(content){
 'use strict';
 const catalogue=content.links;
 const get=id=>catalogue.find(v=>v.id===id)||null;
 function active(items){if(items?.length!==3)return null;const chars=new Set(items.map(i=>i.char));return catalogue.find(v=>v.chars.every(c=>chars.has(c)))||null;}
 function apply(items){const link=active(items);return items.map(({teamLink,...item})=>({...item,...(link?{teamLink:link.id}:{})}));}
 function effect(link){return link?[link.power?`威力+${Math.round(link.power*100)}％`:'',link.weight?`重量+${Math.round(link.weight*100)}％`:''].filter(Boolean).join('・'):'';}
 function describe(items){const link=active(items);return link?`${link.name}：3体とも${effect(link)}`:'連携なし';}
 return{catalogue,get,active,apply,effect,describe};
});
