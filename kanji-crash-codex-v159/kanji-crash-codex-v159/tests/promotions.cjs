const assert=require('node:assert/strict'),P=require('../dist/promotion-rules.js'),R=require('../dist/play-records.js'),H=require('../dist/honor-icons.js');
const state={rating:1200,playProgress:R.empty()};P.initialize(state);assert.equal(P.current(state).title,'初級');state.rating=20000;
assert.equal(P.current(state).title,'初級');assert.equal(P.next(state).index,1);assert(!P.canChallenge(state,2));
for(const t of P.tiers.slice(1)){
 assert(P.canChallenge(state,t.index));state.playProgress.challenges[P.trialId(t.index,'boss')]={clears:1};assert.equal(P.reconcile(state).length,0);
 state.playProgress.challenges[P.trialId(t.index,'mission')]={clears:1};assert.equal(P.reconcile(state)[0].title,t.title);assert.equal(P.current(state).title,t.title);
}
assert.equal(P.next(state),null);assert(P.canChallenge(state,4,'boss'));state.rating=1000;assert(P.canChallenge(state,4,'mission'));assert.equal(P.current(state).title,'漢字王');state.rating=2600;assert.equal(P.current(state).title,'漢字王');assert.equal(P.reconcile(state).length,0);
for(const rp of [1200,1400,1800,2200,2600]){const s={rating:rp};P.initialize(s);assert.equal(s.cpuPromotions.unlocked,P.rawIndex(rp));assert(P.validSave(s));}
const legacy={rating:1000,iconProgress:{highestRating:2600}};P.initialize(legacy);assert.equal(legacy.cpuPromotions.unlocked,4);
const account={rating:1200};P.initialize(account);P.inherit(account,{cpuPromotionVersion:1,highestCpuRank:2,highestRating:4000});assert.equal(account.cpuPromotions.unlocked,2);
const waiting={rating:2999,cpuPromotions:{version:1,unlocked:0},playProgress:{challenges:{'rank-1-boss':{clears:1},'rank-1-mission':{clears:1}}}};assert.equal(P.reconcile(waiting).length,0);assert(P.canChallenge(waiting,1,'boss'));assert(!P.canChallenge(waiting,2,'boss'));waiting.rating=3000;assert.equal(P.reconcile(waiting).length,1);
assert(!P.validSave({cpuPromotions:{version:1,unlocked:5}}));assert(!P.validSave({cpuPromotions:{version:1,unlocked:1.5}}));
const team=[{char:'一',jis:1},{char:'山',jis:1},{char:'川',jis:1}];assert.equal(R.condition('rank-1-mission',team,()=>1),'');assert(R.condition('rank-1-mission',team.map(i=>({...i,jis:3})),()=>1));assert(R.condition('rank-2-mission',team,()=>5));
const make=()=>R.createUsage('rank_usage_test',team.map((i,n)=>({...i,instanceId:'inst_'+n}))),ids=['inst_0','inst_1','inst_2'];
assert(!R.event(make(),true,ids.slice(0,2),'rank-3-mission').cleared);assert(R.event(make(),true,ids,'rank-3-mission').cleared);
let run=make();for(let n=0;n<4;n++)R.launch(run,'inst_0');assert(!R.event(run,true,ids,'rank-4-mission').cleared);run=make();R.launch(run,'inst_0');assert(R.event(run,true,ids,'rank-4-mission').cleared);
assert(R.catalogue.length>=24);assert.equal(P.challenges.length,8);assert.equal(new Set(P.challenges.map(c=>c.id)).size,8);
assert(!H.canUse('sovereign',H.fromState({rating:4000,cpuPromotions:{version:1,unlocked:0}})));assert(H.canUse('sovereign',H.fromState({rating:1000,cpuPromotions:{version:1,unlocked:4}})));
console.log(JSON.stringify({initialOnly:true,bothTrialsRequired:true,rpBanked:true,sequential:true,rpRecoveryNoRepeat:true,legacyAndAccountMigration:true,conditionChecks:true,rankFramesGated:true}));

assert.equal(R.condition(P.trialId(3,'mission'),team,()=>1),'');const fired=make();R.launch(fired,'inst_0');R.launch(fired,'inst_1');assert(!R.event(fired,true,ids.slice(0,2),P.trialId(3,'mission')).cleared);const linked=make();for(const id of ids){R.launch(linked,id);R.kill(linked);}assert(R.event(linked,true,ids,P.trialId(3,'mission')).cleared);assert(!R.event(make(),true,ids.slice(0,2),P.trialId(4,'mission')).cleared);assert(!R.event(make(),true,ids,P.trialId(4,'mission')).cleared);const changed={rating:3000,cpuPromotions:{version:1,unlocked:2},playProgress:{challenges:{'rank-3-boss':{clears:1},'rank-3-mission':{clears:1}}}};assert.equal(P.reconcile(changed).length,0);
