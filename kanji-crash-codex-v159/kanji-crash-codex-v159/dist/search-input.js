(function(){
 'use strict';
 const selector='input[type="search"],input[type="text"],input:not([type]),textarea';let scheduled=false,previous=null,focusRegion=null,focusFilters=null,done=null,focusScope=null,hiddenBefore=[];
 function focused(){const input=document.activeElement;return input?.matches(selector)&&!input.disabled?input:null;}
 function clearRegion(){focusRegion?.classList.remove('search-focus-region');focusFilters?.classList.remove('search-focus-filters');focusRegion=null;focusFilters=null;focusScope?.classList.remove('search-focus-scope');focusScope=null;for(const n of hiddenBefore)n.classList.remove('search-before-input');hiddenBefore=[];}
 function scrollContainer(input){let scroll=input.parentElement;while(scroll&&scroll!==document.body){const overflow=getComputedStyle(scroll).overflowY;if(/auto|scroll/.test(overflow)&&scroll.scrollHeight>scroll.clientHeight)return scroll;scroll=scroll.parentElement;}return null;}
 function update(){
  scheduled=false;const input=focused(),root=document.documentElement,isSearch=!!input?.matches('input[type="search"]');root.classList.toggle('search-input-active',!!input);root.classList.toggle('search-filter-active',isSearch);
  if(!input){clearRegion();previous=null;if(done)done.hidden=true;root.style.removeProperty('--search-viewport-top');root.style.removeProperty('--search-viewport-height');return;}
  const viewport=window.visualViewport,top=viewport?.offsetTop||0,height=viewport?.height||window.innerHeight;root.style.setProperty('--search-viewport-top',top+'px');root.style.setProperty('--search-viewport-height',height+'px');
  if(input!==previous){clearRegion();previous=input;if(isSearch){focusRegion=input.closest('label,.owned-search')||input;focusRegion.classList.add('search-focus-region');focusFilters=input.closest('.practice-picker-filters');focusFilters?.classList.add('search-focus-filters');focusScope=scrollContainer(input)||input.closest('.editor-panel,.profile-shell,[id^="screen-"]');if(focusScope){focusScope.classList.add('search-focus-scope');for(let branch=input;branch&&branch!==focusScope;branch=branch.parentElement)for(let sibling=branch.previousElementSibling;sibling;sibling=sibling.previousElementSibling){sibling.classList.add('search-before-input');hiddenBefore.push(sibling);}}}}
  if(isSearch){if(!done){done=document.createElement('button');done.type='button';done.id='btn-search-input-done';done.className='search-input-done';done.textContent='入力を完了';done.setAttribute('aria-label','文字の検索を確定してキーボードを閉じる');done.addEventListener('pointerdown',e=>e.preventDefault());done.onclick=()=>{focused()?.blur();queue();};document.body.append(done);}done.hidden=false;}else if(done)done.hidden=true;
  const scroll=scrollContainer(input);if(!scroll)return;const bounds=scroll.getBoundingClientRect(),rect=input.getBoundingClientRect(),safeTop=Math.max(top+(isSearch?64:12),bounds.top+12),safeBottom=Math.min(top+height,bounds.bottom)-20;
  // Align search near the top so the matching characters remain visible below it.
  if(isSearch&&rect.top!==safeTop)scroll.scrollTop+=rect.top-safeTop;else if(rect.bottom>safeBottom)scroll.scrollTop+=rect.bottom-safeBottom;else if(rect.top<safeTop)scroll.scrollTop-=safeTop-rect.top;
 }
 function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(update);}
 document.addEventListener('focusin',event=>{if(event.target.matches(selector)){queue();setTimeout(queue,160);setTimeout(queue,360);}});document.addEventListener('focusout',()=>{setTimeout(queue,0);});window.addEventListener('resize',queue);window.visualViewport?.addEventListener('resize',queue);window.visualViewport?.addEventListener('scroll',queue);
})();
