(function (root, factory) {
    const api = factory(root.KanjiLevels || (typeof require === 'function' ? require('./level-rules.js') : null),root.KanjiGoals || (typeof require === 'function' ? require('./collection-goals.js') : null));
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.KanjiInventory = api;
})(typeof window !== 'undefined' ? window : globalThis, function (Levels,Goals) {
    'use strict';
    function unlocked(item, getReadings) {
        const all = getReadings(item.char);
        const list = Array.isArray(item.unlockedReadings) ? item.unlockedReadings : [item.ruby || all[0]];
        return [...new Set(list.filter(r => all.includes(r)).concat(all.includes(item.ruby) ? [item.ruby] : []))];
    }
    function normalize(item, getReadings) {
        Levels.normalize(item);
        item.locked = item.locked === true;
        item.unlockedReadings = unlocked(item, getReadings);
        if (!item.ruby && item.unlockedReadings.length) item.ruby = item.unlockedReadings[0];
        item.equippedReadings = equipped(item, getReadings);
        if (!item.equippedReadings.length && item.unlockedReadings.length) item.equippedReadings = [item.unlockedReadings[0]];
        item.ruby = item.equippedReadings.includes(item.ruby) ? item.ruby : item.equippedReadings[0] || '';
        item.rubyUnlocked = !!item.ruby; item.readingEquipped = !!item.ruby;
        return item;
    }
    function equipped(item, getReadings) {
        const allowed=unlocked(item,getReadings);
        const selected=Array.isArray(item.equippedReadings)?item.equippedReadings:item.ruby?[item.ruby]:[];
        const result=[...new Set(selected.filter(r=>allowed.includes(r)))];
        if(result.includes(item.ruby))return [item.ruby,...result.filter(r=>r!==item.ruby)];
        return result;
    }
    const totalExp = Levels.totalExp, applyExp = Levels.applyExp;
    function iconItem(state){return state?.inventory?.filter(i=>i.char===state?.playerProfile?.char).sort((a,b)=>totalExp(b)-totalExp(a)||(b.unlockedReadings?.length||0)-(a.unlockedReadings?.length||0))[0];}
    function protectedItem(item, deck, state) { return item.locked || deck.includes(item.instanceId) || iconItem(state)?.instanceId===item.instanceId; }
    function fingerprint(state) {
        return JSON.stringify([state.playerProfile?.char,state.deck, state.inventory.map(i => [i.instanceId, i.id, i.char, i.jis, !!i.locked, !!i.autoLocked, i.level, i.exp, i.ruby, i.unlockedReadings, i.equippedReadings])]);
    }
    function buildPlan(state, mode, jis = 'all', getReadings, getStrength = i => totalExp(i)) {
        const operations = [], groups = new Map(), iconId=iconItem(state)?.instanceId, isProtected=item=>item.locked||state.deck.includes(item.instanceId)||item.instanceId===iconId;
        for (const item of state.inventory) {
            if (jis !== 'all' && item.jis !== Number(jis)) continue;
            const key = mode === 'duplicate' ? item.char : item.jis;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(item);
        }
        for (const group of groups.values()) {
            if (mode === 'duplicate') {
                const sorted = group.slice().sort((a, b) => Number(isProtected(b)) - Number(isProtected(a))
                    || unlocked(b, getReadings).length - unlocked(a, getReadings).length || getStrength(b) - getStrength(a));
                const keep = sorted[0];
                for (const material of sorted.slice(1)) if (!isProtected(material))
                    operations.push({ type: 'duplicate', keepId: keep.instanceId, materialId: material.instanceId });
            } else {
                const materials = group.filter(i => !isProtected(i)).sort((a, b) => getStrength(a) - getStrength(b));
                for (let i = 0; i + 1 < materials.length; i += 2)
                    operations.push({ type: 'synthesis', ids: [materials[i].instanceId, materials[i + 1].instanceId] });
            }
        }
        return { mode, fingerprint: fingerprint(state), operations };
    }
    function mostGrown(state,char,getReadings){return state.inventory.filter(i=>i.char===char).sort((a,b)=>totalExp(b)-totalExp(a)||unlocked(b,getReadings).length-unlocked(a,getReadings).length)[0];}
    function duplicateMaterials(state,keepId,getReadings){getReadings=typeof getReadings==='function'?getReadings:null;const keep=state.inventory.find(i=>i.instanceId===keepId);if(!keep)return [];const iconId=iconItem(state)?.instanceId,grown=getReadings?mostGrown(state,keep.char,getReadings):null,needsRuby=!!getReadings&&unlocked(keep,getReadings).length<getReadings(keep.char).length;return state.inventory.filter(i=>i!==keep&&i!==grown&&i.instanceId!==iconId&&i.char===keep.char&&!state.deck.includes(i.instanceId)&&(!i.locked||needsRuby&&i.autoLocked===true)).sort((a,b)=>totalExp(a)-totalExp(b));}
    function duplicatePlan(state, keepId, getReadings) {
        const material=duplicateMaterials(state,keepId,getReadings)[0];
        return { mode:'duplicate',fingerprint:fingerprint(state),operations:material?[{type:'duplicate',keepId,materialId:material.instanceId,...(material.locked?{autoUnlock:true}:{})}]:[] };
    }
    function rubyUnlockPlan(state, getReadings) {
        const groups = new Map(), operations = [], iconId=iconItem(state)?.instanceId;
        let unlockedCount = 0, characterCount = 0;
        for (const item of state.inventory) {
            if (!groups.has(item.char)) groups.set(item.char, []);
            groups.get(item.char).push(item);
        }
        for (const group of groups.values()) {
            const all = getReadings(group[0].char);
            if (!all.length || group.length < 2) continue;
            const grown = group.slice().sort((a, b) => totalExp(b) - totalExp(a)
                || unlocked(b, getReadings).length - unlocked(a, getReadings).length)[0];
            const keep = group.filter(i => unlocked(i, getReadings).length < all.length).sort((a, b) =>
                Number(state.deck.includes(b.instanceId)) - Number(state.deck.includes(a.instanceId))
                || Number(!!b.locked) - Number(!!a.locked) || totalExp(b) - totalExp(a)
                || unlocked(b, getReadings).length - unlocked(a, getReadings).length)[0];
            if (!keep) continue;
            const known = new Set(unlocked(keep, getReadings)), before = known.size;
            const materials = group.filter(i=>i!==keep&&i!==grown&&i.instanceId!==iconId&&!state.deck.includes(i.instanceId)&&(!i.locked||i.autoLocked===true))
                .sort((a, b) => totalExp(a) - totalExp(b));
            for (const material of materials) {
                if (known.size >= all.length) break;
                for (const ruby of unlocked(material, getReadings)) known.add(ruby);
                const next = all.find(r => !known.has(r));
                if (next) known.add(next);
                operations.push({ type: 'duplicate', keepId: keep.instanceId, materialId: material.instanceId,...(material.locked?{autoUnlock:true}:{}) });
            }
            if (known.size > before) { unlockedCount += known.size - before; characterCount++; }
        }
        return { mode: 'ruby', fingerprint: fingerprint(state), operations, unlockedCount, characterCount };
    }
    function manualPlan(state, id1, id2) {
        const a = state.inventory.find(i => i.instanceId === id1), b = state.inventory.find(i => i.instanceId === id2);
        let operations = [];
        if (a && b && id1 !== id2 && a.jis === b.jis && !protectedItem(a,state.deck,state) && !protectedItem(b,state.deck,state))
            operations = a.char === b.char ? [{ type: 'duplicate', keepId: id1, materialId: id2 }] : [{ type: 'synthesis', ids: [id1, id2] }];
        return { mode: a?.char === b?.char ? 'duplicate' : 'synthesis', fingerprint: fingerprint(state), operations };
    }
    function recipePlan(state,id1,id2){
        const a=state.inventory.find(i=>i.instanceId===id1),b=state.inventory.find(i=>i.instanceId===id2),recipe=a&&b&&id1!==id2?Goals.match(a.char,b.char):null;
        return{mode:'recipe',fingerprint:fingerprint(state),recipe,operations:recipe&&!protectedItem(a,state.deck,state)&&!protectedItem(b,state.deck,state)?[{type:'recipe',ids:[id1,id2],recipeId:recipe.id}]:[]};
    }
    function executePlan(state, plan, options) {
        if (!plan?.operations.length || fingerprint(state) !== plan.fingerprint) throw Error('stale');
        const inventory = state.inventory.map(i => Levels.normalize({ ...i, unlockedReadings: [...unlocked(i, options.getReadings)], equippedReadings: [...equipped(i, options.getReadings)] }));
        const results = [], consumed = new Set(), plannedConsumption = new Set(plan.operations.flatMap(o=>o.type==='duplicate'?[o.materialId]:o.ids||[])), rng = options.rng || Math.random;
        let coinsSpent=0;
        const find = id => inventory.find(i => i.instanceId === id && !consumed.has(id));
        for (const operation of plan.operations) {
            if (operation.type === 'duplicate') {
                const keep = find(operation.keepId), material = find(operation.materialId);
                if (!keep || !material || keep === material || keep.char !== material.char) throw Error('protected');
                const all = options.getReadings(keep.char);
                if(protectedItem(material,state.deck,state)){if(material.instanceId===iconItem(state)?.instanceId||operation.autoUnlock!==true||material.autoLocked!==true||state.deck.includes(material.instanceId)||unlocked(keep,options.getReadings).length>=all.length||mostGrown(state,keep.char,options.getReadings)?.instanceId===material.instanceId)throw Error('protected');material.locked=false;material.autoLocked=false;}
                const previousReadings = unlocked(keep, options.getReadings);
                keep.unlockedReadings = [...new Set([...previousReadings, ...unlocked(material, options.getReadings)])];
                const newReading = all.find(r => !keep.unlockedReadings.includes(r)) || null;
                if (newReading) keep.unlockedReadings.push(newReading);
                keep.equippedReadings = [...new Set([...keep.equippedReadings, ...keep.unlockedReadings.filter(r => !previousReadings.includes(r))])];
                applyExp(keep, totalExp(keep) + totalExp(material) + 40);
                consumed.add(material.instanceId);
                results.push({ type: 'duplicate', char: keep.char, instanceId: keep.instanceId, newReading, newReadings: keep.unlockedReadings.filter(r => !previousReadings.includes(r)), level: keep.level });
            } else if (operation.type === 'synthesis') {
                const [a, b] = operation.ids.map(find);
                if (!a || !b || a === b || a.jis !== b.jis || protectedItem(a,state.deck,state) || protectedItem(b,state.deck,state)) throw Error('protected');
                const target = a.jis===5?5:Math.min(4, a.jis + (rng() < 0.35 ? 1 : 0));
                const pool = options.pools[target];
                if (!pool?.length) throw Error('pool');
                const base = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
                const same = inventory.find(i => !consumed.has(i.instanceId) && i.char === base.char);
                const all = options.getReadings(base.char), ruby = same ? unlocked(same, options.getReadings)[0] || all[0] : all[Math.min(all.length - 1, Math.floor(rng() * all.length))];
                const item = normalize({ ...base, instanceId: options.createId(), level: 1, exp: 0, ruby, locked: false, unlockedReadings: ruby ? [ruby] : [] }, options.getReadings);
                if (!item.instanceId || inventory.some(i => i.instanceId === item.instanceId)) throw Error('id');
                applyExp(item, totalExp(a) + totalExp(b));
                consumed.add(a.instanceId); consumed.add(b.instanceId); if (options.onCreated) options.onCreated(item,{inventory:inventory.filter(i=>!plannedConsumption.has(i.instanceId)&&!consumed.has(i.instanceId))}); inventory.push(item);
                results.push({ type: 'synthesis', char: item.char, instanceId: item.instanceId, jis: item.jis, level: item.level });
            } else if(operation.type==='recipe'){
                const [a,b]=(operation.ids||[]).map(find),recipe=a&&b&&Goals.match(a.char,b.char);
                if(!a||!b||a===b||!recipe||recipe.id!==operation.recipeId||protectedItem(a,state.deck,state)||protectedItem(b,state.deck,state))throw Error('protected');
                if(!Number.isFinite(state.coins)||state.coins<coinsSpent+recipe.cost)throw Error('coins');
                const base=options.catalogue?.find(i=>i.char===recipe.result);if(!base)throw Error('recipe');
                const words=options.getReadings(base.char),item=normalize({...base,instanceId:options.createId(),level:1,exp:0,ruby:words[0]||'',unlockedReadings:words.slice(0,1),locked:false},options.getReadings);
                if(!item.instanceId||inventory.some(i=>i.instanceId===item.instanceId))throw Error('id');
                applyExp(item,totalExp(a)+totalExp(b));consumed.add(a.instanceId);consumed.add(b.instanceId);coinsSpent+=recipe.cost;
                if(options.onCreated)options.onCreated(item,{inventory:inventory.filter(i=>!plannedConsumption.has(i.instanceId)&&!consumed.has(i.instanceId))});inventory.push(item);
                results.push({type:'recipe',recipeId:recipe.id,char:item.char,instanceId:item.instanceId,jis:item.jis,level:item.level});
            } else throw Error('operation');
        }
        return { inventory: inventory.filter(i => !consumed.has(i.instanceId)), results, consumed: [...consumed], coinsSpent };
    }
    return { unlocked, equipped, normalize, totalExp, applyExp, iconItem, protectedItem, fingerprint, buildPlan, duplicateMaterials, duplicatePlan, rubyUnlockPlan, recipePlan, manualPlan, executePlan };
});
