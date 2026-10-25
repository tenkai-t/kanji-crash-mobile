import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {japanDay,status,claim,protectSave,rewards} from '../server/login-bonus.mjs';
const sql=new DatabaseSync(':memory:');
sql.exec('CREATE TABLE guest_players(id TEXT PRIMARY KEY,snapshot TEXT,revision INTEGER,updated_at INTEGER)');
const db={run:async(q,...a)=>({meta:{changes:Number(sql.prepare(q).run(...a).changes)}}),first:async(q,...a)=>sql.prepare(q).get(...a)||null,batch:async queries=>{sql.exec('BEGIN');try{const r=queries.map(([q,...a])=>({meta:{changes:Number(sql.prepare(q).run(...a).changes)}}));sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};
const initial={coins:123,characterFragments:7,rating:888,inventory:[{instanceId:'keep'}],giftClaims:['old'],deck:[]};
sql.prepare('INSERT INTO guest_players VALUES(?,?,0,0)').run('test',JSON.stringify(initial));
const guest={id:'test'},before=Date.parse('2026-10-25T14:59:59.999Z'),after=before+1;
assert.equal(japanDay(after),japanDay(before)+1);
assert.equal((await status(db,guest,before)).next,1);
const results=await Promise.allSettled([claim(db,guest,{revision:0},before),claim(db,guest,{revision:0},before)]);
assert.equal(results.filter(r=>r.status==='fulfilled'&&!r.value.alreadyReceived).length,1);
let row=sql.prepare('SELECT * FROM guest_players').get();assert.equal(JSON.parse(row.snapshot).coins,2123);assert.equal(row.revision,1);
assert((await claim(db,guest,{revision:0},before)).alreadyReceived);
await assert.rejects(protectSave(db,guest,initial));
await protectSave(db,guest,JSON.parse(row.snapshot));
await assert.rejects(claim(db,guest,{revision:0},after));
await claim(db,guest,{revision:1},after); // midnight, not 24 hours after last claim
for(let i=2;i<7;i++)await claim(db,guest,{revision:i},after+i*86400000*2); // gaps do not reset
row=sql.prepare('SELECT * FROM guest_players').get();const saved=JSON.parse(row.snapshot);
assert.equal(saved.coins,20123);assert.equal(saved.characterFragments,137);assert.deepEqual(saved.inventory,initial.inventory);assert.deepEqual(saved.giftClaims,initial.giftClaims);assert.equal(saved.rating,888);
assert.equal((await status(db,guest,after+20*86400000)).next,1);
assert.equal(rewards.length,7);
await assert.rejects(claim(db,guest,{revision:7},after+20*86400000,null),/確認待ち/);
// Failure inside the atomic batch must roll back both the receipt and snapshot.
const originalBatch=db.batch;db.batch=async queries=>{sql.exec('BEGIN');try{const [q,...a]=queries[0];sql.prepare(q).run(...a);throw Error('simulated storage failure');}finally{sql.exec('ROLLBACK');}};
await assert.rejects(claim(db,guest,{revision:7},after+20*86400000),/simulated/);db.batch=originalBatch;
assert.equal(sql.prepare('SELECT COUNT(*) n FROM login_bonus_claims').get().n,7);
assert.equal(sql.prepare('SELECT revision FROM guest_players').get().revision,7);
sql.close();console.log('PASS JST boundary, concurrent/repeated claims, revision protection, 7-day cycle, gaps, exact rewards, atomic failure and old data preservation');
