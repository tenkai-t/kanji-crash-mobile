const assert=require('node:assert/strict'),AI=require('../dist/cpu-ai.js');
const piece=(key,x,y,isPlayer,power=120,mass=1.6)=>({char:'一',key,x,y,isPlayer,attr:'metal',power,mass,radius:26,velocity:{x:0,y:0},angle:0,friction:.05,frictionAir:.025,restitution:.85});
for(const [radius,power,mass]of [[150,120,1.6],[110,550,7],[190,80,.8]]){
 const snapshot={center:{x:0,y:0},radius,baseRadius:radius,timestamp:3000,pressure:{shots:0,ratio:1,pending:false},pieces:[piece('own',0,radius*.35,true,power,mass),piece('peer',0,-radius*.65,false)]},before=JSON.stringify(snapshot),shot=AI.plan(snapshot,'normal',{isPlayer:true,maxStrength:.08,spins:[0,-.6,.6]});
 assert(shot);assert.equal(shot.key,'own');assert.equal(JSON.stringify(snapshot),before);assert(Math.hypot(shot.force.x,shot.force.y)<=.08*power/100+1e-10);assert([0,-.6,.6].includes(shot.spin));assert.equal(shot.ownOut,0);
 const flipped={...snapshot,pieces:snapshot.pieces.map(p=>({...p,isPlayer:!p.isPlayer}))},outcome=AI.simulate(flipped,shot);assert.equal(shot.score,outcome.score);assert.equal(shot.enemyOut,outcome.enemyOut);
}
assert.equal(AI.plan({center:{x:0,y:0},radius:150,pieces:[piece('own',0,0,true)]},'normal',{isPlayer:true}),null);
console.log(JSON.stringify({playerPerspective:true,liveStateUnchanged:true,spinCandidates:true,realPlayerForceCap:true,simulatedOutcomeConsistent:true,noEnemyNoShot:true}));
