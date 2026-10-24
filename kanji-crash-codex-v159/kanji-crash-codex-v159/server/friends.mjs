import {publicProfile} from './leaderboards.mjs';
export const friendLimit=50;
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const randomCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(8)),n=>alphabet[n%alphabet.length]).join('');
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const pair=(a,b)=>[a,b].sort();
export async function playerCode(db,key){
 const existing=await db.first('SELECT code FROM friend_players WHERE key=?',key);if(existing)return existing.code;
 for(let n=0;n<5;n++){await db.run('INSERT OR IGNORE INTO friend_players (key,code) VALUES (?,?)',key,randomCode());const row=await db.first('SELECT code FROM friend_players WHERE key=?',key);if(row)return row.code;}
 fail('フレンドコードを作成できませんでした。もう一度お試しください。',503);
}
export async function connection(db,key,code){
 if(!/^[A-Z2-9]{8}$/.test(code||''))fail('8文字のフレンドコードを入力してください。');
 const other=await db.first('SELECT key FROM friend_players WHERE code=?',code);if(!other)fail('フレンドコードが見つかりません。',404);if(other.key===key)fail('自分のコードは登録できません。');
 const [left,right]=pair(key,other.key),row=await db.first('SELECT * FROM friend_connections WHERE left_key=? AND right_key=?',left,right);
 return {left,right,other:other.key,row};
}
export async function friendList(db,key){
 const code=await playerCode(db,key),rows=await db.all('SELECT * FROM friend_connections WHERE left_key=? OR right_key=? ORDER BY updated_at DESC',key,key),entries=[];
 for(const row of rows){const other=row.left_key===key?row.right_key:row.left_key,p=await db.first('SELECT p.payload,f.code FROM player_profiles p JOIN friend_players f ON f.key=p.key WHERE p.key=?',other);if(!p)continue;
  let invitation=null;if(row.status==='accepted'&&row.invited_by===other&&row.invite_code){const room=await db.first('SELECT code FROM friend_rooms WHERE code=? AND host_key=? AND status=\'waiting\' AND guest_key IS NULL AND expires_at>?',row.invite_code,other,Date.now());if(room)invitation=room.code;}
  const saved=JSON.parse(p.payload);entries.push({code:p.code,profile:publicProfile(saved),status:row.status==='accepted'?'accepted':row.requested_by===key?'outgoing':'incoming',invitation});
 }
 return {code,entries,limit:friendLimit};
}
export async function friendInvitations(db,key,now){
 // One indexed read for the global notice; do not fetch every friend's roster.
 const rows=await db.all("SELECT r.code,p.payload FROM friend_connections c JOIN friend_rooms r ON r.code=c.invite_code JOIN player_profiles p ON p.key=c.invited_by WHERE (c.left_key=? OR c.right_key=?) AND c.status='accepted' AND c.invited_by<>? AND r.host_key=c.invited_by AND r.status='waiting' AND r.guest_key IS NULL AND r.expires_at>? ORDER BY c.updated_at DESC LIMIT 100",key,key,key,now);
 return {invitations:rows.map(row=>({code:row.code,profile:publicProfile(JSON.parse(row.payload))}))};
}
const acceptedCount=async(db,key)=>(await db.first("SELECT COUNT(*) AS count FROM friend_connections WHERE status='accepted' AND (left_key=? OR right_key=?)",key,key)).count;
async function checkCapacity(db,key,other){if(await acceptedCount(db,key)>=friendLimit)fail('フレンドは50人までです。登録を解除してから追加してください。',409);if(await acceptedCount(db,other)>=friendLimit)fail('相手のフレンド登録数が上限の50人に達しています。',409);}
export async function friendshipAction(db,key,action,code,now){
 const c=await connection(db,key,code);
 if(action==='request'){
  if(!c.row){await checkCapacity(db,key,c.other);const count=await db.first('SELECT COUNT(*) AS count FROM friend_connections WHERE left_key=? OR right_key=?',key,key);if(count.count>=100)fail('フレンドと申請は合計100件まで登録できます。');
   const countOther=await db.first('SELECT COUNT(*) AS count FROM friend_connections WHERE left_key=? OR right_key=?',c.other,c.other);if(countOther.count>=100)fail('相手の申請件数が上限に達しています。');
   const inserted=await db.run("INSERT OR IGNORE INTO friend_connections (left_key,right_key,requested_by,status,updated_at) SELECT ?,?,?,'requested',? WHERE (SELECT COUNT(*) FROM friend_connections WHERE status='accepted' AND (left_key=? OR right_key=?))<50 AND (SELECT COUNT(*) FROM friend_connections WHERE status='accepted' AND (left_key=? OR right_key=?))<50 AND (SELECT COUNT(*) FROM friend_connections WHERE left_key=? OR right_key=?)<100 AND (SELECT COUNT(*) FROM friend_connections WHERE left_key=? OR right_key=?)<100",c.left,c.right,key,now,key,key,c.other,c.other,key,key,c.other,c.other);
   if(!inserted.meta.changes&&!await db.first('SELECT status FROM friend_connections WHERE left_key=? AND right_key=?',c.left,c.right))fail('フレンドまたは申請件数が上限に達しました。一覧を更新してください。',409);
  }
 }else if(action==='accept'){
  if(!c.row)fail('申請が見つかりません。',404);if(c.row.status!=='accepted'&&c.row.requested_by===key)fail('相手の承認を待っています。',409);
  if(c.row.status!=='accepted'){await checkCapacity(db,key,c.other);const updated=await db.run("UPDATE friend_connections SET status='accepted',updated_at=? WHERE left_key=? AND right_key=? AND status='requested' AND (SELECT COUNT(*) FROM friend_connections WHERE status='accepted' AND (left_key=? OR right_key=?))<50 AND (SELECT COUNT(*) FROM friend_connections WHERE status='accepted' AND (left_key=? OR right_key=?))<50",now,c.left,c.right,key,key,c.other,c.other);if(!updated.meta.changes){const current=await db.first('SELECT status FROM friend_connections WHERE left_key=? AND right_key=?',c.left,c.right);if(current?.status!=='accepted')fail('フレンド上限に達したか申請が変更されました。一覧を更新してください。',409);}}
 }else if(action==='remove')await db.run('DELETE FROM friend_connections WHERE left_key=? AND right_key=?',c.left,c.right);
 return friendList(db,key);
}
export async function requireFriend(db,key,code){const c=await connection(db,key,code);if(c.row?.status!=='accepted')fail('承認済みのフレンドを選んでください。',403);return c;}
