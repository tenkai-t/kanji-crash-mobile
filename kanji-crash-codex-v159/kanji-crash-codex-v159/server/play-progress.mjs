import Records from '../dist/play-records.js';
import * as CpuSeasons from './cpu-skill-seasons.mjs';
import CpuSkill from '../dist/cpu-skill-rules.js';
import {publicProfile} from './leaderboards.mjs';
import Game from './game.cjs';
export async function read(db,key,usageKey=key){
 const [usage,challenges]=await Promise.all([db.all('SELECT char,plays,wins,honor_wins AS honorWins,shots,kills,survived,best_shot AS bestShot FROM play_usage WHERE key=?',usageKey),db.all('SELECT challenge,attempts,clears,best_shots AS bestShots,best_survivors AS bestSurvivors FROM practice_records WHERE key=?',key)]);
 return{usage:Object.fromEntries(usage.map(({char,...v})=>[char,v])),challenges:Object.fromEntries(challenges.filter(r=>!CpuSkill.stages.some(c=>c.id===r.challenge)).map(({challenge,...v})=>[challenge,v]))};
}
function eventIssue(event){
 if(!event||!Array.isArray(event.items)||event.items.some(i=>!i||typeof i.char!=='string'))return 'EVENT_SHAPE_INVALID';
 if(event.items.some(i=>!Game.bases.has(i.char)))return 'EVENT_CHARACTER_UNKNOWN';
 if(event.challenge&&!Records.get(event.challenge))return 'EVENT_CHALLENGE_UNKNOWN';
 if(event.cpuSkill&&!CpuSkill.valid(event))return 'CPU_EVENT_INVALID';
 return 'EVENT_COUNTER_INVALID';
}
export async function save(db,key,input,now,profileKey,usageKey=key,collect=true){
 // Opt-in partial acknowledgement keeps an invalid legacy event from blocking later records.
 if(input.partial===true){
  if(!Array.isArray(input.events)||input.events.length>10)throw Object.assign(Error('使用実績の記録を確認してください。'),{status:400,code:'EVENT_BATCH_INVALID'});
  const accepted=[],rejected=[],seen=new Set();
  for(const event of input.events){
   if(seen.has(event?.id))continue;seen.add(event?.id);
   try{const result=await save(db,key,{...input,partial:false,retireLegacy:false,events:[event]},now,profileKey,usageKey,false);accepted.push(...result.accepted);}
   catch(error){if(error.status!==400)throw error;rejected.push({id:event?.id,code:error.code||'EVENT_INVALID',retryable:false});}
  }
  if(input.retireLegacy===true)await save(db,key,{events:[],retireLegacy:true},now,profileKey,usageKey,false);
  return {accepted,rejected,progress:await read(db,key,usageKey),cpuSkillRecords:await skillRecords(db,usageKey)};
 }
 if(!Array.isArray(input.events)||input.events.length>10||new Set(input.events.map(e=>e?.id)).size!==input.events.length)throw Object.assign(Error('使用実績の記録を確認してください。'),{status:400,code:'EVENT_BATCH_INVALID'});
 for(const event of input.events)if(!Records.validEvent(event,c=>Game.bases.has(c)))throw Object.assign(Error('使用実績の記録を確認してください。'),{status:400,code:eventIssue(event)});
 if(input.events.some(e=>CpuSkill.stages.some(c=>c.id===e.challenge)))throw Object.assign(Error('旧3課題の保存は終了しました。'),{status:400,code:'EVENT_RETIRED'});
 if(input.retireLegacy===true){const queries=[['DELETE FROM cpu_skill_best WHERE key=?',key],['DELETE FROM cpu_skill_scores WHERE key=?',key],['DELETE FROM practice_records WHERE key=? AND challenge IN (?,?,?)',key,...CpuSkill.stages.map(c=>c.id)]];if(usageKey!==key)queries.push(['DELETE FROM play_usage WHERE key=?',key]);await db.batch(queries);}
 for(const e of input.events){
  if(await db.first('SELECT event FROM play_events WHERE key=? AND event=?',key,e.id))continue;
  const queries=e.items.map(i=>['INSERT INTO play_usage (key,char,plays,wins,honor_wins,shots,kills,survived,best_shot) SELECT ?,?,1,?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM play_events WHERE key=? AND event=?) ON CONFLICT(key,char) DO UPDATE SET plays=MIN(1000000000,plays+1),wins=MIN(1000000000,wins+excluded.wins),honor_wins=MIN(1000000000,honor_wins+excluded.honor_wins),shots=MIN(1000000000,shots+excluded.shots),kills=MIN(1000000000,kills+excluded.kills),survived=MIN(1000000000,survived+excluded.survived),best_shot=MAX(best_shot,excluded.best_shot)',usageKey,i.char,e.outcome==='win'?1:0,e.outcome==='win'&&Records.get(e.challenge)?.kind!=='cpu-skill'?1:0,i.shots,i.kills,i.survived?1:0,i.bestShot,key,e.id]);
  if(e.challenge)queries.push(['INSERT INTO practice_records (key,challenge,attempts,clears,best_shots,best_survivors) SELECT ?,?,1,?,?,? WHERE NOT EXISTS (SELECT 1 FROM play_events WHERE key=? AND event=?) ON CONFLICT(key,challenge) DO UPDATE SET attempts=MIN(1000000000,attempts+1),clears=MIN(1000000000,clears+excluded.clears),best_shots=CASE WHEN excluded.best_shots IS NULL THEN best_shots WHEN best_shots IS NULL THEN excluded.best_shots ELSE MIN(best_shots,excluded.best_shots) END,best_survivors=MAX(best_survivors,excluded.best_survivors)',key,e.challenge,e.cleared?1:0,e.cleared?e.shots:null,e.cleared?e.survivors:0,key,e.id]);
  if(CpuSkill.get(e.challenge,e.cpuSkill?.season)){
   if(!CpuSkill.valid(e))throw Object.assign(Error('CPU腕試しの記録を確認してください。'),{status:400,code:'CPU_EVENT_INVALID'});
   const p=await db.first('SELECT payload FROM player_profiles WHERE key=?',profileKey);
   const score=CpuSkill.score(e);
   if(score>0&&!p)throw Object.assign(Error('プレイヤー設定を保存してから再登録してください。'),{status:400,code:'PROFILE_REQUIRED'});
   if(p&&score>0&&e.cpuSkill){CpuSeasons.addRecord(queries,usageKey,e,JSON.stringify(publicProfile(JSON.parse(p.payload))),now);}

  }
  queries.push(['INSERT OR IGNORE INTO play_events (key,event,created_at) VALUES (?,?,?)',key,e.id,now]);await db.batch(queries);
 }
 if(!collect)return {accepted:input.events.map(e=>e.id)};
 return{cpuSkillRecords:await skillRecords(db,usageKey),progress:await read(db,key,usageKey),accepted:input.events.map(e=>e.id)};
}

export async function skillRecords(db,key){return CpuSeasons.records(db,key);}
