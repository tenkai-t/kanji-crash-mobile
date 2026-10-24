import Game from './game.cjs';
import Rules from '../dist/online-rules.js';
import {publicProfile,publicTeam} from './leaderboards.mjs';
import {randomCode} from './friends.mjs';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export function rule(value,fallback='balanced'){if(value===undefined)return fallback;if(!Rules.validRule(value))fail('対戦ルールを選び直してください。');return value;}
const statsKey=(key,ruleSet)=>ruleSet==='free'?'free:'+key:key;
export async function stats(db,key,ruleSet='balanced'){key=statsKey(key,ruleSet);let value=await db.first('SELECT rating,wins,losses,draws FROM online_stats WHERE key=?',key);if(!value){await db.run('INSERT OR IGNORE INTO online_stats (key) VALUES (?)',key);value=await db.first('SELECT rating,wins,losses,draws FROM online_stats WHERE key=?',key);}return {...value,rank:Rules.rank(value.rating)};}
export function roster(input,ruleSet=rule(input?.ruleSet)){let team;try{team=Game.roster({...input,items:ruleSet==='balanced'?input?.items?.map(i=>({...i,level:Rules.level})):input?.items});}catch(e){fail(e.message);}const cost=Rules.total(team.items);if(ruleSet==='balanced'&&cost>Rules.budget)fail(`編成コストは${Rules.budget}以内にしてください（現在${cost}）。文字や装備ルビを変更できます。`);return {...team,cost};}
export async function saveLineup(db,room){if(room.mode!=='online'||!room.state)return;const ruleSet=Rules.roomRule(room);for(const [key,raw] of [[room.host_key,room.host],[room.guest_key,room.guest]]){if(!key||!raw)continue;const team=JSON.parse(raw),profile=JSON.stringify(publicProfile(team.profile)),items=JSON.stringify(publicTeam(team));await stats(db,key,ruleSet);await db.run('UPDATE online_stats SET profile=?,team=? WHERE key=? AND (profile IS NULL OR profile<>? OR team IS NULL OR team<>?)',profile,items,statsKey(key,ruleSet),profile,items);}}
export async function settle(db,room){
 if(room.mode!=='online'||room.status!=='finished'||!room.state)return null;const state=JSON.parse(room.state);if(!state.finished)return null;
 const ruleSet=Rules.roomRule(room);let result=await db.first('SELECT * FROM online_results WHERE code=?',room.code);
 if(result?.applied)return result;
 if(!result){await saveLineup(db,room);const [a,b]=await Promise.all([stats(db,room.host_key,ruleSet),stats(db,room.guest_key,ruleSet)]),expected=1/(1+10**((b.rating-a.rating)/400)),score=state.winner===null?.5:state.winner===0?1:0,delta=Math.round(24*(score-expected));result={host_delta:Math.max(800-a.rating,delta),guest_delta:Math.max(800-b.rating,-delta),winner:state.winner};}
 await db.batch([
  ['INSERT OR IGNORE INTO online_results (code,host_key,guest_key,host_delta,guest_delta,winner) VALUES (?,?,?,?,?,?)',room.code,room.host_key,room.guest_key,result.host_delta,result.guest_delta,state.winner],
  ['UPDATE online_stats SET rating=rating+(SELECT host_delta FROM online_results WHERE code=?),wins=wins+?,losses=losses+?,draws=draws+? WHERE key=? AND EXISTS(SELECT 1 FROM online_results WHERE code=? AND applied=0)',room.code,state.winner===0?1:0,state.winner===1?1:0,state.winner===null?1:0,statsKey(room.host_key,ruleSet),room.code],
  ['UPDATE online_stats SET rating=rating+(SELECT guest_delta FROM online_results WHERE code=?),wins=wins+?,losses=losses+?,draws=draws+? WHERE key=? AND EXISTS(SELECT 1 FROM online_results WHERE code=? AND applied=0)',room.code,state.winner===1?1:0,state.winner===0?1:0,state.winner===null?1:0,statsKey(room.guest_key,ruleSet),room.code],
  ['UPDATE online_results SET applied=1 WHERE code=?',room.code]
 ]);
 return await db.first('SELECT host_delta,guest_delta FROM online_results WHERE code=?',room.code);
}
export async function touch(db,room,key,now){
 if(room.mode!=='online'||room.status!=='playing')return room;
 const state=JSON.parse(room.state),side=room.host_key===key?0:1,seen=state.turn===0?room.seen_host:room.seen_guest,ownSeen=side===0?room.seen_host:room.seen_guest;
 // A disconnected player has 60 seconds from the last heartbeat to return.
 const disconnect=now-seen>8000,expires=disconnect?Math.min(room.grace_until,Math.max(room.deadline,seen+60000)):room.deadline;
 if(now>=expires){state.finished=true;state.winner=1-state.turn;state.reason=disconnect?'再接続期限':'持ち時間切れ';state.replay=null;await db.run("UPDATE friend_rooms SET state=?,status='finished',revision=revision+1 WHERE code=? AND revision=? AND status='playing'",JSON.stringify(state),room.code,room.revision);return await db.first('SELECT * FROM friend_rooms WHERE code=?',room.code);}
 const returning=state.turn===side&&now>room.deadline&&now-ownSeen>8000&&!room.reconnect_used;
 // Keep checking the clock on every read, but persist at most one heartbeat per 3s.
 if(!returning&&now-ownSeen<3000)return room;
 const seenColumn=side===0?'seen_host':'seen_guest';
 await db.run(`UPDATE friend_rooms SET ${seenColumn}=?,deadline=?,reconnect_used=? WHERE code=? AND revision=? AND status='playing' AND deadline=? AND reconnect_used=?`,now,returning?Math.min(room.grace_until,now+5000):room.deadline,returning?1:room.reconnect_used,room.code,room.revision,room.deadline,room.reconnect_used);
 return await db.first('SELECT * FROM friend_rooms WHERE code=?',room.code);
}
export const candidateQuery=lower=>`SELECT * FROM online_queue INDEXED BY idx_online_queue_rating
 WHERE rule_set=? AND room_code IS NULL AND rating ${lower?'<':'>='} ? AND rating ${lower?'>=':'<='} ? AND touched_at>=? AND key<>?
 AND ${lower?'? - rating':'rating - ?'} <= MAX(?,MIN(2000,120+CAST(MAX(0,(?-joined_at)/1000) AS INTEGER)*25))
 ORDER BY rating ${lower?'DESC':'ASC'},joined_at ASC,key ASC LIMIT 12`;
async function queued(db,key,now,own){
 if(!own)return {status:'idle'};
 if(own.room_code){let room=await db.first('SELECT * FROM friend_rooms WHERE code=?',own.room_code);if(!room||room.expires_at<now){await db.run('DELETE FROM online_queue WHERE key=? AND room_code=?',key,own.room_code);return {status:'idle'};}return {status:'matched',room};}
 if(own.touched_at<now-45000){await db.run('DELETE FROM online_queue WHERE key=? AND room_code IS NULL AND touched_at<?',key,now-45000);return {status:'idle'};}
 if(now-own.touched_at>=10000)await db.run('UPDATE online_queue SET touched_at=? WHERE key=? AND room_code IS NULL',now,key);
 const wait=(now-own.joined_at)/1000,range=Rules.range(wait);
 // Search each side of the RP index; a long-waiting peer can use its wider range.
 const bands=await Promise.all([true,false].map(lower=>db.all(candidateQuery(lower),own.rule_set,own.rating,own.rating+(lower?-2000:2000),now-45000,key,own.rating,range,now)));
 const candidates=bands.flat().sort((a,b)=>Math.abs(a.rating-own.rating)-Math.abs(b.rating-own.rating)||a.joined_at-b.joined_at||a.key.localeCompare(b.key)).slice(0,12);
 for(const peer of candidates){if(Math.abs(peer.rating-own.rating)>Math.max(range,Rules.range((now-peer.joined_at)/1000)))continue;
  const host=Game.normalizeTeam(JSON.parse(peer.player)),guest=Game.normalizeTeam(JSON.parse(own.player)),code=randomCode();
  await db.batch([
   ["INSERT OR IGNORE INTO friend_rooms (code,host_key,guest_key,host,guest,state,status,revision,expires_at,mode,deadline,grace_until,seen_host,seen_guest,rule_set) SELECT ?,?,?,?, ?,NULL,'preparing',1,?,'online',0,0,?,?,? WHERE EXISTS(SELECT 1 FROM online_queue WHERE key=? AND room_code IS NULL AND touched_at>=? AND rule_set=?) AND EXISTS(SELECT 1 FROM online_queue WHERE key=? AND room_code IS NULL AND touched_at>=? AND rule_set=?)",code,peer.key,key,JSON.stringify(host),JSON.stringify(guest),now+5*60000,now,now,own.rule_set,peer.key,now-45000,own.rule_set,key,now-45000,own.rule_set],
   ['UPDATE online_queue SET room_code=? WHERE key IN (?,?) AND room_code IS NULL AND EXISTS(SELECT 1 FROM friend_rooms WHERE code=? AND host_key=? AND guest_key=?)',code,peer.key,key,code,peer.key,key]
  ]);
  own=await db.first('SELECT * FROM online_queue WHERE key=?',key);if(!own)return {status:'idle'};if(own.room_code)return {status:'matched',room:await db.first('SELECT * FROM friend_rooms WHERE code=?',own.room_code)};
 }
 own=await db.first('SELECT * FROM online_queue WHERE key=?',key);if(!own)return {status:'idle'};if(own.room_code)return {status:'matched',room:await db.first('SELECT * FROM friend_rooms WHERE code=?',own.room_code)};return {status:'waiting',ruleSet:own.rule_set,joinedAt:own.joined_at,serverNow:now,range};
}
export async function queue(db,key,profileKey,method,input,now){
 let own=await db.first('SELECT * FROM online_queue WHERE key=?',key);
 if(own?.room_code){const room=await db.first('SELECT * FROM friend_rooms WHERE code=?',own.room_code);if(room&&room.expires_at>=now&&['preparing','playing'].includes(room.status))return {status:'matched',room};if(method==='GET')return queued(db,key,now,own);if(room)await settle(db,room);await db.run('DELETE FROM online_queue WHERE key=? AND room_code=?',key,own.room_code);own=null;}
 if(method==='POST'){
  // Only server-stored PvP RP for this rule determines the search band.
  // CPU RP, CPU rank and client-supplied rating never gate a match.
  const ruleSet=rule(input?.ruleSet),team=roster(input,ruleSet),row=await db.first('SELECT payload FROM player_profiles WHERE key=?',profileKey);if(!row)fail('プレイヤー設定を保存してください。');const rating=await stats(db,key,ruleSet),player={profile:publicProfile(JSON.parse(row.payload)),...team};
  await db.run('INSERT INTO online_queue (key,player,rating,joined_at,touched_at,rule_set) VALUES (?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET player=excluded.player,rating=excluded.rating,touched_at=excluded.touched_at,rule_set=excluded.rule_set,joined_at=CASE WHEN online_queue.touched_at<? OR online_queue.rule_set<>excluded.rule_set THEN excluded.joined_at ELSE online_queue.joined_at END WHERE online_queue.room_code IS NULL',key,JSON.stringify(player),rating.rating,now,now,ruleSet,now-45000);
  own=await db.first('SELECT * FROM online_queue WHERE key=?',key);
 }
 return queued(db,key,now,own);
}
export async function cancel(db,key,now){await db.run('DELETE FROM online_queue WHERE key=? AND room_code IS NULL',key);const own=await db.first('SELECT room_code FROM online_queue WHERE key=?',key);if(own?.room_code){const room=await db.first('SELECT * FROM friend_rooms WHERE code=?',own.room_code);if(room&&['preparing','playing'].includes(room.status))return {status:'matched',room};await db.run('DELETE FROM online_queue WHERE key=? AND room_code=?',key,own.room_code);}return {status:'idle'};}
