(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiSummonVisuals=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
function firstFlags(results){const seen=new Set();return results.map(r=>{const char=r.item.char,first=r.firstDiscovery===true&&!r.duplicate&&!r.fragmentExchange&&!seen.has(char);seen.add(char);return first;});}
function back(item){const tier=Number(item.jis);return ({1:{label:'基本',seal:'一',pattern:'single'},2:{label:'希少',seal:'二',pattern:'double'},3:{label:'超希少',seal:'三',pattern:'triple'},4:{label:'伝説',seal:'四',pattern:'radiant'},5:{label:'元素文字',seal:'元',pattern:'orbit'}})[tier]||{label:'文字',seal:'召',pattern:'single'};}
function tenGuarantee(results){
 if(!Array.isArray(results)||results.length!==10)return null;
 const present=new Set(results.map(r=>Number(r?.item?.jis))),tier=[4,3,2].find(t=>present.has(t));
 if(!tier)return null;return {tier,label:{2:'希少以上確定',3:'超希少以上確定',4:'伝説レア確定'}[tier]};
}
return {firstFlags,back,tenGuarantee};
});
