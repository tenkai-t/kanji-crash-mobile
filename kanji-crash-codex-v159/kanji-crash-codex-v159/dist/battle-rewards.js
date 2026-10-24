(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.KanjiRewards = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';
    function create(playerIds, enemyIds) {
        return { playerIds: [...playerIds], enemyIds: [...enemyIds], defeated: [], earned: {}, shot: null, sweep: false, settled: false };
    }
    function beginShot(state, isPlayer, shooterId, remainingEnemies) {
        if (state.settled) return;
        state.shot = isPlayer ? { shooterId, enemies: [...remainingEnemies], defeated: [] } : null;
    }
    function recordKill(state, enemyId, killerId, exp) {
        if (state.settled || state.defeated.includes(enemyId) || !state.enemyIds.includes(enemyId)) return false;
        state.defeated.push(enemyId);
        if (state.playerIds.includes(killerId) && exp > 0) state.earned[killerId] = (state.earned[killerId] || 0) + exp;
        const shot = state.shot;
        if (shot && shot.enemies.includes(enemyId)) {
            shot.defeated.push(enemyId);
            if (state.enemyIds.length === 3 && shot.enemies.length === 3 && shot.defeated.length === 3) state.sweep = true;
        }
        return true;
    }
    function settle(state, won, survivorIds) {
        if (state.settled) return null;
        state.settled = true;
        const intact = won && state.playerIds.length === 3 && state.playerIds.every(id => survivorIds.includes(id));
        const sweep = won && state.sweep;
        const extraRate = (intact ? 0.5 : 0) + (sweep ? 1 : 0);
        const awards = Object.entries(state.earned).map(([id, base])=>({ id, base, bonus: Math.round(base * extraRate) }));
        return { intact, sweep, multiplier: 1 + extraRate, awards, totalBonus: awards.reduce((sum,a)=>sum+a.bonus,0) };
    }
    return { create, beginShot, recordKill, settle };
});
