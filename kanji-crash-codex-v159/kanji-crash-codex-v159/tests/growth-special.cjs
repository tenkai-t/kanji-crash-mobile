const assert=require('assert'),fs=require('fs'),vm=require('vm');
const G=require('../dist/growth-rules.js'),R=require('../dist/kanji-rules.js'),A=require('../dist/reading-abilities.js'),S=require('../dist/special-challenge.js'),T=require('../dist/character-traits.js');
const html=fs.readFileSync(require.resolve('../dist/index.html'),'utf8'),database=JSON.parse(html.match(/const KANJI_DATABASE\s*=\s*(\[.*?\]);/s)[1]);
const dictionary={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../dist/readings.js'),'utf8'),dictionary);
const getReadings=char=>[...new Set((dictionary.window.KANJI_READINGS[char]||[]).map(r=>r.replace(/[.・()（）-]/g,'')).filter(r=>/^[ぁ-ゖァ-ヺー]+$/.test(r)))];
const stats=item=>R.getStats(item,A.bonusForReadings(item.equippedReadings||[]),A.resolveAll(item));
const combos=new Set();let checked=0;
for(const base of database){
 const before=JSON.stringify(base),p=G.profile(base);combos.add(p.roleId);assert(!("curveId" in p)&&!("curveName" in p));
 assert.equal(p,G.profile({...base,level:99,ruby:'別の読み'}));assert(Object.isFrozen(p));assert(Math.abs(p.growthPower+p.growthWeight-2)<1e-8);
 for(const level of [1,9,10,29,30,59,60,99]){const a=R.getStats({...base,level}),b=R.getStats({...base,level:level+1});assert(b.power>a.power&&b.weight>a.weight);}
 assert.equal(p.strokeCount,require('../dist/strokes.js')[base.char]);assert.equal(p.strokeBonusPercent,(p.strokeCount-1)*3);assert.equal(p.strokeMultiplier,1+p.strokeBonusPercent/100);assert.equal(JSON.stringify(base),before);checked++;
}
assert.equal(combos.size,3);assert.equal(checked,10142);
assert.equal(G.profile('剣').roleId,'attack');assert.equal(G.profile('岩').roleId,'weight');assert(!('curves' in G));
for(const level of [2,10,11,30,31,60,61,100])assert.equal(G.units(level)-G.units(level-1),1);
for(const char of ['剣','岩','苗']){const base=database.find(k=>k.char===char),p=G.profile(base),factor=22*(1+(base.jis-1)*.15)*p.strokeMultiplier;for(const level of [9,10,29,30,59,60]){const a=G.bonuses(base,base.jis,level),b=G.bonuses(base,base.jis,level+1);assert(Math.abs((b.power-a.power)-factor*p.growthPower)<1);assert(Math.abs((b.weight-a.weight)-factor*p.growthWeight)<1);}}
for(const char of ['剣','岩','口','合','独'])for(const level of [1,9,10,30,60,100]){
 const item={...database.find(k=>k.char===char),level,equippedReadings:['おもい','うつ','かえす'],traitWeightMultiplier:1.15,rubyWeightMultiplier:.9,battleMultiplier:1.35};
 const before=JSON.stringify(item),preview=R.growthPreview(item,A.bonusForReadings(item.equippedReadings),A.resolveAll(item)),a=stats(item),b=stats({...item,level:Math.min(100,level+1)});
 assert.equal(preview.power,b.power-a.power);assert.equal(preview.weight,b.weight-a.weight);assert.equal(preview.max,level===100);assert.equal(JSON.stringify(item),before);
}
// Growth is recalculated for existing levels without changing any owned progress.
for(const char of ['剣','岩','苗','鬱','龍']){const base=database.find(i=>i.char===char),p=G.profile(base),legacy={...base,level:41,exp:123,locked:true,instanceId:'inst_legacy',equippedReadings:getReadings(char).slice(0,2)},before=JSON.stringify(legacy),growth=G.bonuses(legacy,base.jis,legacy.level),oldBase=40*22*(1+(base.jis-1)*.15);assert(growth.power>Math.round(oldBase*p.growthPower));assert(growth.weight>Math.round(oldBase*p.growthWeight));assert.equal(JSON.stringify(legacy),before);}
// At equal rarity/level, higher stroke counts give a larger combined base growth,
// retaining the existing split between attack and weight roles.
for(const jis of [1,2,3,4]){const grouped=new Map();for(const item of database.filter(i=>i.jis===jis)){const b=G.bonuses(item,jis,10),n=b.profile.strokeCount,total=b.power+b.weight;if(!grouped.has(n))grouped.set(n,[]);grouped.get(n).push(total);}let previous=0;for(const [n,values]of [...grouped].sort((a,b)=>a[0]-b[0])){assert(Math.min(...values)>previous,`JIS${jis} ${n} strokes`);previous=Math.max(...values);}}
const team=['剣','岩','苗'].map((char,n)=>({...database.find(k=>k.char===char),instanceId:`inst_${n}`,level:4+n,exp:19,locked:true,ruby:getReadings(char)[0],unlockedReadings:getReadings(char),equippedReadings:getReadings(char).slice(0,2)}));
const before=JSON.stringify(team),roster=new Set();
for(let index=0;index<5;index++){
 const challenge=S.create(team,database,getReadings,stats,()=>index/5+.01);assert.equal(challenge.name,S.squads[index].name);assert.equal(challenge.level,10);assert(challenge.multiplier>=1.35);
 for(const enemy of challenge.enemies){roster.add(enemy.char);assert(T.get(enemy));assert.equal(enemy.jis,database.find(i=>i.char===enemy.char).jis);assert(enemy.equippedReadings.length>0&&enemy.equippedReadings.length<=3);assert(enemy.equippedReadings.every(r=>getReadings(enemy.char).includes(r)));assert.equal(new Set(enemy.equippedReadings).size,enemy.equippedReadings.length);}
 const mean=items=>items.reduce((sum,i)=>sum+stats(i).power+stats(i).weight,0)/items.length;assert.equal(challenge.multiplier,1.35);
 challenge.team[0].equippedReadings.pop();challenge.team[0].unlockedReadings.pop();challenge.team[0].level++;assert.equal(JSON.stringify(team),before);
}
assert.deepStrictEqual([...roster].sort(),T.catalogue.map(t=>t.char).sort());
const legendary=database.filter(i=>i.jis===4).slice(0,3).map((i,n)=>({...i,level:75+n,equippedReadings:getReadings(i.char).slice(0,3)}));
const high=S.create(legendary,database,getReadings,stats,()=>0);assert.equal(high.level,10);assert.equal(high.multiplier,1.35);assert.equal(JSON.stringify(team),before);
console.log(JSON.stringify({characters:checked,growthCombinations:combos.size,constantGrowth:true,strokeGrowth:true,existingLevelsRecalculated:true,equippedPreview:true,preserved:true,specialSquads:5,specialCharacters:roster.size,trainedMultiplier:high.multiplier}));
