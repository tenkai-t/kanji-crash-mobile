const assert = require('assert');
const AI = require('../dist/cpu-ai.js');
const Matter = require('../dist/vendor/matter.min.js');
function piece(key,x,y,isPlayer,attr='metal',power=110,radius=26) {
 return {key,x,y,isPlayer,attr,power,radius,mass:1.6,velocity:{x:0,y:0},frictionAir:0.025,restitution:0.85,friction:0.05};
}
const attributes=['wood','fire','earth','metal','water'];
const samples=[];
for(let i=0;i<18;i++) {
 const radius=[130,150,178][i%3],scale=radius/150;
 samples.push({center:{x:0,y:0},radius,pieces:[
  piece(1,-62*scale,-63*scale,false,attributes[i%5],100+i,26*Math.min(1,scale)),
  piece(2,0,-92*scale,false,attributes[(i+1)%5],110+i,26*Math.min(1,scale)),
  piece(3,62*scale,-63*scale,false,attributes[(i+2)%5],120+i,26*Math.min(1,scale)),
  piece(4,-62*scale,72*scale,true,attributes[(i+2)%5],110,26*Math.min(1,scale)),
  piece(5,0,40*scale,true,attributes[(i+3)%5],110,26*Math.min(1,scale)),
  piece(6,62*scale,72*scale,true,attributes[(i+4)%5],110,26*Math.min(1,scale))
 ]});
}
for(const [cx,cy,px,py] of [[0,0,0,120],[70,0,128,0],[128,0,0,0],[0,-120,70,60],[120,20,-80,-30],[0,60,0,-80]])samples.push({center:{x:0,y:0},radius:150,pieces:[piece(1,cx,cy,false),piece(4,px,py,true,'wood')]});
let oldOwn=0,newOwn=0,oldEnemy=0,newEnemy=0,improved=0,totalMs=0;
for(const [index,snapshot] of samples.entries()) {
 const own=snapshot.pieces.filter(p=>!p.isPlayer),enemies=snapshot.pieces.filter(p=>p.isPlayer);
 const shooter=own[index%own.length];const target=enemies.slice().sort((a,b)=>Math.hypot(a.x-shooter.x,a.y-shooter.y)-Math.hypot(b.x-shooter.x,b.y-shooter.y))[0];
 const angle=Math.atan2(target.y-shooter.y,target.x-shooter.x)+(index%3-1)*0.06;
 const strength=0.06*shooter.power/100;
 const legacy=AI.simulate(snapshot,{key:shooter.key,force:{x:Math.cos(angle)*strength,y:Math.sin(angle)*strength}});
 const before=JSON.stringify(snapshot),start=performance.now();const shot=AI.plan(snapshot);totalMs+=performance.now()-start;
 assert(shot);assert.strictEqual(JSON.stringify(snapshot),before,'planner must not mutate the live state');
 oldOwn+=legacy.ownOut;newOwn+=shot.ownOut;oldEnemy+=legacy.enemyOut;newEnemy+=shot.enemyOut;if(shot.score>legacy.score)improved++;
}
assert(newOwn===0&&newOwn<=oldOwn,'planner must avoid own losses in these fixtures');assert(newEnemy>=oldEnemy,'safer CPU should still knock out opponents');assert(improved>=18,'tactical outcome should improve in most fixtures');
// A moving piece near the edge can rebound off a heavier opponent and fall.
// The planner must find a safer shot under the revised collision rules.
const moving={center:{x:0,y:0},radius:150,pieces:[{...piece(1,9.76,138.24,false,'fire'),velocity:{x:0.45,y:1.71}},{...piece(4,127.74,40.92,true,'wood'),mass:2.6}]};
const direction=Matter.Vector.normalise(Matter.Vector.sub(moving.pieces[1],moving.pieces[0]));
assert.strictEqual(AI.simulate(moving,{key:1,force:Matter.Vector.mult(direction,.066)}).ownOut,1);
assert.strictEqual(AI.plan(moving).ownOut,0,'a hazardous rebound must be avoided');
const a=Matter.Bodies.circle(0,0,26),b=Matter.Bodies.circle(50,0,26);a.gameData={isPlayer:false,attr:'fire'};b.gameData={isPlayer:false,attr:'metal'};Matter.Body.setVelocity(a,{x:10,y:0});const velocity={...b.velocity};assert.deepStrictEqual(require('../dist/attribute-rules.js').queueCollision(a,b),[]);assert.deepStrictEqual(b.velocity,velocity,'allies must not receive attribute impulses');
console.log(JSON.stringify({scenarios:samples.length,oldOwn,newOwn,oldEnemy,newEnemy,improved,meanPlanningMs:Math.round(totalMs/samples.length)}));
