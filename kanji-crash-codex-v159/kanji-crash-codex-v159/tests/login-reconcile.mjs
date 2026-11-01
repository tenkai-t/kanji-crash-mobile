import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {claim,reconcileDevice,protectSave} from '../server/login-bonus.mjs';
const sql=new DatabaseSync(':memory:');sql.exec('CREATE TABLE guest_players(id TEXT PRIMARY KEY,snapshot TEXT,revision INTEGER,updated_at INTEGER);CREATE TABLE guest_backups(player_id TEXT,revision INTEGER,snapshot TEXT,saved_at INTEGER,PRIMARY KEY(player_id,revision))');
const db={run:async(q,...a)=>({meta:{changes:Number(sql.prepare(q).run(...a).changes)}}),first:async(q,...a)=>sql.prepare(q).get(...a)||null,batch:async queries=>{sql.exec('BEGIN');try{const results=queries.map(([q,...a])=>({meta:{changes:Number(sql.prepare(q).run(...a).changes)}}));sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const guest={id:'synthetic'},old={coins:100,characterFragments:8,rating:1200,inventory:[{instanceId:'inst_old'}],deck:['inst_old'],giftClaims:['keep'],cpuPromotions:{unlocked:1}};sql.prepare('INSERT INTO guest_players VALUES(?,?,0,0)').run(guest.id,JSON.stringify(old));
const now=Date.parse('2026-11-01T01:00:00Z');await claim(db,guest,{revision:0},now);const remote=sql.prepare('SELECT * FROM guest_players').get(),receipts=sql.prepare('SELECT * FROM login_bonus_claims').all();
const local={...old,coins:77,rating:1600,inventory:[...old.inventory,{instanceId:'inst_new',level:19}],deck:['inst_new'],characterFragments:21};const input={state:local,revision:remote.revision,ordinal:1,confirmPreserveDevice:true};
await assert.rejects(reconcileDevice(db,guest,{...input,confirmPreserveDevice:false},now));await assert.rejects(reconcileDevice(db,guest,{...input,revision:999},now));await assert.rejects(reconcileDevice(db,guest,{...input,ordinal:2},now));
await assert.rejects(reconcileDevice(db,guest,{...input,state:{...local,giftClaims:[]}},now),/ギフト受取履歴/);
const r=await reconcileDevice(db,guest,input,now);assert.deepEqual(r.state,{...local,loginBonusOrdinal:1});assert.equal(r.revision,2);await protectSave(db,guest,r.state);assert.deepEqual(sql.prepare('SELECT * FROM login_bonus_claims').all(),receipts);assert.equal(sql.prepare('SELECT snapshot FROM guest_backups WHERE player_id=? AND revision=1').get(guest.id).snapshot,remote.snapshot);
const duplicate=await reconcileDevice(db,guest,input,now);assert.equal(duplicate.revision,2);assert.deepEqual(duplicate.state,r.state);
assert.equal((await claim(db,guest,{revision:2},now)).alreadyReceived,true);assert.equal(JSON.parse(sql.prepare('SELECT snapshot FROM guest_players').get().snapshot).coins,77);
// Claims moving forward while the client reviews must reject the old ordinal.
await claim(db,guest,{revision:2},now+86400000);await assert.rejects(reconcileDevice(db,guest,input,now+86400000));
// Atomic storage failure must retain both the previous snapshot and receipt ledger.
const before=sql.prepare('SELECT * FROM guest_players').get(),beforeBackups=sql.prepare('SELECT * FROM guest_backups').all(),batch=db.batch;db.batch=async queries=>{sql.exec('BEGIN');try{const[q,...args]=queries[0];sql.prepare(q).run(...args);throw Error('synthetic failure');}finally{sql.exec('ROLLBACK');}};
await assert.rejects(reconcileDevice(db,guest,{...input,revision:before.revision,ordinal:2},now),/synthetic failure/);assert.deepEqual(sql.prepare('SELECT * FROM guest_players').get(),before);assert.deepEqual(sql.prepare('SELECT * FROM guest_backups').all(),beforeBackups);db.batch=batch;
sql.close();console.log('PASS explicit confirmation, exact device preservation, no rewards/receipt edits, archived server snapshot, idempotence, stale revision/day and atomic rollback');
