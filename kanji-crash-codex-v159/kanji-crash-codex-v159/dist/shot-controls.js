(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiShotControls=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const gripRadius=(width,height)=>Math.max(28,Math.min(width,height)*.44);
 const spinRadius=(width,height)=>Math.max(28,Math.min(80,Math.min(width,height)*.23));
 function spin(offset,pull,radius){
  const distance=Math.hypot(offset.x,offset.y),length=Math.hypot(pull.x,pull.y),cross=offset.x*pull.y-offset.y*pull.x;
  if(!Number.isFinite(distance+length+radius)||radius<=6||distance<=6||length<.001||Math.abs(cross)<distance*length*.06)return 0;
  return Math.sign(cross)*3*Math.min(1,(distance-6)/(radius-6));
 }
 function label(value){const n=Math.abs(value);return n<.02?'回転なし':`${value>0?'右':'左'}回転・${n<1?'弱':n<2?'中':'強'}`;}
 function gesture(start,end,center,radius){const vector={x:start.x-end.x,y:start.y-end.y},distance=Math.hypot(vector.x,vector.y);return {vector,moved:distance,power:Math.min(120,distance*1.5),spin:spin({x:start.x-center.x,y:start.y-center.y},vector,radius)};}
 return{gripRadius,spinRadius,spin,label,gesture};
});
