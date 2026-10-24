const assert=require('node:assert/strict');
const D=require('../dist/cpu-difficulty.js'),AI=require('../dist/cpu-ai.js'),P=require('../dist/synthesis-presentation.js');
for(const level of [1,10,50,80]){const team=[{level},{level}];const values=['normal','hard','boss'].map(d=>D.enemyLevel(d,team));assert(values[0]<values[1]&&values[1]<values[2]);}
assert.equal(D.enemyLevel('boss',[{level:100}]),150);
assert.deepEqual(D.get('normal').tiers,[1]);assert.deepEqual(D.get('hard').tiers,[2,3]);assert.deepEqual(D.get('boss').tiers,[4]);
const before={inventory:[{instanceId:'a',char:'木',jis:1,ruby:'キ',unlockedReadings:['キ']},{instanceId:'b',char:'木',jis:1},{instanceId:'c',char:'木',jis:1}],characterDiscoveries:['林']};
const plan={operations:[{type:'duplicate',keepId:'a',materialId:'b'},{type:'duplicate',keepId:'a',materialId:'c'},{type:'synthesis',ids:['b','c']},{type:'synthesis',ids:['b','c']}]};
const outcome={inventory:[{instanceId:'a',char:'木',unlockedReadings:['キ','モク','ボク']},{instanceId:'d',char:'林',jis:2},{instanceId:'e',char:'森',jis:2}],results:[{type:'duplicate',instanceId:'a',char:'木',newReadings:['モク']},{type:'duplicate',instanceId:'a',char:'木',newReadings:['ボク']},{type:'synthesis',instanceId:'d',char:'林',jis:2},{type:'synthesis',instanceId:'e',char:'森',jis:2}]};
const entries=P.describe(before,plan,outcome);assert.equal(entries[0].char,'森');assert.equal(entries.filter(r=>r.fresh).length,1);assert.equal(entries.filter(r=>r.upgraded).length,2);assert.equal(entries.reduce((n,r)=>n+r.newReadings.length,0),2);
const piece=(key,x,y,isPlayer)=>({key,x,y,isPlayer,attr:'metal',power:110,radius:26,mass:1.6,velocity:{x:0,y:0},frictionAir:.025,restitution:.85,friction:.05});
const report=[];
for(const positions of [[-60,-70,60,70],[0,-110,40,90],[95,-45,-60,70]]){const [x,y,tx,ty]=positions,snapshot={center:{x:0,y:0},radius:150,pieces:[piece(1,x,y,false),piece(2,tx,ty,true)]},saved=JSON.stringify(snapshot),results=['normal','hard','boss'].map(d=>{const start=performance.now(),shot=AI.plan(snapshot,d,{classicDifficulty:true});assert(shot);return {difficulty:d,score:Math.round(shot.score),ownOut:shot.ownOut,ms:Math.round(performance.now()-start)};});assert(results[1].score>=results[0].score);assert(results[2].score>=results[1].score);assert.equal(JSON.stringify(snapshot),saved);report.push(results);}
console.log(JSON.stringify({levelsSeparated:true,batchRubyCountsExact:true,newDiscoveryOrdering:true,physicsSearch:report}));
