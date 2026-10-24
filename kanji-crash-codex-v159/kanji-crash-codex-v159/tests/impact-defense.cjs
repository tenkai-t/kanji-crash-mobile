const assert=require('node:assert/strict'),M=require('../dist/vendor/matter.min.js'),T=require('../dist/character-traits.js'),S=require('../dist/battle-skills.js'),R=require('../dist/reading-abilities.js'),AI=require('../dist/cpu-ai.js');
const {Engine,Body,Composite,Events}=M,arena={center:{x:0,y:0},radius:1000},close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function piece(char,x,player,n=0){const b=T.createBody({char},x,0,1,{mass:3,frictionAir:.025,restitution:.85,friction:.05});b.gameData={char,key:player?1:0,isPlayer:player,isOut:false,attr:'none',readingAbilities:n?[{...R.abilities.anchor,stacks:n}]:[],rubyState:{},traitState:{}};return b;}
for(const n of [1,2,3]){
 const a=piece('亜',-50,false),b=piece('亜',0,true,n),bodies=[a,b];S.beginTurn(bodies);S.onLaunch(a,0);Body.setVelocity(a,{x:8,y:0});const v={...b.velocity},actions=S.queueCollision(a,b,0,{bodies,arena});close(b.mass,3*[1.5,1.65,1.8][n-1]);close(b.velocity.x,v.x);close(b.velocity.y,v.y);assert(actions.some(a=>a.anchoring));
 S.beforeUpdate(bodies,arena,1);T.beforeUpdate(bodies,1);assert(b.mass>3,'mass remains boosted during contact');Body.setPosition(a,{x:-200,y:0});S.beforeUpdate(bodies,arena,2);T.beforeUpdate(bodies,2);assert(b.mass>3);S.beforeUpdate(bodies,arena,301);T.beforeUpdate(bodies,301);close(b.mass,3);assert(!S.state(b).anchorMultiplier);
 S.onLaunch(b,3);Body.setVelocity(a,{x:8,y:0});S.queueCollision(a,b,3,{bodies,arena});close(b.mass,3,'own launched piece cannot use anchor');
 S.beginTurn(bodies);a.gameData.isPlayer=true;S.queueCollision(a,b,4,{bodies,arena});close(b.mass,3);
}
// Actual physical impulse and private CPU prediction must use identical temporary mass.
const positions=[];
for(const n of [0,1,2,3]){
 const a=piece('亜',-70,false),b=piece('亜',0,true,n),bodies=[a,b],world=Engine.create({gravity:{scale:0}});Composite.add(world.world,bodies);let actions=[];
 Events.on(world,'beforeUpdate',()=>{S.beforeUpdate(bodies,arena,world.timing.timestamp);T.beforeUpdate(bodies,world.timing.timestamp);});Events.on(world,'collisionStart',ev=>T.rootPairs(ev.pairs).forEach(([a,b])=>actions.push(...S.queueCollision(a,b,world.timing.timestamp,{bodies,arena}))));Events.on(world,'afterUpdate',()=>{S.applyQueued(actions);actions=[];S.afterUpdate(bodies,arena,world.timing.timestamp);T.afterUpdate(bodies,arena,world.timing.timestamp);});
 const snapshot={...arena,timestamp:0,pieces:bodies.map(b=>({key:b.gameData.key,char:b.gameData.char,x:b.position.x,y:b.position.y,radius:b.circleRadius,traitScale:1,baseMass:b.traitBaseMass,mass:b.mass,angle:0,isPlayer:b.gameData.isPlayer,attr:'none',power:100,readingAbilities:b.gameData.readingAbilities,friction:.05,frictionAir:.025,restitution:.85}))},shot={key:0,force:{x:.065,y:0},spin:0};const predicted=AI.simulate(snapshot,shot);S.onLaunch(a,0,{bodies,arena,power:.8});T.onLaunch(a,0,0,{bodies,direction:{x:1,y:0}});Body.applyForce(a,a.position,shot.force);for(let i=0;i<168;i++)Engine.update(world,1000/60);for(let i=0;i<2;i++)close(bodies[i].position.x,predicted.positions[i].x);positions.push(b.position.x);close(b.mass,3);Engine.clear(world);
}
assert(positions[0]>positions[1]&&positions[1]>positions[2]&&positions[2]>positions[3],JSON.stringify(positions));
// Sticky defense: 30% reduction and 45% attacker deceleration; mouth stays at 20%.
for(const ch of ['粘','口']){const a=piece('亜',-50,false),b=piece(ch,0,true);Body.setVelocity(a,{x:8,y:0});const actions=T.queueCollision(a,b,{bodies:[a,b],arena});Body.setVelocity(b,{x:4,y:0});T.applyQueued(actions);close(b.velocity.x,ch==='粘'?2.8:3.2);close(a.velocity.x,ch==='粘'?4.4:8);}
console.log('PASS impact-only anchor 30/45/60%, restoration, no launch/ally activation, monotonic physical defense, exact CPU parity and sticky 30%/45%.');
