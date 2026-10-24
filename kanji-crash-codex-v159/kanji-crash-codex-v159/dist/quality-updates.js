(function(){
 'use strict';
 const $=id=>document.getElementById(id);let entries=[],matchKey='',friendRevision=-1;
 window.clearBattleActivations=()=>{entries=[];matchKey='';friendRevision=-1;};
 window.recordBattleActivation=(body,ability)=>{
  if(!body?.gameData||!ability?.name)return;
  const room=typeof battleMode!=='undefined'&&battleMode==='friend'&&typeof friendRoom!=='undefined'?friendRoom:null,key=room?room.code+':'+room.round:'solo';if(matchKey!==key){entries=[];matchKey=key;}
  const shot=room?.state?.pressure?.shots??(typeof battlePressure!=='undefined'?battlePressure.shots:0),side=body.gameData.isPlayer?'自分':'相手',char=body.gameData.char||'？',name=String(ability.name).slice(0,80),piece=room?body.gameData.friendKey:body.id;
  const previous=entries.at(-1);if(previous&&previous.piece===piece&&previous.name===name&&previous.shot===shot)previous.count++;else entries.push({shot,side,char,name,piece,count:1});if(entries.length>200)entries.shift();
 };
 window.recordFriendBattleActivations=room=>{const key=room.code+':'+room.round;if(matchKey!==key){entries=[];matchKey=key;friendRevision=-1;}if(room.revision<=friendRevision)return;friendRevision=room.revision;for(const event of room.state?.replay?.events||[]){const piece=room.state.pieces.find(p=>p.key===event.key);if(piece)recordBattleActivation({id:event.key,gameData:{...piece.data,friendKey:event.key,isPlayer:(event.key<3?0:1)===room.side}},event);}};
 window.renderBattleActivations=()=>{const list=$('battle-activation-list');if(!list)return;list.replaceChildren();if(!entries.length){list.textContent='能力が発動すると、ここに記録されます。';return;}for(const e of [...entries].reverse()){const row=document.createElement('li');row.dataset.side=e.side==='自分'?'self':'peer';row.textContent=(e.shot?'第'+e.shot+'手':'開始時')+'・'+e.side+'「'+e.char+'」 '+e.name+(e.count>1?' ×'+e.count:'');list.append(row);}};
 window.openResultBattleActivations=()=>{$('btn-result-activations')?.focus();openBattleInfo();const close=$('btn-close-battle-info');close.textContent='×';close.setAttribute('aria-label','発動記録を閉じて対局の結果に戻る');$('battle-activation-history')?.scrollIntoView({block:'start'});};
 window.addEventListener('load',()=>{
  const info=$('battle-info-content');if(info){const section=document.createElement('section'),title=document.createElement('h3'),note=document.createElement('p'),list=document.createElement('ol');section.className='battle-activation-history';title.textContent='能力の発動記録';note.textContent='新しい順に最大200件。同じ手で続けて発動した能力は回数をまとめます。';list.id='battle-activation-list';section.append(title,note,list);section.id='battle-activation-history';info.append(section);renderBattleActivations();}
  const rank=$('screen-rank')?.firstElementChild;if(rank){const updates=document.createElement('details');updates.id='game-update-notes';updates.className='glass-panel';updates.innerHTML='<summary>更新のお知らせ</summary><p>保存と対局情報を改善しました。</p><ul><li>保存状況を「データを守る・引き継ぐ」の見出しに表示。</li><li>サーバーバックアップの過去5回分から復元できます。</li><li>対局の「情報」で能力の発動記録を確認できます。</li></ul>';rank.append(updates);try{if(localStorage.getItem('kanji_update_notice')!=='145'){if(typeof showToast==='function')showToast('更新：バックアップ履歴と能力の発動記録を追加しました。詳しくは「記録」の更新のお知らせへ。');localStorage.setItem('kanji_update_notice','145');}}catch{}}
 });
})();
