/* No rewards are granted on the client. The unapproved schedule is a preview. */
(()=>{
 const install=()=>{const anchor=document.getElementById('guest-player-panel');if(!anchor)return;
 const panel=document.createElement('details');panel.id='login-bonus-panel';panel.className='guest-player-panel';
 panel.innerHTML='<summary>ログインボーナス</summary><p>来た日ごとに進む7回式。お休みしてもリセットされません。日本時間の午前0時に更新します。</p><p id="login-bonus-status" role="status">報酬量を確認中です。現在は受け取れません。</p><ol id="login-bonus-days"></ol><button type="button" class="inventory-action" disabled>受取状況を確認中</button>';
 anchor.after(panel);
 const light=document.createElement('label');light.className='inventory-note';const toggle=document.createElement('input');toggle.type='checkbox';try{toggle.checked=localStorage.getItem('kanji_workshop_light_v1')==='1';}catch{}
 const applyLight=()=>{document.documentElement.dataset.workshopLight=String(toggle.checked);};applyLight();toggle.onchange=()=>{applyLight();try{localStorage.setItem('kanji_workshop_light_v1',toggle.checked?'1':'0');}catch{}};light.append(toggle,document.createTextNode('召喚・錬成の演出を軽くする'));panel.after(light);new MutationObserver(()=>{if(panel.parentElement!==anchor.parentElement){anchor.after(panel);panel.after(light);}}).observe(document.body,{childList:true,subtree:true});
 const button=panel.querySelector('button');let current=null,busy=false;
 button.onclick=async()=>{if(busy||!current?.enabled||current.received)return;
 if(guestBackupBusy||guestRestoring||saveRecoveryBlocked||guestBackupConflict){noteText('保存処理の完了と保存状態を確認してください。');return;}
 if(!document.getElementById('screen-battle')?.classList.contains('hidden')||window.isGachaPresentationBusy?.()){noteText('対局や召喚を終了してから受け取ってください。');return;}
 busy=true;button.disabled=true;let original=null,attempted=false;const shield=document.createElement('dialog');shield.textContent='ログイン報酬を保存しています…';document.body.append(shield);shield.addEventListener('cancel',e=>e.preventDefault());shield.showModal();pausePlayerOverlay();
 try{await backupGuestNow({manual:true});if(guestBackupStatus!=='saved'||guestBackupDirty||guestBackupBusy)throw Error('最新のデータを保存できませんでした。');
 original=JSON.stringify(gameState);guestRestoring=true;
 attempted=true;const result=await guestRequest('/api/login-bonus','POST',{revision:guestCredentials.revision});
 if(result.alreadyReceived){current=result;noteText('本日は受取済みです。');return;}
 if(JSON.stringify(gameState)!==original)throw Error('保存中に端末の状態が変わりました。上書きを停止しました。復元コードから最新データを確認してください。');
 const next=migrateCatalogueSave(result.state);if(!validSave(next)||!saveStore)throw Error('報酬の端末保存を確認できません。復元コードで最新データを確認してください。');
 saveStore.replace(next);gameState=next;rememberGuest({...guestCredentials,revision:result.revision,savedAt:result.savedAt,backupHash:await guestSnapshotHash(JSON.stringify(next))});guestBackupRaw=JSON.stringify(next);guestBackupDirty=false;guestBackupStatus='saved';current=result;updateHeaderUI();renderCollection();renderGuestPlayer();noteText(`${result.reward.coins.toLocaleString()}文・かけら${result.reward.fragments}個を受け取りました。`);
 }catch(error){if(attempted){guestBackupConflict=true;noteText(error.message+' 通信後の失敗では受取済みの可能性があります。再付与せず、復元コードから保存状態を確認してください。');}else noteText(error.message+' 保存完了を待って、もう一度受取ボタンを押してください。');}
 finally{guestRestoring=false;busy=false;shield.close();shield.remove();resumePlayerEngine();button.disabled=!current?.enabled||current.received;button.textContent=current?.received?'本日は受取済み':'受け取る';}};
 function noteText(text){document.getElementById('login-bonus-status').textContent=text;}

 panel.addEventListener('toggle',async()=>{if(!panel.open)return;const note=document.getElementById('login-bonus-status');try{await ensureGuestSession();const value=await guestRequest('/api/login-bonus');current=value;button.disabled=!value.enabled||value.received;button.textContent=value.received?'本日は受取済み':value.enabled?'受け取る':'準備中';const list=document.getElementById('login-bonus-days');list.replaceChildren(...value.rewards.map((r,n)=>{const li=document.createElement('li');li.textContent=`${n+1}回目：`+[r.coins?`${r.coins.toLocaleString()}文`:'',r.fragments?`文字のかけら${r.fragments}個`:''].filter(Boolean).join(' ＋ ');if(n+1===value.next)li.textContent+=' ← 次回';return li}));note.textContent=value.enabled?`次は${value.next}回目。1日1回受け取れます。`:'報酬量の確認待ちです。以下は提案中の数量です。';}catch{note.textContent='受取状況を確認できません。通信を確認して開き直してください。';}});
 };
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
