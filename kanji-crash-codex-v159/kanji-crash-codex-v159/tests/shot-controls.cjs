const assert=require('node:assert/strict'),C=require('../dist/shot-controls.js'),T=require('../dist/character-traits.js'),Matter=require('../dist/vendor/matter.min.js');
const center={x:200,y:200},radius=80;
const pull=(offset,direction,length=45)=>C.gesture({x:center.x+offset.x,y:center.y+offset.y},{x:center.x+offset.x-direction.x*length,y:center.y+offset.y-direction.y*length},center,radius);
assert.equal(pull({x:0,y:0},{x:0,y:-1}).spin,0);
assert.equal(pull({x:6,y:0},{x:0,y:-1}).spin,0);
assert.equal(pull({x:50,y:0},{x:1,y:0}).spin,0);
assert.equal(pull({x:80,y:0},{x:0,y:-1}).spin,-3);
assert.equal(pull({x:-80,y:0},{x:0,y:-1}).spin,3);
const right=C.spin({x:40,y:0},{x:0,y:-45},radius);
assert(right<0&&!Number.isInteger(right));
for(const [offset,direction]of [[{x:40,y:0},{x:0,y:-1}],[{x:0,y:40},{x:1,y:0}],[{x:-40,y:0},{x:0,y:1}],[{x:0,y:-40},{x:-1,y:0}]])assert.equal(pull(offset,direction).spin,right);
for(const [width,height]of [[320,568],[390,844],[844,390]]){const r=C.gripRadius(width,height);assert(r>=Math.min(width,height)*.43&&r<Math.min(width,height)/2);assert.equal(C.spinRadius(width,height),Math.min(80,Math.min(width,height)*.23));const g=C.gesture({x:width/2,y:height/2},{x:width/2,y:height/2+80},{x:width/2,y:height/2},r);assert.equal(g.power,120);assert.equal(g.moved,80);assert.equal(g.spin,0);}
for(const value of [-Infinity,Infinity,NaN])assert.equal(C.spin({x:value,y:0},{x:0,y:-45},radius),0);
for(const [spin,speed]of [[.5,.025],[1.5,.07],[2.5,.115],[-2.5,-.115]]){const b=Matter.Bodies.circle(0,0,20);b.gameData={char:'山',isPlayer:true};T.onLaunch(b,0,spin);assert.equal(T.state(b).launchSpin,spin);assert(Math.abs(b.angularVelocity-speed*1.3)<1e-10);}
console.log(JSON.stringify({centralDeadZone:true,distanceSpin:true,allDirections:true,cssPower:true,fractionalPhysics:true}));
