(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiSaveProtection=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const key='moji_otoshi_save_v5',previous=key+'_previous',rejected=key+'_rejected',history=key+'_history';
 function create(storage,decode){let blocked=false,trusted=null,observed=null;const parse=raw=>{try{return raw?decode(JSON.parse(raw)):null;}catch{return null;}};
 function entries(){try{const list=JSON.parse(storage.getItem(history)||'[]');return Array.isArray(list)?list.filter(e=>typeof e.raw==='string').slice(0,10):[];}catch{return [];}}
 function archive(raw){if(!raw)return;const list=entries();if(list.some(e=>e.raw===raw))return;storage.setItem(history,JSON.stringify([{raw,at:Date.now()},...list].slice(0,10)));}
 function backups(){const seen=new Set();return [{raw:storage.getItem(previous),at:null},...entries(),{raw:storage.getItem(rejected),at:null}].flatMap(e=>{if(!e.raw||seen.has(e.raw))return [];seen.add(e.raw);const state=parse(e.raw);return state?[{state,at:e.at,raw:e.raw}]:[];});}
 function load(){try{const prior=storage.getItem(previous);if(parse(prior)){try{archive(prior);}catch{}}observed=storage.getItem(key);const state=parse(observed);if(state){trusted=observed;try{archive(trusted);}catch{}return {state};}if(observed){blocked=true;try{storage.setItem(rejected,observed);}catch{}}const old=backups()[0];if(old){trusted=old.raw;blocked=false;return {state:old.state,recovered:true};}if(!observed)return {state:null};return {state:null,blocked:true};}catch{return {state:null,blocked:blocked=true};}}
 const isQuota=e=>e?.name==='QuotaExceededError'||e?.code===22||e?.code===1014||/quota/i.test(e?.message||'');
 function shrinkHistory(){const list=entries();if(!list.length){if(storage.getItem(history)!==null){storage.removeItem(history);return true;}return false;}for(;;){list.pop();if(!list.length){storage.removeItem(history);return true;}try{storage.setItem(history,JSON.stringify(list));return true;}catch(e){if(!isQuota(e))throw e;}}}
 function put(name,raw){for(;;){try{storage.setItem(name,raw);return;}catch(e){if(!isQuota(e)||!shrinkHistory())throw e;}}}
 function write(state){if(blocked)throw Error('save-protected');const current=storage.getItem(key);if(current!==observed){blocked=true;throw Error('save-conflict');}const raw=JSON.stringify(state),prior=trusted;if(prior&&prior!==raw){try{put(previous,prior);}catch(e){if(!isQuota(e))throw e;}}put(key,raw);observed=trusted=raw;return true;}
 function authorizeReplacement(){const raw=storage.getItem(key);if(raw){archive(raw);if(blocked)storage.setItem(rejected,raw);}observed=raw;blocked=false;}
 function replace(state){const wasBlocked=blocked;try{authorizeReplacement();return write(state);}catch(e){blocked=wasBlocked;throw e;}}
 return {load,write,replace,backups,authorizeReplacement,get blocked(){return blocked;}};
 }
 return {create,key,previous,rejected,history};
});
