(function(){
 'use strict';
 function normalizeClose(button){const text=button.textContent.trim();if(!['×','閉じる','戻る'].includes(text))return;if(!button.getAttribute('aria-label')){const title=button.parentElement.querySelector('h2,h3')?.textContent.trim()||'画面';button.setAttribute('aria-label',title+'を閉じる');}button.classList.add('ui-dialog-close');if(text!=='×')button.textContent='×';button.type='button';}
 window.addEventListener('load',()=>{
  for(const header of document.querySelectorAll('.editor-title')){const normalize=()=>{for(const button of header.querySelectorAll(':scope > button'))normalizeClose(button);};normalize();new MutationObserver(normalize).observe(header,{childList:true,subtree:true,characterData:true});}
  const sortRefreshers=[];
  for(const id of ['collection-sort','practice-filter-sort','friend-filter-sort','fragment-filter-sort']){const select=document.getElementById(id);if(!select)continue;const note=document.createElement('small');note.className='ui-sort-note';note.textContent='JIS範囲外の元素文字は末尾に表示';select.after(note);const refresh=()=>{note.hidden=!['jis','jis_desc','jis_asc'].includes(select.value);};select.addEventListener('change',refresh);sortRefreshers.push(refresh);refresh();}
  document.addEventListener('click',()=>{for(const refresh of sortRefreshers)refresh();});
 });
})();
