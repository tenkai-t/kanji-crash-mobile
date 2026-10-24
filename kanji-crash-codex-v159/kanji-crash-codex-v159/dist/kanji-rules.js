(function (root, factory) {
    const rules = factory(root.KanjiTraits || (typeof require === 'function' ? require('./character-traits.js') : null),root.KanjiGrowth || (typeof require === 'function' ? require('./growth-rules.js') : null),root.KanjiTeamLinks || (typeof require === 'function' ? require('./team-links.js') : null));
    if (typeof module === 'object' && module.exports) module.exports = rules;
    else root.KanjiRules = rules;
})(typeof window !== 'undefined' ? window : globalThis, function (Traits,Growth,Links) {
    'use strict';
    const attributes = {
        wood: { name: '木', light: '#4ade80', base: '#166534', dark: '#052e16' },
        fire: { name: '火', light: '#fb923c', base: '#b91c1c', dark: '#450a0a' },
        earth: { name: '土', light: '#fbbf24', base: '#92400e', dark: '#451a03' },
        metal: { name: '金', light: '#e2e8f0', base: '#64748b', dark: '#1e293b' },
        water: { name: '水', light: '#38bdf8', base: '#1d4ed8', dark: '#082f49' }
    };
    const rarity = [
        { name: '一般', power: 1, weight: 1, edge: '#94a3b8', glow: 0 },
        { name: '希少', power: 1.15, weight: 1.5, edge: '#c4b5fd', glow: 5 },
        { name: '超希少', power: 1.4, weight: 2.1, edge: '#fde68a', glow: 10 },
        { name: '伝説', power: 1.65, weight: 2.9, edge: '#fcd34d', glow: 16 }
    ];
    const jisLevel = item => Math.max(1, Math.min(4, (item?.jis===5?3:Number(item?.jis)) || 1));
    function getStats(item, readingBonus, readingAbility = null) {
        item = item || {};
        readingBonus = readingBonus || { power: 0, weight: 0, speed: 0, score: 0, label: '未装備' };
        const jis = jisLevel(item), tier = rarity[jis - 1];
        const level = Math.max(1, Math.min(item.cpuControlled===true?Growth.cpuMaxLevel:Growth.maxLevel,Math.floor(Number(item.level) || 1)));
        const growth = Growth.bonuses(item,jis,level),profile=growth.profile;
        const levelBonus = Math.round((growth.power+growth.weight)/2);
        const readingAbilities=[...new Map((Array.isArray(readingAbility)?readingAbility:readingAbility?[readingAbility]:[]).filter(Boolean).map(a=>[a.id,a])).values()];
        const bonuses=readingAbilities.reduce((sum,a)=>{for(const key of ['power','weight','speed'])sum[key]+=(Number(a.bonuses?.[key])||0);return sum;},{power:0,weight:0,speed:0});
        const weightMultiplier=readingAbilities.reduce((value,a)=>value*(Number(a.weightMultiplier)||1),1);
        const battleMultiplier = Number.isFinite(Number(item.battleMultiplier)) ? Math.max(1, Number(item.battleMultiplier)) : 1;
        const stats = {
            power: Math.max(1, Math.round((Number(item.power) || 1) * 100 * tier.power * profile.initialPower) + growth.power + readingBonus.power + (Number(bonuses.power) || 0)),
            weight: Math.max(1, Math.round((Math.round((Number(item.weight) || 1) * 100 * tier.weight * profile.initialWeight) + growth.weight + readingBonus.weight + (Number(bonuses.weight) || 0)) * weightMultiplier)),
            speed: readingBonus.speed + (Number(bonuses.speed) || 0),
            attr: attributes[item.attr] ? item.attr : 'metal', readingBonus, readingAbility:readingAbilities[0]||null, readingAbilities,
            rarity: tier.name, levelBonus,levelPowerBonus:growth.power,levelWeightBonus:growth.weight,growth:profile
        };
        stats.trait = Traits.get(item);
        stats.power = Math.max(1, Math.round(stats.power * battleMultiplier * (stats.trait?.power || 1)));
        stats.weight = Math.max(1, Math.round(stats.weight * battleMultiplier * (stats.trait?.weight || 1)));
        stats.power=Math.max(1,Math.round(stats.power*(item.traitPowerMultiplier || 1)));
        stats.weight=Math.max(1,Math.round(stats.weight*(item.traitWeightMultiplier || 1)));
        stats.power=Math.max(1,Math.round(stats.power*(item.rubyPowerMultiplier||1)));
        stats.weight=Math.max(1,Math.round(stats.weight*(item.rubyWeightMultiplier||1)));
        stats.teamLink=Links.get(item.teamLink);
        if(stats.teamLink){stats.power=Math.max(1,Math.round(stats.power*(1+stats.teamLink.power)));stats.weight=Math.max(1,Math.round(stats.weight*(1+stats.teamLink.weight)));}
        return stats;
    }
    function getPhysics(stats) {
        return Traits.physics(stats);
    }
    function growthPreview(item,readingBonus,readingAbility){const maxLevel=item?.cpuControlled===true?Growth.cpuMaxLevel:Growth.maxLevel,level=Math.max(1,Math.min(maxLevel,Math.floor(Number(item?.level)||1))),current=getStats({...item,level},readingBonus,readingAbility),next=getStats({...item,level:Math.min(maxLevel,level+1)},readingBonus,readingAbility);return{profile:current.growth,power:next.power-current.power,weight:next.weight-current.weight,max:level===maxLevel,maxLevel};}
    return { attributes, rarity, jisLevel, getStats, getPhysics,growthPreview };
});
