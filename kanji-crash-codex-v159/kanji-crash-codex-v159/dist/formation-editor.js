'use strict';
let formationDraft=null,formationItems=[],formationSelected=0,formationSlot=0,formationPointer=null,formationOffset={x:0,y:0},formationPractice=false;
function getActiveFormation(){if(gameState.loadedDeckFormation)return gameState.loadedDeckFormation;return gameState.activeFormation===null?KanjiFormation.defaults:gameState.formationPresets[gameState.activeFormation]||KanjiFormation.defaults;}
function formationMetrics(){const c=document.getElementById('formation-canvas');return formationPractice?{c,r:Math.min(c.width,c.height)*.46,center:{x:c.width/2,y:c.height/2}}:{c,r:Math.min(c.width*.45,c.height/1.18),center:{x:c.width/2,y:10}};}
function formationPreviewBodies(){const {r,center}=formationMetrics();return formationItems.map((i,n)=>{const p=formationDraft[n],body=KanjiTraits.createBody(i,center.x+p.x*r,center.y+p.y*r,r/(formationPractice?184:150),{},p.angle);body.gameData={...i,isPlayer:true};return body;});}
function drawFormation(){if(!formationDraft)return;const {c,r,center}=formationMetrics(),cx=c.getContext('2d');cx.clearRect(0,0,c.width,c.height);
 cx.fillStyle='#0f172a';cx.beginPath();cx.arc(center.x,center.y,r,0,formationPractice?Math.PI*2:Math.PI);cx.closePath();cx.fill();cx.strokeStyle='#d97706';cx.lineWidth=3;cx.stroke();
 if(formationPractice)drawPracticeTargets(cx,center,r);
 cx.setLineDash([5,5]);cx.strokeStyle='#64748b';cx.beginPath();cx.moveTo(center.x-r,center.y);cx.lineTo(center.x+r,center.y);cx.stroke();cx.setLineDash([]);
 cx.fillStyle='#64748b';cx.font='11px "Kanji Unified Mincho", serif';cx.textAlign='center';cx.fillText('自陣・相手は上側',center.x,center.y+17);
 formationPreviewBodies().forEach((body,n)=>{KanjiPieceArt.draw(cx,body,performance.now(),true);cx.fillStyle='#fff';cx.font='bold 10px sans-serif';cx.fillText(String(n+1),body.position.x,body.position.y+body.circleRadius+15);if(n===formationSelected){cx.strokeStyle='#fbbf24';cx.lineWidth=1;cx.setLineDash([3,3]);cx.beginPath();cx.arc(body.position.x,body.position.y,body.circleRadius+12,0,Math.PI*2);cx.stroke();cx.setLineDash([]);}});
 const item=formationItems[formationSelected],trait=KanjiTraits.get(item);document.getElementById('formation-selected').textContent=item?`${formationSelected+1}：${item.char}${trait?'・'+trait.name:''}`:'コマがありません';
}
function resizeFormation(){if(!formationDraft||document.getElementById('modal-formation').classList.contains('hidden'))return;const c=document.getElementById('formation-canvas');c.width=Math.round(c.clientWidth);c.height=Math.round(c.clientHeight);drawFormation();}
function renderFormationSlots(){document.getElementById('formation-slots').hidden=formationPractice;document.getElementById('formation-save-note').hidden=formationPractice;if(formationPractice){document.getElementById('btn-save-formation').textContent='配置を確定して戻る';return;}document.getElementById('formation-slots').innerHTML=gameState.formationPresets.map((p,n)=>`<button onclick="selectFormationSlot(${n})" aria-pressed="${n===formationSlot}">配置${n+1}<small>${p?'保存済み':'未保存'}</small>${n===gameState.activeFormation?'<small>使用中</small>':''}</button>`).join('');document.getElementById('btn-save-formation').textContent=`配置${formationSlot+1}に保存して使用`;}
window.openFormationEditor=()=>{
 formationPractice=false;document.getElementById('modal-formation').classList.remove('practice-formation');document.getElementById('formation-title').textContent='初期配置';document.getElementById('formation-description').textContent='自陣内でコマをドラッグ。矢印が正面です。盾は尖った側が正面。重ねて配置はできません。';
 formationItems=gameState.deck.map(id=>gameState.inventory.find(i=>i.instanceId===id)).filter(Boolean);if(!formationItems.length){showToast('先にデッキに文字を編成してください。');return;}
 cancelDrag();if(runner)runner.enabled=false;formationSelected=0;formationSlot=gameState.activeFormation??0;formationPointer=null;
 const layout=KanjiFormation.fit(formationItems,getActiveFormation());formationDraft=layout.points;
 document.getElementById('formation-hint').textContent=layout.adjusted?'コマの大きさに合わせて配置を調整しました。':'動かすコマをタップ。左右のボタンで向きを変えられます。';
 document.getElementById('modal-formation').classList.remove('hidden');document.querySelector('#modal-formation .editor-panel').scrollTop=0;renderFormationSlots();resizeFormation();
};
window.selectFormationSlot=n=>{if(n<0||n>2)return;formationSlot=n;const p=gameState.formationPresets[n];if(p){const layout=KanjiFormation.fit(formationItems,p);formationDraft=layout.points;document.getElementById('formation-hint').textContent=layout.adjusted?'コマの大きさに合わせて配置を調整しました。':`配置${n+1}を読み込みました。`;}else document.getElementById('formation-hint').textContent=`現在の配置を配置${n+1}に保存できます。`;renderFormationSlots();drawFormation();};
window.rotateFormation=angle=>{const p=formationDraft[formationSelected];if(!p)return;const result=KanjiFormation.move(formationItems,formationDraft,formationSelected,{...p,angle:KanjiFormation.wrapAngle(p.angle+angle)});if(result){formationDraft=result;document.getElementById('formation-hint').textContent='向きを変更しました。';drawFormation();}else document.getElementById('formation-hint').textContent='他のコマや境界に触れるため回転できません。少し動かしてください。';};
window.saveFormationPreset=()=>{if(!formationDraft||!KanjiFormation.valid(formationItems,formationDraft))return;if(formationPractice){practiceRun.formation=KanjiFormation.copy(formationDraft);closeModal('modal-formation');resetBattle();return;}gameState.loadedDeckFormation=null;gameState.formationPresets[formationSlot]=KanjiFormation.copy(formationDraft);gameState.activeFormation=formationSlot;saveState();renderDeckSlots();closeModal('modal-formation');};
window.useDefaultFormation=()=>{if(formationPractice){practiceRun.formation=KanjiFormation.fit(practiceRun.team,KanjiFormation.defaults).points;closeModal('modal-formation');resetBattle();return;}gameState.loadedDeckFormation=null;gameState.activeFormation=null;saveState();renderDeckSlots();closeModal('modal-formation');};
window.openPracticeFormation=()=>{
 if(!isPractice()||practiceRun.started||!soloBattlePending||!KanjiPlayRecords.get(practiceRun.id).positioning)return;
 formationPractice=true;formationItems=practiceRun.team;formationSelected=0;formationPointer=null;formationDraft=KanjiFormation.fit(formationItems,practiceRun.formation).points;pausePlayerOverlay();
 const modal=document.getElementById('modal-formation');modal.classList.add('practice-formation');modal.classList.remove('hidden');document.getElementById('formation-title').textContent='一撃チャレンジ・初期配置';document.getElementById('formation-description').textContent='相手は上側。自分を下半分でドラッグし、位置と向きを変更します。この挑戦だけに適用します。';document.getElementById('formation-hint').textContent=KanjiPlayRecords.get(practiceRun.id).hint||'開始位置を考えよう。';renderFormationSlots();resizeFormation();modal.querySelector('.editor-panel').scrollTop=0;modal.querySelector('button').focus();
};
let catalogueFilter='all';
function renderTraitCatalogue(){
 const intro=document.getElementById('trait-catalogue-intro');if(intro)intro.textContent=`特殊な形や固有特性を持つ${KanjiTraits.catalogue.length}文字。矢印は正面です。盾は尖った側が正面です。入手済みの記録は、錬成に使っても残ります。`;
 const container=document.getElementById('trait-catalogue');container.innerHTML='';
 const found=new Set(gameState.specialDiscoveries||[]),ownedChars=new Set(gameState.inventory.map(i=>i.char));
 document.getElementById('catalogue-progress').textContent=`入手済み ${found.size} / ${KanjiTraits.catalogue.length}種・現在所持 ${KanjiTraits.catalogue.filter(t=>ownedChars.has(t.char)).length}種`;
 document.querySelectorAll('[data-catalogue-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.catalogueFilter===catalogueFilter)));
 for(const t of KanjiTraits.catalogue){
  const discovered=found.has(t.char);if(catalogueFilter==='found'&&!discovered||catalogueFilter==='missing'&&discovered)continue;
  const owned=gameState.inventory.filter(i=>i.char===t.char).sort((a,b)=>getTotalExp(b)-getTotalExp(a)),base=KANJI_DATABASE.find(k=>k.char===t.char),item=owned[0]||base;
  const card=document.createElement('article');card.className='trait-card';card.dataset.char=t.char;card.dataset.found=String(discovered);
  card.innerHTML=`<canvas width="156" height="168" aria-label="${t.char}の形"></canvas><div><h3>${t.char}：${t.name}</h3><p class="catalogue-state">${discovered?'入手済み':'未入手'}・${getJisVisual(base.jis).rank}・${ATTR_INFO[base.attr].name}属性</p><p class="catalogue-state">${owned.length?`所持${owned.length}体・最高Lv.${owned[0].level||1}`:discovered?'現在の所持なし':'召喚・錬成で入手できます'}</p><p>${t.description}</p><p class="catalogue-state">属性特性：${KanjiElements.get(base).name}</p>${owned.length?'<button type="button">所持文字を見る</button>':''}</div>`;
  container.appendChild(card);const c=card.querySelector('canvas'),cx=c.getContext('2d');cx.scale(2,2);const body=KanjiTraits.createBody(item,39,40,.68);body.gameData={...item,isPlayer:true};KanjiPieceArt.draw(cx,body,0,true);
  const button=card.querySelector('button');if(button)button.onclick=()=>{closeModal('modal-traits');openRubyModal(owned[0]);};
 }
 if(!container.children.length){const p=document.createElement('p');p.className='catalogue-empty';p.textContent=catalogueFilter==='found'?'まだ特殊文字を入手していません。':'すべての特殊文字を入手済みです！';container.appendChild(p);}
}
window.setCatalogueFilter=value=>{if(['all','found','missing'].includes(value)){catalogueFilter=value;renderTraitCatalogue();}};
window.openTraitCatalogue=()=>{cancelDrag();if(runner)runner.enabled=false;renderTraitCatalogue();document.getElementById('modal-traits').classList.remove('hidden');document.querySelector('#modal-traits .editor-panel').scrollTop=0;};
window.addEventListener('load',()=>{
 const c=document.getElementById('formation-canvas');
 function point(e){const box=c.getBoundingClientRect();return{x:(e.clientX-box.left)*c.width/box.width,y:(e.clientY-box.top)*c.height/box.height};}
 c.addEventListener('pointerdown',e=>{if(e.isPrimary===false||e.button!==0||formationPointer!==null)return;e.preventDefault();const p=point(e),bodies=formationPreviewBodies();const n=bodies.map((b,i)=>({b,i})).filter(({b})=>KanjiTraits.hitTest(b,p,22)).sort((a,b)=>Math.hypot(a.b.position.x-p.x,a.b.position.y-p.y)-Math.hypot(b.b.position.x-p.x,b.b.position.y-p.y))[0]?.i;if(n===undefined)return;formationSelected=n;formationPointer=e.pointerId;formationOffset={x:p.x-bodies[n].position.x,y:p.y-bodies[n].position.y};c.setPointerCapture(e.pointerId);drawFormation();});
 c.addEventListener('pointermove',e=>{if(e.pointerId!==formationPointer)return;e.preventDefault();const p=point(e),{r,center}=formationMetrics(),n=formationSelected;const next={x:(p.x-formationOffset.x-center.x)/r,y:(p.y-formationOffset.y-center.y)/r,angle:formationDraft[n].angle};const result=KanjiFormation.move(formationItems,formationDraft,n,next);if(result){formationDraft=result;document.getElementById('formation-hint').textContent='配置を変更しました。保存先を選んでください。';drawFormation();}else document.getElementById('formation-hint').textContent='自陣の内側・コマが重ならない場所に配置してください。';});
 const cancel=()=>{const id=formationPointer;formationPointer=null;if(id!==null&&c.hasPointerCapture(id))c.releasePointerCapture(id);};c.addEventListener('pointerup',cancel);c.addEventListener('pointercancel',cancel);c.addEventListener('lostpointercapture',()=>formationPointer=null);window.addEventListener('resize',()=>{cancel();requestAnimationFrame(resizeFormation);});new ResizeObserver(resizeFormation).observe(c);
});
