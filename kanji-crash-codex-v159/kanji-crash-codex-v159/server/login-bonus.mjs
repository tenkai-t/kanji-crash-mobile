// Server clock only. Amounts explicitly approved by the owner on 2026-10-25.
export const rewards = Object.freeze([{coins:2000,fragments:0},{coins:0,fragments:10},{coins:3000,fragments:0},{coins:0,fragments:20},{coins:5000,fragments:20},{coins:0,fragments:30},{coins:10000,fragments:50}]);
export const proposal = rewards;
export function japanDay(now){return Math.floor((now+9*3600000)/86400000);}
const fail=(message,status=409)=>{throw Object.assign(Error(message),{status});};
const schemas=new WeakMap();
export async function schema(db){const key=db.schemaToken||db;if(schemas.has(key))return schemas.get(key);const pending=db.run('CREATE TABLE IF NOT EXISTS login_bonus_claims (player_id TEXT NOT NULL, day INTEGER NOT NULL, ordinal INTEGER NOT NULL, coins INTEGER NOT NULL, fragments INTEGER NOT NULL, PRIMARY KEY(player_id,day), UNIQUE(player_id,ordinal))');schemas.set(key,pending);try{await pending;}catch(error){schemas.delete(key);throw error;}}
export async function status(db,guest,now=Date.now(),schedule=rewards){
 await schema(db);const row=await db.first('SELECT COUNT(*) AS count, MAX(day) AS lastDay FROM login_bonus_claims WHERE player_id=?',guest.id);
 const count=Number(row.count),day=japanDay(now);
 return {serverNow:now,enabled:!!schedule,received:row.lastDay!==null&&Number(row.lastDay)>=day,ordinal:count,next:count%7+1,day,nextResetAt:(day+1)*86400000-9*3600000,rewards:schedule||proposal};
}
export async function claim(db,guest,input,now=Date.now(),schedule=rewards){
 if(!schedule)fail('ログインボーナスは報酬量の確認待ちです。',503);
 const current=await status(db,guest,now,schedule);
 if(current.received)return {...current,alreadyReceived:true};
 const row=await db.first('SELECT snapshot,revision FROM guest_players WHERE id=?',guest.id);
 if(!row?.snapshot||input.revision!==row.revision)fail('最新のデータをサーバーに保存してから受け取ってください。');
 const old=JSON.parse(row.snapshot),count=await db.first('SELECT COUNT(*) AS count FROM login_bonus_claims WHERE player_id=?',guest.id),ordinal=Number(count.count)+1,reward=schedule[(ordinal-1)%7];
 if(!reward||![reward.coins,reward.fragments].every(n=>Number.isSafeInteger(n)&&n>=0))fail('報酬設定を確認してください。',503);
 const state={...old,coins:old.coins+reward.coins,characterFragments:(old.characterFragments||0)+reward.fragments,loginBonusOrdinal:ordinal};
 if(!Number.isSafeInteger(state.coins)||!Number.isSafeInteger(state.characterFragments))fail('保存値を確認してください。');
 const result=await db.batch([
 ['INSERT OR IGNORE INTO login_bonus_claims(player_id,day,ordinal,coins,fragments) SELECT id,?,?,?,? FROM guest_players WHERE id=? AND revision=?',current.day,ordinal,reward.coins,reward.fragments,guest.id,row.revision],
 ['UPDATE guest_players SET snapshot=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND EXISTS(SELECT 1 FROM login_bonus_claims WHERE player_id=? AND day=? AND ordinal=?)',JSON.stringify(state),now,guest.id,row.revision,guest.id,current.day,ordinal]
 ]);
 if(!result[0].meta.changes||!result[1].meta.changes)fail('受取状況が更新されました。最新の保存データを確認してください。');
 return {state,revision:row.revision+1,savedAt:now,reward,...await status(db,guest,now,schedule)};
}
// A stale client must not overwrite a server reward after a lost response.
export async function protectSave(db,guest,state){
 await schema(db);const row=await db.first('SELECT MAX(ordinal) AS ordinal FROM login_bonus_claims WHERE player_id=?',guest.id);
 if((state.loginBonusOrdinal||0)!==(Number(row.ordinal)||0))fail('ログイン報酬の保存状態が異なります。復元コードから最新データを確認してください。');
}

// Explicit owner action: preserve device progress, acknowledge existing receipts,
// and archive the former server snapshot. No receipt or reward is issued here.
export async function reconcileDevice(db,guest,input,now=Date.now()){
 await schema(db);
 if(input.confirmPreserveDevice!==true)fail('端末データを維持する確認が必要です。',400);
 const local=input.state;
 if(!local||!Array.isArray(local.inventory)||!Array.isArray(local.deck)||local.deck.length>3||!Number.isSafeInteger(local.coins)||local.coins<0||!Number.isFinite(local.rating)||!Number.isSafeInteger(local.characterFragments??0)||(local.characterFragments??0)<0)fail('端末の保存内容を確認してください。',400);
 const received=await db.first('SELECT MAX(ordinal) AS ordinal FROM login_bonus_claims WHERE player_id=?',guest.id),ordinal=Number(received.ordinal)||0,localOrdinal=local.loginBonusOrdinal||0;
 if(!Number.isSafeInteger(localOrdinal)||localOrdinal<0||localOrdinal>=ordinal||input.ordinal!==ordinal)fail('受取状況が変わりました。もう一度確認してください。');
 const row=await db.first('SELECT snapshot,revision,updated_at FROM guest_players WHERE id=?',guest.id),state={...local,loginBonusOrdinal:ordinal},raw=JSON.stringify(state);
 if(row?.snapshot===raw)return {state,revision:row.revision,savedAt:row.updated_at,reconciled:true};
 if(!row?.snapshot||row.revision!==input.revision||(JSON.parse(row.snapshot).loginBonusOrdinal||0)!==ordinal)fail('サーバーの保存内容が変わりました。もう一度確認してください。');
 if((JSON.parse(row.snapshot).giftClaims||[]).some(id=>!(local.giftClaims||[]).includes(id)))fail('サーバーにだけあるギフト受取履歴が見つかりました。履歴を保護するため修復を停止しました。');
 const result=await db.batch([
 ['INSERT OR IGNORE INTO guest_backups(player_id,revision,snapshot,saved_at) SELECT id,revision,snapshot,updated_at FROM guest_players WHERE id=? AND revision=? AND COALESCE((SELECT MAX(ordinal) FROM login_bonus_claims WHERE player_id=?),0)=?',guest.id,row.revision,guest.id,ordinal],
 ['UPDATE guest_players SET snapshot=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND COALESCE((SELECT MAX(ordinal) FROM login_bonus_claims WHERE player_id=?),0)=?',raw,now,guest.id,row.revision,guest.id,ordinal]
 ]);
 if(!result[1].meta.changes)fail('保存または受取状況が変わりました。もう一度確認してください。');
 return {state,revision:row.revision+1,savedAt:now,reconciled:true};
}
