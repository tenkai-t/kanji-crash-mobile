(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiPracticePicker=api;})(typeof window!=='undefined'?window:globalThis,function(){
 const Traits=typeof module==='object'&&module.exports?require('./character-traits.js'):window.KanjiTraits;
 const ElementCharacters=typeof module==='object'&&module.exports?require('./element-characters.js'):window.KanjiElementCharacters;
 const FishCharacters=typeof module==='object'&&module.exports?require('./fish-characters.js'):window.KanjiFishCharacters;
 const jisSortValue=item=>[1,2,3,4].includes(Number(item.jis))?Number(item.jis):0;
 function compareJis(a,b,descending=true){const av=jisSortValue(a),bv=jisSortValue(b);return (!av&&!!bv?1:!!av&&!bv?-1:(descending?bv-av:av-bv));}
 const normalize=v=>String(v||'').normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
 function filter(inventory,options,getReadings,getAbilities,getStats,getRubyCount=i=>(i.unlockedReadings||i.equippedReadings||[]).length,getStrokes=i=>i.strokes||0){
  const query=normalize(options.query),readings=new Map();const matches=i=>{if(!query||normalize(i.char).includes(query))return true;if(!readings.has(i.char))readings.set(i.char,getReadings(i.char).map(normalize));return readings.get(i.char).some(r=>r.includes(query));};
  const filtered=inventory.filter(i=>matches(i)&&(!options.jis||options.jis==='all'||(options.jis==='fish'?FishCharacters.has(i):options.jis==='element'?ElementCharacters.has(i):options.jis==='special'?!!Traits.get(i):options.jis==='secret'?getReadings(i.char).length===0:i.jis===Number(options.jis)))&&(!options.attr||i.attr===options.attr)&&(!options.ability||getAbilities(i).some(a=>a?.id===options.ability)));
  if(options.sort==='jis')return filtered.sort((a,b)=>compareJis(a,b));
  const sort=options.sort,compute=sort==='ruby'?getRubyCount:sort==='strokes_asc'||sort==='strokes_desc'?getStrokes:sort==='level'?i=>i.level:sort==='power'?i=>getStats(i).power:sort==='weight'?i=>getStats(i).weight:null;if(!compute)return filtered;
  const values=new Map(filtered.map(i=>[i,compute(i)])),direction=sort==='strokes_asc'?1:-1;return filtered.sort((a,b)=>direction*(values.get(a)-values.get(b)));
 }

 return {filter,normalize,jisSortValue,compareJis};
});
