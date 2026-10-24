const assert=require('node:assert/strict'),H=require('../dist/honor-icons.js');
assert.equal(H.catalogue.length,74);
assert.equal(new Set(H.catalogue.map(i=>i.id)).size,74);
for(const item of H.catalogue){assert(!H.canUse(item.id,{ratingRewardVersion:1,[item.key]:item.value-1}));assert(H.canUse(item.id,{ratingRewardVersion:1,[item.key]:item.value,...item.requires}));assert(H.canUse(item.id,{ratingRewardVersion:1,[item.key]:item.value+1,...item.requires}));}
const past={highestRating:2600,bestEndless:20,trialWins:3,bestTrialStreak:0,completedCollections:0};
const after=H.fromState({rating:900,endlessBest:0,specialTrialWins:0,iconProgress:past});assert.deepEqual(after,H.progress({...past,cpuPromotionVersion:1,highestCpuRank:4}));assert(H.catalogue.slice(0,12).every(i=>H.canUse(i.id,after)));assert(H.catalogue.slice(12).every(i=>!H.canUse(i.id,after)));
assert.deepEqual(H.fromState({rating:1400,endlessBest:3}),H.progress({highestRating:1400,bestEndless:3,cpuPromotionVersion:1,highestCpuRank:1}));
assert(H.validSave({}));assert(!H.validSave({specialTrialWins:-1}));assert(!H.validSave({iconProgress:{bestEndless:1.5}}));assert(!H.validProgress({highestRating:Infinity}));assert(!H.canUse('unknown',past));
console.log(JSON.stringify({icons:74,exactThresholds:true,permanentUnlocks:true,legacyRecords:true,saveValidation:true}));
