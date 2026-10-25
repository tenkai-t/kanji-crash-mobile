/* Display history is local; reward eligibility and all grants stay on the server. */
(()=>{
 const install=()=>{
  const $=id=>document.getElementById(id),anchor=$('guest-player-panel');if(!anchor)return;
  const entry=document.createElement('section');entry.id='login-bonus-panel';entry.className='login-bonus-entry';
  entry.innerHTML='<div><h3 class="kanji-font">ログインボーナス</h3><p id="login-bonus-entry-status">来た日ごとに進む、7回の贈りもの</p></div><button id="btn-login-bonus-open" type="button" class="inventory-action secondary">報酬を確認</button>';
  anchor.after(entry);
  const modal=document.createElement('div');modal.id='modal-login-bonus';modal.className='editor-overlay hidden';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','login-bonus-title');
  modal.innerHTML='<section class="editor-panel login-bonus-shell"><div class="editor-title"><h2 id="login-bonus-title" class="kanji-font">ログインボーナス</h2><button type="button" id="btn-login-bonus-close" aria-label="ログインボーナスを閉じる">閉じる</button></div><p class="login-bonus-intro">文字の旅に、今日の贈りもの。</p><p class="inventory-note">お休みしても進み具合はそのまま。日本時間の午前0時に更新します。</p><ol id="login-bonus-days" tabindex="0" aria-label="7回分のログイン報酬"></ol><div class="login-bonus-footer"><p id="login-bonus-status" role="status" aria-live="polite">受取状況を確認しています…</p><button id="btn-login-bonus-claim" type="button" class="inventory-action" disabled>確認中…</button><button id="btn-login-bonus-refresh" type="button" class="inventory-action secondary">受取状況を再確認</button></div></section>';
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
   $('login-bonus-days').replaceChildren(...current.rewards.map((reward,n)=>{
    const item=document.createElement('li');item.dataset.state=n===today?(current.received?'today-received':'today'):n<completed?'received':'future';
    const title=document.createElement('h3');title.textContent=(n+1)+'回目';const label=document.createElement('span');label.className='login-bonus-day-state';label.textContent=n===today?(current.received?'✓ 今日の受取済み':'今回の報酬'):n<completed?'✓ 受取済み':'これから';
    item.append(title,label);for(const [amount,name]of [[reward.coins,'文'],[reward.fragments,'文字のかけら']]){if(!amount)continue;const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=amount.toLocaleString('ja-JP');if(name==='文')p.append(strong,document.createTextNode(' 文'));else p.append(document.createTextNode('文字のかけら '),strong,document.createTextNode(' 個'));item.append(p);}return item;
   }));
   $('login-bonus-entry-status').textContent=current.received?'本日は受取済みです。明日も文字の旅へ。':current.enabled?`${current.next}回目の贈りものを受け取れます。`:'ただいま準備中です。';
  }
  function armRefresh(value){clearTimeout(refreshTimer);const delay=Number.isFinite(value.serverNow)?value.nextResetAt-value.serverNow+100:60000;refreshTimer=setTimeout(()=>{if(!document.hidden)refresh(true);},Math.max(1000,Math.min(delay,86400100)));}
  function close(){if(busy||modal.classList.contains('hidden'))return;markShown();pendingAuto=false;modal.classList.add('hidden');resumePlayerEngine();if(opener?.isConnected)opener.focus({preventScroll:true});}
  function show(){if(unavailable())return false;opener=document.activeElement;pausePlayerOverlay();modal.classList.remove('hidden');render();markShown();$('btn-login-bonus-close').focus({preventScroll:true});return true;}
  function queueAuto(){clearTimeout(autoTimer);if(!pendingAuto||!current||current.received||!current.enabled||wasShown(current.day)){pendingAuto=false;return;}if(document.hidden)return;
   autoTimer=setTimeout(()=>{if(!pendingAuto||!current||current.received||wasShown(current.day)){pendingAuto=false;return;}if(checking||unavailable()){queueAuto();return;}pendingAuto=false;if(show())setNote(`${current.next}回目の報酬です。「受け取る」で保存します。`);},500);
  }
  async function refresh(auto=false){
   if(busy)return;if(checking)return checking;
   button.disabled=true;button.textContent='確認中…';$('btn-login-bonus-refresh').disabled=true;
   checking=(async()=>{try{
    await ensureGuestSession();const id=player(),value=await guestRequest('/api/login-bonus');if(id!==player())throw Error('接続情報が変わりました。再確認してください。');current=value;
    setNote(value.received?'本日は受取済みです。次の贈りものは日本時間の午前0時から。':value.enabled?`${value.next}回目の報酬を受け取れます。`:'ただいま準備中です。');
    armRefresh(value);
    pendingAuto=pendingAuto||auto&&!value.received&&!wasShown(value.day);
   }catch(error){current=null;pendingAuto=false;setNote('受取状況を確認できません。通信を確認し、「受取状況を再確認」を押してください。',true);$('login-bonus-entry-status').textContent='受取状況を確認できません。報酬画面から再確認できます。';$('login-bonus-days').replaceChildren();button.disabled=true;button.textContent='受取状況を確認できません';clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(!document.hidden)refresh(true);},30000);
   }finally{checking=null;$('btn-login-bonus-refresh').disabled=false;render();queueAuto();}})();
   return checking;
  }
  $('btn-login-bonus-open').onclick=()=>{if(unavailable()){ $('login-bonus-entry-status').textContent='対局やほかの画面を閉じてから確認してください。';return;}show();setNote('受取状況を確認しています…');refresh();};
  $('btn-login-bonus-refresh').onclick=()=>{setNote('受取状況を確認しています…');refresh();};$('btn-login-bonus-close').onclick=close;
  button.onclick=async()=>{
   if(busy||checking||!current?.enabled||current.received)return;
   if(guestBackupBusy||guestRestoring||saveRecoveryBlocked||guestBackupConflict){setNote('保存処理の完了と保存状態を確認してください。',true);return;}
   busy=true;render();$('btn-login-bonus-close').disabled=true;$('btn-login-bonus-refresh').disabled=true;modal.setAttribute('aria-busy','true');setNote('今日の贈りものを保存しています…');let original=null,attempted=false;
   try{
    await backupGuestNow({manual:true});if(guestBackupStatus!=='saved'||guestBackupDirty||guestBackupBusy)throw Error('最新のデータを保存できませんでした。');
    original=JSON.stringify(gameState);guestRestoring=true;attempted=true;const result=await guestRequest('/api/login-bonus','POST',{revision:guestCredentials.revision});
    if(result.alreadyReceived){current=result;armRefresh(result);setNote('本日は受取済みです。');return;}
    if(JSON.stringify(gameState)!==original)throw Error('保存中に端末の状態が変わりました。上書きを停止しました。復元コードから最新データを確認してください。');
    const next=migrateCatalogueSave(result.state);if(!validSave(next)||!saveStore)throw Error('報酬の端末保存を確認できません。復元コードで最新データを確認してください。');
    saveStore.replace(next);gameState=next;rememberGuest({...guestCredentials,revision:result.revision,savedAt:result.savedAt,backupHash:await guestSnapshotHash(JSON.stringify(next))});guestBackupRaw=JSON.stringify(next);guestBackupDirty=false;guestBackupStatus='saved';current=result;armRefresh(result);updateHeaderUI();renderCollection();renderGuestPlayer();markShown();
    const rewards=[];if(result.reward.coins)rewards.push(result.reward.coins.toLocaleString('ja-JP')+'文');if(result.reward.fragments)rewards.push('文字のかけら'+result.reward.fragments+'個');setNote(rewards.join('と')+'を受け取りました。');
   }catch(error){if(attempted){guestBackupConflict=true;setNote(error.message+' 通信後の失敗では受取済みの可能性があります。復元コードから保存状態を確認してください。',true);}else setNote(error.message+' 保存完了を待って、もう一度受取ボタンを押してください。',true);}
   finally{guestRestoring=false;busy=false;modal.removeAttribute('aria-busy');$('btn-login-bonus-close').disabled=false;$('btn-login-bonus-refresh').disabled=false;render();}
  };
  modal.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'){const items=[...modal.querySelectorAll('button,[tabindex="0"]')].filter(n=>!n.disabled&&!n.hidden),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
  const start=()=>{if(loaded)return;loaded=true;setTimeout(()=>refresh(true),750);};if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(autoTimer);return;}refresh(true);});window.addEventListener('focus',()=>{if(loaded&&!document.hidden)refresh(true);});window.addEventListener('online',()=>refresh(true));
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
