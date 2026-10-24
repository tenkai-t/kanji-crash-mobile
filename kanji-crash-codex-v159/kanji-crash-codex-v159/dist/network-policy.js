(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiNetwork=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const reads=new Map();
 function delay(base,failures,cap=60000,random=Math.random){return failures?Math.round(Math.min(cap,base*2**Math.min(failures,8))*(.8+.2*random())):base;}
 async function read(key,fn){if(!reads.has(key)){const pending=Promise.resolve().then(fn);reads.set(key,pending);pending.finally(()=>{if(reads.get(key)===pending)reads.delete(key);}).catch(()=>{});}return structuredClone(await reads.get(key));}
 function invalidate(){reads.clear();}
 function retryAfter(response){const value=Number(response.headers.get('Retry-After'));return Number.isFinite(value)&&value>0?Math.min(300000,value*1000):0;}
 return {delay,read,invalidate,retryAfter};
});
