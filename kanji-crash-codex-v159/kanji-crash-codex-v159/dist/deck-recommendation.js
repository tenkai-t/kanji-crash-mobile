(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.KanjiDeckRecommendation = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';
    const roles = ['攻撃役', '耐久役', '補助役'];
    const preference = [['strike','chase','backwater','charge'], ['anchor','guard','counter','dodge','glide'], ['sturdy','return','brake','magnet','resonance']];
    function recommend(inventory, getReadings, getStats) {
        const candidates = [], seenIds = new Set();
        for (const item of inventory) {
            if (!item.instanceId || seenIds.has(item.instanceId)) continue;
            seenIds.add(item.instanceId);
            const bestByAbility = new Map();
            const equippedReadings=[...new Set(getReadings(item.char,item))];
            for (const ruby of equippedReadings.length ? equippedReadings : ['']) {
                const stats = getStats({ ...item, ruby, equippedReadings }), id = stats.readingAbility?.id || 'none';
                const strength = stats.power + stats.weight, previous = bestByAbility.get(id);
                if (!previous || strength > previous.strength || (strength === previous.strength && ruby === item.ruby))
                    bestByAbility.set(id, { instanceId: item.instanceId, char: item.char, ruby, equippedReadings:equippedReadings.slice(), attr: stats.attr, abilityId: id, abilityIds:(stats.readingAbilities||[stats.readingAbility]).filter(Boolean).map(a=>a.id), stats, strength });
            }
            candidates.push(...bestByAbility.values());
        }
        if (!candidates.length) return [];
        const maxStrength = candidates.reduce((max, c) => Math.max(max, (c.stats.power + c.stats.weight) / 2), 0);
        const roleScore = (c, role) => {
            const p = c.stats.power * (c.abilityIds.includes('strike') ? 1.15 : 1);
            const w = c.stats.weight * (c.abilityIds.includes('guard') ? 1.25 : c.abilityIds.includes('sturdy') ? 1.20 : 1);
            const weights = [[0.7, 0.3], [0.3, 0.7], [0.5, 0.5]][role];
            return p * weights[0] + w * weights[1] + (c.abilityIds.some(id=>preference[role].includes(id)) ? maxStrength * 0.04 : 0);
        };
        const pools = roles.map((_, i) => candidates.slice().sort((a, b) => roleScore(b, i) - roleScore(a, i) || String(a.instanceId).localeCompare(String(b.instanceId))).slice(0, 18));
        const size = Math.min(3, new Set(candidates.map(c => c.instanceId)).size);
        let best = [], bestScore = -Infinity;
        function visit(team, sum, role) {
            if (role === size) {
                const attributes = new Set(team.map(c => c.attr)).size, abilities = new Set(team.flatMap(c => c.abilityIds)).size;
                const resonanceBonus=team.reduce((bonus,c)=>bonus+(c.abilityIds.includes('resonance')&&team.some(other=>other!==c&&other.attr===c.attr)?c.stats.power*.10:0),0);
                const score = sum + maxStrength * 0.10 * (attributes + abilities - 2)+resonanceBonus;
                if (score > bestScore) { bestScore = score; best = team.map((c, i) => ({ ...c, role: roles[i] })); }
                return;
            }
            for (const c of pools[role]) if (!team.some(t => t.instanceId === c.instanceId)) visit([...team, c], sum + roleScore(c, role), role + 1);
        }
        visit([], 0, 0);
        return best;
    }
    return { recommend };
});
