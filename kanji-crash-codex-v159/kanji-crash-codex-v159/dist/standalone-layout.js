/* Viewport layout only. No save data or game state is changed. */
(()=>{
 const mode=window.matchMedia('(display-mode: standalone)');
 const update=()=>document.documentElement.classList.toggle('standalone-layout',mode.matches||navigator.standalone===true);
 update();if(mode.addEventListener)mode.addEventListener('change',update);else mode.addListener?.(update);
})();
