const assert=require('node:assert/strict'),fs=require('node:fs'),H=require('../dist/honor-icons.js'),S=require('../dist/avatar-style.js');
const frames=H.groups().find(g=>g.name==='段位ポイント').items;
assert.deepEqual(frames.map(x=>x.value),[3000,5000,10000,20000,50000,100000]);
for(const i of frames){assert(!H.canUse(i.id,{ratingRewardVersion:1,highestRating:i.value-1}));assert(H.canUse(i.id,{ratingRewardVersion:1,highestRating:i.value}));}
for(const [id,old] of [['lotus',2000],['moon',2400],['emperor',3000],['cosmos',4000]]){
 const saved=H.fromState({rating:900,iconProgress:{highestRating:old}});
 assert(H.canUse(id,saved));assert(H.validSave({iconProgress:saved}));assert.equal(saved.legacyRating,old);
 const roundtrip=H.fromState({rating:1000,iconProgress:JSON.parse(JSON.stringify(saved))});assert(H.canUse(id,roundtrip));assert.equal(roundtrip.legacyRating,old);
 assert(!H.canUse(id,H.progress({ratingRewardVersion:1,highestRating:old,legacyRating:0})));
}
let fresh=H.fromState({rating:1200});fresh=H.fromState({rating:4000,iconProgress:fresh});assert.equal(fresh.legacyRating,1200);assert(!H.canUse('moon',fresh));assert(H.canUse('lotus',fresh));
const old=H.progress({highestRating:4000}),recent=H.progress({ratingRewardVersion:1,highestRating:100000});
const merged=H.merge(old,recent);assert.equal(merged.legacyRating,4000);assert(H.canUse('cosmos',merged));assert(H.canUse('rank-eternal-crown',merged));
for(const id of ['rank-gilded-cloud','rank-eternal-crown']){const svg=S.frameSvg(id,id);assert(svg.includes('data-tier="4"'));assert(!/NaN|undefined/.test(svg));assert(svg.includes('<mask'));fs.writeFileSync('/tmp/'+id+'.svg',svg.replace(/currentColor/g,S.accent(id)));}
assert.notEqual(S.frameSvg('rank-gilded-cloud'),S.frameSvg('rank-eternal-crown'));
console.log('PASS six rank thresholds, legacy unlock retention, new player thresholds, save round-trip, merging and distinct ornate SVG frames');
