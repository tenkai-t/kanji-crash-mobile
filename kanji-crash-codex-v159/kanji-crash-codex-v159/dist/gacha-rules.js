(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.KanjiGacha = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';
    const rates = { normal: [91.8, 6.5, 1.2, 0.5], rare: [15, 60, 20, 5] };
    function pickTier(type, rng = Math.random) {
        const probabilities = rates[type] || rates.normal, roll = rng() * 100;
        let cumulative = 0;
        for (let i = 0; i < probabilities.length; i++) { cumulative += probabilities[i]; if (roll < cumulative) return i + 1; }
        return 4;
    }
    return { rates, pickTier };
});
