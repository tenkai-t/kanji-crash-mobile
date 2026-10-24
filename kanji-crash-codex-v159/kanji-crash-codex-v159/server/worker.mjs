import * as Guests from './guest-players.mjs';
import {database} from './database.mjs';
import Game from './game.cjs';
import Honors from '../dist/honor-icons.js';
import AvatarStyle from '../dist/avatar-style.js';
import * as Online from './online.mjs';
import Rules from '../dist/online-rules.js';
import * as Preparation from './preparation.mjs';
import * as Leaderboards from './leaderboards.mjs';
import CpuSkill from '../dist/cpu-skill-rules.js';
import * as PlayProgress from './play-progress.mjs';
import * as CpuSeasons from './cpu-skill-seasons.mjs';
import * as DeckFavorites from './deck-favorites.mjs';
import * as Replays from './replays.mjs';
import {randomCode,playerCode,friendList,friendInvitations,friendshipAction,requireFriend} from './friends.mjs';
const frames=new Set(Object.keys(AvatarStyle.basicFrames)),colors=new Set(Object.keys(AvatarStyle.colors)),glows=new Set(['none','soft','bright']);
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
function validGame(fn){try{return fn();}catch(error){fail(error.message,400);}}
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
async function identity(request,db){const user=request.headers.get('oai-authenticated-user-id'),device=request.headers.get('X-Kanji-Device');if(!user||request.headers.get('X-Kanji-Guest-Mode')==='1'){const guest=await Guests.authenticate(db,request);if(guest)return guest.legacy_key||'guest:'+guest.id;if(!user)fail('ゲストの接続を確認できません。記録画面で復元コードを確認してください。',401);}if(!/^[a-f0-9]{32}$/.test(device||''))fail('プレイヤー情報を開き直してください。');return user+':'+device;}
function decoration(input,progress){if(!input||typeof input!=='object'||!Game.bases.has(input.char)||!frames.has(input.frame)||!colors.has(input.color)||!glows.has(input.glow))fail('アイコンの設定を確認してください。');const honorId=Honors.retiredIds.includes(input.honorId)?'':input.honorId??'';if(typeof honorId!=='string'||honorId&&!Honors.get(honorId))fail('アイコンの設定を確認してください。');if(honorId&&!Honors.canUse(honorId,progress))fail('このアイコンはまだ解放されていません。');if(input.appearance!==undefined&&!AvatarStyle.valid(input.appearance,progress))fail('質感・配色・勲章の設定を確認してください。');return {char:input.char,frame:input.frame,color:input.color,glow:input.glow,honorId,...(input.appearance!==undefined?{appearance:AvatarStyle.normalize(input.appearance,progress)}:{})};}
export function profile(input,progress={}){const name=String(input?.name||'').trim().normalize('NFC');if(!name||Array.from(name).length>16||/[\x00-\x1f\x7f<>]/.test(name))fail('名前は1〜16文字で入力してください。');const value={name,...decoration(input,progress)};if(input.presets!==undefined){if(!Array.isArray(input.presets)||input.presets.length>3)fail('お気に入りは3つまで登録できます。');value.presets=input.presets.map(p=>p===null?null:decoration(p,progress));}return value;}
function checkedProgress(value){if(value!==undefined&&!Honors.validProgress(value))fail('達成状況を確認してください。');return {...Honors.progress(value),highestOnlineRP:0,highestBalancedRP:0,highestFreeRP:0};}
function profileResponse(stored){const achievementProgress=Honors.progress(stored?.achievementProgress);return {profile:stored?profile(stored,achievementProgress):null,achievementProgress};}
async function changeProfile(db,key,now,build){for(let attempt=0;attempt<3;attempt++){const row=await db.first('SELECT payload FROM player_profiles WHERE key = ?',key),stored=row?JSON.parse(row.payload):null,value=build(stored),payload=JSON.stringify(value);if(row?.payload===payload)return value;const result=row?await db.run('UPDATE player_profiles SET payload=?,updated_at=? WHERE key=? AND payload=?',payload,now,key,row.payload):await db.run('INSERT OR IGNORE INTO player_profiles (key,payload,updated_at) VALUES (?,?,?)',key,payload,now);if(result.meta.changes)return value;}fail('達成状況が更新されました。もう一度お試しください。',503);}
async function onlinePeak(db,key,now){
 const [balanced,free]=await Promise.all([db.first('SELECT rating FROM online_stats WHERE key=?','online:'+key),db.first('SELECT rating FROM online_stats WHERE key=?','free:online:'+key)]);
 const earned={highestBalancedRP:balanced?.rating||0,highestFreeRP:free?.rating||0};
 const row=await db.first('SELECT payload FROM player_profiles WHERE key = ?',key);
 if(!row)return earned;
 const stored=await changeProfile(db,key,now,previous=>({...previous,achievementProgress:Honors.merge(previous?.achievementProgress,earned)}));
 return stored.achievementProgress;
}
async function readBody(request,limit=20000){if(Number(request.headers.get('Content-Length')||0)>limit)fail('送信内容が大きすぎます。',413);const text=await request.text();if(text.length>limit)fail('送信内容が大きすぎます。',413);try{const value=JSON.parse(text);if(!value||typeof value!=='object'||Array.isArray(value))fail('送信内容を確認してください。');return value;}catch{fail('送信内容を確認してください。');}}
function view(room,key){const state=room.state?JSON.parse(room.state):null;return {code:room.code,side:room.host_key===key?0:1,status:room.status,revision:room.revision,expiresAt:room.expires_at,host:{...Game.normalizeTeam(JSON.parse(room.host)),profile:Leaderboards.publicProfile(JSON.parse(room.host).profile)},guest:room.guest?{...Game.normalizeTeam(JSON.parse(room.guest)),profile:Leaderboards.publicProfile(JSON.parse(room.guest).profile)}:null,state,round:room.round||1,ready:JSON.parse(room.ready||'[false,false]'),departed:!!room.departed||state?.reason==='退出',mode:room.mode||'friend',ruleSet:Rules.roomRule(room),lineupRevision:room.lineup_revision||0,deadline:room.deadline||0,graceUntil:room.grace_until||0,serverNow:Date.now()};}
async function roomView(db,room,key){const value=view(room,key);if(['waiting','preparing'].includes(room.status)||room.mode!=='online'&&room.status==='finished'){const peer=value.side?'host':'guest';if(value[peer])value[peer]={profile:value[peer].profile,items:[],formation:null,hidden:true};}if(room.mode==='online'){const result=await Online.settle(db,room);let peaks;if(result)peaks=await Promise.all([onlinePeak(db,room.host_key.slice(7),Date.now()),onlinePeak(db,room.guest_key.slice(7),Date.now())]);value.onlineStats=await Online.stats(db,key,value.ruleSet);value.peerOnlineStats=await Online.stats(db,room.host_key===key?room.guest_key:room.host_key,value.ruleSet);if(result)value.onlineStats.achievementProgress=peaks[value.side];value.ratingChange=result?(value.side===0?result.host_delta:result.guest_delta):null;}if(room.status==='finished'&&room.replay_log){value.replayId=`match_${room.code}_${room.round||1}`;try{value.replayReady=await Replays.saveRoom(db,room,Date.now());}catch(error){console.error('Replay save failed: REPLAY_SAVE_FAILED');value.replayReady=false;}}return value;}
async function api(request,env){
 const url=new URL(request.url),db=database(env),now=Date.now(),path=url.pathname;
 if(!['GET','POST','PUT'].includes(request.method))return json({error:'この操作は使用できません。'},405);
 if(request.method!=='GET'&&((request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)||request.headers.get('Sec-Fetch-Site')==='cross-site'))fail('ゲーム画面から操作してください。',403);
 if(path==='/api/guest'&&request.method==='POST')return json(await Guests.create(db,request));
 if(path==='/api/guest/restore'&&request.method==='POST')return json(await Guests.restore(db,request,await readBody(request)));
 if(path==='/api/session'&&request.method==='GET'){const signed=!!request.headers.get('oai-authenticated-user-id')&&request.headers.get('X-Kanji-Guest-Mode')!=='1',guest=signed?null:await Guests.authenticate(db,request);return json({authenticated:signed||!!guest,guest:!!guest});}
 if(path==='/api/cpu-skill/seasons'&&request.method==='GET')return json(CpuSkill.seasons(now));
 if(path==='/api/leaderboard'&&request.method==='GET')return json(await Leaderboards.cachedList(db,url.searchParams.get('rule')||'balanced',now,url.searchParams.get('season')||CpuSkill.seasonId(now)));
 const key=await identity(request,db),onlineKey='online:'+key;
 const backupPath=path.match(/^\/api\/guest\/backups(?:\/(\d+))?$/);if(backupPath&&request.method==='GET'){const guest=await Guests.authenticate(db,request);if(!guest||key!==(guest.legacy_key||'guest:'+guest.id))fail('ゲストの接続を確認してください。',401);return json(await Guests.backups(db,guest,backupPath[1]?Number(backupPath[1]):null));}
 if(path==='/api/guest/state'&&['GET','PUT'].includes(request.method)){const guest=await Guests.authenticate(db,request);if(!guest||key!==(guest.legacy_key||'guest:'+guest.id))fail('ゲストの接続を確認してください。',401);return json(await Guests.state(db,guest,request.method,request.method==='PUT'?await readBody(request,4000000):null));}
 if(path==='/api/profile'){
  if(request.method==='GET'){await onlinePeak(db,key,now);const row=await db.first('SELECT payload FROM player_profiles WHERE key = ?',key);return json(profileResponse(row?JSON.parse(row.payload):null));}
  if(request.method!=='PUT')fail('この操作は使用できません。',405);const input=await readBody(request),claimed=Honors.merge(checkedProgress(input.achievementProgress),await onlinePeak(db,key,now));const stored=await changeProfile(db,key,now,previous=>{const achievementProgress=Honors.merge(previous?.achievementProgress,claimed);return {...profile({...input,...(input.appearance===undefined&&previous?.appearance?{appearance:previous.appearance}:{}),...(input.presets===undefined&&previous?.presets?{presets:previous.presets}:{})},achievementProgress),achievementProgress};});await db.run('UPDATE online_stats SET profile=? WHERE key IN (?,?)',JSON.stringify(Leaderboards.publicProfile(stored)),onlineKey,'free:'+onlineKey);await db.run('UPDATE challenge_scores SET profile=? WHERE key=?',JSON.stringify(Leaderboards.publicProfile(stored)),onlineKey);await db.run("DELETE FROM leaderboard_snapshots WHERE rule IN ('balanced','free','endless','trial') OR rule LIKE 'cpu-skill:%'");return json(profileResponse(stored));
 }
 if(path==='/api/achievements'&&request.method==='POST'){
  const input=await readBody(request),claimed=Honors.merge(checkedProgress(input.progress),await onlinePeak(db,key,now));const stored=await changeProfile(db,key,now,previous=>{const achievementProgress=Honors.merge(previous?.achievementProgress,claimed);return {...profile(previous||input.profile,achievementProgress),achievementProgress};});return json({achievementProgress:stored.achievementProgress});
 }
 if(path==='/api/deck-favorites'&&request.method==='GET')return json(await DeckFavorites.list(db,onlineKey));
 const deckFavorite=path.match(/^\/api\/deck-favorites\/(\d+)(?:\/(remove))?$/);if(deckFavorite&&['PUT','POST'].includes(request.method))return json(await DeckFavorites.change(db,onlineKey,Number(deckFavorite[1]),await readBody(request),!!deckFavorite[2],now));
 if(path==='/api/friends/invitations'&&request.method==='GET')return json(await friendInvitations(db,key,now));
 if(path==='/api/cpu/score'&&request.method==='POST')return json(await Leaderboards.saveCpu(db,onlineKey,key,await readBody(request),now));
 if(path==='/api/cpu-skill/records'&&request.method==='GET')return json({cpuSkillOwner:onlineKey,usageOwner:onlineKey,cpuSkillRecords:await CpuSeasons.records(db,onlineKey)});
 if(path==='/api/cpu-skill/records'&&request.method==='POST'){const input=await readBody(request);if(input.cpuSkillOwner!==onlineKey)fail('ログイン先が変わりました。記録を再確認してください。',409);return json({...await CpuSeasons.saveBestRecords(db,onlineKey,key,input,now),cpuSkillOwner:onlineKey,usageOwner:onlineKey});}
 if(path==='/api/play-progress'&&request.method==='GET')return json({progress:await PlayProgress.read(db,onlineKey,onlineKey),usageOwner:onlineKey,cpuSkillRecords:await PlayProgress.skillRecords(db,onlineKey)});
 if(path==='/api/play-progress'&&request.method==='POST'){const input=await readBody(request);if(input.usageOwner!==undefined&&input.usageOwner!==onlineKey)fail('ログイン先が変わりました。使用実績を再確認してください。',409);const result=await PlayProgress.save(db,onlineKey,input,now,key,onlineKey);if(result.rejected?.length)console.warn(JSON.stringify({kind:'play-progress-validation',code:'EVENT_REJECTED',count:result.rejected.length,codes:[...new Set(result.rejected.map(e=>e.code))]}));return json({...result,usageOwner:onlineKey});}
 if(path==='/api/replays'&&request.method==='GET')return json(await Replays.list(db,onlineKey));
 if(path==='/api/replays'&&request.method==='POST')return json(await Replays.save(db,onlineKey,await readBody(request,524400)));
 const replayPath=path.match(/^\/api\/replays\/([A-Za-z0-9_-]{1,100})$/);if(replayPath&&request.method==='GET')return json(await Replays.read(db,onlineKey,replayPath[1]));
 const favoritePath=path.match(/^\/api\/replays\/([A-Za-z0-9_-]{1,100})\/favorite$/);if(favoritePath&&request.method==='PUT')return json(await Replays.setFavorite(db,onlineKey,favoritePath[1],await readBody(request)));
 if(path==='/api/challenges/records'&&request.method==='GET')return json(await Leaderboards.ownChallenges(db,onlineKey));
 if(path==='/api/challenges/score'&&request.method==='POST')return json(await Leaderboards.saveChallenge(db,onlineKey,key,await readBody(request),now));
 if(path==='/api/online/stats'&&request.method==='GET')return json({...await Online.stats(db,onlineKey,Online.rule(url.searchParams.get('rule')||undefined)),achievementProgress:await onlinePeak(db,key,now)});
 if(path==='/api/online/queue'&&['GET','POST'].includes(request.method)){
  const queued=await Online.queue(db,onlineKey,key,request.method,request.method==='POST'?await readBody(request):null,now);
  if(queued.room){queued.room=await Online.touch(db,queued.room,onlineKey,now);queued.room=await roomView(db,queued.room,onlineKey);}return json(queued);
 }
 if(path==='/api/online/cancel'&&request.method==='POST'){const result=await Online.cancel(db,onlineKey,now);if(result.room)result.room=await roomView(db,result.room,onlineKey);return json(result);}
 if(path==='/api/friends'&&request.method==='GET'){await playerCode(db,key);return json(await friendList(db,key));}
 if(path==='/api/friends/request'&&request.method==='POST'){const input=await readBody(request);if(!await db.first('SELECT key FROM player_profiles WHERE key=?',key))fail('先にプレイヤー名を保存してください。');return json(await friendshipAction(db,key,'request',input.code,now));}
 const friendAction=path.match(/^\/api\/friends\/([A-Z2-9]{8})\/(accept|remove)$/);
 if(friendAction&&request.method==='POST')return json(await friendshipAction(db,key,friendAction[2],friendAction[1],now));
 const friendCpu=path.match(/^\/api\/friends\/([A-Z2-9]{8})\/cpu$/);
 if(friendCpu&&request.method==='GET'){const target=await requireFriend(db,key,friendCpu[1]),saved=await db.first('SELECT payload FROM friend_setups WHERE key=?',target.other),profile=await db.first('SELECT payload FROM player_profiles WHERE key=?',target.other);if(!saved||!profile)fail('フレンドが対戦用の編成を保存すると腕試しに挑戦できます。',404);const team=validGame(()=>Game.roster(JSON.parse(saved.payload)));return json({code:friendCpu[1],profile:Leaderboards.publicProfile(JSON.parse(profile.payload)),team,cpuDifficulty:'hard'});}
 if(path==='/api/friends/setup'){
  if(request.method==='GET'){const row=await db.first('SELECT payload FROM friend_setups WHERE key=?',key);return json({setup:row?Game.normalizeTeam(JSON.parse(row.payload)):null});}
  if(request.method!=='PUT')fail('この操作は使用できません。',405);const input=await readBody(request);validGame(()=>Game.roster(input));
  if(input.items.some(i=>!/^inst_[A-Za-z0-9_-]{1,90}$/.test(i.instanceId||''))||new Set(input.items.map(i=>i.instanceId)).size!==3)fail('所持文字を3体選んでください。');
  const setup={items:input.items.map(i=>({instanceId:i.instanceId,char:i.char,level:i.level,equippedReadings:[...new Set(i.equippedReadings)]})),formation:input.formation||null};
  await db.run('INSERT INTO friend_setups (key,payload) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload',key,JSON.stringify(setup));return json({setup});
 }
 if(path==='/api/friends/rooms'&&request.method==='POST'){
  const input=await readBody(request),ruleSet=Online.rule(input.ruleSet,'free'),team=Online.roster(input,ruleSet),row=await db.first('SELECT payload FROM player_profiles WHERE key = ?',key);if(!row)fail('先にプレイヤー名とアイコンを保存してください。');
  await db.run('DELETE FROM friend_rooms WHERE expires_at < ?',now);
  const target=input.friendCode?await requireFriend(db,key,input.friendCode):null;const host=JSON.stringify({profile:Leaderboards.publicProfile(JSON.parse(row.payload)),...team});
  for(let attempt=0;attempt<5;attempt++){const code=randomCode();
   const result=await db.run('INSERT OR IGNORE INTO friend_rooms (code,host_key,host,status,revision,expires_at,rule_set) VALUES (?,?,?,\'waiting\',0,?,?)',code,key,host,now+15*60000,ruleSet);if(result.meta.changes){if(target)await db.run('UPDATE friend_connections SET invite_code=?,invited_by=?,updated_at=? WHERE left_key=? AND right_key=? AND status=\'accepted\'',code,key,now,target.left,target.right);return json(view(await db.first('SELECT * FROM friend_rooms WHERE code = ?',code),key),201);}
  }fail('部屋を作成できませんでした。もう一度お試しください。',503);
 }
 const match=path.match(/^\/api\/friends\/rooms\/([A-Z2-9]{8})(?:\/(join|shot|leave|rematch|roster|rules|ready))?$/);if(!match)fail('対戦部屋が見つかりません。',404);
 const [,code,action]=match;let room=await db.first('SELECT * FROM friend_rooms WHERE code = ?',code);if(!room||room.expires_at<now)fail('部屋が見つからないか、期限が切れています。新しい部屋を作成してください。',404);
 const roomKey=room.mode==='online'?onlineKey:key,member=room.host_key===roomKey||room.guest_key===roomKey;
 if(member&&room.mode==='online')room=await Online.touch(db,room,roomKey,now);
 if(action==='rules'&&request.method==='GET'){if(room.mode==='online')fail('オンライン対戦には自動マッチから参加してください。',403);return json({ruleSet:Rules.roomRule(room),status:room.status});}
 if(action==='join'&&request.method==='POST'){
  if(room.mode==='online')fail('オンライン対戦には自動マッチから参加してください。',403);if(member)return json(await roomView(db,room,roomKey));if(room.status!=='waiting'||room.guest_key)fail('この部屋はすでに対戦中です。',409);
  const input=await readBody(request),team=Online.roster(input,Rules.roomRule(room)),row=await db.first('SELECT payload FROM player_profiles WHERE key = ?',key);if(!row)fail('先にプレイヤー名とアイコンを保存してください。');
  const guest={profile:Leaderboards.publicProfile(JSON.parse(row.payload)),...team};
  const result=await db.run('UPDATE friend_rooms SET guest_key=?,guest=?,state=NULL,status=\'preparing\',ready=\'[false,false]\',revision=revision+1,expires_at=? WHERE code=? AND guest_key IS NULL AND status=\'waiting\'',key,JSON.stringify(guest),now+5*60000,code);if(!result.meta.changes)fail('ほかのプレイヤーが先に参加しました。',409);return json(await roomView(db,await db.first('SELECT * FROM friend_rooms WHERE code = ?',code),roomKey));
 }
 if(!member)fail('この対戦部屋には参加していません。',403);
 if(!action&&request.method==='GET'){
  const since=url.searchParams.get('since');
  if(since!==null&&/^\d+$/.test(since)&&Number(since)===room.revision){
   if(room.mode==='online'&&room.status==='finished')await Online.settle(db,room);
   return json({unchanged:true,code:room.code,revision:room.revision,status:room.status,deadline:room.deadline||0,graceUntil:room.grace_until||0,serverNow:now});
  }
  return json(await roomView(db,room,roomKey));
 }
 if(action==='leave'&&request.method==='POST'){
  if(room.mode==='online'&&['preparing','playing'].includes(room.status)&&!room.departed)fail('マッチ成立後は対局終了まで退出できません。',409);
  if(room.departed||room.status==='closed')return json(await roomView(db,room,roomKey));const state=room.state?JSON.parse(room.state):null;if(state&&!state.finished){state.finished=true;state.winner=room.host_key===roomKey?1:0;state.reason='退出';state.replay=null;}
  const result=await db.run('UPDATE friend_rooms SET status=?,state=?,departed=1,ready=\'[false,false]\',revision=revision+1 WHERE code=? AND revision=?',state?'finished':'closed',state?JSON.stringify(state):null,code,room.revision);if(!result.meta.changes)fail('対局が更新されました。もう一度退出してください。',409);return json(await roomView(db,await db.first('SELECT * FROM friend_rooms WHERE code = ?',code),roomKey));
 }
 if(['ready','rematch','roster'].includes(action)&&request.method==='POST'){return json(await roomView(db,await Preparation.change(db,room,roomKey,action,await readBody(request),now,key),roomKey));}
 if(action==='shot'&&request.method==='POST'){
  const input=await readBody(request),state=room.state?JSON.parse(room.state):null,side=room.host_key===roomKey?0:1;
  if(!/^[a-f0-9]{32}$/.test(input.id||''))fail('発射内容を確認してください。');
  if(state?.lastShot?.id===input.id&&state.lastShot.side===side)return json(await roomView(db,room,roomKey));
  if(room.status!=='playing'||!state)fail('対局は終了しています。',409);
  if(input.revision!==room.revision||state.turn!==side)fail('盤面が更新されました。現在の番を確認してください。',409);
  const next=validGame(()=>Game.play(state,input,side)),log=Replays.append(room.replay_log,next,side,input);const result=await db.run('UPDATE friend_rooms SET state=?,replay_log=?,status=?,revision=revision+1,expires_at=?,deadline=?,grace_until=?,reconnect_used=0 WHERE code=? AND revision=?',JSON.stringify(next),log,next.finished?'finished':'playing',now+60*60000,room.mode==='online'?now+30000:0,room.mode==='online'?now+90000:0,code,room.revision);if(!result.meta.changes)fail('発射はすでに受け付けられています。盤面を確認してください。',409);return json(await roomView(db,await db.first('SELECT * FROM friend_rooms WHERE code = ?',code),roomKey));
 }
 fail('この操作は使用できません。',405);
}
export default {async fetch(request,env){
 const path=new URL(request.url).pathname;if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
 const start=performance.now(),requestId=crypto.randomUUID();let response,code='OK';
 try{response=await api(request,env);}catch(error){code=error.code||('HTTP_'+(error.status||503));response=json({error:error.status?error.message:'保存・対戦に接続できません。時間をおいて再度お試しください。',code,requestId},error.status||503);if(error.retryAfter)response.headers.set('Retry-After',String(error.retryAfter));}
 const duration=Math.round((performance.now()-start)*100)/100;response.headers.set('Server-Timing','app;dur='+duration);response.headers.set('X-Kanji-Request-Id',requestId);
 // All failures and 1% of successful requests, with no query, user ID or request body.
 if(response.status>=400||parseInt(requestId.slice(0,4),16)%100===0){const route=path.replace(/\/rooms\/[A-Z2-9]{8}/g,'/rooms/:code').replace(/\/friends\/[A-Z2-9]{8}/g,'/friends/:code').replace(/\/replays\/[^/]+/g,'/replays/:id').replace(/\/backups\/\d+/g,'/backups/:revision');console[response.status>=500?'error':response.status>=400?'warn':'log'](JSON.stringify({kind:'kanji-api',route,method:request.method,status:response.status,code,ms:duration,requestId}));}
 return response;
}};
