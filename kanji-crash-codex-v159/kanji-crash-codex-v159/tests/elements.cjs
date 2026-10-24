const assert=require('assert'),M=require('../dist/vendor/matter.min.js'),E=require('../dist/element-skills.js'),T=require('../dist/character-traits.js'),A=require('../dist/attribute-rules.js'),S=require('../dist/battle-skills.js'),AI=require('../dist/cpu-ai.js');
const {Body,Vector,Engine,Composite,Events}=M;
const piece=(attr,isPlayer,x,y=0,char='亜')=>{const b=T.createBody({char},x,y,1,{mass:1.5,friction:.05,frictionAir:.025,restitution:.85});b.gameData={attr,isPlayer,char,isOut:false};return b;};
const close=(actual,expected)=>assert(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
function push({attacker='water',defender='metal',turn=true,helpers=[],launched=true}){
 const a=piece(attacker,true,-30),b=piece(defender,false,30),bodies=[a,b,...helpers];
 Body.setVelocity(a,{x:8,y:0});if(launched)E.onLaunch(a);
 const actions=E.queueCollision(a,b,{bodies,turnIsPlayer:turn}),events=[];
 Body.setVelocity(a,{x:2,y:0});Body.setVelocity(b,{x:4,y:0});E.applyQueued(actions,(b,s)=>events.push(s.name));
 return{a,b,actions,events};
}
close(push({attacker:'fire'}).b.velocity.x,5.4);
close(push({attacker:'fire',launched:false}).b.velocity.x,4);
const first=push({attacker:'fire'});assert(first.a.gameData.fireUsed);Body.setVelocity(first.a,{x:8,y:0});assert(!E.queueCollision(first.a,first.b,{turnIsPlayer:true}).some(a=>a.bonuses.length),'only the first enemy contact gets fire');E.onLaunch(first.a);assert(!first.a.gameData.fireUsed);
close(push({defender:'earth'}).b.velocity.x,2.8);
close(push({defender:'earth',turn:false}).b.velocity.x,4);
const helper=()=>piece('wood',false,60,30);
close(push({helpers:[helper()]}).b.velocity.x,3);
close(push({helpers:[helper(),helper()]}).b.velocity.x,2.25);
close(push({defender:'earth',helpers:[helper()]}).b.velocity.x,2.1);
close(push({helpers:[piece('wood',true,60,30)]}).b.velocity.x,4);
close(push({helpers:[piece('wood',false,300)]}).b.velocity.x,4);
const dead=helper();dead.gameData.isOut=true;close(push({helpers:[dead]}).b.velocity.x,4);
close(push({attacker:'metal'}).a.velocity.x,4.4);
close(push({attacker:'metal',launched:false}).a.velocity.x,2);
const metal=push({attacker:'metal'});Body.setVelocity(metal.a,{x:2,y:0});E.applyQueued([...metal.actions,...metal.actions]);close(metal.a.velocity.x,4.4);
const water=piece('water',true,125),opponent=piece('water',false,-125),center=piece('water',true,60);let moved=0;
E.beginTurn([water,opponent,center],true,{center:{x:0,y:0},radius:150},()=>moved++);close(water.position.x,113);close(opponent.position.x,-125);close(center.position.x,60);assert.equal(moved,1);
const blocked=piece('water',true,125),blocker=piece('metal',true,71);E.beginTurn([blocked,blocker],true,{center:{x:0,y:0},radius:150});close(blocked.position.x,125);assert(!M.Query.collides(blocked,[blocker]).length);
water.gameData.isOut=true;E.beginTurn([water],true,{center:{x:0,y:0},radius:150});close(water.position.x,113);
// A real simulation independently runs the browser's event order. Compare
// CPU prediction for all 5 skills combined with matchup, reading and geometry.
for(const attr of Object.keys(E.catalogue)){
 const bodies=[piece(attr,false,-35,0,'矢'),piece('earth',true,35),piece('wood',true,75,55)];
 bodies[0].gameData.readingAbility={id:'strike'};bodies[1].gameData.readingAbility={id:'guard'};
 const engine=Engine.create({gravity:{scale:0}});Composite.add(engine.world,bodies);let match=[],trait=[],element=[],reading=[];
 Events.on(engine,'beforeUpdate',()=>T.beforeUpdate(bodies,engine.timing.timestamp));
 Events.on(engine,'collisionStart',ev=>T.rootPairs(ev.pairs).forEach(([a,b])=>{match.push(...A.queueCollision(a,b));trait.push(...T.queueCollision(a,b));element.push(...E.queueCollision(a,b,{bodies,turnIsPlayer:false}));reading.push(...S.queueCollision(a,b,engine.timing.timestamp,{prediction:true}));}));
 Events.on(engine,'afterUpdate',()=>{A.applyQueued(match);T.applyQueued(trait);E.applyQueued(element);S.applyQueued(reading);T.afterUpdate(bodies,{center:{x:0,y:0},radius:1000},engine.timing.timestamp);match=[];trait=[];element=[];reading=[];});
 const snapshot={center:{x:0,y:0},radius:1000,pieces:bodies.map((b,i)=>({key:i,char:b.gameData.char,attr:b.gameData.attr,isPlayer:b.gameData.isPlayer,readingAbility:b.gameData.readingAbility,x:b.position.x,y:b.position.y,radius:b.circleRadius,baseMass:b.traitBaseMass,mass:b.mass,traitScale:b.traitScale,angle:b.angle,friction:b.friction,frictionAir:b.frictionAir,restitution:b.restitution}))};
 const shot={key:0,force:{x:.04,y:0}},predicted=AI.simulate(snapshot,shot);S.onLaunch(bodies[0]);T.onLaunch(bodies[0],0,0,{direction:Vector.normalise(shot.force)});E.onLaunch(bodies[0]);Body.applyForce(bodies[0],bodies[0].position,shot.force);
 for(let i=0;i<168;i++)Engine.update(engine,1000/60);
 bodies.forEach((b,i)=>close(Vector.magnitude(Vector.sub(b.position,predicted.positions[i])),0));
}
console.log(JSON.stringify({fiveElementSkills:true,fireOnce:true,woodStacks:true,earthTurnBoundary:true,metalNoEnergyDuplication:true,waterNoOverlap:true,cpuParity:5}));
