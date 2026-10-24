(function(root,factory){const api=factory(root.Matter||(typeof require==='function'?require('./vendor/matter.min.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiTraits=api;})(typeof window!=='undefined'?window:globalThis,function(Matter){
 'use strict';
 const {Bodies,Body,Vector,Query}=Matter;
 const catalogue=[
  {char:'一',name:'一閃',shape:'bar',description:'横長の形。発射中、すぐ横をすれ違った相手を横へ弾く。直接接触せずに発動。1発射1体まで。'},
  {char:'小',name:'すり抜け',shape:'small',power:1.2,description:'小さな体で威力＋20%。発射後1.6秒は自分をすり抜ける。'},
  {char:'口',name:'堅牢城',shape:'square',weight:1.6,description:'重量＋60%。受ける吹き飛ばしを20%軽減。'},
  {char:'山',name:'峰打ち',shape:'triangle',description:'発射後、最初に当てた相手の次の発射の威力を30%下げる。通常どおり押し出す。弱体化は重複せず、相手が発射すると解除。'},
  {char:'大',name:'衝撃波',shape:'large',description:'大きな体。発射後の最初の衝突で、近くの別の相手へ勢い40%の衝撃波。届く範囲も拡大。1発射1回。'},
  {char:'十',name:'四方撃',shape:'cross',description:'最初の衝突後、上下左右の近くにいる別の相手へ直角に進路変更。1発射1回。'},
  {char:'凹',name:'捕縛',shape:'notch',weight:1.15,description:'重量＋15%。両方のターンで、くぼみの内側に接触した相手を0.5秒つかみ、一緒に移動・回転。捕まえた相手の重さも受ける。各ターン1回。外側・背面では発動しない。'},
  {char:'弾',name:'跳ね返り',shape:'circle',description:'最初の衝突で跳ね返り、衝突前の勢い100%で進み、0.5秒間は空気抵抗を60%軽減。1発射1回。'},
  {char:'風',name:'追い風',shape:'circle',description:'近くを通過する発射中の自分のコマを40%加速（加速量は最大4・近くを通過させやすい広めの範囲）。1発射1回、複数の風では重複しない。'},
  {char:'粘',name:'粘着防御',shape:'circle',description:'受ける勢いを30%軽減し、ぶつかってきた相手を45%減速。'},
  {char:'回',name:'旋風',shape:'hexagon',weight:1.05,description:'重量＋5%。発射後1.3秒回転。回転が強いほど、衝突した相手を回転方向へ強く横に弾く。'},
  {char:'矢',name:'貫矢',shape:'arrow',description:'発射時は回転せず先端を発射方向へ向ける。衝突後も直進方向を保ち、失った直進力の50%を回復。衝突による減速は残る。'},
  {char:'盾',name:'絶対防御',shape:'shield',weight:1.2,description:'重量＋20%。平たい側が正面で、正面の吹き飛ばしを50%軽減。さらに1対局1回、落下を確実に防いで停止。'},
  {char:'合',name:'結束',shape:'circle',description:'近くの別の自分が発射すると、発射方向にいる近くの相手へ0.18秒後に追撃。1発射1回、追撃は連鎖しない。'},
  {char:'独',name:'孤高',shape:'circle',description:'近くに自分がいなければ威力＋35%・重量＋15%。最後の1体なら威力＋50%。'}
 ];
 const table=Object.fromEntries(catalogue.map(t=>[t.char,Object.freeze(t)]));
 const get=item=>table[typeof item==='string'?item:item?.char]||null;
 const traitOf=b=>get(b.gameData||b.traitChar);
 const dot=(a,b)=>a.x*b.x+a.y*b.y;
 const front=b=>({x:Math.sin(b.angle),y:-Math.cos(b.angle)});
 function physics(stats){return{mass:stats.weight/100*1.5,friction:.05,frictionAir:.025,restitution:.85};}
 function createBody(item,x,y,scale=1,options={},angle=0){
  const t=get(item),shape=t?.shape||'circle';let body,outline=null;
  const polygon=points=>{const p=points.map(([x,y])=>({x:x*scale,y:y*scale}));return Bodies.fromVertices(0,0,[p],options);};
  if(shape==='bar')body=Bodies.rectangle(0,0,76*scale,18*scale,options);
  else if(shape==='square')body=Bodies.rectangle(0,0,52*scale,52*scale,options);
  else if(shape==='triangle')body=polygon([[-30,22],[30,22],[0,-32]]);
  else if(shape==='arrow')body=polygon([[0,-36],[20,26],[-20,26]]);
  else if(shape==='shield')body=polygon([[-27,-26],[27,-26],[27,20],[0,32],[-27,20]]);
  else if(shape==='hexagon')body=Bodies.polygon(0,0,6,28*scale,options);
  else if(shape==='cross'||shape==='notch'){
   let parts,pts;
   if(shape==='cross'){
    parts=[Bodies.rectangle(0,0,20*scale,20*scale),Bodies.rectangle(-22*scale,0,24*scale,20*scale),Bodies.rectangle(22*scale,0,24*scale,20*scale),Bodies.rectangle(0,-22*scale,20*scale,24*scale),Bodies.rectangle(0,22*scale,20*scale,24*scale)];
    pts=[[-10,-34],[10,-34],[10,-10],[34,-10],[34,10],[10,10],[10,34],[-10,34],[-10,10],[-34,10],[-34,-10],[-10,-10]];
   }else{
    parts=[Bodies.rectangle(-26*scale,-6.5*scale,10*scale,45*scale),Bodies.rectangle(26*scale,-6.5*scale,10*scale,45*scale),Bodies.rectangle(0,22.5*scale,62*scale,13*scale)];
    pts=[[-31,-29],[-21,-29],[-21,16],[21,16],[21,-29],[31,-29],[31,29],[-31,29]];
   }
   body=Body.create({...options,parts});
   outline=pts.map(([x,y])=>({x:x*scale-body.position.x,y:y*scale-body.position.y}));
  }else body=Bodies.circle(0,0,(shape==='small'?18:shape==='large'?34:26)*scale,options);
  const isRound=['circle','small','large'].includes(shape);
  body.traitOutline=outline||(!isRound?body.vertices.map(v=>({x:v.x-body.position.x,y:v.y-body.position.y})):null);
  body.circleRadius=isRound?body.circleRadius:Math.max(...(body.parts.length>1?body.parts.slice(1):[body]).flatMap(p=>p.vertices.map(v=>Math.hypot(v.x-body.position.x,v.y-body.position.y))));
  body.traitScale=scale;body.traitChar=item?.char||'';body.traitBaseMass=options.mass||body.mass;
  if(options.mass)Body.setMass(body,options.mass);
  body.parts.forEach(p=>{p.friction=options.friction??.05;p.restitution=options.restitution??.85;});
  Body.setPosition(body,{x,y});Body.setAngle(body,angle);return body;
 }
 function resizeBody(body,scale){const ratio=scale/(body.traitScale||1),mass=body.mass;Body.scale(body,ratio,ratio);body.traitOutline=body.traitOutline?.map(v=>({x:v.x*ratio,y:v.y*ratio}));body.traitScale=scale;Body.setMass(body,mass);}
 function rootPairs(pairs){const seen=new Set();return pairs.map(p=>[p.bodyA.parent||p.bodyA,p.bodyB.parent||p.bodyB]).filter(([a,b])=>{const key=[a.id,b.id].sort((x,y)=>x-y).join(':');if(a===b||seen.has(key))return false;seen.add(key);return true;});}
 function isOutside(body,center,radius){
  if(!body.traitOutline)return Math.hypot(body.position.x-center.x,body.position.y-center.y)>radius+body.circleRadius;
  const parts=body.parts.length>1?body.parts.slice(1):[body];
  return parts.every(part=>{if(Query.point([part],center).length)return false;
   return part.vertices.every((a,i)=>{const b=part.vertices[(i+1)%part.vertices.length],dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy;
    const t=Math.max(0,Math.min(1,((center.x-a.x)*dx+(center.y-a.y)*dy)/(len||1)));return Math.hypot(a.x+t*dx-center.x,a.y+t*dy-center.y)>radius;
   });
  });
 }
 function hitTest(body,point,minRadius=22){return Query.point([body],point).length>0||Math.hypot(point.x-body.position.x,point.y-body.position.y)<=Math.min(body.circleRadius,minRadius);}
 const state=b=>b.gameData.traitState||(b.gameData.traitState={});
 const alive=b=>b.gameData&&!b.gameData.isOut;
 const notify=(b,fn)=>{const t=traitOf(b);if(t&&fn)fn(b,{...t,color:'#a7f3d0'});};
 const identity=b=>b.gameData.key??b.id;
 function releaseCapture(b){const s=state(b);delete s.captureHolder;delete s.trapUntil;b.collisionFilter.group=0;}
 function followCapture(b,bodies,time){const s=state(b),h=bodies.find(a=>identity(a)===s.captureHolder);if(s.captureHolder===undefined)return;if(time>=s.trapUntil||!h||!alive(h)){releaseCapture(b);return;}const offset=Vector.rotate({x:s.captureX,y:s.captureY},h.angle);Body.setPosition(b,Vector.add(h.position,offset));Body.setAngle(b,h.angle+s.captureAngle);Body.setVelocity(b,Vector.add(h.velocity,{x:-offset.y*h.angularVelocity,y:offset.x*h.angularVelocity}));Body.setAngularVelocity(b,h.angularVelocity);b.force.x=b.force.y=0;}
 function beginTurn(bodies){for(const b of bodies.filter(alive)){state(b).launched=false;state(b).captureUsed=false;releaseCapture(b);}}
 function beforeUpdate(bodies,time){
  const active=bodies.filter(alive);
  for(const b of active){const data=b.gameData,t=traitOf(b),s=state(b);if(s.bounceGlideUntil!==undefined&&time>=s.bounceGlideUntil){b.frictionAir=s.bounceBaseAir;delete s.bounceGlideUntil;delete s.bounceBaseAir;}delete data.traitSkippedBodyId;let power=s.weakened?.7:1,weight=1;
   const allied=active.filter(a=>a!==b&&a.gameData.isPlayer===data.isPlayer);
   if(t?.char==='独'&&!allied.some(a=>Vector.magnitude(Vector.sub(a.position,b.position))<110*(b.traitScale||1))){power*=allied.length?1.35:1.5;weight*=1.15;}
   data.traitPowerMultiplier=power;data.traitWeightMultiplier=weight;
   const baseMass=b.traitBaseMass||b.mass,rubyWeight=data.rubyWeightMultiplier||1,traitMass=weight===1?baseMass:Math.round(Math.round(baseMass/.015)*weight)*.015,mass=(rubyWeight===1?traitMass:Math.round(Math.round(traitMass/.015)*rubyWeight)*.015)+active.filter(a=>state(a).captureHolder===identity(b)&&time<state(a).trapUntil).reduce((total,a)=>total+(a.traitBaseMass||a.mass),0);if(Math.abs(b.mass-mass)>1e-8)Body.setMass(b,mass);
   followCapture(b,active,time);if(t?.char==='矢'&&s.launched&&s.captureHolder===undefined&&s.arrowX!==undefined){Body.setAngle(b,Math.atan2(s.arrowX,-s.arrowY));Body.setAngularVelocity(b,0);}
   b.collisionFilter.category=data.isPlayer?2:4;b.collisionFilter.mask=t?.char==='小'&&time<s.phaseUntil?0xffffffff^(data.isPlayer?2:4):0xffffffff;
   if(t?.char==='回'&&!s.launchSpin&&data.traitSpinUntil>time&&Vector.magnitude(b.velocity)>.35)Body.setAngularVelocity(b,.182);
  }
 }
 function normalizeSpin(value){const n=Number(value);return Number.isFinite(n)?Math.max(-3,Math.min(3,n)):0;}
 function onLaunch(b,time,spin=0,options={}){const s=state(b);s.sweepUsed=s.weakenUsed=s.turnUsed=s.bounceUsed=s.windBoostUsed=false;s.weakened=false;
  const direction=options.direction||Vector.normalise(b.force);if(traitOf(b)?.char==='矢'){spin=0;s.arrowX=direction.x;s.arrowY=direction.y;if(Vector.magnitude(direction)>.1)Body.setAngle(b,Math.atan2(direction.x,-direction.y));Body.setAngularVelocity(b,0);}const helper=(options.bodies||[]).filter(a=>a!==b&&alive(a)&&a.gameData.isPlayer===b.gameData.isPlayer&&traitOf(a)?.char==='合'&&Vector.magnitude(Vector.sub(a.position,b.position))<100*(a.traitScale||1)).sort((a,c)=>Vector.magnitude(Vector.sub(a.position,b.position))-Vector.magnitude(Vector.sub(c.position,b.position)))[0];
  if(helper&&Vector.magnitude(direction)>.1)state(helper).link={due:time+180,x:direction.x,y:direction.y};s.launched=true;s.impactUsed=false;s.windAt=time+500;s.windUsed=false;s.phaseUntil=time+1600;s.launchSpin=normalizeSpin(spin);if(traitOf(b)?.char==='回'){b.gameData.traitSpinUntil=time+1300;if(!s.launchSpin)Body.setAngularVelocity(b,.182);}if(s.launchSpin){const n=Math.abs(s.launchSpin),lo=Math.floor(n),rates=[0,.065,.117,.182],speed=rates[lo]+(rates[Math.min(3,lo+1)]-rates[lo])*(n-lo);Body.setAngularVelocity(b,Math.sign(s.launchSpin)*speed);}}
 function afterUpdate(bodies,arena,time,fn){const active=bodies.filter(alive);
  for(const b of active){const t=traitOf(b),s=state(b),speed=Vector.magnitude(b.velocity),scale=b.traitScale||1;
   followCapture(b,active,time);if(t?.char==='矢'&&s.launched&&s.captureHolder===undefined&&s.arrowX!==undefined){const dir={x:s.arrowX,y:s.arrowY};Body.setVelocity(b,Vector.mult(dir,Math.max(0,dot(b.velocity,dir))));Body.setAngle(b,Math.atan2(dir.x,-dir.y));Body.setAngularVelocity(b,0);}
   if(s.captureHolder!==undefined)continue;
   if(t?.char==='一'&&s.launched&&!s.sweepUsed&&speed>.8){const dir=Vector.normalise(b.velocity),side={x:-dir.y,y:dir.x};
    const target=active.filter(a=>a.gameData.isPlayer!==b.gameData.isPlayer).find(a=>{const offset=Vector.sub(a.position,b.position),lateral=Math.abs(dot(offset,side));return Math.abs(dot(offset,dir))<45*scale&&lateral>a.circleRadius+10*scale&&lateral<a.circleRadius+52*scale&&!Query.collides(b,[a]).length;});
    if(target){const sign=dot(Vector.sub(target.position,b.position),side)>=0?1:-1;Body.setVelocity(target,Vector.add(target.velocity,Vector.mult(side,sign*Math.min(6,speed*.7))));target.gameData.lastHitBy=b;target.gameData.wasHitByEnemy=true;target.gameData.lastEnemyHitAt=time;s.sweepUsed=true;notify(b,fn);}
   }
   if(t?.char==='風')for(const a of active){const as=state(a);if(a===b||a.gameData.isPlayer!==b.gameData.isPlayer||!as.launched||as.windBoostUsed||Vector.magnitude(a.velocity)<=.8||Vector.magnitude(Vector.sub(a.position,b.position))>=120*scale)continue;as.windBoostUsed=true;const v=Vector.magnitude(a.velocity);Body.setVelocity(a,Vector.mult(a.velocity,1+Math.min(.4,4/v)));notify(b,fn);if(fn)fn(a,{...get('風'),color:'#a7f3d0'});}
   if(s.link&&time>=s.link.due){const shot=s.link;delete s.link;const dir={x:shot.x,y:shot.y};const target=active.filter(a=>a.gameData.isPlayer!==b.gameData.isPlayer&&Vector.magnitude(Vector.sub(a.position,b.position))<150*scale&&dot(Vector.normalise(Vector.sub(a.position,b.position)),dir)>.4).sort((a,c)=>Vector.magnitude(Vector.sub(a.position,b.position))-Vector.magnitude(Vector.sub(c.position,b.position)))[0];if(target){Body.setVelocity(target,Vector.add(target.velocity,Vector.mult(dir,2.5)));target.gameData.lastHitBy=b;target.gameData.wasHitByEnemy=true;target.gameData.lastEnemyHitAt=time;notify(b,fn);}}
  }
  for(const b of active)followCapture(b,active,time);
 }
 function inNotch(holder,target){const local=Vector.rotate(Vector.sub(target.position,holder.position),-holder.angle),scale=holder.traitScale||1;return Math.abs(local.x)<21*scale&&local.y>-36*scale-target.circleRadius*.6&&local.y<18*scale;}
 function queueCollision(a,b,options={}){
  if(!alive(a)||!alive(b)||a.gameData.isPlayer===b.gameData.isPlayer)return[];
  const normal=Vector.normalise(Vector.sub(b.position,a.position)),actions=[];
  for(const [holder,target]of [[a,b],[b,a]])if(traitOf(holder)?.char==='凹'&&!state(holder).captureUsed&&state(holder).captureHolder===undefined&&state(target).captureHolder===undefined&&inNotch(holder,target)&&Vector.magnitude(Vector.sub(target.velocity,holder.velocity))>.4){state(holder).captureUsed=true;actions.push({capture:true,holder,target,now:options.now||0});}
  function attack(attacker,defender,n){if(dot(attacker.velocity,n)<=.8)return;
   const a=traitOf(attacker),d=traitOf(defender),s=state(attacker);let factor=1,radial=0,shock=false,piercing=false,slowing=false;

   if(a?.char==='矢'&&dot(front(attacker),n)>=.65){piercing=true;}
   const attackBoost=factor!==1,defenseEffect=d?.char==='口'||d?.char==='粘'||d?.char==='盾'&&dot(front(defender),Vector.neg(n))>=.4;
   if(d?.char==='盾'&&dot(front(defender),Vector.neg(n))>=.4)factor*=.5;
   if(d?.char==='口')factor*=.8;if(d?.char==='粘'){factor*=.7;slowing=true;}
   if(a?.char==='山'&&s.launched&&!s.weakenUsed){s.weakenUsed=true;actions.push({weaken:true,attacker,defender});}
   if(a?.char==='大'&&s.launched&&!s.impactUsed){shock=true;s.impactUsed=true;}
   const spin=attacker.angularVelocity;const sideways=Math.abs(spin)>.02?(a?.char==='回'?.845:.15)*Math.min(1,Math.abs(spin)/.14)*Math.sign(spin):0;
   const turning=a?.char==='十'&&s.launched&&!s.turnUsed,bouncing=a?.char==='弾'&&s.launched&&!s.bounceUsed;
   if(factor!==1||radial||shock||piercing||slowing||sideways||turning||bouncing)actions.push({attacker,defender,normal:n,before:{...defender.velocity},attackerBefore:{...attacker.velocity},factor,radial,shock,piercing,slowing,sideways,turning,bouncing,attackEffect:attackBoost||radial||shock||piercing||sideways,defenseEffect,options});
  }
  attack(a,b,normal);attack(b,a,Vector.neg(normal));return actions;
 }
 function applyQueued(actions,fn){const changes=new Map(),restores=new Map(),slowed=new Set(),waveHits=new Set();
  const add=(b,v)=>changes.set(b,Vector.add(changes.get(b)||{x:0,y:0},v));
  for(const a of actions){
   if(a.weaken){if(alive(a.defender)){state(a.defender).weakened=true;notify(a.attacker,fn);if(fn)fn(a.defender,{name:'次の発射−30%',color:'#fbbf24'});}continue;}
   if(a.capture){if(!alive(a.target)||!alive(a.holder)||state(a.target).captureHolder!==undefined||state(a.holder).captureHolder!==undefined)continue;const s=state(a.target),offset=Vector.rotate(Vector.sub(a.target.position,a.holder.position),-a.holder.angle);s.trapUntil=a.now+500;s.captureHolder=identity(a.holder);s.captureX=offset.x;s.captureY=offset.y;s.captureAngle=a.target.angle-a.holder.angle;a.holder.collisionFilter.group=a.target.collisionFilter.group=-(a.holder.id+1);const mass=a.holder.mass+a.target.mass;Body.setVelocity(a.holder,Vector.mult(Vector.add(Vector.mult(a.holder.velocity,a.holder.mass),Vector.mult(a.target.velocity,a.target.mass)),1/mass));followCapture(a.target,[a.holder,a.target],a.now);notify(a.holder,fn);continue;}
   if(!alive(a.defender))continue;const received=Math.max(0,dot(Vector.sub(a.defender.velocity,a.before),a.normal));if(received<.05)continue;
   add(a.defender,Vector.mult(a.normal,Math.max(-8,Math.min(8,received*(a.factor-1)))));
   if(a.radial&&a.options.arena){const offset=Vector.sub(a.defender.position,a.options.arena.center);add(a.defender,Vector.mult(Vector.magnitude(offset)>.001?Vector.normalise(offset):a.normal,Math.min(6,received*a.radial)));}
   if(a.shock)for(const target of (a.options.bodies||[])){if(!alive(target)||target===a.defender||target.gameData.isPlayer===a.attacker.gameData.isPlayer||waveHits.has(target))continue;
    if(Vector.magnitude(Vector.sub(target.position,a.attacker.position))>120*(a.attacker.traitScale||1))continue;waveHits.add(target);add(target,Vector.mult(Vector.normalise(Vector.sub(target.position,a.attacker.position)),Math.min(6.4,received*.4)));target.gameData.lastHitBy=a.attacker;target.gameData.wasHitByEnemy=true;target.gameData.lastEnemyHitAt=a.options.now;
   }
   if(a.sideways)add(a.defender,Vector.mult({x:-a.normal.y,y:a.normal.x},Math.min(6,received*Math.abs(a.sideways))*Math.sign(a.sideways)));
   if(a.turning&&!state(a.attacker).turnUsed){const scale=a.attacker.traitScale||1,axis=Math.abs(a.attackerBefore.x)>=Math.abs(a.attackerBefore.y)?'y':'x',target=(a.options.bodies||[]).filter(b=>b!==a.defender&&alive(b)&&b.gameData.isPlayer!==a.attacker.gameData.isPlayer&&Vector.magnitude(Vector.sub(b.position,a.attacker.position))<200*scale&&(axis==='y'?Math.abs(b.position.x-a.attacker.position.x):Math.abs(b.position.y-a.attacker.position.y))<35*scale).sort((b,c)=>Vector.magnitude(Vector.sub(b.position,a.attacker.position))-Vector.magnitude(Vector.sub(c.position,a.attacker.position)))[0];if(target){const offset=Vector.sub(target.position,a.attacker.position),dir=axis==='x'?{x:Math.sign(offset.x),y:0}:{x:0,y:Math.sign(offset.y)};Body.setVelocity(a.attacker,Vector.mult(dir,Math.max(1,Vector.magnitude(a.attackerBefore)*.65)));Body.setAngularVelocity(a.attacker,0);state(a.attacker).turnUsed=true;notify(a.attacker,fn);}}
   if(a.bouncing&&!state(a.attacker).bounceUsed){const reflection=Vector.sub(a.attackerBefore,Vector.mult(a.normal,2*dot(a.attackerBefore,a.normal)));Body.setVelocity(a.attacker,Vector.mult(reflection,1));state(a.attacker).bounceUsed=true;state(a.attacker).bounceGlideUntil=(a.options.now||0)+500;state(a.attacker).bounceBaseAir=a.attacker.frictionAir;a.attacker.frictionAir*=.4;notify(a.attacker,fn);}
   if(a.piercing&&alive(a.attacker)){const direction=Vector.normalise(a.attackerBefore),lost=Math.max(0,Vector.magnitude(a.attackerBefore)-Math.max(0,dot(a.attacker.velocity,direction))),v=Vector.mult(direction,Math.min(6,lost*.5));const parallel=Vector.mult(direction,dot(a.attacker.velocity,direction));Body.setVelocity(a.attacker,parallel);if(Vector.magnitude(v)>Vector.magnitude(restores.get(a.attacker)||{x:0,y:0}))restores.set(a.attacker,v);}
   if(a.slowing)slowed.add(a.attacker);
   if(a.attackEffect)notify(a.attacker,fn);if(a.defenseEffect)notify(a.defender,fn);
  }
  for(const [b,v]of restores)add(b,v);for(const [b,v]of changes){const mag=Vector.magnitude(v);Body.setVelocity(b,Vector.add(b.velocity,mag>8?Vector.mult(v,8/mag):v));}for(const b of slowed)if(alive(b))Body.setVelocity(b,Vector.mult(b.velocity,.55));
 }
 function tryPreventFall(b,arena,bodies,fn){if(traitOf(b)?.char!=='盾'||state(b).shieldUsed)return false;
  const original={...b.position},direction=Vector.normalise(Vector.sub(original,arena.center)),radius=Math.max(0,arena.radius-b.circleRadius-4);let destination=null;
  for(const inward of [0,b.circleRadius,b.circleRadius*2,arena.radius]){for(let i=0;i<36&&!destination;i++){const p=Vector.add(arena.center,Vector.mult(Vector.rotate(direction,i*Math.PI/18),Math.max(0,radius-inward)));Body.setPosition(b,p);if(!Query.collides(b,bodies.filter(a=>a!==b&&alive(a))).length)destination=p;}if(destination)break;}
  Body.setPosition(b,destination||original);if(!destination)return false;Body.setVelocity(b,{x:0,y:0});Body.setAngularVelocity(b,0);b.force.x=0;b.force.y=0;state(b).shieldUsed=true;releaseCapture(b);b.gameData.wasHitByEnemy=false;notify(b,fn);return true;
 }
 const copyState=s=>({...s,link:s.link?{...s.link}:undefined});
 const status=b=>state(b).weakened?'（次の発射：威力−30%）':traitOf(b)?.char==='盾'?(state(b).shieldUsed?'（落下防止：使用済み）':'（落下防止：残り1回）'):'';
 return{catalogue,get,physics,createBody,resizeBody,rootPairs,isOutside,hitTest,state,copyState,status,beginTurn,beforeUpdate,onLaunch,normalizeSpin,afterUpdate,queueCollision,applyQueued,tryPreventFall};
});
