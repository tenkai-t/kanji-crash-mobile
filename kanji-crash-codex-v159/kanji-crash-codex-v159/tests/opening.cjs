const assert=require('assert'),fs=require('fs'),Order=require('../dist/turn-order.js'),F=require('../dist/formation-rules.js'),Traits=require('../dist/character-traits.js');
const db=JSON.parse(fs.readFileSync('dist/index.html','utf8').match(/const KANJI_DATABASE\s*=\s*(\[.*?\]);/s)[1]);
assert(db.length===10142&&db.every(i=>Number.isInteger(Order.count(i))&&Order.count(i)>0));
assert.deepStrictEqual(['一','小','口','山','十','凹','回','矢','盾','亜','唖','娃'].map(Order.count),[1,3,3,3,2,5,6,5,9,7,10,9]);
const low=['一','口','山'],high=['亜','唖','娃'];assert.equal(Order.total(low),7);assert.equal(Order.total(high),26);
assert.equal(Order.choose(low,high,()=>{throw Error('not a tie')}).playerFirst,true);assert.equal(Order.choose(high,low,()=>{throw Error('not a tie')}).playerFirst,false);
assert(Order.choose(['口'],['山'],()=>.4999).playerFirst);assert(!Order.choose(['口'],['山'],()=>.5).playerFirst);assert(Order.choose(['口'],['山'],()=>0).tie);
assert.equal(Order.total(['一','一','一']),3);assert.throws(()=>Order.count('ABC'));
function seeded(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const seen=new Set();let formations=0;
for(let seed=1;seed<=150;seed++){const items=[0,1,2].map((_,i)=>Traits.catalogue[(seed+i*7)%15]),points=F.random(items,seeded(seed));assert(F.valid(items,points));assert(F.validPreset(points));assert.deepStrictEqual(points,F.random(items,seeded(seed)));formations++;seen.add(JSON.stringify(points));}
for(const value of [0,.1,.5,.9,.999999]){const items=[{char:'大'},{char:'凹'},{char:'矢'}];assert(F.valid(items,F.random(items,()=>value)));}
// These orientations previously made the random fallback throw during reset.
const crowded=[{char:'矢'},{char:'盾'},{char:'凹'}];assert(F.valid(crowded,F.random(crowded,seeded(176))));
assert(seen.size===150);console.log(JSON.stringify({strokeCoverage:db.length,totals:[7,26],fewerStrokesFirst:true,tieBothSides:true,randomFormations:formations,unique:seen.size}));
const shields=F.random([{char:'盾'},{char:'盾'},{char:'盾'}],seeded(40));for(const p of shields)assert((Math.sin(p.angle)*p.x-Math.cos(p.angle)*p.y)/Math.hypot(p.x,p.y)<-.8,'shield flat front faces toward the center');
