'use strict';
let gachaPresentation=null;
window.isGachaPresentationBusy=()=>!!gachaPresentation&&(gachaPresentation.discoveryActive||gachaPresentation.revealed.size<gachaPresentation.results.length);
const gachaDiscoveryLabel=r=>r.duplicate?'重複':r.firstDiscovery===false||r.fragmentExchange?'再入手':'NEW・初発見';
const gachaReducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement?.dataset?.workshopLight==='true';
const gachaPacing=Object.freeze({discovery:1800});
function dismissGachaDiscovery(){
 const view=gachaPresentation;if(!view)return;
 clearTimeout(view.discoveryTimer);view.discoveryActive=false;
 const stage=document.getElementById('gacha-discovery');if(stage){stage.hidden=true;stage.classList.remove('is-written');}
 document.getElementById('modal-gacha').classList.remove('is-discovery-active');
 window.KanjiGameAudio?.stop();
}
function refreshGachaRepeat(){window.refreshSingleGachaRepeat?.();const view=gachaPresentation,button=document.getElementById('btn-gacha-repeat');if(!button)return;const eligible=view&&view.results.length===10&&['normal','rare','element'].includes(view.type)&&view.revealed.size===10&&!view.discoveryActive;button.hidden=!eligible;if(!eligible){button.disabled=true;return;}const cost=view.type==='normal'?1000:3000;button.disabled=!!view.repeatUsed||gameState.coins<cost;button.textContent='続けて10連召喚\n'+(gameState.coins<cost?'あと'+(cost-gameState.coins).toLocaleString('ja-JP')+'文必要':'（'+cost.toLocaleString('ja-JP')+'文）');}
window.repeatTenGacha=()=>{const view=gachaPresentation;if(!view||Date.now()<(view.repeatAfter||0)||view.discoveryActive||view.repeatUsed||view.results.length!==10||view.revealed.size!==10||!['normal','rare','element'].includes(view.type))return;const cost=view.type==='normal'?1000:3000;if(gameState.coins<cost){refreshGachaRepeat();showToast('文が不足しています。');return;}view.repeatUsed=true;refreshGachaRepeat();try{drawTenGacha(view.type);if(gachaPresentation!==view)gachaPresentation.opener=view.opener;else{view.repeatUsed=false;refreshGachaRepeat();}}catch(error){view.repeatUsed=false;refreshGachaRepeat();throw error;}};
function selectGachaResult(index){
 const view=gachaPresentation,r=view?.results[index];if(!r)return;
 view.selected=index;
 document.querySelectorAll('#gacha-result-grid button').forEach((b,n)=>b.setAttribute('aria-pressed',String(n===index)));
 const item=r.item,stats=getKanjiStats(item),attr=ATTR_INFO[item.attr]||ATTR_INFO.metal;
 const panel=document.getElementById('gacha-selected');panel.hidden=false;panel.dataset.jis=String(item.jis);
 document.getElementById('gacha-selected-char').textContent=item.char;
 document.getElementById('gacha-selected-reading').textContent=item.ruby||'読み未装備';
 document.getElementById('gacha-selected-meta').textContent=`${getCharacterTypeLabel(item)}・${attr.name}属性・Lv.${item.level}`;
 document.getElementById('gacha-selected-power').textContent=stats.power;
 document.getElementById('gacha-selected-weight').textContent=stats.weight;
 document.getElementById('gacha-selected-note').textContent=(r.fragmentExchange?'文字のかけらで交換しました。':r.fragments?`全ルビ解放済みの重複ボーナス：文字のかけら＋${r.fragments}個。文字も獲得しました。${r.summonSource==='element'?'元素文字召喚の重複報酬は水準に関係なく1個です。':''}`:r.duplicate?'同じ文字と錬成するとルビを解放できます。':r.firstDiscovery===false?'以前発見した文字を再入手しました。':'初めて発見した文字です。')+(item.autoLocked?' 自動ロック済み。':'');
 const trait=KanjiTraits.get(item),element=KanjiElements.get(item);
 document.getElementById('gacha-selected-abilities').innerHTML=`<span class="ability-list">${getReadingAbilities(item).map(a=>`<span class="ability-chip" style="color:${a.color||'#e879f9'}">${a.name}</span>`).join('')}${trait?`<span class="ability-chip" style="color:#a7f3d0">固有：${trait.name}</span>`:''}${element?`<span class="ability-chip" style="color:${element.color}">${element.name}</span>`:''}</span>`;
}
function finishGachaResults(){
 const view=gachaPresentation;if(!view||view.discoveryActive||view.revealed.size!==view.results.length)return;
 const fresh=view.firstFlags.filter(Boolean).length,reacquired=view.results.filter(r=>!r.duplicate&&(r.firstDiscovery===false||r.fragmentExchange)).length;
 document.getElementById('gacha-animation-sub').textContent=`${view.results.length}文字獲得・初発見 ${fresh}文字・再入手 ${reacquired}文字`+(view.results.some(r=>r.fragments)?`・文字のかけら＋${view.results.reduce((n,r)=>n+(r.fragments||0),0)}個`:view.results.some(r=>r.fragmentExchange)?'・かけら交換':'');
 const skip=document.getElementById('btn-gacha-skip');if(document.activeElement===skip)document.getElementById('btn-gacha-close').focus({preventScroll:true});
 skip.hidden=true;document.getElementById('modal-gacha').classList.remove('is-summoning');refreshGachaRepeat();
 document.getElementById('gacha-reveal-progress').textContent='文字をタップすると能力を確認できます';
 if(!view.userSelected)selectGachaResult(view.results.reduce((best,r,n)=>r.item.jis>view.results[best].item.jis?n:best,0));
}
function showGachaDiscovery(index,sound=true){
 const view=gachaPresentation,stage=document.getElementById('gacha-discovery');if(!view||!stage)return;
 clearTimeout(view.discoveryTimer);view.discoveryActive=sound;stage.hidden=false;stage.classList.remove('is-written');
 document.getElementById('gacha-discovery-char').textContent=view.results[index].item.char;
 document.getElementById('gacha-discovery-reading').textContent=view.results[index].item.ruby||'読み未装備';
 const first=view.firstFlags[index],label=first?'初発見':view.results[index].duplicate?'重複':'再入手';
 document.getElementById('gacha-discovery-meta').textContent=getCharacterTypeLabel(view.results[index].item)+'・'+label;
 document.getElementById('gacha-reveal-eyebrow').textContent=first?'新たな文字との出会い':'選んだ文字が目を覚ます';
 document.getElementById('gacha-reveal-stamp').textContent=first?'初発見':view.results[index].duplicate?'所持済':'再入手';
 stage.dataset.jis=String(view.results[index].item.jis);void stage.offsetWidth;if(sound)stage.classList.add('is-written');
 document.getElementById('modal-gacha').classList.add('is-discovery-active');if(sound)playSound(first?'discovery':view.results[index].item.jis>=3?'rare':'reveal');
 if(sound){view.discoveryTimer=setTimeout(()=>{if(gachaPresentation!==view)return;view.discoveryActive=false;finishGachaResults();},gachaPacing.discovery);gachaTimeouts.push(view.discoveryTimer);}
}
function revealGachaResult(index,sound=true){
 const view=gachaPresentation;if(!view||view.revealed.has(index))return;
 view.revealed.add(index);const b=document.querySelector(`#gacha-result-grid [data-gacha-index="${index}"]`);b.classList.add('is-revealed');
 b.setAttribute('aria-label',`${index+1}文字目：${view.results[index].item.char}、${getCharacterTypeLabel(view.results[index].item)}、${view.firstFlags[index]?'初発見':gachaDiscoveryLabel(view.results[index])}。能力を確認`);
 if(view.selected===null||(sound&&!view.userSelected))selectGachaResult(index);
 if(sound)showGachaDiscovery(index);
 if(view.revealed.size===view.results.length)finishGachaResults();
 else document.getElementById('gacha-reveal-progress').textContent=`開封済み ${view.revealed.size} / ${view.results.length}`;
}
window.skipGachaAnimation=()=>{
 window.KanjiGameAudio?.stop();
 if(gachaPresentation){gachaPresentation.discoveryActive=false;gachaPresentation.repeatAfter=Date.now()+500;}
 const modal=document.getElementById('modal-gacha');modal.classList.add('is-skipped');modal.classList.remove('is-discovery-active');const stage=document.getElementById('gacha-discovery');if(stage){stage.hidden=true;stage.classList.remove('is-written');}
 gachaTimeouts.forEach(clearTimeout);gachaTimeouts=[];
 gachaPresentation?.results.forEach((_,n)=>revealGachaResult(n,false));
 finishGachaResults();
};
window.clearGachaPresentation=()=>{
 window.KanjiGameAudio?.stop();document.getElementById('modal-gacha').classList.remove('is-summoning','is-discovery-active');const stage=document.getElementById('gacha-discovery');if(stage){stage.hidden=true;stage.classList.remove('is-written');}
 gachaTimeouts.forEach(clearTimeout);gachaTimeouts=[];
 const opener=gachaPresentation?.opener;gachaPresentation=null;refreshGachaRepeat();
 if(opener?.isConnected)requestAnimationFrame(()=>opener.focus({preventScroll:true}));
};
window.showGachaResults=(results,type)=>{
 gachaTimeouts.forEach(clearTimeout);gachaTimeouts=[];
 gachaPresentation={results,type,firstFlags:KanjiSummonVisuals.firstFlags(results),discoveryActive:false,repeatAfter:0,repeatUsed:false,revealed:new Set(),selected:null,userSelected:false,opener:document.activeElement};
 const modal=document.getElementById('modal-gacha'),grid=document.getElementById('gacha-result-grid');modal.classList.remove('is-skipped','is-discovery-active');const stage=document.getElementById('gacha-discovery');if(stage){stage.hidden=true;stage.classList.remove('is-written');}grid.replaceChildren();
 modal.dataset.count=String(results.length);modal.dataset.type=type;
 document.getElementById('gacha-animation-title').textContent=type==='exchange'?'文字のかけら交換':(type==='element'?'元素文字':type==='rare'?'希少文字':'通常文字')+(results.length===10?'10連召喚':'召喚');
 document.getElementById('gacha-animation-sub').textContent=results.length===10?'気になるカードをタップして、1枚ずつ開封できます':'札をタップして、好きなタイミングで開封できます';
 document.getElementById('gacha-reveal-progress').textContent=`開封済み 0 / ${results.length}`;
 document.getElementById('gacha-selected').hidden=true;
 document.getElementById('btn-gacha-skip').hidden=false;document.getElementById('btn-gacha-skip').textContent=results.length===10?'すべて開く':'演出スキップ・結果をまとめて見る';refreshGachaRepeat();
 results.forEach((r,n)=>{
  const b=document.createElement('button'),v=getJisVisual(r.item.jis);b.type='button';b.className='gacha-result-card';b.dataset.gachaIndex=String(n);b.dataset.jis=String(r.item.jis);b.setAttribute('aria-pressed','false');const back=KanjiSummonVisuals.back(r.item);b.dataset.pattern=back.pattern;b.dataset.first=String(gachaPresentation.firstFlags[n]);b.setAttribute('aria-label',`${n+1}文字目：${back.label}。開封して能力を確認`);
  b.innerHTML=`<span class="gacha-card-seal" aria-hidden="true"><i class="gacha-back-pattern"></i><strong>${r.fragmentExchange?'換':back.seal}</strong><small>${back.label}</small></span><span class="gacha-card-face" aria-hidden="true"><span class="gacha-tier ${v.char}">${getCharacterTypeLabel(r.item)}</span><span class="gacha-glyph kanji-font ${v.char}">${r.item.char}</span><span class="gacha-card-state">${(gachaPresentation.firstFlags[n]?'NEW<br>初発見':gachaDiscoveryLabel(r)==='NEW・初発見'?'再入手':gachaDiscoveryLabel(r))+(r.fragments?'<span class="gacha-card-fragments">かけら＋'+r.fragments+'</span>':'')}</span></span>`;
  const view=gachaPresentation;
  b.onclick=()=>{if(gachaPresentation!==view)return;view.userSelected=true;dismissGachaDiscovery();if(results.length!==10){gachaTimeouts.forEach(clearTimeout);gachaTimeouts=[];}if(!view.revealed.has(n))revealGachaResult(n);else showGachaDiscovery(n,false);selectGachaResult(n);finishGachaResults();};grid.append(b);
 });
 modal.classList.remove('hidden');modal.classList.add('is-summoning');playSound('summon');
 // Both single and ten pulls wait for an explicit tap, even with reduced motion.
 document.querySelector('#gacha-result-grid [data-gacha-index="0"]').focus({preventScroll:true});
};
document.getElementById('modal-gacha').addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();closeModal('modal-gacha');}
 if(e.key==='Tab'){
  const buttons=[...e.currentTarget.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled),first=buttons[0],last=buttons.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 }
});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches&&gachaPresentation){clearTimeout(gachaPresentation.discoveryTimer);gachaPresentation.discoveryActive=false;window.KanjiGameAudio?.stop();finishGachaResults();}});

document.addEventListener('visibilitychange',()=>{if(document.hidden&&gachaPresentation){clearTimeout(gachaPresentation.discoveryTimer);gachaPresentation.discoveryActive=false;window.KanjiGameAudio?.stop();finishGachaResults();}});

new MutationObserver(()=>{const modal=document.getElementById('modal-gacha');if(gachaPresentation&&modal.classList.contains('hidden'))clearGachaPresentation();}).observe(document.getElementById('modal-gacha'),{attributes:true,attributeFilter:['class']});
