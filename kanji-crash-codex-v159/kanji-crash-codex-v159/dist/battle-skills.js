(function (root, factory) {
    const api = factory(root.Matter || (typeof require === 'function' ? require('./vendor/matter.min.js') : null));
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.KanjiBattleSkills = api;
})(typeof window !== 'undefined' ? window : globalThis, function (Matter) {
    'use strict';
    const { Body, Vector, Query } = Matter;
    const dot = (a, b) => a.x * b.x + a.y * b.y;
    const ability=(body,id)=>(body.gameData.readingAbilities||[body.gameData.readingAbility]).find(a=>a?.id===id);
    const state = body => body.gameData.rubyState || (body.gameData.rubyState = {charge:0});
    const stacks=(b,id)=>Math.max(1,Math.min(3,ability(b,id)?.stacks||1));
    const used=(b,id)=>state(b)[id+'Count']??(id==='sturdy'?Number(!!b.gameData.sturdyUsed):Number(!!state(b)[id+'Used']));
    const available=(b,id)=>!!ability(b,id)&&used(b,id)<stacks(b,id);
    const consume=(b,id)=>{const s=state(b);s[id+'Count']=used(b,id)+1;s[id+'Used']=s[id+'Count']>=stacks(b,id);if(id==='sturdy')b.gameData.sturdyUsed=s[id+'Used'];};
    const chargeBonus=b=>Math.min([.3,.4,.5][stacks(b,'charge')-1],(state(b).charge||0)*[.1,.15,.2][stacks(b,'charge')-1]);
    const key = body => body.gameData.key ?? body.id;
    const active = bodies => (bodies || []).filter(b => b.gameData && !b.gameData.isOut);
    function releaseAnchor(body){const s=state(body);if(s.anchorMultiplier){Body.setMass(body,body.mass/s.anchorMultiplier);body.gameData.rubyWeightMultiplier=(body.gameData.rubyWeightMultiplier||1)/s.anchorMultiplier;}delete s.anchorMultiplier;delete s.anchorContacts;delete s.anchorReleaseAt;}
    function beginTurn(bodies) {
        for (const body of active(bodies)){releaseAnchor(body);state(body).launchActive=false;state(body).defenseBlocked=false;}
    }
    function onLaunch(body, now = 0, options = {}) {
        body.gameData.wasHitByEnemy = false;
        body.gameData.lastEnemyHitAt = -Infinity;
        releaseAnchor(body);const s=state(body);s.charge=0;s.launchAt=now;s.launchActive=true;s.braked=false;s.sendUsed=false;delete s.ukemiAt;
        s.launchPower=Math.max(0,Math.min(1,Number(options.power)||0));

        s.brakeAt=ability(body,'brake')?now+900:Infinity;

        for(const other of active(options.bodies))if(other!==body&&other.gameData.isPlayer===body.gameData.isPlayer&&ability(other,'charge'))state(other).charge=Math.min(3,(state(other).charge||0)+1);
        if(options.arena)beforeUpdate(options.bodies||[body],options.arena,now);
    }
    function beforeUpdate(bodies, arena, now) {
        const alive=active(bodies);
        for(const body of alive){
            const d=body.gameData,s=state(body);
            d.rubyBackwater=!!ability(body,'backwater')&&Math.hypot(body.position.x-arena.center.x,body.position.y-arena.center.y)>=arena.radius*.72;
            const resonanceAllies=alive.filter(b=>b!==body&&b.gameData.isPlayer===d.isPlayer&&b.gameData.attr===d.attr&&Vector.magnitude(Vector.sub(b.position,body.position))<=140*(body.traitScale||1)).length;d.rubyResonance=!!ability(body,'resonance')&&resonanceAllies>0;
            d.rubyPowerMultiplier=(d.rubyBackwater?[1.2,1.3,1.35][stacks(body,'backwater')-1]:1)*(d.rubyResonance?1+[.15,.20,.23][stacks(body,'resonance')-1]+(resonanceAllies>=2?.05:0):1)*(1+(ability(body,'charge')?chargeBonus(body):0));
            if(s.anchorMultiplier){if(Query.collides(body,alive.filter(b=>b!==body&&b.gameData.isPlayer!==d.isPlayer&&(s.anchorContacts||[]).includes(key(b)))).length)s.anchorReleaseAt=now+300;else if(now>=(s.anchorReleaseAt??now))releaseAnchor(body);}
            d.rubyWeightMultiplier=(d.rubyBackwater?.9:1)*(s.anchorMultiplier||1);

        }
    }
    function safePosition(body, position, arena, bodies) {
        if(!arena||Math.hypot(position.x-arena.center.x,position.y-arena.center.y)+body.circleRadius>arena.radius-2)return false;
        const original={...body.position};Body.setPosition(body,position);
        const free=Query.collides(body,active(bodies).filter(b=>b!==body)).length===0;
        Body.setPosition(body,original);return free;
    }
    function afterUpdate(bodies, arena, now, options = {}) {
        const alive=active(bodies),dt=Math.min(2,Math.max(0,options.delta||1000/60)/(1000/60));
        for(const body of alive){
            const s=state(body);
            if(now>=s.brakeAt&&!s.braked){Body.setVelocity(body,Vector.mult(body.velocity,[.15,.10,.07][stacks(body,'brake')-1]));Body.setAngularVelocity(body,body.angularVelocity*[.15,.10,.07][stacks(body,'brake')-1]);s.braked=true;if(!options.prediction)options.notify?.(body,ability(body,'brake'));}
            if(s.ukemiAt!==undefined&&now>=s.ukemiAt){delete s.ukemiAt;if(available(body,'glide')){consume(body,'glide');Body.setVelocity(body,Vector.mult(body.velocity,.1));Body.setAngularVelocity(body,body.angularVelocity*.1);body.force.x=body.force.y=0;body.torque=0;if(!options.prediction)options.notify?.(body,ability(body,'glide'));}}
            const future=[];
            for(const hit of s.pursuits||[]){
                if(now<hit.due){future.push(hit);continue;}
                s.chasePending=false;const target=alive.find(b=>key(b)===hit.target);
                if(!target||Vector.magnitude(Vector.sub(target.position,body.position))>140*(body.traitScale||1))continue;
                if(!available(body,'chase'))continue;consume(body,'chase');Body.setVelocity(target,Vector.add(target.velocity,Vector.mult(hit.normal,hit.impulse)));target.gameData.lastHitBy=body;target.gameData.wasHitByEnemy=true;target.gameData.lastEnemyHitAt=now;
                if(!options.prediction)options.notify?.(body,ability(body,'chase'));
            }
            s.pursuits=future;
        }
    }
    function queueCollision(a, b, now, options = {}) {
        if (!a.gameData || !b.gameData || a.gameData.isOut || b.gameData.isOut) return [];
        if(a.gameData.isPlayer===b.gameData.isPlayer){const actions=[];for(const [source,target] of [[a,b],[b,a]]){const s=state(source),normal=Vector.normalise(Vector.sub(target.position,source.position));if(ability(source,'magnet')&&s.launchActive&&!s.sendUsed&&dot(source.velocity,normal)>.8)actions.push({send:true,attacker:source,defender:target,normal,speed:dot(source.velocity,normal),now,options,prediction:!!options.prediction});}return actions;}

        const direction = Vector.normalise(Vector.sub(b.position, a.position));
        const actions = [];
        function attack(attacker, defender, normal) {
            if (dot(attacker.velocity, normal) <= 0.8) return;
            defender.gameData.wasHitByEnemy = true; defender.gameData.lastEnemyHitAt = now;
            const atk=state(attacker),def=state(defender);
            let anchoring=false;
            if(ability(defender,'anchor')&&!def.launchActive){
                if(!def.anchorMultiplier){def.anchorMultiplier=[1.5,1.65,1.8][stacks(defender,'anchor')-1];defender.gameData.rubyWeightMultiplier=(defender.gameData.rubyWeightMultiplier||1)*def.anchorMultiplier;Body.setMass(defender,defender.mass*def.anchorMultiplier);anchoring=true;}
                def.anchorReleaseAt=now+300;def.anchorContacts=[...new Set([...(def.anchorContacts||[]),key(attacker)])];
            }
            const striking=available(attacker,'strike')&&atk.launchActive&&atk.launchPower>=.6?1:0;
            const guarding=available(defender,'guard')?1:0;
            const front={x:Math.sin(defender.angle),y:-Math.cos(defender.angle)};
            const countering=available(defender,'counter')&&dot(front,Vector.neg(normal))>=.5?1:0;
            const chasing=available(attacker,'chase')&&atk.launchActive&&!atk.chasePending?1:0;
            const dodging=available(defender,'dodge')?1:0;
            const ukemi=available(defender,'glide')&&def.ukemiAt===undefined?1:0;
            if (anchoring || striking || guarding || countering || chasing || dodging || ukemi) actions.push({ attacker, defender, normal, before: { ...defender.velocity }, anchoring, striking, guarding, countering, chasing, dodging, ukemi, now, options, prediction: !!options.prediction });
        }
        attack(a, b, direction); attack(b, a, Vector.neg(direction));
        return actions;
    }
    function applyQueued(actions, notify) {
        for (const action of actions) {
            if(action.send){const {attacker,defender,normal,speed}=action;if(attacker.gameData.isOut||defender.gameData.isOut||state(attacker).sendUsed||!state(attacker).launchActive)continue;state(attacker).sendUsed=true;const impulse=Math.min(10,speed*[.8,1,1.15][stacks(attacker,'magnet')-1]*attacker.mass/Math.max(.01,defender.mass));Body.setVelocity(defender,Vector.add(defender.velocity,Vector.mult(normal,impulse)));Body.setVelocity(attacker,{x:0,y:0});Body.setAngularVelocity(attacker,0);attacker.force.x=attacker.force.y=0;attacker.torque=0;state(defender).launchActive=false;if(!action.prediction&&notify){notify(attacker,ability(attacker,'magnet'));notify(defender,{...ability(attacker,'magnet'),name:'送り出された'});}continue;}
            const { attacker, defender, normal, before, anchoring, striking, guarding, countering, chasing, dodging, ukemi, prediction } = action;
            if (defender.gameData.isOut) continue;
            const received = Math.max(0, dot(Vector.sub(defender.velocity, before), normal));
            if (received <= 0.05) continue;

            const strikeNow=striking&&available(attacker,'strike'),guardAvailable=guarding&&available(defender,'guard'),counterNow=countering&&available(defender,'counter');
            const bonus = Math.min(10, received * [.375,.40,.425][stacks(attacker,'strike')-1]) * strikeNow;
            let evasion=0,guardNow=false;const defenseAllowed=!state(defender).defenseBlocked;
            if(defenseAllowed&&dodging&&available(defender,'dodge')){
                const sideways={x:-normal.y,y:normal.x},step=18*(defender.traitScale||1);
                for(const sign of [1,-1]){const destination=Vector.add(defender.position,Vector.mult(sideways,sign*step));
                    if(safePosition(defender,destination,action.options.arena,action.options.bodies)){
                        evasion=dodging;
                        if(!prediction)Body.setPosition(defender,destination);
                        consume(defender,'dodge');
                        break;
                    }
                }
            }
            if(defenseAllowed){if(evasion){state(defender).defenseBlocked=true;}else if(guardAvailable){guardNow=true;state(defender).defenseBlocked=true;}else if(ukemi&&available(defender,'glide')&&state(defender).ukemiAt===undefined){state(defender).ukemiAt=action.now+300;state(defender).defenseBlocked=true;}}
            const adjusted = (received + bonus) * (1 - 0.5 * guardNow)*(1-.75*evasion);
            Body.setVelocity(defender, Vector.add(defender.velocity, Vector.mult(normal, adjusted - received)));
            if(counterNow&&!attacker.gameData.isOut){Body.setVelocity(attacker,Vector.sub(attacker.velocity,Vector.mult(normal,received*.7*counterNow)));attacker.gameData.lastHitBy=defender;attacker.gameData.wasHitByEnemy=true;attacker.gameData.lastEnemyHitAt=action.now;}
            if(chasing&&!attacker.gameData.isOut&&available(attacker,'chase')&&!state(attacker).chasePending){const s=state(attacker);s.chasePending=true;(s.pursuits||(s.pursuits=[])).push({target:key(defender),normal:{...normal},due:action.now+180,impulse:Math.min(6,received*.3)*chasing});}
            if(strikeNow)consume(attacker,'strike');if(guardNow)consume(defender,'guard');if(counterNow)consume(defender,'counter');
            if (!prediction && notify) {
                if(anchoring)notify(defender,ability(defender,'anchor'));
                if (strikeNow) notify(attacker, ability(attacker,'strike'));
                if (guardNow) notify(defender, ability(defender,'guard'));
                if(counterNow)notify(defender,ability(defender,'counter'));
                if(evasion)notify(defender,ability(defender,'dodge'));
            }
        }
    }
    function canPreventFall(body, now) {
        const data = body.gameData, elapsed = now - data.lastEnemyHitAt;
        return available(body,'sturdy') && now>=(state(body).rescueUntil||0) && data.wasHitByEnemy && elapsed >= 0 && elapsed <= 4500;
    }
    function canReturn(body, now){const s=state(body);return available(body,'return')&&now>=(s.rescueUntil||0)&&s.launchActive&&!body.gameData.wasHitByEnemy&&now-s.launchAt>=0&&now-s.launchAt<=4500;}
    function fallChance(body,now){return canPreventFall(body,now)||canReturn(body,now)?1:0;}
    function tryPreventFall(body, arena, now, options = {}) {
        const returning=!canPreventFall(body,now)&&canReturn(body,now),chance=returning||canPreventFall(body,now)?1:0;
        if(!chance)return false;
        const direction=Vector.normalise(Vector.sub(body.position,arena.center)),radius=Math.max(0,arena.radius-body.circleRadius-4);
        let destination=null;
        if(returning){
            for(const inward of [0,body.circleRadius,body.circleRadius*2])for(const angle of [0,.20,-.20,.40,-.40]){
                const candidate=Vector.add(arena.center,Vector.mult(Vector.rotate(direction,angle),Math.max(0,radius-inward)));
                if(!destination&&safePosition(body,candidate,arena,options.bodies))destination=candidate;
            }
        }else{
            // Deterministic safe landing shared by live physics, replay and CPU prediction.
            const enemies=active(options.bodies).filter(b=>b!==body&&b.gameData.isPlayer!==body.gameData.isPlayer),origin={...body.position};let best=-Infinity;
            for(const ratio of [.6,.45,.3,0])for(const angle of [Math.PI/2,-Math.PI/2,Math.PI/3,-Math.PI/3,2*Math.PI/3,-2*Math.PI/3,Math.PI]){
                const candidate=Vector.add(arena.center,Vector.mult(Vector.rotate(direction,angle),Math.min(radius,arena.radius*ratio))),distance=Vector.magnitude(Vector.sub(candidate,origin));
                if(distance<Math.max(body.circleRadius*2,arena.radius*.35)||!safePosition(body,candidate,arena,options.bodies))continue;
                const separation=enemies.length?Math.min(...enemies.map(b=>Vector.magnitude(Vector.sub(candidate,b.position))-body.circleRadius-b.circleRadius)):arena.radius;
                const score=separation-distance*.15;if(score>best){destination=candidate;best=score;}
            }
        }
        if(!destination)return false;
        Body.setPosition(body,destination);
        Body.setVelocity(body, { x: 0, y: 0 }); Body.setAngularVelocity(body, 0);
        body.force.x = 0; body.force.y = 0;
        consume(body,returning?'return':'sturdy');state(body).rescueUntil=now+500;
        state(body).launchActive=false;const trait=body.gameData.traitState;if(trait){delete trait.captureHolder;delete trait.trapUntil;body.collisionFilter.group=0;}body.gameData.wasHitByEnemy = false;
        if (!options.prediction&&options.notify) options.notify(body, ability(body,returning?'return':'sturdy'));
        return true;
    }
    function status(body,id){const s=state(body);if(['sturdy','guard','strike','counter','dodge','chase','return','glide'].includes(id))return `（残り${Math.max(0,stacks(body,id)-used(body,id))}／${stacks(body,id)}回）`;if(id==='anchor'&&s.anchorMultiplier)return '（衝突防御中）';if(id==='charge')return `（現在+${Math.round(chargeBonus(body)*100)}%）`;if(id==='backwater'&&body.gameData.rubyBackwater||id==='resonance'&&body.gameData.rubyResonance)return '（発動中）';return '';}
    const copyState=s=>({...s,pursuits:(s.pursuits||[]).map(hit=>({...hit,normal:{...hit.normal}}))});
    return { state, copyState, beginTurn, onLaunch, beforeUpdate, afterUpdate, queueCollision, applyQueued, canPreventFall, canReturn, fallChance, tryPreventFall, status };
});
