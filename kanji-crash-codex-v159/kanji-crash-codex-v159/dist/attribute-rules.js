(function (root, factory) {
    const api = factory(root.Matter || (typeof require === 'function' ? require('./vendor/matter.min.js') : null));
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.KanjiAttributes = api;
})(typeof window !== 'undefined' ? window : globalThis, function (Matter) {
    'use strict';
    const { Body, Vector } = Matter;
    const advantage = { wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood' };
    function multiplier(attacker, defender) {
        return advantage[attacker] === defender ? 1.45 : advantage[defender] === attacker ? 0.75 : 1;
    }
    const dot = (a, b) => a.x * b.x + a.y * b.y;
    function queueCollision(a, b) {
        if (!a.gameData || !b.gameData || a.gameData.isPlayer === b.gameData.isPlayer) return [];
        const normal = Vector.normalise(Vector.sub(b.position, a.position)), actions = [];
        function attack(attacker, defender, direction) {
            const factor = multiplier(attacker.gameData.attr, defender.gameData.attr);
            if (factor !== 1 && dot(attacker.velocity, direction) > 0.8)
                actions.push({ attacker, defender, normal: direction, before: { ...defender.velocity }, factor });
        }
        attack(a, b, normal); attack(b, a, Vector.neg(normal));
        return actions;
    }
    function applyQueued(actions, notify) {
        for (const action of actions) {
            const { attacker, defender, normal, before, factor } = action;
            if (defender.gameData.isOut) continue;
            const received = Math.max(0, dot(Vector.sub(defender.velocity, before), normal));
            if (received <= 0.05) continue;
            const change = Math.max(-8, Math.min(8, received * (factor - 1)));
            Body.setVelocity(defender, Vector.add(defender.velocity, Vector.mult(normal, change)));
            if (notify) notify(attacker, defender, factor);
        }
    }
    return { advantage, multiplier, queueCollision, applyQueued };
});
