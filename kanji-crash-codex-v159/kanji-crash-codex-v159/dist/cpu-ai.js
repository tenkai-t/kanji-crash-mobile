(function (root, factory) {
    const api = factory(root.Matter || (typeof require === 'function' ? require('./vendor/matter.min.js') : null), root.KanjiBattleSkills || (typeof require === 'function' ? require('./battle-skills.js') : null), root.KanjiAttributes || (typeof require === 'function' ? require('./attribute-rules.js') : null), root.KanjiTraits || (typeof require === 'function' ? require('./character-traits.js') : null), root.KanjiElements || (typeof require === 'function' ? require('./element-skills.js') : null), root.KanjiPressure || (typeof require === 'function' ? require('./battle-pressure.js') : null),root.KanjiCpuDifficulty || (typeof require === 'function' ? require('./cpu-difficulty.js') : null));
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.KanjiCpuAI = api;
})(typeof window !== 'undefined' ? window : globalThis, function (Matter, Skills, Attributes, Traits, Elements, Pressure, Difficulty) {
    'use strict';
    const { Engine, Bodies, Body, Composite, Events, Vector } = Matter;
    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    function simulate(snapshot, shot) {
        const world = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
        const bodies = snapshot.pieces.map(p => {
            const body = Traits.createBody({char:p.char}, p.x, p.y, p.traitScale || (p.radius / 26), {
                friction: p.friction ?? 0.05,
                frictionAir: p.frictionAir ?? 0.025,
                restitution: p.restitution ?? 0.85,
                mass: p.baseMass || p.mass,
            }, p.angle || 0);
            body.gameData = { char:p.char, traitSpinUntil:p.traitSpinUntil,traitState:p.traitState?Traits.copyState(p.traitState):undefined, key: p.key, isPlayer: p.isPlayer, attr: p.attr, readingAbility: p.readingAbility, readingAbilities: p.readingAbilities, sturdyUsed: !!p.sturdyUsed, wasHitByEnemy: !!p.wasHitByEnemy, lastEnemyHitAt: p.lastEnemyHitAt, rubyState:p.rubyState?Skills.copyState(p.rubyState):undefined };
            Body.setAngle(body, p.angle || 0);
            Body.setVelocity(body, p.velocity || { x: 0, y: 0 });
            Body.setAngularVelocity(body, p.angularVelocity || 0);
            return body;
        });
        Composite.add(world.world, bodies);
        let pending = [], attributeActions = [], traitActions = [], elementActions = [];
        const shooter=bodies.find(b=>b.gameData.key===shot.key);
        const now = () => world.timing.timestamp + (snapshot.timestamp || 0);
        const arena={center:snapshot.center,radius:snapshot.radius};
        Events.on(world, 'beforeUpdate', () => {Skills.beforeUpdate(bodies,arena,now());Traits.beforeUpdate(bodies.filter(b=>!b.gameData.isOut), now());});
        Events.on(world, 'collisionStart', event => Traits.rootPairs(event.pairs).forEach(([a,b]) => {
            pending.push(...Skills.queueCollision(a,b,now(),{prediction:true,bodies,arena}));
            attributeActions.push(...Attributes.queueCollision(a,b));
            traitActions.push(...Traits.queueCollision(a,b,{bodies,arena,now:now()}));
            elementActions.push(...Elements.queueCollision(a,b,{bodies,turnIsPlayer:shooter?.gameData.isPlayer}));
        }));
        Events.on(world, 'afterUpdate', () => { Attributes.applyQueued(attributeActions); Traits.applyQueued(traitActions); Elements.applyQueued(elementActions); Skills.applyQueued(pending); Skills.afterUpdate(bodies,arena,now(),{prediction:true});Traits.afterUpdate(bodies,arena,now());pending = []; attributeActions = []; traitActions = []; elementActions=[]; });
        if (shooter) { Skills.onLaunch(shooter,now(),{bodies,arena,prediction:true,power:shot.power??Vector.magnitude(shot.force)/(.08*((snapshot.pieces.find(p=>p.key===shot.key)?.power||100)/100))}); Traits.onLaunch(shooter,now(),shot.spin,{bodies,direction:Vector.normalise(shot.force)}); Elements.onLaunch(shooter); Body.applyForce(shooter, shooter.position, shot.force); }
        const out = new Set();
        const survivalChance = new Map();
        const pressure=snapshot.pressure?{...snapshot.pressure}:null;
        if(pressure){pressure.pending=false;Pressure.beginShot(pressure,bodies);}
        for (let tick = 0; tick < 168; tick++) {
            Engine.update(world, 1000 / 60);
            if(pressure&&tick===131){const result=Pressure.completeShot(pressure,bodies);if(result.shrunk)arena.radius=(snapshot.baseRadius||snapshot.radius/snapshot.pressure.ratio)*pressure.ratio;}
            for (const body of bodies) {
                if (!out.has(body.gameData.key) && Traits.isOutside(body,arena.center,arena.radius)) {
                    if(Traits.tryPreventFall(body,arena,bodies)||Skills.tryPreventFall(body,arena,now(),{bodies,prediction:true}))continue;
                    out.add(body.gameData.key); body.gameData.isOut=true;
                    survivalChance.set(body.gameData.key,0);
                    Composite.remove(world.world, body);
                }
            }
        }
        let enemyOut = 0, ownOut = 0, score = 0;
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i], original = snapshot.pieces[i];
            if (out.has(original.key)) {
                if (original.isPlayer) { enemyOut++; score -= 250 * (survivalChance.get(original.key) || 0); }
                else { ownOut++; score += 450 * (survivalChance.get(original.key) || 0); }
                continue;
            }
            const before = distance(original, snapshot.center) / snapshot.radius;
            const after = distance(body.position, snapshot.center) / snapshot.radius;
            if (original.isPlayer) score += (after - before) * 35;
            else {
                score += (before - after) * 10;
                score -= Math.max(0, after - 0.83) * 100;
            }
        }
        const enemies = snapshot.pieces.filter(p => p.isPlayer).length;
        const own = snapshot.pieces.length - enemies;
        score += enemyOut * 250 - ownOut * 450;
        if(pressure?.shots>=36){const decision=Pressure.judge(bodies,arena.center,arena.radius);if(decision.winner!==null)score+=decision.winner?-600:600;}
        const allFallChance = isPlayer => snapshot.pieces.filter(p => p.isPlayer === isPlayer).reduce((chance, p) => chance * (1 - (survivalChance.get(p.key) || 0)), 1);
        if (enemyOut === enemies) score += 700 * allFallChance(true);
        if (ownOut === own) score -= 1000 * allFallChance(false);
        const result = { score, enemyOut, ownOut, positions: bodies.map(b => ({ key: b.gameData.key, x: b.position.x, y: b.position.y, out: out.has(b.gameData.key) })) };
        Engine.clear(world);
        Composite.clear(world.world);
        return result;
    }

    function plan(snapshot, difficulty = 'normal', options = {}) {
        // The existing evaluator sees its own side as CPU. Work on a copy when
        // planning for the player, retaining the live piece IDs and state.
        if (options.isPlayer) snapshot = { ...snapshot, pieces: snapshot.pieces.map(p => ({ ...p, isPlayer: !p.isPlayer })) };
        const own = snapshot.pieces.filter(p => !p.isPlayer);
        const enemies = snapshot.pieces.filter(p => p.isPlayer);
        if (!own.length || !enemies.length) return null;
        const profile=options.classicDifficulty?Difficulty.get(difficulty):null;
        const angles = profile?.angles || (difficulty === 'normal' ? [0, -0.07, 0.07] : [0, -0.09, 0.09, -0.18, 0.18]);
        const powers = profile?.powers || (difficulty === 'normal' ? [0.012, 0.022, 0.034, 0.046] : [0.009, 0.017, 0.026, 0.038, 0.05]);
        const arenaScale = Math.min(1.4, snapshot.radius / 150);
        let bestSafe = null, bestOverall = null;const beam=[];
        function consider(piece, direction, strength) {
            // Bound acceleration, rather than using one force cap for every
            // mass. Heavy rare pieces can still use their higher power.
            const maxForce = 0.055 * Math.max(0.5, piece.mass / 1.6);
            const magnitude = Math.min(maxForce, options.maxStrength ? options.maxStrength * (piece.power / 100) : Infinity, strength * arenaScale * (piece.power / 100));
            for (const spin of options.spins || [0]) {
                const candidate = { key: piece.key, force: Vector.mult(direction, magnitude), power:magnitude/(.08*(piece.power/100)), spin };
                const outcome = simulate(snapshot, candidate);
                const choice = { ...candidate, ...outcome };
                if(profile?.beam){beam.push(choice);beam.sort((a,b)=>(a.ownOut-b.ownOut)||(b.score-a.score));if(beam.length>profile.beam)beam.pop();}
                if (!bestOverall || outcome.score > bestOverall.score) bestOverall = choice;
                if (outcome.ownOut === 0 && (!bestSafe || outcome.score > bestSafe.score)) bestSafe = choice;
            }
        }
        for (const piece of own) {
            for (const target of enemies) {
                const direct = Vector.normalise({ x: target.x - piece.x, y: target.y - piece.y });
                for (const angle of angles) for (const power of powers) consider(piece, Vector.rotate(direct, angle), power);
                const strike=(piece.readingAbilities||[piece.readingAbility]).find(a=>a?.id==='strike'),ruby=piece.rubyState||{};
                if(strike&&(ruby.strikeCount??Number(!!ruby.strikeUsed))<(strike.stacks||1))for(const power of [.600001,.7])consider(piece,direct,.08*power/arenaScale);
            }
            // If every attack would fall off, move back toward the center.
            const inward = Vector.normalise({ x: snapshot.center.x - piece.x, y: snapshot.center.y - piece.y });
            for (const power of [0.004, 0.008]) consider(piece, inward, power);
        }
        // Test spin only on a bounded shortlist to keep mobile turns responsive.
        if(profile?.spinCandidates.length)for(const candidate of beam.slice())for(const spin of profile.spinCandidates){const shot={key:candidate.key,force:{...candidate.force},power:candidate.power,spin},outcome=simulate(snapshot,shot),choice={...shot,...outcome};if(!bestOverall||outcome.score>bestOverall.score)bestOverall=choice;if(outcome.ownOut===0&&(!bestSafe||outcome.score>bestSafe.score))bestSafe=choice;}
        if(profile&&difficulty==='boss'&&bestOverall?.enemyOut===enemies.length&&bestOverall.ownOut<own.length)return bestOverall;
        return bestSafe || bestOverall;
    }
    return { plan, simulate };
});
