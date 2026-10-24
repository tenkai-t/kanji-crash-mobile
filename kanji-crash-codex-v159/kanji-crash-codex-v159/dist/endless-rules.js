(function (root, factory) {
    const api = factory(root.KanjiLevels || (typeof require === 'function' ? require('./level-rules.js') : null));
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.KanjiEndless = api;
})(typeof window !== 'undefined' ? window : globalThis, function (Levels) {
    'use strict';
    const create = team => ({ wave: 1, kills: 0, wins: 0, awaitingNext: false, finished: false, team: team.map(i => ({ ...i,unlockedReadings:i.unlockedReadings?.slice(),equippedReadings:i.equippedReadings?.slice() })), roster: [] });
    const killBoost = 0.03;
    const wavesPerTier = 5;
    const tier = wave => Math.min(4, 1 + Math.floor((wave - 1) / wavesPerTier));
    const multiplier = kills => 1 + Math.max(0, Math.floor(kills)) * killBoost;
    function enemyItems(run, pools, rng = Math.random) {
        const jis = tier(run.wave), pool = pools[jis];
        if (!pool?.length) throw Error('pool');
        if (run.roster.length !== 3 || run.roster[0].jis !== jis)
            run.roster = Array.from({ length: 3 }, () => ({ ...pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))] }));
        return run.roster.map(i => ({ ...i, level: Levels.clampCpu(run.wave),cpuControlled:true, battleMultiplier: multiplier(run.kills) }));
    }
    function recordKill(run) { if (!run.finished && !run.awaitingNext) run.kills++; return multiplier(run.kills); }
    function finishWave(run, won) {
        if (run.finished || run.awaitingNext) return 0;
        if (won) { run.wins = run.wave; run.awaitingNext = true; return 40 + Math.min(16, run.wave) * 10; }
        run.finished = true; return 0;
    }
    function advance(run) {
        if (!run.awaitingNext || run.finished) return false;
        run.wave++; run.awaitingNext = false; return true;
    }
    function normalizeRecord(state) {
        state.endlessBest=Number.isInteger(state.endlessBest)&&state.endlessBest>=0?state.endlessBest:0;
        if(!Number.isInteger(state.endlessBestKills)||state.endlessBestKills<0){state.endlessBestKills=state.endlessBest*3;state.endlessBestEstimated=state.endlessBest>0;}
        else state.endlessBestEstimated=state.endlessBestEstimated===true;
        return state;
    }
    function recordBest(state,run) {
        normalizeRecord(state);if(!run)return false;
        if(run.wins>state.endlessBest||(run.wins===state.endlessBest&&(run.kills>state.endlessBestKills||(state.endlessBestEstimated&&run.kills>=state.endlessBestKills)))){
            state.endlessBest=run.wins;state.endlessBestKills=run.kills;state.endlessBestEstimated=false;return true;
        }return false;
    }
    function recordLabel(state){normalizeRecord(state);return `${state.endlessBest}連勝・${state.endlessBestKills}体${state.endlessBestEstimated?'以上':''}撃破`;}
    function validRecord(state){return (state.endlessBestKills===undefined||(Number.isInteger(state.endlessBestKills)&&state.endlessBestKills>=0))&&(state.endlessBestEstimated===undefined||typeof state.endlessBestEstimated==='boolean');}
    return { killBoost, wavesPerTier, create, tier, multiplier, enemyItems, recordKill, finishWave, advance, normalizeRecord, recordBest, recordLabel, validRecord };
});
