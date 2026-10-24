'use strict';
let soloReplay=null,replayTurn=null,replayBodies=[],latestReplayId=null,replayReturn=null,replayListReturn=null,replayViewer=null,replayPlaying=false,replayTime=0,replaySpeed=1,replayRaf=0,replayLastTime=0,replayListBusy=false,replaySyncBusy=false,replayOpenBusy=false,replayMemory=new Map(),replaySummaries=[],replayFavoritesOnly=false,replayFavoriteBusy=false,replayWrites=Promise.resolve();
const replayEl=id=>document.getElementById(id);
const replayNode=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
const replayDb=new Promise((resolve,reject)=>{if(!window.indexedDB){reject(Error('storage'));return;}const req=indexedDB.open('kanji-crash-replays',1);req.onupgradeneeded=()=>req.result.createObjectStore('replays',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
replayDb.catch(()=>{});
async function replayCache(action){const db=await replayDb;return new Promise((resolve,reject)=>{const tx=db.transaction('replays','readwrite'),store=tx.objectStore('replays');let result;const req=action(store);if(req){req.onsuccess=()=>result=req.result;}tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
async function cachedReplays(){try{const all=await replayCache(s=>s.getAll());return [...new Map([...all,...replayMemory.values()].map(e=>[e.id,e])).values()];}catch{return [...replayMemory.values()];}}
async function cacheReplay(record,synced=false,changes={}){
 const save=async()=>{const old=replayMemory.get(record.id)||(await cachedReplays()).find(e=>e.id===record.id),entry={...old,id:record.id,record,synced:old?.synced||synced,favorite:old?.favorite||false,...changes};replayMemory.set(record.id,entry);try{await replayCache(s=>s.put(entry));}catch{}
 const all=(await cachedReplays()).filter(e=>!e.favorite).sort((a,b)=>b.record.createdAt-a.record.createdAt);for(const old of all.slice(KanjiReplays.limit)){replayMemory.delete(old.id);try{await replayCache(s=>s.delete(old.id));}catch{}}
 return entry;};const next=replayWrites.then(save);replayWrites=next.catch(()=>{});return next;
}
function replayResultButton(id){latestReplayId=id||null;const button=replayEl('btn-result-replay');button.hidden=!id;}
window.beginSoloReplay=()=>{
 replayResultButton(null);replayTurn=null;replayBodies=[...playerBodies,...cpuBodies];
 const label=battleMode==='friend-cpu'?'フレンド腕試し':isPractice()?KanjiPlayRecords.get(practiceRun.id).name:battleMode==='endless'?`強敵連戦・第${endlessRun.wave}戦`:battleMode==='special'?`${specialChallenge.name}・Lv.${specialChallenge.level}`:`CPU対戦・${{normal:'通常',hard:'強敵',boss:'漢字王'}[currentCpuDifficulty]||'通常'}`;
 soloReplay=KanjiReplays.create({id:'cpu_'+playerRandomId(),createdAt:Date.now(),mode:isPractice()?practiceRun.kind:battleMode,label,names:[gameState.playerProfile?.name||'あなた',replayEl('cpu-name').textContent],side:0},replayBodies.map(b=>KanjiReplays.piece(b,b.gameData.isPlayer?0:1,arenaCenter,arenaBaseRadius)),KanjiReplays.snapshot(replayBodies,arenaCenter,arenaBaseRadius,battlePressure.ratio));
};
window.abandonSoloReplay=()=>{soloReplay=null;replayTurn=null;replayBodies=[];replayResultButton(null);};
window.beginReplayShot=(body,side,spin)=>{if(!soloReplay||soloReplay.complete)return;closeReplayShot();replayTurn={side,key:replayBodies.indexOf(body),spin:KanjiTraits.normalizeSpin(spin),duration:1,frames:[KanjiReplays.snapshot(replayBodies,arenaCenter,arenaBaseRadius,battlePressure.ratio)],events:[],started:engine.timing.timestamp};soloReplay.turns.push(replayTurn);};
window.captureSoloReplay=(force=false)=>{if(!replayTurn||!soloReplay||soloReplay.complete)return;const elapsed=Math.min(6000,Math.max(0,Math.round(engine.timing.timestamp-replayTurn.started))),last=replayTurn.frames.at(-1);if(!force&&elapsed-last[0]<80)return;const frame=KanjiReplays.snapshot(replayBodies,arenaCenter,arenaBaseRadius,battlePressure.ratio,elapsed);if(replayTurn.frames.length>=99)replayTurn.frames[replayTurn.frames.length-1]=frame;else if(force||elapsed>last[0])replayTurn.frames.push(frame);};
window.recordReplayAbility=(body,ability)=>{if(!replayTurn||soloReplay?.complete||replayTurn.events.length>=120)return;const key=replayBodies.indexOf(body);if(key<0)return;const color=/^#[0-9a-fA-F]{3,8}$/.test(ability.color||'')?ability.color:'#a7f3d0';replayTurn.events.push({key,name:String(ability.name||'能力発動').slice(0,40),color,t:Math.min(6000,Math.max(0,Math.round(engine.timing.timestamp-replayTurn.started)))});};
window.closeReplayShot=()=>{if(!replayTurn)return;captureSoloReplay(true);replayTurn.duration=Math.max(400,replayTurn.frames.at(-1)[0]);replayTurn.frames.push(KanjiReplays.snapshot(replayBodies,arenaCenter,arenaBaseRadius,battlePressure.ratio,replayTurn.duration));if(replayTurn.frames.length>100)replayTurn.frames.splice(-2,1);delete replayTurn.started;replayTurn=null;};
window.finishSoloReplay=(winner,verdict)=>{
 if(!soloReplay||soloReplay.complete)return;closeReplayShot();KanjiReplays.finish(soloReplay,winner===null?null:winner?0:1,verdict?.reason||(isPractice()&&winner!==true&&playerBodies.some(b=>!b.gameData.isOut)?'チャレンジ条件未達成':'全滅'),KanjiReplays.snapshot(replayBodies,arenaCenter,arenaBaseRadius,battlePressure.ratio));
 const record=soloReplay;if(!KanjiReplays.valid(record,c=>KANJI_DATABASE.some(i=>i.char===c))){console.error('Replay recording invalid');return;}replayResultButton(record.id);cacheReplay(record).then(syncReplayCache).catch(()=>{replayMemory.set(record.id,{id:record.id,record,synced:false});showToast('リプレイを端末に保存できませんでした。画面を閉じる前に見返せます。');syncReplayCache();});
};
window.acceptRoomReplay=room=>{if(room.state?.finished)replayResultButton(room.replayId);else replayResultButton(null);};
window.initializeReplays=()=>{setTimeout(syncReplayCache,1200);};
window.syncReplayCache=async()=>{if(replaySyncBusy)return;replaySyncBusy=true;try{await replayWrites;if(gameState.replayDeviceScopeVersion!==1){for(const entry of await cachedReplays())await cacheReplay(entry.record,false,{synced:false,scopeVersion:1});gameState.replayDeviceScopeVersion=1;saveState();}for(const entry of await cachedReplays()){
 try{if(!entry.synced&&!['friend','online'].includes(entry.record.mode)){await playerApi('/api/replays','POST',{replay:entry.record,favorite:!!entry.favorite});await cacheReplay(entry.record,true);}
 if(entry.favoritePending&&(entry.synced||!['friend','online'].includes(entry.record.mode))){await playerApi('/api/replays/'+entry.id+'/favorite','PUT',{favorite:!!entry.favorite});const current=replayMemory.get(entry.id);if(current?.favorite===entry.favorite)await cacheReplay(entry.record,true,{favoritePending:false});}
 }catch(error){if(error.status===401)break;throw error;}
 }}catch(error){if(!replayEl('modal-replays').classList.contains('hidden'))replayEl('replay-list-status').textContent='未保存の記録があります。「一覧を更新」で再試行できます。';}finally{replaySyncBusy=false;}};
window.openReplayList=()=>{replayListReturn=document.activeElement;pausePlayerOverlay();replayEl('modal-replays').classList.remove('hidden');replayEl('modal-replays').querySelector('.editor-panel').scrollTop=0;replayEl('modal-replays').querySelector('.editor-title button').focus();loadReplayList();};
window.closeReplayList=()=>{replayEl('modal-replays').classList.add('hidden');resumePlayerEngine();if(replayListReturn?.isConnected)replayListReturn.focus();};
function replayOutcome(r){return r.winner===null?'引き分け':r.winner===r.side?'勝利':'敗北';}
function favoriteButton(button,favorite){button.textContent=favorite?'お気に入り解除':'お気に入りに保存';button.setAttribute('aria-pressed',String(!!favorite));button.disabled=replayFavoriteBusy;}
function renderReplayList(){
 const box=replayEl('replay-list');box.replaceChildren();const entries=replaySummaries.filter(r=>!replayFavoritesOnly||r.favorite).sort((a,b)=>b.createdAt-a.createdAt);
 replayEl('replay-favorite-count').textContent=`お気に入り ${replaySummaries.filter(r=>r.favorite).length} / ${KanjiReplays.favoriteLimit}対局`;
 for(const r of entries){const card=replayNode('article','replay-card'),info=replayNode('div',''),date=new Date(r.createdAt).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});info.append(replayNode('h3','',r.label),replayNode('p','',`${replayOutcome(r)}・${r.turns}手・${date}`),replayNode('p','replay-team-line',`${r.chars.join('・')} 対 ${r.opponents.join('・')}`),replayNode('p','replay-meta',`${r.names[1-r.side]}${r.local?'・端末の記録':''}${r.favoritePending?'・お気に入りは接続後に同期':''}`));
 const actions=replayNode('div','replay-card-actions'),button=replayNode('button','inventory-action','見る'),favorite=replayNode('button','inventory-action secondary');button.type=favorite.type='button';button.dataset.replay=r.id;button.setAttribute('aria-label',r.label+'のリプレイを見る');button.onclick=()=>openSavedReplay(r.id,button);favorite.dataset.replayFavorite=r.id;favoriteButton(favorite,r.favorite);favorite.onclick=()=>toggleReplayFavorite(r.id);actions.append(button,favorite);card.append(info,actions);box.append(card);}
 if(!entries.length)box.append(replayNode('p','replay-empty',replayFavoritesOnly?'お気に入りはまだありません。「お気に入りに保存」で残せます。':'まだリプレイはありません。更新後に終了した対局から記録します。'));
}
window.filterReplayList=value=>{replayFavoritesOnly=value==='favorites';renderReplayList();};
window.loadReplayList=async()=>{
 if(replayListBusy)return;replayListBusy=true;replayEl('btn-replay-refresh').disabled=true;replayEl('replay-list-status').textContent='記録を読み込み中…';
 try{await syncReplayCache();const local=await cachedReplays();let status;
 try{const result=await playerApi('/api/replays'),serverIds=new Set(result.replays.map(r=>r.id));replaySummaries=result.replays.map(r=>{const e=local.find(e=>e.id===r.id);return e?.favoritePending?{...r,favorite:e.favorite,favoritePending:true}:r;});replaySummaries.push(...local.filter(e=>(!e.synced||e.favoritePending)&&!serverIds.has(e.id)).map(e=>({...KanjiReplays.summary(e.record),local:true,favorite:!!e.favorite,favoritePending:!!e.favoritePending})));status='直近20対局と、お気に入り最大50対局を保存します。お気に入りは新しい対戦が増えても残ります。';
 for(const r of result.replays){const e=local.find(e=>e.id===r.id);if(e&&!e.favoritePending)await cacheReplay(e.record,true,{favorite:!!r.favorite});}
 }catch(error){replaySummaries=local.map(e=>({...KanjiReplays.summary(e.record),local:true,favorite:!!e.favorite,favoritePending:!!e.favoritePending}));status=error.status===401?'この端末に保存しています。接続が戻ると、このプレイヤーの記録をサーバーにも保存できます。':'接続できません。端末の記録を表示しています。再接続後にお気に入りを同期します。';}
 renderReplayList();replayEl('replay-list-status').textContent=status;
 }catch{replayEl('replay-list-status').textContent='リプレイを読み込めませんでした。もう一度更新してください。';}finally{replayListBusy=false;replayEl('btn-replay-refresh').disabled=false;}
};
async function loadReplayRecord(id){let entry=replayMemory.get(id)||(await cachedReplays()).find(e=>e.id===id);if(entry)return entry;
 const result=await playerApi('/api/replays/'+id);return cacheReplay(result.replay,true,{favorite:!!result.favorite});
}
window.toggleReplayFavorite=async id=>{
 if(replayFavoriteBusy)return;replayFavoriteBusy=true;const status=replayEl('replay-favorite-status');status.textContent='保存中…';
 try{const entry=await loadReplayRecord(id),favorite=!entry.favorite;
 if(favorite&&Math.max((await cachedReplays()).filter(e=>e.favorite).length,replaySummaries.filter(e=>e.favorite).length)>=KanjiReplays.favoriteLimit)throw Error(`お気に入りは${KanjiReplays.favoriteLimit}対局まで保存できます。`);
 let synced=entry.synced,pending=false;try{if(!synced&&['friend','online'].includes(entry.record.mode)){await cacheReplay(entry.record,false,{favorite,favoritePending:false});const row=replaySummaries.find(r=>r.id===id);if(row)row.favorite=favorite;status.textContent='この端末のお気に入りに保存しました。';return;}if(!synced&&!['friend','online'].includes(entry.record.mode)){await playerApi('/api/replays','POST',{replay:entry.record,favorite});synced=true;}await playerApi('/api/replays/'+id+'/favorite','PUT',{favorite});}catch(error){if(error.status===401||!error.status||error.status>=500)pending=true;else throw error;}
 await cacheReplay(entry.record,synced,{favorite,favoritePending:pending});const row=replaySummaries.find(r=>r.id===id);if(row)Object.assign(row,{favorite,favoritePending:pending});else replaySummaries.push({...KanjiReplays.summary(entry.record),favorite,favoritePending:pending,local:!synced});
 status.textContent=pending?'端末に保存しました。接続後に、この端末の保存先へ同期します。':favorite?'お気に入りに保存しました。新しい対戦が増えても残ります。':'お気に入りを解除しました。直近20対局を超えた記録は履歴から外れます。';
 }catch(error){status.textContent=error.message;showToast(error.message);}finally{replayFavoriteBusy=false;renderReplayList();if(replayViewer)favoriteButton(replayEl('btn-replay-favorite'),replayMemory.get(replayViewer.id)?.favorite);}
};
window.openLatestReplay=button=>{if(latestReplayId)openSavedReplay(latestReplayId,button||replayEl('btn-result-replay'));};
window.openSavedReplay=async(id,trigger=null)=>{
 if(replayOpenBusy)return;replayOpenBusy=true;const original=trigger?.textContent,disabled=trigger?.disabled;if(trigger){trigger.disabled=true;trigger.textContent='読み込み中…';}
 try{const entry=await loadReplayRecord(id),record=entry.record;
 if(!KanjiReplays.valid(record,c=>KANJI_DATABASE.some(i=>i.char===c))){showToast('このリプレイを再生できません。');return;}
 window.releaseReplayVideo?.();pauseReplay();replayViewer=record;replayTime=0;replaySpeed=1;replayEl('replay-speed').value='1';replayReturn=trigger||document.activeElement;pausePlayerOverlay();replayEl('modal-replay-viewer').classList.remove('hidden');replayEl('modal-replay-viewer').querySelector('.editor-panel').scrollTop=0;replayEl('replay-viewer-title').textContent=record.label;replayEl('replay-names').textContent=`あなた：${record.names[record.side]} ／ 相手：${record.names[1-record.side]}`;replayEl('replay-outcome').textContent=`${replayOutcome(record)}・${record.turns.length}手・${record.reason}`;replayEl('replay-seek').max=String(Math.max(1,KanjiReplays.duration(record)));favoriteButton(replayEl('btn-replay-favorite'),entry.favorite);replayEl('replay-favorite-status').textContent=entry.favoritePending?'お気に入りは端末に保存済み・接続後に同期します。':'';replayEl('modal-replay-viewer').querySelector('.editor-title button').focus();renderReplayFrame();
 }catch(error){showToast(error.status===404?'この対局のリプレイが見つかりません。部屋を開き直してからお試しください。':error.message);}finally{replayOpenBusy=false;if(trigger){trigger.disabled=disabled;trigger.textContent=original;}}
};
window.closeReplayViewer=()=>{window.releaseReplayVideo?.();pauseReplay();replayEl('modal-replay-viewer').classList.add('hidden');replayViewer=null;resumePlayerEngine();if(replayReturn?.isConnected)replayReturn.focus();};
function pauseReplay(){replayPlaying=false;cancelAnimationFrame(replayRaf);replayEl('btn-replay-play').textContent='再生';replayLastTime=0;}
window.toggleReplay=()=>{if(!replayViewer)return;if(replayPlaying){pauseReplay();return;}if(replayTime>=KanjiReplays.duration(replayViewer))replayTime=0;replayPlaying=true;replayEl('btn-replay-play').textContent='一時停止';replayLastTime=0;replayRaf=requestAnimationFrame(tickReplay);};
function tickReplay(time){if(!replayPlaying||!replayViewer)return;if(replayLastTime)replayTime=Math.min(KanjiReplays.duration(replayViewer),replayTime+(time-replayLastTime)*replaySpeed);replayLastTime=time;renderReplayFrame();if(replayTime>=KanjiReplays.duration(replayViewer))pauseReplay();else replayRaf=requestAnimationFrame(tickReplay);}
window.seekReplay=value=>{pauseReplay();replayTime=Number(value)||0;renderReplayFrame();};
window.stepReplay=direction=>{if(!replayViewer)return;pauseReplay();const current=KanjiReplays.at(replayViewer,replayTime),target=direction<0?(current.local>100?current.index:current.index-1):current.index+1;replayTime=target>=replayViewer.turns.length?KanjiReplays.duration(replayViewer):KanjiReplays.offset(replayViewer,Math.max(0,target));renderReplayFrame();};
window.setReplaySpeed=value=>{replaySpeed=Number(value)||1;};
function drawReplayBoard(ctx,r,time){
 const state=KanjiReplays.at(r,time),frame=state.frame,flip=r.side===1,ratio=frame[1];ctx.clearRect(0,0,800,800);ctx.save();ctx.scale(2,2);ctx.fillStyle='#070d1f';ctx.fillRect(0,0,400,400);ctx.beginPath();ctx.arc(200,200,184*ratio,0,Math.PI*2);ctx.fillStyle='#0f172a';ctx.fill();ctx.lineWidth=5;ctx.strokeStyle='#d97706';ctx.stroke();ctx.beginPath();ctx.arc(200,200,Math.max(0,184*ratio-12),0,Math.PI*2);ctx.strokeStyle='#d9770655';ctx.lineWidth=1;ctx.stroke();let pCount=0,eCount=0;
 r.pieces.forEach((piece,n)=>{const p=frame[2][n],mine=piece.side===r.side;if(p[3])return;mine?pCount++:eCount++;const active=state.turn?.events.filter(e=>e.key===n&&e.t<=state.local&&e.t>state.local-800).at(-1),scale=p[4]/piece.radius,previous=state.turn&&KanjiReplays.at(r,Math.max(0,time-20)).frame[2][n],body={gameData:{...piece,isPlayer:mine,rubyUnlocked:!!piece.ruby,traitState:{launchSpin:state.turn?.key===n?state.turn.spin:0},skillFlashUntil:active?time+1:0,skillFlashColor:active?.color},position:{x:flip?400-p[0]:p[0],y:flip?400-p[1]:p[1]},angle:p[2]+(flip?Math.PI:0),circleRadius:p[4],traitScale:piece.scale*scale,traitOutline:piece.outline?.map(v=>({x:v.x*scale,y:v.y*scale})),angularVelocity:previous?(p[2]-previous[2])/.02:0};KanjiPieceArt.draw(ctx,body,time,true,{minCharacterSize:17});});ctx.restore();
 return {state,pCount,eCount,ratio};
}
function renderReplayFrame(){
 if(!replayViewer)return;const r=replayViewer,{state,pCount,eCount,ratio}=drawReplayBoard(replayEl('replay-canvas').getContext('2d'),r,replayTime);
 const turn=state.turn;replayEl('replay-turn').textContent=turn?`第${state.index+1}手・${turn.side===r.side?'あなた':'相手'}の「${r.pieces[turn.key].char}」${Math.abs(turn.spin)>.1?`・回転 ${Math.abs(turn.spin).toFixed(1)}`:''}`:'初期配置';replayEl('replay-counts').textContent=`あなた ${pCount}体 ／ 相手 ${eCount}体・土俵 ${Math.round(ratio*100)}％`;const event=turn?.events.filter(e=>e.t<=state.local&&e.t>state.local-800).at(-1);replayEl('replay-event').textContent=event?`「${r.pieces[event.key].char}」${event.name}`:' ';replayEl('replay-time').textContent=`${(replayTime/1000).toFixed(1)} / ${(KanjiReplays.duration(r)/1000).toFixed(1)}秒`;replayEl('replay-seek').value=String(replayTime);replayEl('btn-replay-prev').disabled=replayTime===0;replayEl('btn-replay-next').disabled=replayTime>=KanjiReplays.duration(r);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseReplay();});
window.addEventListener('online',syncReplayCache);
