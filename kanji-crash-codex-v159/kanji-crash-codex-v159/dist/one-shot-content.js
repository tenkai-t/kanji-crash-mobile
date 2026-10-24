(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiOneShotContent=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 // Append stages with new permanent IDs. Existing IDs retain clears and first rewards.
 const definitions={version:1,stages:[
  {id:'shot-chain',name:'一撃・縦の連鎖',group:'基本',condition:'縦に並んだ相手3体を1回の発射で落とす',reward:250,points:[{x:0,y:.30},{x:0,y:.57},{x:0,y:.84}]},
  {id:'shot-fan',name:'一撃・三角の陣',group:'基本',condition:'三角形に並んだ相手3体を1回の発射で落とす',reward:350,points:[{x:0,y:.40},{x:-.25,y:.73},{x:.25,y:.73}]},
  {id:'shot-row',name:'一撃・横の壁',group:'基本',condition:'横に並んだ相手3体を1回の発射で落とす',reward:450,points:[{x:-.30,y:.72},{x:0,y:.72},{x:.30,y:.72}]},
  {id:'shot-oblique',name:'一撃・斜めの連鎖',group:'配置の工夫',condition:'斜めに並んだ相手3体を1回の発射で落とす',hint:'左側から斜めに通る道を探そう。開始位置とコマの向きが鍵。',positioning:true,reward:600,points:[{x:-.28,y:.18},{x:-.02,y:.44},{x:.24,y:.70}]},
  {id:'shot-left',name:'一撃・左端の縦列',group:'配置の工夫',condition:'左に寄った相手3体を1回の発射で落とす',hint:'相手の列に合わせて位置を変え、押し出す方向を考えよう。',positioning:true,enemies:['小','小','小'],reward:650,points:[{x:-.48,y:.17},{x:-.48,y:.43},{x:-.48,y:.69}]},
  {id:'shot-iron',name:'一撃・鉄の連鎖',group:'高難度',condition:'重い鐵3体を1回の発射で落とす',hint:'目安Lv.50以上。威力だけでなく重量・装備ルビも強化しよう。',positioning:true,playerLevel:'owned',enemyLevel:30,enemies:['鐵','鐵','鐵'],reward:1000,points:[{x:0,y:.18},{x:0,y:.48},{x:0,y:.78}]},
  {id:'shot-fortress',name:'一撃・鋼鉄の横陣',group:'超高難度',condition:'鋼鉄の横陣3体を1回の発射で落とす',hint:'目安Lv.80以上。幅のある形や回転を活かし、一度に複数へ当てよう。',positioning:true,playerLevel:'owned',enemyLevel:50,enemies:['鐵','鋼','鐵'],reward:1500,points:[{x:-.30,y:.70},{x:0,y:.70},{x:.30,y:.70}]},
  {id:'shot-sovereign',name:'一撃・王座の三文字',group:'極級',condition:'JIS第4水準の精鋭3体を1回の発射で落とす',hint:'目安Lv.100・複数ルビ装備。文字の形・特性・属性相性も組み合わせよう。',positioning:true,playerLevel:'owned',enemyLevel:65,enemies:['灩','籰','鸙'],reward:2500,points:[{x:0,y:.26},{x:-.25,y:.66},{x:.25,y:.66}]}
 ]};
 function create(data){
  if(!Number.isSafeInteger(data?.version)||data.version<1||!Array.isArray(data.stages)||!data.stages.length)throw Error('one-shot content');
  const ids=new Set(),stages=data.stages.map(raw=>{
   const c={kind:'one-shot',playerLevel:10,enemyLevel:10,enemyMultiplier:1,enemies:['丁','丁','丁'],positioning:false,...raw};
   if(!/^shot-[a-z0-9-]{1,58}$/.test(c.id)||ids.has(c.id))throw Error('one-shot ID');ids.add(c.id);
   if(['name','group','condition'].some(k=>typeof c[k]!=='string'||!c[k])||c.hint!==undefined&&typeof c.hint!=='string'||!Number.isSafeInteger(c.reward)||c.reward<0||typeof c.positioning!=='boolean'||c.playerLevel!=='owned'&&(!Number.isInteger(c.playerLevel)||c.playerLevel<1||c.playerLevel>100)||!Number.isInteger(c.enemyLevel)||c.enemyLevel<1||c.enemyLevel>100||!Number.isFinite(c.enemyMultiplier)||c.enemyMultiplier<1||c.enemyMultiplier>5)throw Error('one-shot rules');
   if(!Array.isArray(c.enemies)||c.enemies.length!==3||c.enemies.some(v=>typeof v!=='string'||Array.from(v).length!==1)||!Array.isArray(c.points)||c.points.length!==3||c.points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.y<=0||Math.hypot(p.x,p.y)>.95||p.angle!==undefined&&(!Number.isFinite(p.angle)||Math.abs(p.angle)>Math.PI)))throw Error('one-shot layout');
   return Object.freeze({...c,enemies:Object.freeze([...c.enemies]),points:Object.freeze(c.points.map(p=>Object.freeze({x:p.x,y:p.y,angle:p.angle||0})))});
  });return Object.freeze({version:data.version,stages:Object.freeze(stages)});
 }
 return Object.freeze({...create(definitions),create});
});
