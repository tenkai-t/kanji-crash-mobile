'use strict';
window.specialThemeSelection='link';
window.renderSpecialThemes=()=>{
 const box=document.getElementById('special-theme-picker');if(!box)return;
 const T=KanjiTrialThemes,level=Number(document.getElementById('special-start-level').value),themes=T.themesFor(KANJI_DATABASE);
 if(!themes.some(t=>t.id===specialThemeSelection))specialThemeSelection=themes[0]?.id;
 box.replaceChildren();
 for(const theme of themes){const progress=T.row(gameState,theme.id,level),allowed=T.canChallenge(gameState,theme.id,level,KANJI_DATABASE),button=document.createElement('button');button.type='button';button.className='special-theme-choice';button.dataset.theme=theme.id;button.setAttribute('aria-pressed',String(theme.id===specialThemeSelection));button.disabled=!allowed;const name=document.createElement('strong');name.textContent=theme.name;const chars=document.createElement('span');chars.textContent=theme.chars.join('・');const status=document.createElement('small');status.textContent=!allowed?'同Lv.の全テーマ勝利で解放':progress.intact&&progress.efficient?'追加目標も達成':progress.cleared?'クリア済み':'未クリア';button.append(name,chars,status);button.onclick=()=>{specialThemeSelection=theme.id;renderSpecialThemes();};box.append(button);}
 const theme=T.get(specialThemeSelection,KANJI_DATABASE),info=document.getElementById('special-theme-info');info.replaceChildren();if(!theme)return;
 const r=T.row(gameState,theme.id,level),heading=document.createElement('h4');heading.textContent='攻略のヒント';const hint=document.createElement('p');hint.textContent=theme.hint;const goals=document.createElement('p');goals.textContent=`追加目標：全員生還${r.intact?' ✓':''} ／ ${theme.shotTarget}発以内で勝利${r.efficient?' ✓':''}`;const reward=document.createElement('p');reward.textContent='Lv.10以上で銅・Lv.60以上で銀・Lv.100で金の攻略勲章。2つの追加目標は同じレベルの別の勝利で達成しても獲得できます。';info.append(heading,hint,goals,reward);
 const allowed=T.canChallenge(gameState,theme.id,level,KANJI_DATABASE),start=document.getElementById('btn-start-special');start.disabled=!allowed;start.textContent=`${theme.name}・Lv.${level}に挑む`;
 const basic=themes.filter(t=>!t.boss),clears=basic.filter(t=>T.row(gameState,t.id,level).cleared).length;document.getElementById('special-trial-best').textContent=`Lv.${level}：${clears}/${basic.length}テーマクリア`+(T.row(gameState,'boss',level).cleared?'・総合クリア':basic.every(t=>T.row(gameState,t.id,level).cleared)?'・総合試練 解放':'');
};
window.renderSpecialTrialResult=(winner,prior)=>{
 const run=specialChallenge,T=KanjiTrialThemes,row=T.row(gameState,run.themeId,run.difficultyLevel),survivors=playerBodies.filter(b=>!b.gameData.isOut).length,shots=usageBattle?.shots||0;
 let box=document.getElementById('special-result-goals');if(!box){box=document.createElement('section');box.id='special-result-goals';box.className='special-theme-info';document.getElementById('result-message').after(box);}box.hidden=false;box.replaceChildren();
 const current=document.createElement('p');current.textContent=`今回：${shots}発・自分${survivors}体生還`;const goals=document.createElement('p');goals.textContent=`追加目標の達成：全員生還 ${row.intact?'✓':'未達成'} ／ ${run.shotTarget}発以内 ${row.efficient?'✓':'未達成'}`;box.append(current,goals);
 const medals=KanjiTrialThemes.badges.filter(b=>!KanjiAvatarStyle.badgeUnlocked(b.id,prior)&&KanjiAvatarStyle.badgeUnlocked(b.id,gameState.iconProgress));if(medals.length){const reward=document.createElement('p');reward.className='special-medal-notice';reward.textContent='勲章を解放：'+medals.map(b=>b.name).join('・');box.append(reward);}
 const next=winner===true?T.nextTheme(run,gameState,KANJI_DATABASE):null,button=document.getElementById('btn-special-next');button.hidden=!next;button.textContent=next?`次へ：${next.name}`:'次の試練へ';document.getElementById('btn-special-retry').hidden=false;renderSpecialThemes();
};
window.retrySpecialBattle=()=>{if(!specialChallenge)return;specialChallenge.finished=false;specialChallenge.won=false;document.getElementById('modal-result').classList.add('hidden');document.getElementById('modal-battle-menu').classList.add('hidden');resetBattle(false,true);};
document.getElementById('special-start-level').value=String(KanjiTrialThemes.levels.includes(gameState.specialTrialSelectedLevel)?gameState.specialTrialSelectedLevel:10);
document.getElementById('special-start-level').addEventListener('change',()=>{gameState.specialTrialSelectedLevel=Number(document.getElementById('special-start-level').value);renderSpecialThemes();if(typeof saveState==='function')saveState();});
// Retired trial frames are removed from selection; other profile settings remain intact.
for(const profile of [gameState.playerProfile,...(gameState.playerProfile?.presets||[])])if(profile&&KanjiHonors.retiredIds.includes(profile.honorId))profile.honorId='';
renderSpecialThemes();
