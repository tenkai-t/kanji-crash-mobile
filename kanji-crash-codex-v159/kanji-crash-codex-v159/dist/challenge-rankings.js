'use strict';
let challengeSyncBusy=false,challengeSyncTimer=null;
const challengeNumber=n=>Number.isInteger(n)&&n>=0&&n<=1000000;
function challengeLocal(mode){return mode==='endless'?{mode,wins:gameState.endlessBest||0,kills:gameState.endlessBestKills||0,estimated:!!gameState.endlessBestEstimated}:{mode,wins:gameState.specialTrialBest||0,kills:0,estimated:false};}
function challengeCompare(a,b){return a.wins-b.wins||a.kills-b.kills;}
function challengeProfileChanged(profile){return profile&&['name','char','frame','color','glow','honorId'].some(key=>(profile[key]||'')!==(gameState.playerProfile[key]||''));}
function challengeSnapshot(mode){const local=challengeLocal(mode),cached=gameState.challengeRankings?.[mode];if(!local.wins&&!local.kills)return null;return {...local,items:cached&&challengeCompare(cached,local)===0&&Array.isArray(cached.items)?cached.items:[]};}
function acceptChallengeRecord(record){
 const mode=record.mode;if(!['endless'].includes(mode)||!challengeNumber(record.wins)||!Number.isInteger(record.kills)||record.kills<0)return;
 const current=challengeLocal(mode),comparison=challengeCompare(record,current);if(comparison<0||comparison===0&&record.estimated&&!current.estimated)return;
 if(mode==='endless'){gameState.endlessBest=record.wins;gameState.endlessBestKills=record.kills;gameState.endlessBestEstimated=!!record.estimated;}else gameState.specialTrialBest=Math.max(gameState.specialTrialBest||0,record.wins);
 const old=gameState.challengeRankings?.[mode];gameState.challengeRankings??={};if(comparison>0||!old||!old.items?.length||record.items?.length)gameState.challengeRankings[mode]={...record,pending:false};
}
function queueChallengeRecord(mode,run){
 if(mode!=='endless'||!run?.started)return;const record={mode,wins:mode==='endless'?run.wins:run.streak,kills:mode==='endless'?run.kills:0,estimated:false};if(!record.wins&&!record.kills||challengeCompare(record,challengeLocal(mode))<0)return;
 const old=gameState.challengeRankings?.[mode];if(old&&challengeCompare(record,old)===0&&!old.estimated&&old.items?.length)return;
 record.items=run.team.map(item=>({char:item.char,level:item.level,equippedReadings:getEquippedReadings(item).slice()}));gameState.challengeRankings??={};gameState.challengeRankings[mode]={...record,pending:true};clearTimeout(challengeSyncTimer);challengeSyncTimer=setTimeout(syncChallengeScores,400);
}
async function syncChallengeScores(){
 if(challengeSyncBusy)return;const snapshots=['endless'].filter(mode=>gameState.challengeRankings?.[mode]?.pending).map(challengeSnapshot).filter(Boolean);if(!snapshots.length)return;challengeSyncBusy=true;let succeeded=false;
 try{const session=await playerApi('/api/session');if(!session.authenticated){prepEl('challenge-ranking-sync').textContent='接続できると強敵連戦の記録をランキングへ登録できます。';return;}if(!snapshots.length)return;await ensurePlayerProfile();for(const snapshot of snapshots){const result=await playerApi('/api/challenges/score','POST',snapshot);acceptChallengeRecord(result.record);const current=gameState.challengeRankings?.[snapshot.mode];if(current&&challengeCompare(current,snapshot)===0&&JSON.stringify(current.items)===JSON.stringify(snapshot.items))current.pending=false;}saveState();prepEl('challenge-ranking-sync').textContent='強敵連戦の最高記録をオンラインで保存します。';succeeded=true;
 }catch(error){prepEl('challenge-ranking-sync').textContent=error.message+' 記録は端末に残り、再接続時に登録します。';}finally{challengeSyncBusy=false;if(succeeded&&gameState.challengeRankings?.endless?.pending){clearTimeout(challengeSyncTimer);challengeSyncTimer=setTimeout(syncChallengeScores,400);}}
}
async function initializeChallengeRankings(){
 if(challengeSyncBusy)return;challengeSyncBusy=true;let authenticated=false;
 try{const session=await playerApi('/api/session');if(!session.authenticated){prepEl('challenge-ranking-sync').textContent='接続できると強敵連戦の記録をランキングへ登録できます。';return;}authenticated=true;const result=await playerApi('/api/challenges/records');for(const record of result.records)acceptChallengeRecord(record);
  for(const mode of ['endless']){const local=challengeSnapshot(mode),remote=result.records.find(record=>record.mode===mode);if(!local)continue;const pending=!remote||challengeCompare(local,remote)>0||challengeProfileChanged(remote.profile)||challengeCompare(local,remote)===0&&(remote.estimated&&!local.estimated||!remote.items?.length&&local.items.length>0);gameState.challengeRankings??={};gameState.challengeRankings[mode]={...local,pending};}saveState();
 }catch(error){prepEl('challenge-ranking-sync').textContent=error.message+' 記録は端末に残っています。';}finally{challengeSyncBusy=false;if(authenticated)await syncChallengeScores();}
}
window.showRanking=mode=>{if(mode==='trial')return;prepEl('leaderboard-rule').value=mode;switchTab('rank');};
window.addEventListener('online',initializeChallengeRankings);
