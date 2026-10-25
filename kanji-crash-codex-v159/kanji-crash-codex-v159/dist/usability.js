/* Layout and navigation only: existing save, battle, draw and recovery handlers stay intact. */
(()=>{
 const $=id=>document.getElementById(id),node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
 function details(title,...children){const d=node('details','ux-details'),s=node('summary','',title);d.append(s,...children.filter(Boolean));return d;}
 function button(id,label,action){const b=node('button','inventory-action secondary',label);b.id=id;b.type='button';b.onclick=action;return b;}
 window.addEventListener('load',()=>{
  document.body.classList.add('ux-refined');
  const cpu=$('btn-start-cpu').closest('.mode-card'),panel=cpu.querySelector('.glass-panel'),rewards=cpu.querySelector('.mode-rewards')?.parentElement,extra=panel?.querySelector('details');
  if(rewards){rewards.querySelector('summary').textContent='報酬・難易度の詳細';if(extra){for(const n of [...extra.children])if(n.tagName!=='SUMMARY')rewards.append(n);extra.remove();}cpu.append(rewards);}
  for(const more of document.querySelectorAll('.mode-card .mode-rewards')){const fold=more.parentElement;if(fold.tagName==='DETAILS')more.closest('.mode-card').append(fold);}
  const start=$('btn-start-cpu');start.setAttribute('aria-label','選んだ難易度でCPU対戦の準備へ進む');
  $('screen-deck').querySelector('h2').nextElementSibling.textContent='文字を選んで編成。ルビは、読みと能力の装備です。';
  const synthesis=$('screen-synthesis'),bench=$('synth-slot-1').closest('.glass-panel'),materials=$('synthesis-selectable-grid').closest('.glass-panel'),seal=synthesis.querySelector('.workshop-seal');
  synthesis.querySelector('h2').nextElementSibling.textContent='素材を2体選び、消費内容を確認して錬成します。';
  seal.after(materials);materials.after(bench);materials.querySelector('h3').textContent='1．素材を選ぶ';
  const protection=node('p','inventory-note','ロック中・編成中・アイコン用の文字は素材にできません。');protection.id='ux-synthesis-protection';materials.querySelector('h3').after(protection);
  bench.prepend(node('h3','ux-section-title','2．消費内容を確認'));$('btn-execute-synth').textContent='消費内容・結果を確認';
  const recipe=$('btn-recipes').closest('.glass-panel'),bulk=$('btn-bulk-synthesis').closest('.glass-panel');
  const methods=details('錬成方法の違い・組み合わせ・一括操作',node('p','inventory-note','通常錬成：同じ水準の2体から新しい文字を狙います。同じ文字なら未解放のルビを解放し、経験値を引き継ぎます。'),recipe,bulk);methods.id='ux-synthesis-methods';bench.after(methods);
  recipe.prepend(node('p','inventory-note','組み合わせ錬成：2文字のレシピを探します。費用と素材は実行前に確認できます。'));
  bulk.prepend(node('p','inventory-note','一括錬成：対象の素材をまとめて選び、確認して実行します。'));
  const gachaHeading=$('screen-gacha').querySelector('h2');gachaHeading.nextElementSibling.textContent='文（ゲーム内通貨）で文字を召喚。水準は文字の区分です。';
  for(const card of $('screen-gacha').querySelectorAll('.workshop-panel')){const notes=[...card.querySelectorAll(':scope > p.inventory-note')];if(notes.length>1){const more=details('詳しく見る',...notes.slice(1));card.append(more);}}
  // Retain original form nodes and listeners while putting reward entrances together.
  const rank=$('screen-rank').firstElementChild,rewardSection=node('section','glass-panel ux-reward-section');rewardSection.id='ux-record-rewards';rewardSection.append(node('h3','ux-section-title','報酬'));
  const rewardLinks=node('div','ux-reward-links'),gift=$('recovery-code-panel');
  rewardLinks.append(button('btn-record-login','ログインボーナス',()=>$('btn-login-bonus-open').click()));
  const giftButton=button('btn-record-gift','ギフトコード',()=>{gift.open=!gift.open;giftButton.setAttribute('aria-expanded',String(gift.open));if(gift.open)$('recovery-code-input').focus({preventScroll:true});});giftButton.setAttribute('aria-expanded','false');giftButton.setAttribute('aria-controls','recovery-code-panel');gift.addEventListener('toggle',()=>giftButton.setAttribute('aria-expanded',String(gift.open)));rewardLinks.append(giftButton);rewardSection.append(rewardLinks,gift);
  const tabbar=rank.querySelector('.screen-subtabs');tabbar.before(rewardSection);
  // Settings route to the existing dialogs/data panel, without copying credentials or saves.
  const settings=node('div','editor-overlay hidden');settings.id='modal-game-settings';settings.setAttribute('role','dialog');settings.setAttribute('aria-modal','true');settings.setAttribute('aria-labelledby','game-settings-title');settings.innerHTML='<section class="editor-panel ux-settings"><div class="editor-title"><h2 id="game-settings-title">設定</h2><button type="button" id="btn-game-settings-close" aria-label="設定を閉じる">閉じる</button></div><p class="inventory-note">音・見た目・データの管理</p><div id="game-settings-actions"></div><p class="inventory-note">文はゲーム内通貨。CPU段位ポイントと対人RPは別の成績です。</p></section>';document.body.append(settings);
  let returnFocus=null;const close=()=>{settings.classList.add('hidden');resumePlayerEngine();returnFocus?.focus({preventScroll:true});};
  const open=()=>{if(document.querySelector('[role="dialog"]:not(.hidden),dialog[open]'))return;returnFocus=document.activeElement;pausePlayerOverlay();settings.classList.remove('hidden');$('btn-game-settings-close').focus({preventScroll:true});};
  const menuButton=button('btn-game-settings','設定',open),audioButton=$('btn-game-sound-settings');audioButton.hidden=true;audioButton.after(menuButton);$('btn-game-settings-close').onclick=close;
  const actions=$('game-settings-actions');actions.append(button('btn-settings-audio','音・BGM',()=>{close();audioButton.onclick();}),button('btn-settings-appearance','プレイヤー名・見た目',()=>{close();openPlayerProfile();}),button('btn-settings-data','保存・復元を開く',()=>{close();switchTab('rank');const data=$('guest-player-panel');data.open=true;requestAnimationFrame(()=>{data.scrollIntoView({block:'start'});$('guest-player-title').focus({preventScroll:true});});}));
  const light=document.querySelector('.workshop-light-setting');if(light)actions.append(light);
  settings.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'){const list=[...settings.querySelectorAll('button,input')].filter(n=>!n.disabled&&!n.hidden),first=list[0],last=list.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
  const dataTitle=$('guest-player-title');for(const text of dataTitle.childNodes)if(text.nodeType===Node.TEXT_NODE){text.textContent='保存・復元 ';break;}dataTitle.tabIndex=0;
  const help=$('app-help'),sharing=$('sharing-policy');if(help&&sharing){rank.append(details('ヘルプ・投稿について',help,sharing));}
  // The visible entry above delegates to the original bonus UI; its server checks remain unchanged.
  const intro=details('用語の説明',node('p','inventory-note','ルビ：文字に装備する読みと能力。水準：文字の区分。文：ゲーム内通貨。CPU段位ポイント：CPU対戦の成績。対人RP：オンライン対戦の成績。'));$('app-help').append(intro);
 });
})();
