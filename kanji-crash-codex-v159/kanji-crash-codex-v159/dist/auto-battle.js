'use strict';
let autoBattleEnabled=false,autoContinueEnabled=false,autoShotDue=0,autoNextDue=0,autoResultVersion=-1,autoWinner=null,autoControlSignature='';
const autoEl=id=>document.getElementById(id);
function autoBattleSupported(){return ['classic','endless'].includes(battleMode)&&!isPractice();}
function autoBattleVisible(){return !document.hidden&&!autoEl('screen-battle').classList.contains('hidden');}
function autoBattleBlocked(){return !!document.querySelector('[id^="modal-"]:not(.hidden)');}
function renderAutoBattleControls(){
 const supported=autoBattleSupported(),result=supported&&isBattleEnded&&!autoEl('modal-result').classList.contains('hidden'),seconds=autoNextDue?Math.max(1,Math.ceil((autoNextDue-performance.now())/1000)):0;
 const signature=[supported,result,autoBattleEnabled,autoContinueEnabled,seconds,autoWinner,soloBattlePending].join('|');if(signature===autoControlSignature)return;autoControlSignature=signature;
 autoEl('auto-prepare-options').hidden=!supported;autoEl('btn-auto-battle').hidden=!supported;autoEl('auto-result-controls').hidden=!result;
 for(const id of ['auto-prepare-enabled'])autoEl(id).checked=autoBattleEnabled;
 for(const id of ['auto-prepare-continue','auto-result-continue'])autoEl(id).checked=autoContinueEnabled;
 autoEl('btn-auto-battle').setAttribute('aria-pressed',String(autoBattleEnabled));autoEl('btn-auto-battle').textContent=autoBattleEnabled?'自動操作中・停止':'オートで操作';
 autoEl('btn-auto-result').textContent=autoBattleEnabled?'オートを停止':'オートをON';
 autoEl('auto-result-status').textContent=autoWinner!==true?'オートは停止しました。':seconds?`${seconds}秒後に次の対局を開始します。`:autoBattleEnabled?'次へ自動で進む設定を選べます。':'次の対局は手動で開始できます。';
}
window.setAutoBattle=value=>{
 autoBattleEnabled=!!value&&autoBattleSupported();autoShotDue=0;autoNextDue=0;
 if(autoBattleEnabled){cancelDrag();clearShotSelection();setBattleInputMode('shoot');}
 renderAutoBattleControls();updateCentralShotStatus();
};
window.setAutoContinue=value=>{autoContinueEnabled=!!value;autoNextDue=0;renderAutoBattleControls();};
function autoBattleReset(){autoShotDue=0;autoNextDue=0;autoResultVersion=-1;autoWinner=null;autoControlSignature='';}
function autoBattleFinished(winner){
 autoShotDue=0;autoNextDue=0;autoResultVersion=battleVersion;autoWinner=winner;
 if(winner!==true)autoBattleEnabled=false;
 autoControlSignature='';
}
function executeAutoPlayerShot(){
 if(!autoBattleEnabled||!autoBattleSupported()||!autoBattleVisible()||autoBattleBlocked()||soloBattlePending||isBattleEnded||!isPlayerTurn||isDragging||pendingShotTap||battleInputMode!=='shoot'||!runner?.enabled)return;
 const version=battleVersion;
 try{
  const shot=KanjiCpuAI.plan(getCpuSnapshot(),'normal',{isPlayer:true,maxStrength:.08,spins:[0,-.6,.6]}),body=shot&&playerBodies.find(b=>b.id===shot.key&&!b.gameData.isOut);
  if(version!==battleVersion)return;
  if(!body){checkWinCondition();if(!isBattleEnded)setAutoBattle(false);return;}
  const maximum=.08*(getKanjiStats(body.gameData).power/100),pull=maximum>0?Math.min(120,Math.hypot(shot.force.x,shot.force.y)/maximum*120):0;
  if(!launchPlayerShot(body,shot.force,pull,shot.spin))setAutoBattle(false);
 }catch{setAutoBattle(false);showToast('オートを停止しました。手動で対局を続けられます。');}
}
async function continueAutoBattle(){
 if(!autoBattleSupported())return;
 if(battleMode==='endless')continueEndlessBattle();else closeResultModal();
 if(autoBattleEnabled&&autoContinueEnabled&&soloBattlePending&&autoBattleSupported())await startPreparedBattle();
}
function autoBattleTick(){
 if(!autoBattleSupported()){autoBattleEnabled=false;autoShotDue=autoNextDue=0;renderAutoBattleControls();return;}
 const now=performance.now(),visible=autoBattleVisible();
 if(isBattleEnded){
  autoShotDue=0;const resultVisible=!autoEl('modal-result').classList.contains('hidden'),otherModal=!!document.querySelector('[id^="modal-"]:not(.hidden):not(#modal-result)');
  if(autoBattleEnabled&&autoContinueEnabled&&autoWinner===true&&autoResultVersion===battleVersion&&visible&&resultVisible&&!otherModal){
   if(!autoNextDue)autoNextDue=now+4000;
   if(now>=autoNextDue){autoNextDue=0;continueAutoBattle().catch(()=>setAutoBattle(false));}
  }else autoNextDue=0;
 }else{
  autoNextDue=0;
  if(autoBattleEnabled&&visible&&!soloBattlePending&&isPlayerTurn&&!autoBattleBlocked()&&battleInputMode==='shoot'&&!isDragging&&!pendingShotTap&&runner?.enabled){
   if(!autoShotDue)autoShotDue=now+700;
   if(now>=autoShotDue){autoShotDue=0;executeAutoPlayerShot();}
  }else autoShotDue=0;
 }
 renderAutoBattleControls();
}
document.addEventListener('visibilitychange',()=>{autoShotDue=autoNextDue=0;});
window.addEventListener('load',()=>{renderAutoBattleControls();setInterval(autoBattleTick,250);});
