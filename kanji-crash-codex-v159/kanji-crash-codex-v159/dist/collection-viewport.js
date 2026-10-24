(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiCollectionViewport=api;})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';const active=new WeakMap();
 function locate(prefix,y){let a=0,b=prefix.length-1;while(a<b){const m=Math.floor((a+b+1)/2);if(prefix[m]<=y)a=m;else b=m-1;}return Math.min(a,prefix.length-2);}
 function visibleRange(prefix,start,height,overscan=3){const rows=prefix.length-1;return {start:Math.max(0,locate(prefix,Math.max(0,start))-overscan),end:Math.min(rows,locate(prefix,Math.max(0,start+height))+1+overscan)};}
 function dispose(grid){active.get(grid)?.();active.delete(grid);}
 function mount(grid,items,build){dispose(grid);if(items.length<=120||typeof ResizeObserver==='undefined'){grid.replaceChildren();for(const item of items)grid.appendChild(build(item));return;}
  let scroller=grid.parentElement;while(scroller&&scroller!==document.body&&!/auto|scroll/.test(getComputedStyle(scroller).overflowY))scroller=scroller.parentElement;scroller=scroller||document.documentElement;
  const top=document.createElement('div'),bottom=document.createElement('div');for(const n of [top,bottom]){n.style.gridColumn='1 / -1';n.style.pointerEvents='none';n.setAttribute('aria-hidden','true');}
  const estimate=grid.id==='synthesis-selectable-grid'?140:420;let columns=0,gap=12,heights=[],prefix=[],rows=new Map(),scheduled=0,dead=false;
  const sizes=new ResizeObserver(entries=>{let changed=false;for(const entry of entries){const index=Number(entry.target.dataset.collectionRow),height=entry.target.getBoundingClientRect().height;if(Number.isInteger(index)&&height>0&&Math.abs((heights[index]||estimate)-height)>1){heights[index]=height;changed=true;}}if(changed)queue();});
  function queue(){if(!scheduled&&!dead)scheduled=requestAnimationFrame(update);}
  function update(){scheduled=0;if(dead)return;const style=getComputedStyle(grid),nextColumns=Math.max(1,style.gridTemplateColumns.split(/\s+/).filter(Boolean).length);gap=parseFloat(style.rowGap)||12;
   if(columns!==nextColumns){columns=nextColumns;heights=[];for(const row of rows.values())sizes.unobserve(row);rows.clear();grid.replaceChildren();}
   const count=Math.ceil(items.length/columns);prefix=[0];for(let r=0;r<count;r++)prefix.push(prefix[r]+(heights[r]||estimate)+gap);
   const box=grid.getBoundingClientRect(),view=scroller.getBoundingClientRect(),height=scroller.clientHeight||window.innerHeight||800,start=Math.max(0,view.top-box.top);const range=visibleRange(prefix,start,height);
   for(const [index,row]of rows)if(index<range.start||index>=range.end){sizes.unobserve(row);rows.delete(index);row.remove();}
   top.style.height=Math.max(0,prefix[range.start]-(range.start?gap:0))+'px';top.style.display=range.start?'block':'none';bottom.style.height=Math.max(0,prefix[count]-prefix[range.end]-(range.end<count?gap:0))+'px';bottom.style.display=range.end<count?'block':'none';
   if(!top.parentElement)grid.append(top);if(!bottom.parentElement)grid.append(bottom);
   let before=bottom;for(let index=range.end-1;index>=range.start;index--){let row=rows.get(index);if(!row){row=document.createElement('div');row.dataset.collectionRow=String(index);row.style.cssText='grid-column:1 / -1;display:grid;min-width:0;align-items:stretch';row.style.gridTemplateColumns=style.gridTemplateColumns;row.style.columnGap=style.columnGap;for(let n=index*columns;n<Math.min(items.length,(index+1)*columns);n++)row.appendChild(build(items[n]));rows.set(index,row);sizes.observe(row);}if(row.nextSibling!==before)grid.insertBefore(row,before);before=row;}
  }
  const resize=new ResizeObserver(queue);resize.observe(grid);scroller.addEventListener('scroll',queue,{passive:true});window.addEventListener('resize',queue);active.set(grid,()=>{dead=true;if(scheduled)cancelAnimationFrame(scheduled);scroller.removeEventListener('scroll',queue);window.removeEventListener('resize',queue);resize.disconnect();sizes.disconnect();rows.clear();});grid.replaceChildren();update();
 }
 return {mount,dispose,visibleRange,locate};
});
