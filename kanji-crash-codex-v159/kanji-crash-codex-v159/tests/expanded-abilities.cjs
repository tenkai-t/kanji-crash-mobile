const assert=require('assert'),fs=require('fs'),vm=require('vm');
const M=require('../dist/vendor/matter.min.js'),R=require('../dist/reading-abilities.js'),S=require('../dist/battle-skills.js'),T=require('../dist/character-traits.js'),Rules=require('../dist/kanji-rules.js'),AI=require('../dist/cpu-ai.js'),E=require('../dist/element-skills.js');
const {Body,Vector}=M,arena={center:{x:0,y:0},radius:150};
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function piece(ids=[],x=0,y=0,isPlayer=true,char='A'){
 const b=T.createBody({char},x,y,1,Rules.getPhysics(Rules.getStats({char,power:1,weight:1})));
 b.gameData={char,isPlayer,isOut:false,attr:'metal',power:1,weight:1,readingAbilities:ids.map(id=>R.abilities[id])};return b;
}
const dictionary={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../dist/readings.js'),'utf8'),dictionary);
const examples={};for(const id of Object.keys(R.abilities)){
 for(const [char,words]of Object.entries(dictionary.window.KANJI_READINGS))for(const ruby of words)if(R.abilities[id].readings.includes(R.normalize(ruby))&&R.resolve({char,ruby}).id===id)examples[id]={char,ruby};
 assert(examples[id],`real obtainable reading missing: ${id}`);
}
assert.equal(Object.keys(R.abilities).length,14);assert.equal(E.catalogue.earth.name,'大地の守り');assert.equal(R.abilities.sturdy.name,'復活');
function collision(attacks,defenses,rng=()=>0,options={}){
 const a=piece(attacks,-30),b=piece(defenses,30,0,false),bodies=[a,b];Body.setVelocity(a,{x:8,y:0});
 S.onLaunch(a,0,{power:1});Body.setAngle(b,-Math.PI/2);const events=[],actions=S.queueCollision(a,b,10,{bodies,arena,rng,...options});Body.setVelocity(a,{x:2,y:0});Body.setVelocity(b,{x:4,y:0});S.applyQueued(actions,(b,a)=>events.push(a.id));return {a,b,bodies,events};
}
let result=collision([],['counter']);close(result.a.velocity.x,-.8);assert(result.events.includes('counter'));assert(result.a.gameData.lastHitBy===result.b);
close(collision([],['counter'],()=>.99).a.velocity.x,-.8);
result=collision([],['dodge']);close(result.b.velocity.x,1);close(Math.abs(result.b.position.y),18);assert(S.state(result.b).dodgeUsed);assert.equal(S.status(result.b,'dodge'),'（残り0／1回）');
Body.setVelocity(result.a,{x:8,y:0});const second=S.queueCollision(result.a,result.b,20,{bodies:result.bodies,arena,rng:()=>0});assert(!second.some(a=>a.dodging));
result=collision([],['dodge'],()=>.10);close(Math.abs(result.b.position.y),18);close(result.b.velocity.x,1);
result=collision([],['dodge'],()=>0,{arena:{center:{x:0,y:0},radius:40}});assert(!S.state(result.b).dodgeUsed);close(result.b.velocity.x,4);
result=collision(['chase'],[]);S.afterUpdate(result.bodies,arena,189);close(result.b.velocity.x,4);S.afterUpdate(result.bodies,arena,190);close(result.b.velocity.x,5.2);S.afterUpdate(result.bodies,arena,220);close(result.b.velocity.x,5.2);
result=collision(['chase'],[],()=>.20);S.afterUpdate(result.bodies,arena,200);close(result.b.velocity.x,5.2);
result=collision(['chase'],[]);Body.setPosition(result.b,{x:200,y:0});S.afterUpdate(result.bodies,arena,200);close(result.b.velocity.x,4);
const magnet=piece(['magnet']),enemy=piece([],80,0,false),friend=piece([],0,80);S.onLaunch(magnet,100);S.afterUpdate([magnet,enemy,friend],arena,116);close(enemy.velocity.x,0);close(friend.velocity.y,0);
const glide=piece(['glide'],0,0,true,'粘');glide.frictionAir=.075;S.onLaunch(glide,100);S.beforeUpdate([glide],arena,101);close(glide.frictionAir,.075);
result=collision([],['glide']);S.afterUpdate(result.bodies,arena,309);close(result.b.velocity.x,4);S.afterUpdate(result.bodies,arena,310);close(result.b.velocity.x,.4);assert(S.state(result.b).glideUsed);
const brake=piece(['brake']);S.onLaunch(brake,100);Body.setVelocity(brake,{x:10,y:0});S.afterUpdate([brake],arena,999);close(brake.velocity.x,10);S.afterUpdate([brake],arena,1000);close(brake.velocity.x,1.5);S.afterUpdate([brake],arena,1100);close(brake.velocity.x,1.5);
const returning=()=>{const b=piece(['return'],180);S.onLaunch(b,10);return b;};
let b=returning();assert(S.tryPreventFall(b,arena,20,{rng:()=>.199}));assert(S.state(b).returnUsed);assert(!T.isOutside(b,arena.center,arena.radius));S.onLaunch(b,30);Body.setPosition(b,{x:180,y:0});assert(!S.tryPreventFall(b,arena,40,{rng:()=>0}));
b=returning();assert(S.tryPreventFall(b,arena,20,{rng:()=>.99}));b.gameData.wasHitByEnemy=true;assert(!S.canReturn(b,20));b=returning();S.beginTurn([b]);assert(!S.canReturn(b,20));
b=returning();const crowded=piece([],120);assert(S.tryPreventFall(b,arena,20,{bodies:[b,crowded],rng:()=>0}));assert.equal(M.Query.collides(b,[crowded]).length,0,'return cannot overlap a living piece');
const empowered=piece(['backwater','resonance','charge'],110),same=piece([],0,70),same2=piece([],0,-70);S.state(empowered).charge=3;
S.beforeUpdate([empowered,same,same2],arena,0);T.beforeUpdate([empowered,same,same2],0);let stats=Rules.getStats(empowered.gameData,undefined,empowered.gameData.readingAbilities);assert.equal(stats.power,187);assert.equal(stats.weight,90);close(empowered.mass,Rules.getPhysics(stats).mass);
same.gameData.isOut=true;same2.gameData.attr='fire';Body.setPosition(empowered,{x:0,y:0});S.beforeUpdate([empowered,same,same2],arena,1);T.beforeUpdate([empowered,same,same2],1);stats=Rules.getStats(empowered.gameData,undefined,empowered.gameData.readingAbilities);assert.equal(stats.power,130);assert.equal(stats.weight,100);close(empowered.mass,1.5);
const waiting=piece(['charge']),launcher=piece([],60),opponent=piece([],0,70,false);for(let n=0;n<5;n++)S.onLaunch(launcher,n,{bodies:[waiting,launcher,opponent],arena});assert.equal(S.state(waiting).charge,3);S.onLaunch(opponent,6,{bodies:[waiting,launcher,opponent],arena});assert.equal(S.state(waiting).charge,3);S.onLaunch(waiting,7,{bodies:[waiting,launcher,opponent],arena});assert.equal(S.state(waiting).charge,0);assert.equal(waiting.gameData.rubyPowerMultiplier,1);
// Aura mass and displayed weight agree even when the special character aura
// and ruby edge penalty are active together, including their rounding.
const combined=piece(['backwater'],110,0,true,'合'),ally=piece([],70,50);S.beforeUpdate([combined,ally],arena,0);T.beforeUpdate([combined,ally],0);close(combined.mass,Rules.getPhysics(Rules.getStats(combined.gameData,undefined,combined.gameData.readingAbilities)).mass);
// Prediction must use these movement effects, clone usage/charge state, and
// avoid consuming real game randomness.
function snapshot(ids){const b=piece(ids,0,0,false);return {center:{x:0,y:0},radius:1000,timestamp:100,pieces:[{key:1,char:'亜',x:0,y:0,radius:26,mass:1.5,baseMass:1.5,isPlayer:false,attr:'metal',power:100,readingAbilities:b.gameData.readingAbilities,rubyState:{charge:2}},{key:2,char:'亜',x:900,y:0,radius:26,mass:1.5,isPlayer:true,attr:'fire',power:100}]};}
const shot={key:1,force:{x:.03,y:0}},normal=AI.simulate(snapshot([]),shot).positions[0].x,long=AI.simulate(snapshot(['glide']),shot).positions[0].x,short=AI.simulate(snapshot(['brake']),shot).positions[0].x;close(long,normal);assert(short<normal);
const all=snapshot(Object.keys(R.abilities)),before=JSON.stringify(all),random=Math.random;Math.random=()=>{throw Error('AI prediction must not roll live RNG');};try{AI.simulate(all,shot);}finally{Math.random=random;}assert.equal(JSON.stringify(all),before);
// Independently run the real event order with every new ruby active. Exact
// final positions must match the AI's isolated world, including pending hits.
const Attributes=require('../dist/attribute-rules.js'),{Engine,Composite,Events}=M;
const parityBodies=[piece(Object.keys(R.abilities),-35,0,false,'回'),piece(Object.keys(R.abilities),35,0,true,'合'),piece(['charge','resonance'],0,75,false),piece(['resonance'],0,-75,true),piece(['backwater'],750,0,false)];
parityBodies.forEach((b,i)=>{b.gameData.key=i;S.state(b).charge=2;});
const largeArena={center:{x:0,y:0},radius:1000},engine=Engine.create({gravity:{scale:0}});Composite.add(engine.world,parityBodies);let pending=[],attrs=[],traits=[],elements=[];
S.beforeUpdate(parityBodies,largeArena,100);T.beforeUpdate(parityBodies,100);
const fullSnapshot={...largeArena,timestamp:100,pieces:parityBodies.map(b=>({key:b.gameData.key,char:b.gameData.char,attr:b.gameData.attr,isPlayer:b.gameData.isPlayer,x:b.position.x,y:b.position.y,radius:b.circleRadius,mass:b.mass,baseMass:b.traitBaseMass,traitScale:b.traitScale,readingAbilities:b.gameData.readingAbilities,rubyState:S.copyState(S.state(b)),frictionAir:b.frictionAir,friction:b.friction,restitution:b.restitution}))};
const fullShot={key:0,force:{x:.035,y:0}},fullPrediction=AI.simulate(fullSnapshot,fullShot),now=()=>engine.timing.timestamp+100;
Events.on(engine,'beforeUpdate',()=>{S.beforeUpdate(parityBodies,largeArena,now());T.beforeUpdate(parityBodies,now());});
Events.on(engine,'collisionStart',ev=>T.rootPairs(ev.pairs).forEach(([a,b])=>{pending.push(...S.queueCollision(a,b,now(),{prediction:true,bodies:parityBodies,arena:largeArena}));attrs.push(...Attributes.queueCollision(a,b));traits.push(...T.queueCollision(a,b,{bodies:parityBodies,arena:largeArena,now:now()}));elements.push(...E.queueCollision(a,b,{bodies:parityBodies,turnIsPlayer:false}));}));
Events.on(engine,'afterUpdate',()=>{Attributes.applyQueued(attrs);T.applyQueued(traits);E.applyQueued(elements);S.applyQueued(pending);S.afterUpdate(parityBodies,largeArena,now(),{prediction:true});T.afterUpdate(parityBodies,largeArena,now());pending=[];attrs=[];traits=[];elements=[];});
S.onLaunch(parityBodies[0],100,{bodies:parityBodies,arena:largeArena,prediction:true});T.onLaunch(parityBodies[0],100);E.onLaunch(parityBodies[0]);Body.applyForce(parityBodies[0],parityBodies[0].position,fullShot.force);
for(let n=0;n<168;n++)Engine.update(engine,1000/60);
parityBodies.forEach((b,i)=>close(Vector.magnitude(Vector.sub(b.position,fullPrediction.positions[i])),0));
console.log(JSON.stringify({abilities:14,realReadingExamples:examples,deterministicTriggers:true,dodgeOnceAndSafe:true,delayedChase:true,ownReturnOnce:true,chargeCap:3,conditionalStatsAndMass:true,cpuMovement:{normal,long,short},predictionNoMutation:true,allAbilitiesCpuParity:true}));
