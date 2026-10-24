const assert=require('assert'),Matter=require('../dist/vendor/matter.min.js'),T=require('../dist/character-traits.js'),R=require('../dist/kanji-rules.js'),F=require('../dist/formation-rules.js'),AI=require('../dist/cpu-ai.js'),Elements=require('../dist/element-skills.js');
const {Body,Engine,Composite,Events}=Matter;
const piece=(char,x=0,y=0,isPlayer=true,angle=0)=>{const item={char,power:1,weight:1,jis:1,attr:'metal',isPlayer};const b=T.createBody(item,x,y,1,R.getPhysics(R.getStats(item)),angle);b.gameData=item;return b;};
assert.deepStrictEqual(T.catalogue.map(t=>t.char),['一','小','口','山','大','十','凹','弾','風','粘','回','矢','盾','合','独']);
assert.equal(piece('小').circleRadius,18);assert.equal(piece('大').circleRadius,34);assert(piece('口').mass>piece('亜').mass*1.5);
const notch=piece('凹');assert(!Matter.Query.point([notch],{x:0,y:-15}).length,'notch opening must be physically empty');assert(Matter.Query.point([notch],{x:26,y:-15}).length,'notch sides collide');
const cross=piece('十');assert(!Matter.Query.point([cross],{x:25,y:25}).length,'cross corners must be physically empty');assert(Matter.Query.point([cross],{x:28,y:0}).length,'cross arms collide');
assert(T.rootPairs([{bodyA:cross.parts[1],bodyB:notch.parts[1]},{bodyA:cross.parts[2],bodyB:notch.parts[2]}]).length===1,'compound contacts normalize and deduplicate');
const bar=piece('一');assert(Matter.Query.point([bar],{x:35,y:0}).length);assert(!Matter.Query.point([bar],{x:0,y:20}).length);Body.setAngle(bar,Math.PI/2);assert(Matter.Query.point([bar],{x:0,y:35}).length);
const edgeBar=piece('一',0,165);assert(T.isOutside(edgeBar,{x:0,y:0},150),'short edge fully outside counts as a fall');Body.setAngle(edgeBar,Math.PI/2);assert(!T.isOutside(edgeBar,{x:0,y:0},150),'a long edge still on the arena survives');
const oldRadius=notch.circleRadius,oldMass=notch.mass;T.resizeBody(notch,.6);assert(Math.abs(notch.circleRadius-oldRadius*.6)<1e-8&&Math.abs(notch.mass-oldMass)<1e-8);
function flight(char){const engine=Engine.create({gravity:{scale:0}}),b=piece(char);Composite.add(engine.world,b);Body.setVelocity(b,{x:5,y:0});for(let i=0;i<60;i++)Engine.update(engine,1000/60);return b.position.x;}
assert.equal(flight('風'),flight('亜'));assert.equal(flight('粘'),flight('亜'));assert.equal(piece('弾').restitution,.85);
function action(attackerChar,defenderChar,angle){const a=piece(attackerChar,0,50,false,angle),b=piece(defenderChar,0,0,true,angle);Body.setVelocity(a,{x:0,y:-8});T.onLaunch(a,0);const actions=T.queueCollision(a,b,{bodies:[a,b],arena:{center:{x:0,y:100},radius:150},now:0});Body.setVelocity(b,{x:0,y:-4});T.applyQueued(actions);return b.velocity;}
assert(Math.abs(action('矢','亜',0).y+4)<1e-8);assert(Math.abs(action('矢','亜',Math.PI).y+4)<1e-8);
assert(Math.abs(action('亜','盾',0).y+4)<1e-8);assert(Math.abs(action('亜','盾',Math.PI).y+2)<1e-8);assert(Math.abs(action('山','亜',0).y+4)<1e-8);
const spinner=piece('回');T.onLaunch(spinner,10);Body.setVelocity(spinner,{x:1,y:0});T.beforeUpdate([spinner],100);assert.equal(spinner.gameData.traitSpinUntil,1310);assert.equal(spinner.angularVelocity,.182);
const ally=piece('合'),solo=piece('独',200),other=piece('亜',50),enemy=piece('亜',205,0,false);
T.beforeUpdate([ally,solo,other,enemy],0);assert.equal(ally.gameData.traitPowerMultiplier,1);assert.equal(solo.gameData.traitPowerMultiplier,1.35);assert.equal(solo.gameData.traitWeightMultiplier,1.15);
assert(Math.abs(ally.mass-R.getPhysics(R.getStats(ally.gameData)).mass)<1e-8);assert(Math.abs(solo.mass-R.getPhysics(R.getStats(solo.gameData)).mass)<1e-8);
Body.setPosition(other,{x:160,y:0});T.beforeUpdate([ally,solo,other,enemy],0);assert.equal(ally.gameData.traitPowerMultiplier,1);assert.equal(solo.gameData.traitPowerMultiplier,1);other.gameData.isOut=true;T.beforeUpdate([ally,solo,other,enemy],0);assert.equal(solo.gameData.traitPowerMultiplier,1.35);
let layouts=0;for(const t of T.catalogue)for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI]){const items=[t,t,t],requested=F.defaults.map(p=>({...p,angle})),result=F.fit(items,requested);assert(F.valid(items,result.points));assert(F.validPreset(result.points));layouts++;}
const mixed=[{char:'大'},{char:'凹'},{char:'矢'}],layout=F.fit(mixed).points;
assert(!F.move(mixed,layout,0,{...layout[0],x:0,y:-.3}));assert(!F.move(mixed,layout,0,{...layout[1]}));assert(F.move(mixed,layout,0,{...layout[0],x:layout[0].x+.01}));
const save=F.normalize({});save.formationPresets[2]=layout;save.activeFormation=2;assert(F.validSave(save));assert(!F.validSave({...save,formationPresets:[...save.formationPresets,layout]}));assert(!F.validSave({...save,activeFormation:1}));assert(!F.validSave({...save,formationPresets:[null,null,layout.map(p=>({...p,x:NaN}))]}));assert(F.validSave({}));
// Clone the complete live trait physics, including compound geometry, orientation and aura mass.
for(const ch of ['凹','十','矢','盾','風','回','合','独'])for(const spin of [-2,0,2]){
 const bodies=[piece(ch,-35,-40,false,.7),piece('小',35,40,true)];const engine=Engine.create({gravity:{scale:0}});Composite.add(engine.world,bodies);let actions=[],elementActions=[];Events.on(engine,'beforeUpdate',()=>T.beforeUpdate(bodies,engine.timing.timestamp));Events.on(engine,'collisionStart',ev=>T.rootPairs(ev.pairs).forEach(([a,b])=>{actions.push(...T.queueCollision(a,b,{bodies,arena:{center:{x:0,y:0},radius:1000},now:engine.timing.timestamp}));elementActions.push(...Elements.queueCollision(a,b,{bodies,turnIsPlayer:false}));}));Events.on(engine,'afterUpdate',()=>{T.applyQueued(actions);Elements.applyQueued(elementActions);T.afterUpdate(bodies,{center:{x:0,y:0},radius:1000},engine.timing.timestamp);actions=[];elementActions=[];});
 const snapshot={center:{x:0,y:0},radius:1000,timestamp:0,pieces:bodies.map((b,i)=>({key:i,char:b.gameData.char,x:b.position.x,y:b.position.y,radius:b.circleRadius,traitScale:b.traitScale,baseMass:b.traitBaseMass,mass:b.mass,angle:b.angle,velocity:{...b.velocity},isPlayer:b.gameData.isPlayer,attr:'metal',power:100,friction:b.friction,frictionAir:b.frictionAir,restitution:b.restitution}))};
 const shot={key:0,force:{x:.01,y:.012},spin},original=JSON.stringify(snapshot),predicted=AI.simulate(snapshot,shot);T.onLaunch(bodies[0],0,spin,{bodies,direction:Matter.Vector.normalise(shot.force)});Elements.onLaunch(bodies[0]);Body.applyForce(bodies[0],bodies[0].position,shot.force);for(let i=0;i<168;i++)Engine.update(engine,1000/60);assert.equal(JSON.stringify(snapshot),original);
 bodies.forEach((b,i)=>assert(Math.hypot(b.position.x-predicted.positions[i].x,b.position.y-predicted.positions[i].y)<1e-7,`${ch} CPU prediction must match live physics`));
}
// Manual spin works on normal and compound pieces, including the spinner;
// its sign/strength must survive the first physics update, while default 回
// keeps the established intrinsic spin. Prediction uses the same launch.
const spinSpeeds=[0,.065,.117,.182];
for(const char of ['亜','一','十','凹','回'])for(const spin of [-3,-2,-1,0,1,2,3]){
 const body=piece(char),world=Engine.create({gravity:{scale:0}});Composite.add(world.world,body);T.onLaunch(body,0,spin);Body.setVelocity(body,{x:2,y:0});const expected=char==='矢'?0:spin?Math.sign(spin)*spinSpeeds[Math.abs(spin)]:char==='回'?.182:0;assert(Math.abs(body.angularVelocity-expected)<1e-8);Events.on(world,'beforeUpdate',()=>T.beforeUpdate([body],world.timing.timestamp));const angle=body.angle;Engine.update(world,1000/60);assert(Math.abs((body.angle-angle)-expected*(1-body.frictionAir))<1e-8,`${char} ${spin}`);assert.equal(T.state(body).launchSpin,char==='矢'?0:spin);Engine.clear(world);
}
assert.equal(T.normalizeSpin(Infinity),0);assert.equal(T.normalizeSpin('invalid'),0);assert.equal(T.normalizeSpin(-99),-3);assert.equal(T.normalizeSpin(99),3);
console.log(JSON.stringify({traits:15,layouts,realNotchAndCross:true,directionalEffects:true,conditionalStats:true,cpuPhysicsParity:true,spinShapes:5,spinSettings:7,spinPredictionParity:true}));
