const assert = require('assert');
const fs = require('fs');
const path = require('path');
const rules = require('../dist/kanji-rules.js');
const AI = require('../dist/cpu-ai.js');
const Traits = require('../dist/character-traits.js');
const source = fs.readFileSync(path.join(__dirname, '../dist/index.html'), 'utf8');
const database = JSON.parse(source.match(/const KANJI_DATABASE\s*=\s*(\[.*?\]);/s)[1]);
const ranges = [1, 2, 3, 4].map(jis => {
    const stats = database.filter(k => k.jis === jis && !Traits.get(k)).map(k => rules.getStats(k));
    return { jis, power: [Math.min(...stats.map(s => s.power)), Math.max(...stats.map(s => s.power))], weight: [Math.min(...stats.map(s => s.weight)), Math.max(...stats.map(s => s.weight))],meanPower:stats.reduce((n,s)=>n+s.power,0)/stats.length,meanWeight:stats.reduce((n,s)=>n+s.weight,0)/stats.length };
});
for (let i = 1; i < ranges.length; i++) {
    assert(ranges[i].power[0] > ranges[i - 1].power[1] * 1.05, 'initial-value types retain distinct rarity ranges');
    assert(ranges[i].weight[0] > ranges[i - 1].weight[1] * 1.05, 'initial-value types retain distinct rarity ranges');
    assert(ranges[i].meanPower>ranges[i-1].meanPower*1.4&&ranges[i].meanWeight>ranges[i-1].meanWeight*1.4,'rarity remains a clear average advantage');
}
const normal = { jis: 1, power: 1, weight: 1 };
const legendary = { jis: 4, power: 3.2, weight: 1.8 };
const stats = item => rules.getStats(item);
const piece = (key, x, isPlayer, s) => ({ key, x, y: 0, isPlayer, attr: 'metal', radius: 26, power: s.power, ...rules.getPhysics(s) });
function collision(attacker, defender, pull = 0.025) {
    const a = stats(attacker), b = stats(defender);
    return AI.simulate({ center: { x: 0, y: 0 }, radius: 150, pieces: [piece(1, -40, false, a), piece(2, 40, true, b)] }, { key: 1, force: { x: pull * a.power / 100, y: 0 } });
}
const lightHit = collision(normal, normal);
const heavyDefense = collision(normal, legendary);
assert.strictEqual(lightHit.enemyOut, 1);
assert.strictEqual(heavyDefense.enemyOut, 0, 'a legendary defender resists a hit that removes an ordinary defender');
const ordinaryPush = collision(normal, normal, 0.012).positions[1].x;
const legendaryPush = collision(legendary, normal, 0.012).positions[1].x;
assert(legendaryPush > ordinaryPush + 15, 'same pull produces a stronger collision for a rare attacker');
const grown = stats({ ...normal, level: 5 });
assert(grown.power >= stats(normal).power + 80 && grown.weight >= stats(normal).weight + 80, 'leveling has a visible effect');
const snap = { center: { x: 0, y: 0 }, radius: 150, pieces: [piece(1, -60, false, stats(legendary)), piece(2, 60, true, stats(legendary))] };
const shot = AI.plan(snap, 'boss');
assert(shot && shot.ownOut === 0 && Math.hypot(shot.force.x, shot.force.y) > 0.055, 'heavy CPU pieces can use their strength without the old force ceiling');
console.log(JSON.stringify({ ranges, ordinaryPush: Math.round(ordinaryPush), legendaryPush: Math.round(legendaryPush), lightHitOut: lightHit.enemyOut, heavyDefenseOut: heavyDefense.enemyOut, grownPower: grown.power, heavyCpuForce: Math.hypot(shot.force.x, shot.force.y) }));
