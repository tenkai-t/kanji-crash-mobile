import {publicProfile} from './leaderboards.mjs';
import Game from './game.cjs';
import * as Online from './online.mjs';
import Rules from '../dist/online-rules.js';
import * as Replays from './replays.mjs';
const fail=(message,status=409)=>{throw Object.assign(Error(message),{status});};
export async function change(db,room,key,action,input,now,profileKey){
 const side=room.host_key===key?0:1,blind=room.mode!=='online';let current=room;
 if(action==='ready'&&typeof input.ready!=='boolean')fail('スタートの状態を確認してください。',400);
 if(action==='ready'&&input.round!==undefined&&input.round!==(room.round||1))fail('次の対局が準備されました。確認してからスタートしてください。');
 if(action==='ready'&&!blind&&input.revision!==room.revision){if(room.status==='playing'&&input.ready)return room;if(!Number.isInteger(input.lineupRevision)||input.lineupRevision!==room.lineup_revision)fail('相手の編成が更新されました。確認してからスタートしてください。');}
 if(blind&&action==='ready'&&input.ready&&room.status==='playing')return room;
 for(let attempt=0;attempt<4;attempt++){
  if(current.departed||current.status==='closed')fail('相手が退出しました。新しい部屋を作成してください。');
  const round=current.round||1,host=JSON.parse(current.host),guest=current.guest?JSON.parse(current.guest):null;let ready=JSON.parse(current.ready),status=current.status,state=current.state,nextRound=round;
  if(action==='rematch'){
   if(current.mode==='online')fail('オンライン対戦は次の相手を検索してください。');
   if(input.round===round-1&&['preparing','playing'].includes(current.status))return current;
   if(input.round!==round||current.status!=='finished')fail('部屋の状態を確認してください。');
   await Replays.saveRoom(db,current,now);
   status='preparing';state=null;nextRound++;ready=[false,false];
  }else if(action==='ready'){
   if(current.status!=='preparing')fail('開始前の部屋でスタートしてください。');
   ready[side]=input.ready;
   if(ready.every(Boolean)){status='playing';state=JSON.stringify(Game.initial(host,guest));ready=[false,false];}
  }else if(action==='roster'){
   if(!['waiting','preparing','finished'].includes(current.status)||current.mode==='online'&&current.status!=='preparing')fail('対局中は編成を変更できません。');
   if(blind&&ready[side])fail('準備を取り消してから編成を変更してください。');
   if(input.round!==round||!blind&&current.status==='preparing'&&input.revision!==current.revision&&(!Number.isInteger(input.lineupRevision)||input.lineupRevision!==current.lineup_revision))fail('相手の編成が更新されました。もう一度保存してください。');
   const team=Online.roster(input.team,Rules.roomRule(current)),p=await db.first('SELECT payload FROM player_profiles WHERE key=?',profileKey);if(!p)fail('プレイヤー設定を保存してください。',400);Object.assign(side?guest:host,team,{profile:publicProfile(JSON.parse(p.payload))});if(blind)ready[side]=false;else ready=[false,false];
  }
  const begin=status==='playing'&&current.status!=='playing';
  const replayLog=begin?JSON.stringify(Replays.begin(current,JSON.parse(state),host,guest,nextRound,now)):nextRound!==round?null:current.replay_log,replaySaved=begin||nextRound!==round?0:current.replay_saved;
  const result=await db.run('UPDATE friend_rooms SET host=?,guest=?,ready=?,round=?,state=?,status=?,replay_log=?,replay_saved=?,revision=revision+1,lineup_revision=?,expires_at=?,deadline=?,grace_until=?,seen_host=?,seen_guest=?,reconnect_used=0 WHERE code=? AND revision=? AND departed=0',JSON.stringify(host),guest?JSON.stringify(guest):null,JSON.stringify(ready),nextRound,state,status,replayLog,replaySaved,(current.lineup_revision||0)+(action==='roster'?1:0),status==='preparing'?(current.status==='preparing'?current.expires_at:now+5*60000):now+(status==='playing'||status==='finished'?60:15)*60000,begin&&current.mode==='online'?now+30000:current.deadline,begin&&current.mode==='online'?now+90000:current.grace_until,begin?now:current.seen_host,begin?now:current.seen_guest,current.code,current.revision);
  if(result.meta.changes){const changed=await db.first('SELECT * FROM friend_rooms WHERE code=?',current.code);if(begin)await Online.saveLineup(db,changed);return changed;}
  const fresh=await db.first('SELECT * FROM friend_rooms WHERE code=?',current.code);if(!fresh)fail('部屋が見つかりません。',404);
  // Blind preparation retries only while the caller's own lineup is unchanged.
  if((action==='ready'||blind&&action==='roster')&&(blind?(side?fresh.guest!==room.guest:fresh.host!==room.host):(fresh.host!==room.host||fresh.guest!==room.guest)))fail('相手の編成が更新されました。確認してからスタートしてください。');
  if(action==='ready'&&fresh.status==='playing')return fresh;
  current=fresh;
 }
 fail('部屋が更新されました。もう一度お試しください。');
}
