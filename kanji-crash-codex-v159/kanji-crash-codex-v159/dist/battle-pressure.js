(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiPressure=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const create=()=>({shots:0,idle:0,ratio:1,nextShrink:null,pending:false,before:0});
 const active=bodies=>bodies.filter(b=>!b.gameData?.isOut);
 function beginShot(state,bodies){if(state.pending||state.shots>=36)return false;state.shots++;state.pending=true;state.before=active(bodies).length;return true;}
 function completeShot(state,bodies){if(!state.pending)return null;state.pending=false;const killed=active(bodies).length<state.before;state.idle=killed?0:state.idle+1;let warning=false,shrunk=false;
  if(state.nextShrink===null&&state.idle>=10){state.nextShrink=state.shots+1;warning=true;}
  if(state.nextShrink!==null&&state.shots>=state.nextShrink&&state.ratio>.6){state.ratio=Math.max(.6,Math.round((state.ratio-.08)*100)/100);state.nextShrink+=4;shrunk=true;}
  return{warning,shrunk,judge:state.shots>=36};
 }
 const previewRatio=state=>state.nextShrink!==null&&state.ratio>.6?Math.max(.6,Math.round((state.ratio-.08)*100)/100):null;
 function judge(bodies,center,radius){const alive=active(bodies),p=alive.filter(b=>b.gameData.isPlayer),c=alive.filter(b=>!b.gameData.isPlayer);if(p.length!==c.length)return{winner:p.length>c.length,reason:'生存数',player:p.length,cpu:c.length};
  const distance=team=>team.length?team.reduce((s,b)=>s+Math.hypot(b.position.x-center.x,b.position.y-center.y)/radius,0)/team.length:0,player=distance(p),cpu=distance(c);return{winner:Math.abs(player-cpu)<=1e-6?null:player<cpu,reason:Math.abs(player-cpu)<=1e-6?'完全同点':'中央への近さ',player,cpu};
 }
 function label(state){const next=previewRatio(state);return `${state.shots}/36手・土俵${Math.round(state.ratio*100)}%${next!==null?`・${state.nextShrink}手終了で${Math.round(next*100)}%へ縮小`:state.ratio===.6?'・最小サイズ':`・撃破なし${state.idle}/10手`}`;}
 return{create,beginShot,completeShot,previewRatio,judge,label};
});
