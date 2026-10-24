const assert = require('assert');
const fs = require('fs');
const Matter = require('../dist/vendor/matter.min.js');
const Attributes = require('../dist/attribute-rules.js');
const Skills = require('../dist/battle-skills.js');
const Rules = require('../dist/kanji-rules.js');
const Endless = require('../dist/endless-rules.js');
const Gacha = require('../dist/gacha-rules.js');
const AI = require('../dist/cpu-ai.js');
const {Engine, Bodies, Body, Composite, Events} = Matter;
const counts = {};
for (const type of ['normal','rare']) {
    assert.strictEqual(Gacha.rates[type].reduce((a,b)=>a+b,0),100);
    counts[type] = [0,0,0,0];
    for (let i=0;i<10000;i++) counts[type][Gacha.pickTier(type,()=> (i+.5)/10000)-1]++;
    assert.deepStrictEqual(counts[type],Gacha.rates[type].map(n=>n*100));
}
assert.strictEqual(Gacha.pickTier('rare',()=>.149999),1);
assert.strictEqual(Gacha.pickTier('rare',()=>.15),2);
assert.strictEqual(Gacha.pickTier('rare',()=>.75),3);
assert.strictEqual(Gacha.pickTier('rare',()=>.95),4);
function collision(attrA,attrB,options={}) {
    const engine=Engine.create({gravity:{x:0,y:0,scale:0}});
    const a=Bodies.circle(0,0,26,{mass:1.6,restitution:.85,frictionAir:0});
    const b=Bodies.circle(50,0,26,{mass:1.6,restitution:.85,frictionAir:0});
    a.gameData={isPlayer:false,attr:attrA,readingAbility:options.strike?{id:'strike'}:null};
    b.gameData={isPlayer:!options.ally,attr:attrB,readingAbility:options.guard?{id:'guard'}:null};
    Body.setVelocity(a,{x:3,y:0}); Composite.add(engine.world,[a,b]);
    let attrs=[],skills=[],activations=0;
    Events.on(engine,'collisionStart',e=>e.pairs.forEach(p=>{
        attrs.push(...Attributes.queueCollision(p.bodyA,p.bodyB));
        skills.push(...Skills.queueCollision(p.bodyA,p.bodyB,engine.timing.timestamp,{rng:()=>0}));
    }));
    Events.on(engine,'afterUpdate',()=>{Attributes.applyQueued(attrs,()=>activations++);Skills.applyQueued(skills);attrs=[];skills=[];});
    Skills.onLaunch(a,0,{power:1});Engine.update(engine,1000/60);
    const result={impulse:b.velocity.x,activations}; Engine.clear(engine);Composite.clear(engine.world);return result;
}
const neutral=collision('wood','wood').impulse;
for (const a of Object.keys(Attributes.advantage)) for(const b of Object.keys(Attributes.advantage)) {
    const factor=Attributes.multiplier(a,b),result=collision(a,b);
    assert(Math.abs(result.impulse/neutral-factor)<1e-9,`${a} vs ${b} must change the solved collision`);
    assert.strictEqual(result.activations,factor===1?0:1);
}
assert(Math.abs(collision('wood','earth',{strike:true,guard:true}).impulse/neutral-1.45*1.375*.5)<1e-9,'ruby abilities stack with attributes');
assert(Math.abs(collision('wood','earth',{ally:true}).impulse/neutral-1)<1e-9,'allies are neutral');
const stationaryA=Bodies.circle(0,0,26),stationaryB=Bodies.circle(50,0,26);
stationaryA.gameData={isPlayer:false,attr:'wood'};stationaryB.gameData={isPlayer:true,attr:'earth'};
assert.deepStrictEqual(Attributes.queueCollision(stationaryA,stationaryB),[],'overlap at rest does not activate an attribute');
const piece=(key,x,isPlayer,attr)=>({key,x,y:0,isPlayer,attr,radius:26,power:100,mass:1.6});
function predictedPush(attr) {
    return AI.simulate({center:{x:0,y:0},radius:150,pieces:[piece(1,-40,false,'wood'),piece(2,40,true,attr)]},{key:1,force:{x:.02,y:0}}).positions[1].x;
}
const pushes={advantage:predictedPush('earth'),neutral:predictedPush('wood'),disadvantage:predictedPush('metal')};
assert(pushes.advantage>pushes.neutral+1&&pushes.neutral>pushes.disadvantage+10,'matchup plus strengthened earth defense still changes predicted movement');
const source=fs.readFileSync(require('path').join(__dirname,'../dist/index.html'),'utf8');
const database=JSON.parse(source.match(/const KANJI_DATABASE\s*=\s*(\[.*?\]);/s)[1]);
const pools=Object.fromEntries([1,2,3,4].map(jis=>[jis,database.filter(k=>k.jis===jis)]));
const team=[{...pools[1][0],instanceId:'team',level:2,ruby:'ア'}],run=Endless.create(team);
team[0].level=10;assert.strictEqual(run.team[0].level,2,'starting team is frozen');
assert.strictEqual(Endless.multiplier(1),1.03);assert.strictEqual(Endless.multiplier(10),1.3);
assert.deepStrictEqual([1,5,6,10,11,15,16,100].map(Endless.tier),[1,1,2,2,3,3,4,4]);
let last=null;
for(let wave=1;wave<=20;wave++) {
    assert.strictEqual(run.wave,wave);
    const enemies=Endless.enemyItems(run,pools,()=>wave%2?0:.999999),stats=enemies.map(i=>Rules.getStats(i));
    assert(enemies.every(i=>i.level===wave&&i.jis===Math.min(4,1+Math.floor((wave-1)/5))));
    if(last) for(let i=0;i<3;i++) assert(stats[i].power>last[i].power&&stats[i].weight>last[i].weight,'every new squad is stronger');
    for(let kill=0;kill<3;kill++) {
        const before=Rules.getStats(Endless.enemyItems(run,pools)[0]);
        Endless.recordKill(run);
        const after=Rules.getStats(Endless.enemyItems(run,pools)[0]);
        assert(after.power>before.power&&after.weight>before.weight,'each KO strengthens surviving enemies');
    }
    last=Endless.enemyItems(run,pools).map(i=>Rules.getStats(i));
    const reward=Endless.finishWave(run,true);assert.strictEqual(reward,40+Math.min(16,wave)*10);
    assert.strictEqual(Endless.finishWave(run,true),0,'no duplicate reward');
    const kills=run.kills;Endless.recordKill(run);assert.strictEqual(run.kills,kills,'finished round cannot add KOs');
    assert(Endless.advance(run));assert(!Endless.advance(run),'double continuation is rejected');
}
assert.strictEqual(run.kills,60);assert.strictEqual(run.wins,20);
assert.strictEqual(Endless.finishWave(run,false),0);assert(!Endless.advance(run));
Endless.recordKill(run);assert.strictEqual(run.kills,60,'ended run cannot grow');
console.log(JSON.stringify({counts,attributeRatios:{advantage:collision('wood','earth').impulse/neutral,disadvantage:collision('wood','metal').impulse/neutral},pushes,wavesVerified:20,kills:run.kills}));
