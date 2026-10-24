import Honors from '../dist/honor-icons.js';
import * as CpuSeasons from './cpu-skill-seasons.mjs';
import CpuSkill from '../dist/cpu-skill-rules.js';
import Game from './game.cjs';
import AvatarStyle from '../dist/avatar-style.js';
import Rules from '../dist/online-rules.js';
import Levels from '../dist/level-rules.js';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export const publicProfile=p=>({name:p.name,char:p.char,frame:p.frame,color:p.color,glow:p.glow,honorId:Honors.retiredIds.includes(p.honorId)?'':p.honorId||'',...(p.appearance?{appearance:AvatarStyle.normalize(p.appearance)}:{})});
export const publicTeam=team=>team.items.map(({char,level,equippedReadings})=>({char,level:Levels.clamp(level),equippedReadings}));
const challengeModes=new Set(['endless']);
const cacheMs=30000;
const cachedPayload=payload=>{const value=JSON.parse(payload);for(const entry of value.entries||[])entry.items=publicTeam({items:entry.items||[]});return value;};
const publicRefreshes=new WeakMap();
export async function cachedList(db,rule,now,season=CpuSkill.seasonId(now)){
 const scope=db.schemaToken||db;let pending=publicRefreshes.get(scope);if(!pending){pending=new Map();publicRefreshes.set(scope,pending);}const key=JSON.stringify([rule,season]);
 if(!pending.has(key)){const work=readCachedList(db,rule,now,season);pending.set(key,work);work.finally(()=>{if(pending.get(key)===work)pending.delete(key);}).catch(()=>{});}
 return structuredClone(await pending.get(key));
}
async function readCachedList(db,rule,now,season){
 if(!challengeModes.has(rule)&&rule!=='cpu-skill'&&rule!=='cpu'&&!Rules.validRule(rule))fail('ランキングの種類を選び直してください。');
 if(rule==='cpu-skill'&&(!CpuSkill.validSeason(season)||season!=='legacy'&&season>CpuSkill.seasonId(now)))fail('シーズンを選び直してください。');
 const cacheRule=rule==='cpu-skill'?rule+':'+season+':device':rule;
 let row=await db.first('SELECT payload,generated_at,lease_until FROM leaderboard_snapshots WHERE rule=?',cacheRule);
 if(row?.payload&&row.generated_at>now-cacheMs)return cachedPayload(row.payload);
 // A D1 lease shares refreshes across Worker instances; never cache private player data.
 const lease=now+10000,lock=await db.run(`INSERT INTO leaderboard_snapshots (rule,lease_until) VALUES (?,?)
 ON CONFLICT(rule) DO UPDATE SET lease_until=excluded.lease_until
 WHERE leaderboard_snapshots.generated_at<=? AND leaderboard_snapshots.lease_until<=?`,cacheRule,lease,now-cacheMs,now);
 if(lock.meta.changes){
  try{const value={...await list(db,rule,season),generatedAt:now,expiresAt:now+cacheMs};await db.run('UPDATE leaderboard_snapshots SET payload=?,generated_at=?,lease_until=0 WHERE rule=? AND lease_until=?',JSON.stringify(value),now,cacheRule,lease);return value;}
  catch(error){await db.run('UPDATE leaderboard_snapshots SET lease_until=0 WHERE rule=? AND lease_until=?',cacheRule,lease);throw error;}
 }
 if(row?.payload)return cachedPayload(row.payload);
 // Only a cold simultaneous request waits briefly for the first refresh.
 for(let n=0;n<5;n++){await new Promise(resolve=>setTimeout(resolve,40));row=await db.first('SELECT payload FROM leaderboard_snapshots WHERE rule=?',cacheRule);if(row?.payload)return cachedPayload(row.payload);}
 fail('ランキングを更新中です。少し待ってから再確認してください。',503);
}
const challengeEntry=(row,position)=>({...(position?{position}:{}),mode:row.mode,wins:row.wins,kills:row.kills,estimated:!!row.estimated,profile:publicProfile(JSON.parse(row.profile)),items:row.team?publicTeam({items:JSON.parse(row.team)}):[]});
export async function list(db,rule,season=CpuSkill.seasonId()){
 if(rule==='cpu-skill'){if(!CpuSkill.validSeason(season))fail('シーズンを選び直してください。');const rows=await CpuSeasons.ranking(db,season),chars=CpuSkill.seasonStages(season)[0].chars;return{rule,season,entries:rows.map(r=>({...r,season,profile:publicProfile(JSON.parse(r.profile)),items:chars.map(char=>({char,level:10,equippedReadings:[]}))}))};}


 if(challengeModes.has(rule)){const rows=await db.all('SELECT c.mode,c.wins,c.kills,c.estimated,COALESCE(p.payload,c.profile) AS profile,c.team FROM challenge_scores c LEFT JOIN player_profiles p ON p.key=substr(c.key,8) WHERE c.mode=? AND (c.wins>0 OR c.kills>0) ORDER BY c.wins DESC,c.kills DESC,c.updated_at ASC,c.key ASC LIMIT 10',rule);return {rule,entries:rows.map((row,n)=>challengeEntry(row,n+1))};}
 if(rule!=='cpu'&&!Rules.validRule(rule))fail('ランキングの種類を選び直してください。');
 const rows=rule==='cpu'?await db.all('SELECT rating,profile,team FROM cpu_scores ORDER BY rating DESC,updated_at ASC,key ASC LIMIT 10'):await db.all('SELECT key,rating,wins,losses,draws,profile,team FROM online_stats WHERE key LIKE ? AND wins+losses+draws>0 ORDER BY rating DESC,wins DESC,key ASC LIMIT 10',rule==='free'?'free:online:%':'online:%');
 // Current profile belongs to this ranking identity; past rooms only supply its played team.
 if(rule!=='cpu')for(const row of rows){const key=rule==='free'?row.key.slice(5):row.key,stored=await db.first('SELECT payload FROM player_profiles WHERE key=?',key.slice(7)),room=await db.first("SELECT host,guest,host_key FROM friend_rooms WHERE mode='online' AND (host_key=? OR guest_key=?) AND state IS NOT NULL AND (rule_set=? OR rule_set='legacy' AND ?='balanced') ORDER BY expires_at DESC,code DESC LIMIT 1",key,key,rule,rule),previousProfile=row.profile,previousTeam=row.team;
  if(stored)row.profile=JSON.stringify(publicProfile(JSON.parse(stored.payload)));
  if(room){const raw=room.host_key===key?room.host:room.guest;if(raw){const player=JSON.parse(raw);if(!stored)row.profile=JSON.stringify(publicProfile(player.profile));row.team=JSON.stringify(publicTeam(player));}}
  if(row.profile!==previousProfile||row.team!==previousTeam)await db.run('UPDATE online_stats SET profile=?,team=? WHERE key=? AND profile IS ? AND team IS ?',row.profile,row.team,row.key,previousProfile,previousTeam);
 }


 return {rule,entries:rows.map((r,n)=>({position:n+1,rating:r.rating,...(rule==='cpu'?{}:{wins:r.wins,losses:r.losses,draws:r.draws}),profile:r.profile?publicProfile(JSON.parse(r.profile)):{name:'プレイヤー',char:'一',frame:'plain',color:'gold',glow:'none',honorId:''},items:r.team?publicTeam({items:JSON.parse(r.team)}):[]}))};
}
export async function saveCpu(db,key,profileKey,input,now){
 if(!Number.isInteger(input.rating)||input.rating<1000||input.rating>1e9||!Array.isArray(input.items)||input.items.length<1||input.items.length>3)fail('CPU対戦の記録を確認してください。');
 let team;try{team=Game.roster({items:Array.from({length:3},(_,n)=>input.items[n%input.items.length])});}catch(e){fail(e.message);}
 const p=await db.first('SELECT payload FROM player_profiles WHERE key=?',profileKey);if(!p)fail('プレイヤー設定を保存してください。');
 const profile=JSON.stringify(publicProfile(JSON.parse(p.payload))),items=JSON.stringify(publicTeam(team).slice(0,input.items.length)),previous=await db.first('SELECT rating,profile,team FROM cpu_scores WHERE key=?',key);
 if(previous?.rating===input.rating&&previous.profile===profile&&previous.team===items)return {saved:true};
 await db.run('INSERT INTO cpu_scores (key,rating,profile,team,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET rating=MAX(cpu_scores.rating,excluded.rating),profile=excluded.profile,team=excluded.team,updated_at=excluded.updated_at WHERE cpu_scores.rating<>excluded.rating OR cpu_scores.profile<>excluded.profile OR cpu_scores.team<>excluded.team',key,input.rating,profile,items,now);
 return {saved:true};
}
export async function ownChallenges(db,key){return {records:(await db.all("SELECT mode,wins,kills,estimated,profile,team FROM challenge_scores WHERE key=? AND mode='endless'",key)).map(row=>challengeEntry(row))};}
export async function saveChallenge(db,key,profileKey,input,now){
 const {mode,wins,kills=0,estimated=false,items=[]}=input;
 if(!challengeModes.has(mode)||!Number.isInteger(wins)||wins<0||wins>1000000||!Number.isInteger(kills)||kills<0||kills>3*(wins+1)||typeof estimated!=='boolean'||wins===0&&kills===0||!Array.isArray(items)||items.length>3)fail('強敵連戦の記録を確認してください。');
 let team=null;if(items.length){try{team=publicTeam(Game.roster({items:Array.from({length:3},(_,n)=>items[n%items.length])})).slice(0,items.length);}catch(error){fail(error.message);}}
 const p=await db.first('SELECT payload FROM player_profiles WHERE key=?',profileKey);if(!p)fail('プレイヤー設定を保存してください。');const profile=JSON.stringify(publicProfile(JSON.parse(p.payload)));
 const previous=await db.first('SELECT mode,wins,kills,estimated,profile,team FROM challenge_scores WHERE key=? AND mode=?',key,mode);
 const better=!previous||wins>previous.wins||wins===previous.wins&&(kills>previous.kills||kills===previous.kills&&(previous.estimated>Number(estimated)||!previous.team&&team));
 if(!better&&previous.profile===profile)return {saved:true,record:challengeEntry(previous)};
 await db.batch([
  [`INSERT INTO challenge_scores (key,mode,wins,kills,estimated,profile,team,updated_at) VALUES (?,?,?,?,?,?,?,?)
   ON CONFLICT(key,mode) DO UPDATE SET wins=excluded.wins,kills=excluded.kills,estimated=excluded.estimated,profile=excluded.profile,team=excluded.team,updated_at=excluded.updated_at
   WHERE excluded.wins>challenge_scores.wins OR excluded.wins=challenge_scores.wins AND (excluded.kills>challenge_scores.kills OR excluded.kills=challenge_scores.kills AND (challenge_scores.estimated>excluded.estimated OR challenge_scores.team IS NULL AND excluded.team IS NOT NULL))`,key,mode,wins,kills,Number(estimated),profile,team?JSON.stringify(team):null,now],
  ['UPDATE challenge_scores SET profile=? WHERE key=? AND mode=? AND profile<>?',profile,key,mode,profile]
 ]);
 return {saved:true,record:challengeEntry(await db.first('SELECT mode,wins,kills,estimated,profile,team FROM challenge_scores WHERE key=? AND mode=?',key,mode))};
}
