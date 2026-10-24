'use strict';
let deckSwipe=null,deckSwipeIgnoreUntil=0;
const deckMotionReduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function deckPositions(container){return new Map([...container.querySelectorAll('.deck-slot-card')].map(card=>[card.querySelector('[data-deck-detail]')?.dataset.deckDetail,card.getBoundingClientRect()]));}
function settleDeckCard(card){
 const transform=card.style.transform;card.style.transform='';
 if(transform&&!deckMotionReduced())card.animate([{transform},{transform:'none'}],{duration:180,easing:'cubic-bezier(.2,.7,.2,1)'});
}
function stopDeckSwipe(settle=false){
 if(!deckSwipe)return;const {card,pointer,container}=deckSwipe;deckSwipe=null;
 container.querySelectorAll('.deck-slot-card').forEach(c=>{if(settle)settleDeckCard(c);else c.style.transform='';c.classList.remove('deck-swiping','deck-swap-target');});
 if(card.hasPointerCapture(pointer))card.releasePointerCapture(pointer);
}
window.moveDeckSlot=(index,next)=>{
 if(!Number.isInteger(index)||!Number.isInteger(next)||index===next||index<0||next<0||index>=gameState.deck.length||next>=gameState.deck.length)return false;
 const container=document.getElementById('deck-slots-container'),positions=deckPositions(container);stopDeckSwipe();
 const [item]=gameState.deck.splice(index,1);gameState.deck.splice(next,0,item);saveState();renderDeckSlots();updateBattleDeckSummary();
 if(!deckMotionReduced())container.querySelectorAll('.deck-slot-card').forEach(card=>{
  const before=positions.get(card.querySelector('[data-deck-detail]')?.dataset.deckDetail),after=card.getBoundingClientRect();if(!before)return;
  card.animate([{transform:`translate(${before.x-after.x}px,${before.y-after.y}px)`},{transform:'none'}],{duration:200,easing:'cubic-bezier(.2,.7,.2,1)'});
 });
 const chars=gameState.deck.map(id=>gameState.inventory.find(i=>i.instanceId===id)?.char||'');document.getElementById('deck-order-status').textContent='並び順：'+chars.join(' → ');return true;
};
window.swapAdjacentDeck=(index,direction)=>[-1,1].includes(direction)&&moveDeckSlot(index,index+direction);
function deckDropTarget(d,dx){const cards=[...d.container.querySelectorAll('.deck-slot-card')],center=d.card.offsetLeft+d.card.offsetWidth/2+dx;let next=d.index,best=Infinity;for(const card of cards){const distance=Math.abs(center-card.offsetLeft-card.offsetWidth/2);if(distance<best){best=distance;next=Number(card.dataset.deckSlot);}}return next;}
window.bindDeckReordering=container=>{
 if(container.dataset.swipeBound)return;container.dataset.swipeBound='true';
 container.addEventListener('click',e=>{if(performance.now()<deckSwipeIgnoreUntil){deckSwipeIgnoreUntil=0;e.preventDefault();e.stopImmediatePropagation();}},true);
 container.addEventListener('pointerdown',e=>{
  if(e.isPrimary===false||e.button!==0||deckSwipe)return;deckSwipeIgnoreUntil=0;
  if(e.target.closest('.deck-remove,[data-deck-replace-slot]'))return;
  const card=e.target.closest('.deck-slot-card');if(!card)return;
  container.querySelectorAll('.deck-slot-card').forEach(c=>c.getAnimations().forEach(a=>a.finish()));
  deckSwipe={card,container,index:Number(card.dataset.deckSlot),pointer:e.pointerId,x:e.clientX,y:e.clientY,dx:0,dy:0,dragging:false};
 });
 window.addEventListener('pointermove',e=>{
  if(e.pointerId!==deckSwipe?.pointer)return;const d=deckSwipe;d.dx=e.clientX-d.x;d.dy=e.clientY-d.y;
  if(d.scrolling)return;
  if(!d.dragging){
   if(Math.abs(d.dy)>8&&Math.abs(d.dy)>Math.abs(d.dx)){d.scrolling=true;return;}
   if(Math.abs(d.dx)<8||Math.abs(d.dx)<Math.abs(d.dy)*1.2)return;
   d.dragging=true;d.card.setPointerCapture(e.pointerId);d.card.classList.add('deck-swiping');
  }
  e.preventDefault();const next=deckDropTarget(d,d.dx),target=container.querySelector(`[data-deck-slot="${next}"]`);d.target=next;
  const left=container.querySelector('[data-deck-slot="0"]').offsetLeft-d.card.offsetLeft,right=container.querySelector(`[data-deck-slot="${gameState.deck.length-1}"]`).offsetLeft-d.card.offsetLeft;
  d.card.style.transform=`translateX(${Math.max(left-12,Math.min(right+12,d.dx))}px)`;
  container.querySelectorAll('.deck-slot-card').forEach(c=>{if(c===d.card)return;const i=Number(c.dataset.deckSlot),shift=next>d.index&&i>d.index&&i<=next?-1:next<d.index&&i<d.index&&i>=next?1:0,neighbor=container.querySelector(`[data-deck-slot="${i+shift}"]`);c.style.transform=shift&&neighbor?`translateX(${neighbor.offsetLeft-c.offsetLeft}px)`:'';c.classList.toggle('deck-swap-target',c===target&&next!==d.index);});
 },{passive:false});
 window.addEventListener('pointerup',e=>{
  if(e.pointerId!==deckSwipe?.pointer)return;const d=deckSwipe,dx=e.clientX-d.x,dy=e.clientY-d.y;
  if(!d.dragging){stopDeckSwipe();return;}
  deckSwipeIgnoreUntil=performance.now()+500;e.preventDefault();
  const threshold=Math.max(24,Math.min(40,d.card.offsetWidth*.3));
  if(Math.abs(dx)>=threshold&&Math.abs(dx)>Math.abs(dy)*1.2&&moveDeckSlot(d.index,deckDropTarget(d,dx)))return;
  stopDeckSwipe(true);
 });
 window.addEventListener('pointercancel',e=>{if(e.pointerId===deckSwipe?.pointer){if(deckSwipe.dragging)deckSwipeIgnoreUntil=performance.now()+500;stopDeckSwipe(true);}});
 // Touch starts with implicit capture on the glyph/button. Transferring it to
 // the card also fires lostpointercapture on that child; keep the gesture alive.
 container.addEventListener('lostpointercapture',e=>{if(e.pointerId===deckSwipe?.pointer&&e.target===deckSwipe.card)stopDeckSwipe(true);});
 container.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)||!e.target.matches('.deck-slot-card'))return;e.preventDefault();const index=Number(e.target.dataset.deckSlot),next=e.key==='Home'?0:e.key==='End'?gameState.deck.length-1:index+(e.key==='ArrowLeft'?-1:1);if(moveDeckSlot(index,next))container.querySelector(`[data-deck-slot="${next}"]`).focus();});
};
window.addEventListener('resize',()=>stopDeckSwipe());document.addEventListener('visibilitychange',()=>{if(document.hidden)stopDeckSwipe();});
