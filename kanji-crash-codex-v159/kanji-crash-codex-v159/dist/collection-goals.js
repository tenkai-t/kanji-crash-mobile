(function(root,factory){const api=factory(root.KanjiAdventureContent||(typeof require==='function'?require('./adventure-content.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiGoals=api;})(typeof window!=='undefined'?window:globalThis,function(content){
 'use strict';
 const missions=content.missions,recipes=content.recipes;
 const mission=id=>missions.find(m=>m.id===id),recipe=id=>recipes.find(r=>r.id===id);
 const match=(a,b)=>recipes.find(r=>r.materials.slice().sort().join('')===[a,b].sort().join(''))||null;
 function initialize(state){state.collectionClaims=state.collectionClaims||[];state.recipeDiscoveries=state.recipeDiscoveries||[];return state;}
 function validSave(state){return [['collectionClaims',missions],['recipeDiscoveries',recipes]].every(([key,items])=>state[key]===undefined||Array.isArray(state[key])&&state[key].length<=items.length&&new Set(state[key]).size===state[key].length&&state[key].every(id=>items.some(i=>i.id===id)));}
 function progress(state,id){const m=mission(id),found=new Set(state.characterDiscoveries||[]);return m?{found:m.target?found.size:m.chars.filter(c=>found.has(c)).length,total:m.target||m.chars.length,complete:m.target?found.size>=m.target:m.chars.every(c=>found.has(c)),claimed:(state.collectionClaims||[]).includes(id)}:null;}
 function claim(state,id){const m=mission(id),p=progress(state,id);if(!m||!p.complete||p.claimed)throw Error('mission');initialize(state);state.collectionClaims.push(id);state.coins+=m.coins;return m;}
 function discover(state,id){if(!recipe(id))throw Error('recipe');initialize(state);if(!state.recipeDiscoveries.includes(id))state.recipeDiscoveries.push(id);}
 return{missions,recipes,mission,recipe,match,initialize,validSave,progress,claim,discover};
});
