'use strict';
let promotionViewKey='';
function renderPromotionTrials(){
 const box=document.getElementById('rank-trials');if(!box)return;const key=JSON.stringify([gameState.cpuPromotions,gameState.rating,KanjiPromotions.challenges.map(c=>gameState.playProgress?.challenges?.[c.id]?.clears||0)]);if(key===promotionViewKey)return;promotionViewKey=key;box.replaceChildren();const next=KanjiPromotions.next(gameState);
 for(const t of KanjiPromotions.tiers.slice(1)){
  const qualified=gameState.cpuPromotions.unlocked>=t.index,active=next?.index===t.index,eligible=KanjiPromotions.canChallenge(gameState,t.index),card=practiceNode('article','promotion-card');card.dataset.promotion=String(t.index);
  card.append(practiceNode('h4','',`${t.title}・${qualified?'初回試験合格済み':t.min+' 段位ポイントから挑戦'}`));
  if(qualified)card.append(practiceNode('p','inventory-note','合格済みの試練は何度でも再挑戦できます。獲得した段位は下がりません。'));
  else card.append(practiceNode('p','inventory-note',`必要段位ポイント ${Math.min(gameState.rating,t.min)} / ${t.min}${gameState.rating>=t.min?'・達成':''}`));
  for(const [kind,label]of [['boss',t.boss],['mission',t.mission]]){
   const done=KanjiPromotions.cleared(gameState,t.index,kind),button=practiceNode('button','inventory-action'+(kind==='mission'?' secondary':''),`${done||qualified?'再挑戦':kind==='boss'?'ボス':'ミッション'}：${label}`);button.type='button';button.dataset.promotionTrial=KanjiPromotions.trialId(t.index,kind);button.disabled=!KanjiPromotions.canChallenge(gameState,t.index,kind);button.onclick=()=>startPromotionTrial(t.index,kind);card.append(button);
  }
  card.append(practiceNode('p','inventory-note',t.condition));if(!qualified&&!active)card.append(practiceNode('p','inventory-note','前の段位を解放すると挑戦できます。'));else if(!qualified&&!eligible)card.append(practiceNode('p','inventory-note',`あと${t.min-gameState.rating} 段位ポイントで初回試験を開始できます。達成済みの試練は再挑戦できます。`));box.append(card);
 }
}
window.startPromotionTrial=(index,kind)=>{
 if(!KanjiPromotions.canChallenge(gameState,index,kind)){showToast('前の段位を解放し、必要段位ポイントを獲得してください。');return;}
 openPracticeChallenges(kind==='boss'?'promotion-boss':'promotion-mission');document.getElementById('modal-practice').dataset.promotion=String(index);renderPracticeChallenges();if(kind==='boss')initializeDeckFavorites().then(()=>{if(document.getElementById('modal-practice').dataset.kind==='promotion-boss')renderTrialFavorites();});
};
window.renderPromotionTrials=renderPromotionTrials;

function renderPromotionRankList(){const box=document.getElementById('cpu-rank-list');if(!box)return;box.replaceChildren(...KanjiPromotions.tiers.map((tier,n,tiers)=>{const row=document.createElement('article');row.className='cpu-rank-list-row';row.dataset.rankMin=String(tier.min);const title=document.createElement('h4'),icon=document.createElement('span');icon.className='rank-emblem small';KanjiRankEmblems.paint(icon,tier.min);title.append(icon,document.createTextNode(tier.title));const range=document.createElement('p');range.className='cpu-rank-range';range.textContent=tier.min.toLocaleString('ja-JP')+(tiers[n+1]?'〜'+(tiers[n+1].min-1).toLocaleString('ja-JP'):'以上')+' 段位ポイント';const note=document.createElement('p');note.className='inventory-note';note.textContent=n?'初回試験：'+tier.boss+'に勝利／'+tier.condition:'最初の段位';row.append(title,range,note);return row;}));}
renderPromotionRankList();
