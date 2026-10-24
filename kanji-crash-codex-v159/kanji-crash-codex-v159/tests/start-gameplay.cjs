// Existing combat suites exercise battles after Start. Preparation itself is
// covered separately through actual taps in preparation-mobile.mjs.
module.exports=async page=>page.addInitScript(()=>{
 window.addEventListener('load',()=>queueMicrotask(()=>{
  const prepare=resetBattle;
  resetBattle=function(...args){prepare(...args);if(soloBattlePending&&soloPreview)document.getElementById('btn-battle-start').click();};
  if(soloBattlePending&&soloPreview)document.getElementById('btn-battle-start').click();
 }));
});
