'use strict';
// Nonblocking: no pause, modal, or focus change, including during auto play.
const pieceLevelUpQueue=[];let pieceLevelUpTimer=null;
window.notifyPieceLevelUp=(char,before,after)=>{pieceLevelUpQueue.push({char,before,after});if(!pieceLevelUpTimer)showNextPieceLevelUp();};
function showNextPieceLevelUp(){const node=document.getElementById('piece-level-up-notice'),next=pieceLevelUpQueue.shift();if(!next){node.hidden=true;pieceLevelUpTimer=null;return;}node.textContent=`「${next.char}」レベルアップ！\nLv.${next.before} → Lv.${next.after} ・ ステータス上昇`;node.hidden=false;pieceLevelUpTimer=setTimeout(showNextPieceLevelUp,4000);}
