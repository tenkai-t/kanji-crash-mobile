(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiPromotions=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const tiers=Object.freeze([
  {index:0,min:1000,title:'初級'},
  {index:1,min:3000,title:'中級',boss:'中級の門番',enemies:['山','川','林'],multiplier:1.10,conditionId:'first-tier',mission:'JIS第1水準の突破',condition:'自分3体をJIS第1水準だけで編成して勝利'},
  {index:2,min:5000,title:'上級',boss:'五行の守護者',enemies:['鐵','銕','龜'],multiplier:1.25,conditionId:'few-strokes',mission:'少画数の突破',condition:'自分3体の総画数を12画以下にして勝利'},
  {index:3,min:10000,title:'達人',boss:'鉄壁の達人',enemies:['神','淼','焰'],multiplier:1.40,conditionId:'intact',mission:'全員生還の証',condition:'自分3体とも生き残って勝利'},
  {index:4,min:20000,title:'漢字王',boss:'王座の漢字王',enemies:['灩','籰','鸙'],multiplier:1.55,conditionId:'all-killed',mission:'三文字の連携',condition:'自分3体がそれぞれ相手を1体以上落として勝利'}
 ].map(t=>Object.freeze(t)));
 const rawIndex=rp=>tiers.filter(t=>t.min<=rp).at(-1)?.index||0;
 const trialId=(index,kind)=>`rank-${index}-${kind}${kind==='mission'&&index===3?'-v4':kind==='mission'&&index===4?'-v3':''}`;
 const challenges=Object.freeze(tiers.slice(1).flatMap(t=>[
  {id:trialId(t.index,'boss'),name:t.boss,kind:'promotion-boss',rank:t.index,reward:0,enemies:t.enemies,multiplier:t.multiplier,condition:'段位ボスに勝利'},
  {id:trialId(t.index,'mission'),name:t.mission,kind:'promotion-mission',rank:t.index,reward:0,conditionId:t.conditionId,condition:t.condition,enemies:t.index===1?['山','川','林']:t.index===2?['鐵','巖','龜']:t.index===3?['盾','重','岩']:['龍','鳳','麒']}
 ]).map(Object.freeze));
 const legacyChallenges=[{id:'rank-3-mission-v3',kind:'promotion-legacy',name:'旧・三文字の連携',conditionId:'all-killed',reward:0},{id:'rank-4-mission-v2',kind:'promotion-legacy',name:'旧・全員生還の証',conditionId:'intact',reward:0},{id:'rank-3-mission-v2',kind:'promotion-legacy',name:'旧・三属性の戦術',conditionId:'three-elements',reward:0},{id:'rank-3-mission',kind:'promotion-legacy',name:'旧・全員生還の証',conditionId:'intact',reward:0},{id:'rank-4-mission',kind:'promotion-legacy',name:'旧・速攻の王道',conditionId:'swift',reward:0}];
 function validSave(s){return s.cpuPromotions===undefined||s.cpuPromotions&&s.cpuPromotions.version===1&&Number.isInteger(s.cpuPromotions.unlocked)&&s.cpuPromotions.unlocked>=0&&s.cpuPromotions.unlocked<=4;}
 function inherit(s,p){initialize(s);const unlocked=p?.cpuPromotionVersion? p.highestCpuRank||0:rawIndex(p?.highestRating||0);s.cpuPromotions.unlocked=Math.max(s.cpuPromotions.unlocked,unlocked);}
 function initialize(s){if(!s.cpuPromotions)s.cpuPromotions={version:1,unlocked:s.iconProgress?.cpuPromotionVersion?s.iconProgress.highestCpuRank||0:s.iconProgress?.highestRating>0&&s.iconProgress?.ratingRewardVersion!==1?[1400,1800,2200,2600].filter(n=>n<=Math.max(s.rating||0,s.iconProgress.highestRating)).length:rawIndex(Math.max(s.rating||0,s.iconProgress?.highestRating||0))};return s;}
 function cleared(s,index,kind){return (s.playProgress?.challenges?.[trialId(index,kind)]?.clears||0)>0;}
 function reconcile(s){initialize(s);const before=s.cpuPromotions.unlocked;for(const t of tiers.slice(before+1)){if(s.rating<t.min||!cleared(s,t.index,'boss')||!cleared(s,t.index,'mission'))break;s.cpuPromotions.unlocked=t.index;}return tiers.slice(before+1,s.cpuPromotions.unlocked+1);}
 function current(s){initialize(s);return tiers[s.cpuPromotions.unlocked];}
 function next(s){initialize(s);return tiers[s.cpuPromotions.unlocked+1]||null;}
 function canChallenge(s,index,kind){initialize(s);const tier=tiers[index],t=next(s);return !!tier&&index>0&&(index<=s.cpuPromotions.unlocked||!!kind&&cleared(s,index,kind)||!!t&&t.index===index&&s.rating>=t.min);}
 return {tiers,challenges,legacyChallenges,trialId,rawIndex,initialize,inherit,validSave,cleared,reconcile,current,next,canChallenge};
});
