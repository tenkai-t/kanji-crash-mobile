(function(root,factory){const api=factory(root.KanjiAdventureContent||(typeof require==='function'?require('./adventure-content.js'):null),root.KanjiElementCharacters||(typeof require==='function'?require('./element-characters.js'):null),root.KanjiFishCharacters||(typeof require==='function'?require('./fish-characters.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiHonors=api;})(typeof window!=='undefined'?window:globalThis,function(content,ElementCharacters,FishCharacters){
 'use strict';
 const catalogue=Object.freeze([
  {id:'jade',name:'翡翠・細輪',condition:'中級の初回試験合格',key:'highestCpuRank',value:1,tile:0},
  {id:'sapphire',name:'青藍・冠線',condition:'達人の初回試験合格',key:'highestCpuRank',value:3,tile:1},
  {id:'sovereign',name:'王印・金環',condition:'漢字王の初回試験合格',key:'highestCpuRank',value:4,tile:2},
  {id:'phoenix',name:'朱雀・翼線',condition:'強敵連戦で3連勝',key:'bestEndless',value:3,tile:3},
  {id:'dragon',name:'紅蓮・龍紋',condition:'強敵連戦で10連勝',key:'bestEndless',value:10,tile:4},
  {id:'sun',name:'暁・陽刻',condition:'上級の初回試験合格',key:'highestCpuRank',value:2},
  {id:'lotus',name:'紫苑・蓮線',condition:'最高3,000 段位ポイントに到達',key:'highestRating',value:3000,legacyKey:'legacyRating',legacyValue:2000},
  {id:'moon',name:'宵月・黒銀',condition:'最高5,000 段位ポイントに到達',key:'highestRating',value:5000,legacyKey:'legacyRating',legacyValue:2400},
  {id:'tiger',name:'白虎・銀紋',condition:'強敵連戦で5連勝',key:'bestEndless',value:5},
  {id:'ocean',name:'深海・波線',condition:'強敵連戦で20連勝',key:'bestEndless',value:20},
  {id:'emperor',name:'帝印・金彫',condition:'最高10,000 段位ポイントに到達',key:'highestRating',value:10000,legacyKey:'legacyRating',legacyValue:3000},
  {id:'cosmos',name:'星河・細環',condition:'最高20,000 段位ポイントに到達',key:'highestRating',value:20000,legacyKey:'legacyRating',legacyValue:4000},
  {id:'azure-dragon',name:'蒼龍・青銀',condition:'強敵連戦で50連勝',key:'bestEndless',value:50},
  {id:'eternal-dragon',name:'永劫・双環',condition:'強敵連戦で100連勝',key:'bestEndless',value:100},
  {id:'collector-leaf',name:'若葉・青磁',condition:'収集ミッションの報酬を2種類受け取る',key:'completedCollections',value:2,atlas:'collection'},
  {id:'collector-star',name:'探究・桜枝',condition:'収集ミッションの報酬を5種類受け取る',key:'completedCollections',value:5,atlas:'collection'},
  {id:'collector-crown',name:'蒐集・刻印',condition:'収集ミッションの報酬を8種類受け取る',key:'completedCollections',value:8,atlas:'collection'},
  {id:'ink-gold',name:'墨金',condition:'文字を30種類発見',key:'collectedCharacters',value:30},
  {id:'ceramic',name:'青磁',condition:'水・木属性の文字を各10種類発見',key:'collectedWater',value:10,requires:{collectedWood:10}},
  {id:'sakura-haze',name:'桜霞',condition:'収集ミッション報酬を5種類受取',key:'completedCollections',value:5},
  {id:'kintsugi',name:'金継ぎ',condition:'条件付きチャレンジを全6種類達成',key:'clearedConditions',value:6},
  {id:'moon-white',name:'月白',condition:'「全員で帰還」を10回達成',key:'intactClears',value:10},
  {id:'meteor',name:'流星',condition:'一撃チャレンジを全3種類達成',key:'clearedOneShots',value:3},
  {id:'master-seal',name:'極印',condition:'収集報酬8種類・条件6種類・一撃3種類を達成',key:'completedCollections',value:8,requires:{clearedConditions:6,clearedOneShots:3}}
,
{id:'online-rp-1400',name:'対人・青銅',condition:'統一戦・自由戦のいずれかで最高1,400対人RPに到達（解放後は永久保持）',key:'highestOnlineRP',value:1400},{id:'online-rp-1600',name:'対人・白銀',condition:'統一戦・自由戦のいずれかで最高1,600対人RPに到達（解放後は永久保持）',key:'highestOnlineRP',value:1600},{id:'online-rp-1800',name:'対人・黄金',condition:'統一戦・自由戦のいずれかで最高1,800対人RPに到達（解放後は永久保持）',key:'highestOnlineRP',value:1800},{id:'online-rp-2000',name:'対人・白金',condition:'統一戦・自由戦のいずれかで最高2,000対人RPに到達（解放後は永久保持）',key:'highestOnlineRP',value:2000},{id:'online-rp-2200',name:'対人・星冠',condition:'統一戦・自由戦のいずれかで最高2,200対人RPに到達（解放後は永久保持）',key:'highestOnlineRP',value:2200},{id:'online-rp-2600',name:'対人・極王',condition:'統一戦・自由戦のいずれかで最高2,600対人RPに到達（解放後は永久保持）',key:'highestOnlineRP',value:2600},
{id:'online-balanced-rp-1400',name:'統一・青銅',condition:'統一戦で最高1,400対人RPに到達（解放後は永久保持）',key:'highestBalancedRP',value:1400},
{id:'online-balanced-rp-1600',name:'統一・白銀',condition:'統一戦で最高1,600対人RPに到達（解放後は永久保持）',key:'highestBalancedRP',value:1600},
{id:'online-balanced-rp-1800',name:'統一・黄金',condition:'統一戦で最高1,800対人RPに到達（解放後は永久保持）',key:'highestBalancedRP',value:1800},
{id:'online-balanced-rp-2000',name:'統一・白金',condition:'統一戦で最高2,000対人RPに到達（解放後は永久保持）',key:'highestBalancedRP',value:2000},
{id:'online-balanced-rp-2200',name:'統一・星冠',condition:'統一戦で最高2,200対人RPに到達（解放後は永久保持）',key:'highestBalancedRP',value:2200},
{id:'online-balanced-rp-2600',name:'統一・極王',condition:'統一戦で最高2,600対人RPに到達（解放後は永久保持）',key:'highestBalancedRP',value:2600},
{id:'online-free-rp-1400',name:'自由・青銅',condition:'自由戦で最高1,400対人RPに到達（解放後は永久保持）',key:'highestFreeRP',value:1400},
{id:'online-free-rp-1600',name:'自由・白銀',condition:'自由戦で最高1,600対人RPに到達（解放後は永久保持）',key:'highestFreeRP',value:1600},
{id:'online-free-rp-1800',name:'自由・黄金',condition:'自由戦で最高1,800対人RPに到達（解放後は永久保持）',key:'highestFreeRP',value:1800},
{id:'online-free-rp-2000',name:'自由・白金',condition:'自由戦で最高2,000対人RPに到達（解放後は永久保持）',key:'highestFreeRP',value:2000},
{id:'online-free-rp-2200',name:'自由・星冠',condition:'自由戦で最高2,200対人RPに到達（解放後は永久保持）',key:'highestFreeRP',value:2200},
{id:'online-free-rp-2600',name:'自由・極王',condition:'自由戦で最高2,600対人RPに到達（解放後は永久保持）',key:'highestFreeRP',value:2600},
{id:'codex-100',name:'百字・青環',condition:'文字を100種類発見',key:'collectedCharacters',value:100},
{id:'codex-500',name:'五百字・銀刻',condition:'文字を500種類発見',key:'collectedCharacters',value:500},
{id:'codex-1000',name:'千字・金環',condition:'文字を1,000種類発見',key:'collectedCharacters',value:1000},
{id:'codex-3000',name:'三千字・星冠',condition:'文字を3,000種類発見',key:'collectedCharacters',value:3000},
{id:'codex-5000',name:'五千字・双環',condition:'文字を5,000種類発見',key:'collectedCharacters',value:5000},
{id:'codex-10050',name:'万字・極印',condition:'文字を10,050種類発見',key:'collectedCharacters',value:10050},
{id:'codex-jis-1',name:'JIS第1水準・皆伝',condition:'JIS第1水準の文字を2,965種類発見（全種類）',key:'completedJis1',value:1},
{id:'codex-jis-2',name:'JIS第2水準・皆伝',condition:'JIS第2水準の文字を3,390種類発見（全種類）',key:'completedJis2',value:1},
{id:'codex-jis-3',name:'JIS第3水準・皆伝',condition:'JIS第3水準の文字を1,259種類発見（全種類）',key:'completedJis3',value:1},
{id:'codex-jis-4',name:'JIS第4水準・皆伝',condition:'JIS第4水準の文字を2,436種類発見（全種類）',key:'completedJis4',value:1}
,
{id:'usage-single-10',name:'愛用の証',condition:'同じ所持文字を使って10勝（貸出文字は対象外）',key:'highestCharacterWins',value:10},
{id:'usage-single-50',name:'熟練の証',condition:'同じ所持文字を使って50勝（貸出文字は対象外）',key:'highestCharacterWins',value:50},
{id:'usage-single-100',name:'相棒の証',condition:'同じ所持文字を使って100勝（貸出文字は対象外）',key:'highestCharacterWins',value:100},
{id:'usage-single-300',name:'一字入魂',condition:'同じ所持文字を使って300勝（貸出文字は対象外）',key:'highestCharacterWins',value:300},
{id:'usage-variety-10',name:'多彩の証',condition:'10種類の所持文字を使って、それぞれ3勝（貸出文字は対象外）',key:'charactersWithThreeWins',value:10},
{id:'usage-variety-30',name:'百花の証',condition:'30種類の所持文字を使って、それぞれ3勝（貸出文字は対象外）',key:'charactersWithThreeWins',value:30},
{id:'usage-variety-100',name:'万字の使い手',condition:'100種類の所持文字を使って、それぞれ3勝（貸出文字は対象外）',key:'charactersWithThreeWins',value:100}
,
{id:'rank-gilded-cloud',name:'天翔・金雲',condition:'最高50,000 段位ポイントに到達',key:'highestRating',value:50000},
{id:'rank-eternal-crown',name:'無極・宝冠',condition:'最高100,000 段位ポイントに到達',key:'highestRating',value:100000}
,
{id:'element-30',name:'元素入門',condition:'元素文字を30種類発見',key:'collectedElements',value:30},
{id:'element-60',name:'元素探究者',condition:'元素文字を60種類発見',key:'collectedElements',value:60},
{id:'element-90',name:'元素研究家',condition:'元素文字を90種類発見',key:'collectedElements',value:90},
{id:'element-complete',name:'元素博士',condition:'元素文字を118種類発見（全種類）',key:'collectedElements',value:118}
,
{id:'fish-10',name:'小魚・銀波',condition:'魚偏の文字を10種類発見',key:'collectedFish',value:10},
{id:'fish-30',name:'群魚・青潮',condition:'魚偏の文字を30種類発見',key:'collectedFish',value:30},
{id:'fish-60',name:'錦鱗・彩波',condition:'魚偏の文字を60種類発見',key:'collectedFish',value:60},
{id:'fish-100',name:'大海・金鱗',condition:'魚偏の文字を100種類発見',key:'collectedFish',value:100},
{id:'fish-complete',name:'海淵・万鱗',condition:'魚偏の文字を153種類発見（全種類）',key:'collectedFish',value:153}
 ].map((item,index)=>Object.freeze({...item,tile:index%6,atlas:item.atlas??Math.floor(index/6)})));
 function groups(){
  const definitions=[['段位の初回試験',i=>i.key==='highestCpuRank'],['段位ポイント',i=>i.key==='highestRating'],['対人RP・統一',i=>i.key==='highestBalancedRP'],['対人RP・自由',i=>i.key==='highestFreeRP'],['以前の対人RP共通枠',i=>i.key==='highestOnlineRP'],['強敵連戦',i=>i.key==='bestEndless'],['文字の使用実績・一文字',i=>i.key==='highestCharacterWins'],['文字の使用実績・多彩',i=>i.key==='charactersWithThreeWins'],['文字図鑑・発見数',i=>i.key==='collectedCharacters'],['JIS水準コンプリート',i=>i.key.startsWith('completedJis')],['元素文字・収集',i=>i.key==='collectedElements'],['魚偏の文字・収集',i=>i.key==='collectedFish'],['収集ミッション・属性収集',i=>['completedCollections','collectedWater'].includes(i.key)&&i.id!=='master-seal'],['条件付き・一撃チャレンジ',i=>['clearedConditions','clearedOneShots','intactClears'].includes(i.key)||i.id==='master-seal']];
  return definitions.map(([name,matches])=>{const items=catalogue.filter(matches),keys=[...new Set(items.map(i=>i.key))];items.sort((a,b)=>keys.indexOf(a.key)-keys.indexOf(b.key)||a.value-b.value);return {name,items};});
 }
 const limits={...Object.fromEntries((typeof require==='function'?require('./medal-rules.js'):globalThis.KanjiMedals).keys.map(k=>[k,k.startsWith('trialTheme')?100:1000000000])),collectedFish:153,collectedElements:118,ratingRewardVersion:1,legacyRating:1000000000,highestCharacterWins:1000000000,charactersWithThreeWins:10142,highestTrialLevel:100,legacyTrialWins:1000000,legacyTrialStreak:1000000,trialRewardVersion:1,highestOnlineRP:1000000000,highestBalancedRP:1000000000,highestFreeRP:1000000000,completedJis1:1,completedJis2:1,completedJis3:1,completedJis4:1,highestCpuRank:4,cpuPromotionVersion:1,highestRating:1000000000,bestEndless:1000000,trialWins:1000000,bestTrialStreak:1000000,completedCollections:content.missions.length,collectedCharacters:10142,collectedWater:10142,collectedWood:10142,clearedConditions:6,clearedOneShots:3,intactClears:1000000000};
 const get=id=>catalogue.find(i=>i.id===id)||null;
 function validProgress(p){return !!p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(limits).every(k=>p[k]===undefined||(Number.isInteger(p[k])&&p[k]>=0&&p[k]<=limits[k]));}
 function progress(p){p={...p,ratingRewardVersion:1,legacyRating:p?.ratingRewardVersion===1?p.legacyRating:Math.max(p?.legacyRating||0,p?.highestRating||0),trialRewardVersion:1,legacyTrialWins:p?.trialRewardVersion===1?p.legacyTrialWins:Math.max(p?.legacyTrialWins||0,p?.trialWins||0),legacyTrialStreak:p?.trialRewardVersion===1?p.legacyTrialStreak:Math.max(p?.legacyTrialStreak||0,p?.bestTrialStreak||0)};return Object.fromEntries(Object.entries(limits).map(([k,max])=>[k,Number.isFinite(p?.[k])?Math.max(0,Math.min(max,Math.floor(p[k]))):0]));}
 function merge(...items){return items.map(progress).reduce((a,p)=>Object.fromEntries(Object.keys(limits).map(k=>[k,Math.max(a[k],p[k])])),progress());}
 function fromState(state,bases=[]){const found=new Set([...(state?.characterDiscoveries||[]),...(state?.inventory||[]).map(i=>i.char)]),attrs=new Map([...bases,...(state?.inventory||[]).filter(i=>i.attr)].map(i=>[i.char,i.attr])),records=state?.playProgress?.challenges||{},conditions=['first-tier','few-strokes','one-element','no-ruby','intact','swift'],shots=['shot-chain','shot-fan','shot-row'];return merge(state?.iconProgress,{...(typeof require==='function'?require('./medal-rules.js'):globalThis.KanjiMedals).progress(state),collectedFish:FishCharacters.summary(state).found,collectedElements:ElementCharacters.summary(state).found,ratingRewardVersion:1,legacyRating:state?.iconProgress?.ratingRewardVersion===1?state.iconProgress.legacyRating:Math.max(state?.rating||0,state?.iconProgress?.highestRating||0),highestCharacterWins:Math.max(0,...Object.values(state?.playProgress?.usage||{}).map(v=>v.honorWins||0)),charactersWithThreeWins:Object.values(state?.playProgress?.usage||{}).filter(v=>(v.honorWins||0)>=3).length,...Object.fromEntries([1,2,3,4].map(jis=>{const tier=bases.filter(i=>i.jis===jis);return ['completedJis'+jis,tier.length&&tier.every(i=>found.has(i.char))?1:0];})),cpuPromotionVersion:1,highestCpuRank:state?.cpuPromotions?.unlocked??((state?.iconProgress?.highestRating>0&&state.iconProgress.ratingRewardVersion!==1?[1400,1800,2200,2600]:[3000,5000,10000,20000]).filter(n=>n<=Math.max(state?.rating||0,state?.iconProgress?.highestRating||0)).length),highestRating:state?.rating,bestEndless:state?.endlessBest,highestTrialLevel:state?.specialTrialLevelBest,trialRewardVersion:1,legacyTrialWins:state?.iconProgress?.trialRewardVersion===1?state.iconProgress.legacyTrialWins:state?.specialTrialWins,legacyTrialStreak:state?.iconProgress?.trialRewardVersion===1?state.iconProgress.legacyTrialStreak:state?.specialTrialBest,trialWins:state?.specialTrialWins,bestTrialStreak:state?.specialTrialBest,completedCollections:state?.collectionClaims?.length,collectedCharacters:found.size,collectedWater:[...found].filter(c=>attrs.get(c)==='water').length,collectedWood:[...found].filter(c=>attrs.get(c)==='wood').length,clearedConditions:conditions.filter(id=>records[id]?.clears>0).length,clearedOneShots:shots.filter(id=>records[id]?.clears>0).length,intactClears:records.intact?.clears});}
 function canUse(id,p){const item=get(id),v=progress(p);if(!p?.cpuPromotionVersion)v.highestCpuRank=Math.max(v.highestCpuRank,[1400,1800,2200,2600].filter(n=>n<=v.highestRating).length);return !!item&&(v[item.key]>=item.value||item.legacyKey&&v[item.legacyKey]>=item.legacyValue)&&Object.entries(item.requires||{}).every(([key,value])=>v[key]>=value);}
 function status(item,p){const v=progress(p),n=v[item.key];if(['collectedElements','collectedFish'].includes(item.key))return `発見 ${n} / ${item.value} 種類`+(canUse(item.id,v)?'・解放済み':'');if(canUse(item.id,v))return '解放済み';if(item.key==='highestCharacterWins')return `最多勝利 ${n} / ${item.value} 回`;if(item.key==='charactersWithThreeWins')return `3勝した文字 ${n} / ${item.value} 種類`;if(item.requires){return Object.entries({[item.key]:item.value,...item.requires}).map(([key,target])=>`${{collectedWater:'水',collectedWood:'木',completedCollections:'収集',clearedConditions:'条件',clearedOneShots:'一撃'}[key]} ${v[key]} / ${target}`).join('・');}return item.key==='highestTrialLevel'?`最高勝利 Lv.${n} / Lv.${item.value}`:['highestBalancedRP','highestFreeRP'].includes(item.key)?`最高 ${n.toLocaleString()} / ${item.value.toLocaleString()} 対人RP（${item.key==='highestBalancedRP'?'統一':'自由'}）`:item.key==='highestOnlineRP'?`最高 ${n.toLocaleString()} / ${item.value.toLocaleString()} 対人RP（統一・自由共通）`:item.key==='highestCpuRank'?`初回昇格試験 ${n} / ${item.value} 段階`:item.key==='completedCollections'?`受取 ${n} / ${item.value} 種類`:item.key==='highestRating'?`最高 ${n.toLocaleString()} / ${item.value.toLocaleString()} 段位ポイント`:['bestEndless','bestTrialStreak'].includes(item.key)?`最高 ${n} / ${item.value} 連勝`:item.key==='trialWins'?`勝利 ${n} / ${item.value} 回`:item.key==='intactClears'?`達成 ${n} / ${item.value} 回`:`達成 ${n} / ${item.value} 種類`;}
 function validSave(state){return (state.specialThemeProgress===undefined||(typeof require==='function'?require('./special-trial-themes.js'):globalThis.KanjiTrialThemes).validProgress(state.specialThemeProgress))&&(state.medalProgress===undefined||(typeof require==='function'?require('./medal-rules.js'):globalThis.KanjiMedals).valid(state.medalProgress))&&(state.specialTrialLevelBest===undefined||Number.isInteger(state.specialTrialLevelBest)&&state.specialTrialLevelBest>=0&&state.specialTrialLevelBest<=100)&&(state.iconProgress===undefined||validProgress(state.iconProgress))&&(state.specialTrialWins===undefined||(Number.isInteger(state.specialTrialWins)&&state.specialTrialWins>=0&&state.specialTrialWins<=limits.trialWins))&&(state.specialTrialBest===undefined||(Number.isInteger(state.specialTrialBest)&&state.specialTrialBest>=0&&state.specialTrialBest<=limits.bestTrialStreak));}
 return {retiredIds:['celestial','prism','sanctuary','trial-crown'],catalogue,groups,get,progress,merge,fromState,canUse,status,validProgress,validSave};
});
