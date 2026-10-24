(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiCpuDifficulty=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const profiles={
  normal:{name:'通常',tiers:[1],minLevel:1,levelRatio:.9,rubies:1,angles:[0,-.07,.07],powers:[.012,.022,.034],spinCandidates:[],beam:0,description:'JIS第1水準中心。自分の平均Lv.の約90%（最低Lv.1、上限Lv.150）。回転なしで安全な発射を優先する、練習向けのCPUです。'},
  hard:{name:'強敵',tiers:[2,3],minLevel:15,levelRatio:1.3,rubies:1,angles:[0,-.07,.07,-.14,.14],powers:[.012,.022,.034,.046,.055],spinCandidates:[-.8,.8],beam:3,description:'JIS第2水準・JIS第3水準。自分の平均Lv.の約130%（最低Lv.15、上限Lv.150）。回転も試し、端にいるコマを狙う強敵です。'},
  boss:{name:'漢字王',tiers:[4],minLevel:30,levelRatio:1.5,rubies:2,angles:[0,-.07,.07,-.14,.14,-.24,.24],powers:[.012,.022,.034,.046,.055,.065],spinCandidates:[-.8,.8,-1.2,1.2,-2.2,2.2],beam:6,description:'JIS第4水準。自分の平均Lv.の約150%（最低Lv.30、上限Lv.150）。ルビを最大2個装備し、強い回転・多方向の狙いを使う最高難度です。'}
 };
 const get=id=>profiles[id]||profiles.normal;
 function enemyLevel(id,team){const p=get(id),average=(team||[]).reduce((sum,i)=>sum+(Number(i.level)||1),0)/Math.max(1,(team||[]).length);return Math.max(p.minLevel,Math.min(150,Math.round(average*p.levelRatio)));}
 return {profiles,get,enemyLevel};
});
