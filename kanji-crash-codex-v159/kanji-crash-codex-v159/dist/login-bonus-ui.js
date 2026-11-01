/* Display history is local; reward eligibility and all grants stay on the server. */
(()=>{
 const install=()=>{
  const $=id=>document.getElementById(id),anchor=$('guest-player-panel');if(!anchor)return;
  const entry=document.createElement('section');entry.id='login-bonus-panel';entry.className='login-bonus-entry';
  entry.innerHTML='<div><h3 class="kanji-font">ログインボーナス</h3><p id="login-bonus-entry-status">来た日ごとに進む、7回の贈りもの</p></div><button id="btn-login-bonus-open" type="button" class="inventory-action secondary">報酬を確認</button>';
  anchor.after(entry);
  const modal=document.createElement('div');modal.id='modal-login-bonus';modal.className='editor-overlay hidden';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','login-bonus-title');
  modal.innerHTML='<section class="editor-panel login-bonus-shell"><div class="editor-title"><h2 id="login-bonus-title" class="kanji-font">ログインボーナス</h2><button type="button" id="btn-login-bonus-close" aria-label="ログインボーナスを閉じる">閉じる</button></div><p class="login-bonus-intro">文字の旅に、今日の贈りもの。</p><p class="inventory-note">お休みしても進み具合はそのまま。日本時間の午前0時に更新します。</p><ol id="login-bonus-days" tabindex="0" aria-label="7回分のログイン報酬"></ol><div class="login-bonus-footer"><p id="login-bonus-status" tabindex="0" role="status" aria-live="polite">受取状況を確認しています…</p><button id="btn-login-bonus-claim" type="button" class="inventory-action" disabled>確認中…</button><button id="btn-login-bonus-refresh" type="button" class="inventory-action secondary">受取状況を再確認</button></div></section>';
  document.body.append(modal);
  const light=document.createElement('label');light.className='inventory-note workshop-light-setting';const toggle=document.createElement('input');toggle.type='checkbox';try{toggle.checked=localStorage.getItem('kanji_workshop_light_v1')==='1';}catch{}
  const applyLight=()=>{document.documentElement.dataset.workshopLight=String(toggle.checked);};applyLight();toggle.onchange=()=>{applyLight();try{localStorage.setItem('kanji_workshop_light_v1',toggle.checked?'1':'0');}catch{}};light.append(toggle,document.createTextNode('召喚・錬成の演出を軽くする'));entry.after(light);
  new MutationObserver(()=>{if(entry.parentElement!==anchor.parentElement){anchor.after(entry);entry.after(light);}}).observe(document.body,{childList:true,subtree:true});
  const button=$('btn-login-bonus-claim');let current=null,busy=false,checking=null,opener=null,autoTimer=null,refreshTimer=null,pendingAuto=false,loaded=false;
  const shown=new Set();
  const player=()=>typeof guestCredentials!=='undefined'?guestCredentials?.guestId||'':'';
  const displayKey=()=> 'kanji_login_bonus_display_v1:'+player();
  const wasShown=day=>{if(shown.has(player()+':'+day))return true;try{return localStorage.getItem(displayKey())===String(day);}catch{return false;}};
  function markShown(){if(!current||!player())return;shown.add(player()+':'+current.day);try{localStorage.setItem(displayKey(),String(current.day));}catch{}}
  function setNote(text,error=false){$('login-bonus-status').textContent=text;$('login-bonus-status').dataset.error=String(error);}
  function unavailable(){return document.hidden||guestRestoring||saveRecoveryBlocked||guestBackupBusy||typeof replayVideoBusy!=='undefined'&&replayVideoBusy||typeof friendRoom!=='undefined'&&!!friendRoom||typeof onlineSearching!=='undefined'&&onlineSearching||window.isGachaPresentationBusy?.()||!$('screen-battle')?.classList.contains('hidden')||!!document.querySelector('[role="dialog"]:not(.hidden):not(#modal-login-bonus),dialog[open]');}
  function render(){
   if(!current)return;button.disabled=busy||checking!==null||!current.enabled||current.received;button.textContent=busy?'保存しています…':current.received?'本日は受取済み':current.enabled?'今日の報酬を受け取る':'準備中';
   const today=current.received?(current.ordinal-1)%7:current.ordinal%7,completed=current.received?today+1:today;
   const list=$('login-bonus-days'),scroll=list.scrollTop,key=JSON.stringify(current.rewards);
   // Keep card nodes and their scroll anchor stable across saving and success.
   if(list.dataset.rewards!==key||list.children.length!==current.rewards.length){
    list.replaceChildren(...current.rewards.map((reward,n)=>{
     const item=document.createElement('li'),title=document.createElement('h3'),label=document.createElement('span');title.textContent=(n+1)+'回目';label.className='login-bonus-day-state';item.append(title,label);
     for(const [amount,name]of [[reward.coins,'文'],[reward.fragments,'文字のかけら']]){if(!amount)continue;const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=amount.toLocaleString('ja-JP');if(name==='文')p.append(strong,document.createTextNode(' 文'));else p.append(document.createTextNode('文字のかけら '),strong,document.createTextNode(' 個'));item.append(p);}return item;
    }));list.dataset.rewards=key;
   }
   [...list.children].forEach((item,n)=>{item.dataset.state=n===today?(current.received?'today-received':'today'):n<completed?'received':'future';item.querySelector('.login-bonus-day-state').textContent=n===today?(current.received?'✓ 本日の受取済み':'今回の報酬'):n<completed?'✓ 受取済み':'これから';});
   list.scrollTop=scroll;
   $('login-bonus-entry-status').textContent=current.received?'本日は受取済みです。明日も文字の旅へ。':current.enabled?`${current.next}回目の贈りものを受け取れます。`:'ただいま準備中です。';
  }
  function armRefresh(value){clearTimeout(refreshTimer);const delay=Number.isFinite(value.serverNow)?value.nextResetAt-value.serverNow+100:60000;refreshTimer=setTimeout(()=>{if(!document.hidden)refresh(true);},Math.max(1000,Math.min(delay,86400100)));}
  function close(){if(busy||modal.classList.contains('hidden'))return;markShown();pendingAuto=false;modal.classList.add('hidden');resumePlayerEngine();if(opener?.isConnected)opener.focus({preventScroll:true});}
  function show(){if(unavailable())return false;opener=document.activeElement;pausePlayerOverlay();modal.classList.remove('hidden');render();markShown();$('btn-login-bonus-close').focus({preventScroll:true});return true;}
  function queueAuto(){clearTimeout(autoTimer);if(!pendingAuto||!current||current.received||!current.enabled||wasShown(current.day)){pendingAuto=false;return;}if(document.hidden)return;
   autoTimer=setTimeout(()=>{if(!pendingAuto||!current||current.received||wasShown(current.day)){pendingAuto=false;return;}if(checking||unavailable()){queueAuto();return;}pendingAuto=false;if(show())setNote(`${current.next}回目の報酬です。「受け取る」で保存します。`);},500);
  }
  async function bonusRequest(path,method='GET',body){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{return await guestRequest(path,method,body,{signal:controller.signal});}finally{clearTimeout(timer);}}
  const journalKey=()=> 'kanji_login_bonus_pending_v1:'+player();
  const withoutReward=state=>{const copy={...state};delete copy.coins;delete copy.characterFragments;delete copy.loginBonusOrdinal;return JSON.stringify(copy);};
  function readJournal(){try{const proof=JSON.parse(localStorage.getItem(journalKey())||'null');return proof?.player===player()&&Number.isSafeInteger(proof.ordinal)&&proof.ordinal>=0&&Number.isSafeInteger(proof.coins)&&Number.isSafeInteger(proof.fragments)&&Number.isSafeInteger(proof.revision)&&proof.reward&&[proof.reward.coins,proof.reward.fragments].every(n=>Number.isSafeInteger(n)&&n>=0)&&/^[a-f0-9]{64}$/.test(proof.hash||'')?proof:null;}catch{return null;}}
  function clearJournal(){try{localStorage.removeItem(journalKey());}catch{}}
  async function prepareJournal(raw){
   const state=JSON.parse(raw),ordinal=state.loginBonusOrdinal||0,reward=current.rewards[ordinal%7];
   const proof={player:player(),ordinal,revision:guestCredentials.revision,coins:state.coins,fragments:state.characterFragments||0,reward,hash:await guestSnapshotHash(withoutReward(state))};
   if(JSON.stringify(gameState)!==raw)throw Error('保存中に状態が更新されました。もう一度受取ボタンを押してください。');
   try{localStorage.setItem(journalKey(),JSON.stringify(proof));if(localStorage.getItem(journalKey())!==JSON.stringify(proof))throw Error('journal');}catch{throw Error('受取前の記録を端末に保存できないため、報酬の受取を開始していません。端末の保存容量を確認してください。');}
  }
  async function matchesProof(result,proof,awarded){
   const state=result.state,reward=proof.reward;
   return !!state&&result.revision===proof.revision+(awarded?1:0)&&(state.loginBonusOrdinal||0)===proof.ordinal+(awarded?1:0)&&state.coins===proof.coins+(awarded?reward.coins:0)&&(state.characterFragments||0)===proof.fragments+(awarded?reward.fragments:0)&&await guestSnapshotHash(withoutReward(state))===proof.hash;
  }
  // The durable pre-request proof identifies the exact credited snapshot. Only
  // its reward delta is merged; unrelated device progress is never replaced.
  async function reconcile(value,confirmed=null){
   const local=gameState.loginBonusOrdinal||0,proof=readJournal();
   if(value.ordinal===local){
    if(proof){
     const latest=confirmed?.state?confirmed:await bonusRequest('/api/guest/state');
     if(local===proof.ordinal+1&&await matchesProof(latest,proof,true)){
      const raw=JSON.stringify(latest.state);rememberGuest({...guestCredentials,revision:latest.revision,savedAt:latest.savedAt,backupHash:await guestSnapshotHash(raw)});guestBackupRaw=raw;guestBackupDirty=JSON.stringify(gameState)!==raw;guestBackupConflict=false;guestBackupStatus='saved';clearJournal();
     }else if(local===proof.ordinal&&await matchesProof(latest,proof,false)){guestBackupConflict=false;}
     else if(local===proof.ordinal+1){clearJournal();}
     else if(local===proof.ordinal&&latest.revision>proof.revision&&(latest.state?.loginBonusOrdinal||0)===local){clearJournal();}
     else throw Error('保存内容が異なります。保存・復元から確認してください。');
    }
    return;
   }
   if(guestBackupBusy||saveRecoveryBlocked)throw Error('保存処理の完了後に再確認してください。');
   const wasRestoring=guestRestoring;guestRestoring=true;
   try{
    const latest=confirmed?.state?confirmed:await bonusRequest('/api/guest/state');
    if(proof&&local===proof.ordinal&&value.ordinal===local+1&&await matchesProof(latest,proof,true)){
     if((gameState.loginBonusOrdinal||0)!==local)throw Error('受取記録が更新されました。再確認してください。');
     const original=JSON.stringify(gameState),next={...gameState,coins:gameState.coins+proof.reward.coins,characterFragments:(gameState.characterFragments||0)+proof.reward.fragments,loginBonusOrdinal:value.ordinal};
     await applySaved({...latest,state:next},latest.state,original);
    }else{
     const original=JSON.stringify(gameState),next=migrateCatalogueSave(latest.state),reward=value.rewards[local%7];
     if(value.ordinal!==local+1||next?.loginBonusOrdinal!==value.ordinal||!reward||next.coins!==gameState.coins+reward.coins||(next.characterFragments||0)!==(gameState.characterFragments||0)+reward.fragments||withoutReward(next)!==withoutReward(gameState))throw Error('端末とサーバーの保存内容が異なります。保存・復元から確認してください。');
     await applySaved({...latest,state:next},latest.state,original);
    }
    guestBackupConflict=false;clearJournal();
   }finally{guestRestoring=wasRestoring;}
  }
  async function applySaved(result,serverState=result.state,original=JSON.stringify(gameState)){
   const next=migrateCatalogueSave(result.state),raw=JSON.stringify(serverState),hash=await guestSnapshotHash(raw);
   if(JSON.stringify(gameState)!==original)throw Error('端末の状態が更新されました。「受取状況を再確認」で反映を続けられます。');
   if(!validSave(next)||!saveStore)throw Error('報酬の端末保存を確認できません。保存・復元から確認してください。');
   saveStore.write(next);gameState=next;rememberGuest({...guestCredentials,revision:result.revision,savedAt:result.savedAt,backupHash:hash});guestBackupRaw=raw;guestBackupDirty=JSON.stringify(next)!==raw;guestBackupStatus='saved';
   try{updateHeaderUI();renderCollection();renderGuestPlayer();}catch{setNote('報酬の保存は完了しました。画面を開き直してください。');}
  }
  async function refresh(auto=false){
   if(busy)return;if(checking)return checking;
   button.disabled=true;button.textContent='確認中…';$('btn-login-bonus-refresh').disabled=true;
   checking=(async()=>{try{
    await ensureGuestSession();const id=player(),value=await bonusRequest('/api/login-bonus');if(id!==player())throw Error('接続情報が変わりました。再確認してください。');await reconcile(value);current=value;
    setNote(value.received?'本日は受取済みです。次の贈りものは日本時間の午前0時から。':value.enabled?`${value.next}回目の報酬を受け取れます。`:'ただいま準備中です。');
    armRefresh(value);
    pendingAuto=pendingAuto||auto&&!value.received&&!wasShown(value.day);
   }catch(error){current=null;pendingAuto=false;setNote('受取状況を確認できません。'+error.message+' 「受取状況を再確認」でやり直せます。',true);$('login-bonus-entry-status').textContent='受取状況を確認できません。報酬画面から再確認できます。';$('login-bonus-days').replaceChildren();button.disabled=true;button.textContent='受取状況を確認できません';clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(!document.hidden)refresh(true);},30000);
   }finally{checking=null;$('btn-login-bonus-refresh').disabled=false;render();renderGuestPlayer();if(guestBackupDirty&&!guestBackupConflict&&!guestRestoring&&!saveRecoveryBlocked)queueGuestBackup(true);queueAuto();}})();
   return checking;
  }
  $('btn-login-bonus-open').onclick=()=>{if(unavailable()){ $('login-bonus-entry-status').textContent='対局やほかの画面を閉じてから確認してください。';return;}show();setNote('受取状況を確認しています…');refresh();};
  $('btn-login-bonus-refresh').onclick=()=>{setNote('受取状況を確認しています…');refresh();};$('btn-login-bonus-close').onclick=close;
  button.onclick=async()=>{
   if(busy||checking||!current?.enabled||current.received)return;
   if(guestRestoring||saveRecoveryBlocked||guestBackupConflict){setNote('保存状態を確認してください。記録の「保存・復元」から理由を確認できます。',true);return;}
   const restoreFocus=document.activeElement===button;busy=true;render();$('btn-login-bonus-close').disabled=true;$('btn-login-bonus-refresh').disabled=true;modal.setAttribute('aria-busy','true');setNote('今日の贈りものを保存しています…');let original=null,attempted=false;
   try{
    await backupGuestNow({manual:true});if(guestBackupStatus!=='saved'||guestBackupDirty||guestBackupBusy)throw Error($('guest-player-status')?.textContent||'最新のデータを保存できませんでした。');
    original=JSON.stringify(gameState);guestRestoring=true;await prepareJournal(original);attempted=true;const result=await bonusRequest('/api/login-bonus','POST',{revision:guestCredentials.revision});
    if(result.alreadyReceived){await reconcile(result);current=result;armRefresh(result);setNote('本日は受取済みです。');return;}
    await reconcile(result,result);current=result;armRefresh(result);markShown();
    const rewards=[];if(result.reward.coins)rewards.push(result.reward.coins.toLocaleString('ja-JP')+'文');if(result.reward.fragments)rewards.push('文字のかけら'+result.reward.fragments+'個');setNote(rewards.join('と')+'を受け取りました。');
   }catch(error){if(attempted){
     guestBackupConflict=true;
     try{
      const value=await bonusRequest('/api/login-bonus');
      if(value.ordinal>(gameState.loginBonusOrdinal||0)){await reconcile(value);current=value;armRefresh(value);setNote('サーバーの受取記録と報酬を確認しました。');}
      else{const latest=await bonusRequest('/api/guest/state');if(JSON.stringify(gameState)!==original||JSON.stringify(latest.state)!==original||latest.revision!==guestCredentials.revision)throw Error('保存内容が更新されています。');guestBackupConflict=false;current=value;setNote('受取は確定していません。もう一度受取ボタンを押してください。',true);}
     }catch{current=null;button.disabled=true;button.textContent='受取状況を再確認してください';setNote(error.message+' 受取結果は未確認です。「受取状況を再確認」を押してください。保存内容が異なる場合は保存・復元から確認してください。',true);}
    }else{setNote(error.message+' 保存完了を待って、もう一度受取ボタンを押してください。',true);}}
   finally{guestRestoring=false;busy=false;renderGuestPlayer();if(guestBackupDirty&&!guestBackupConflict&&!saveRecoveryBlocked)queueGuestBackup(true);modal.removeAttribute('aria-busy');$('btn-login-bonus-close').disabled=false;$('btn-login-bonus-refresh').disabled=false;render();if(restoreFocus)(current?.received?$('btn-login-bonus-close'):button).focus({preventScroll:true});}
  };
  modal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'){const items=[...modal.querySelectorAll('button,[tabindex="0"]')].filter(n=>!n.disabled&&!n.hidden),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
  const start=()=>{if(loaded)return;loaded=true;setTimeout(()=>refresh(true),750);};if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(autoTimer);return;}refresh(true);});window.addEventListener('focus',()=>{if(loaded&&!document.hidden)refresh(true);});window.addEventListener('online',()=>refresh(true));
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
