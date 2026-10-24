(function(root,factory){
 const api=factory(root.Matter||(typeof require==='function'?require('./vendor/matter.min.js'):null));
 if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiElements=api;
})(typeof window!=='undefined'?window:globalThis,function(Matter){
 'use strict';
 const {Body,Vector,Query}=Matter;
 const catalogue={
  wood:{name:'助け合い',color:'#4ade80',description:'約3コマ分以内の自分が受ける吹き飛ばしを25%軽減。近くに木が2体なら約44%軽減。木3体が互いに助け合いの範囲内にいる間は、それぞれ50%軽減。'},
  fire:{name:'猛進',color:'#f87171',description:'自分から発射したとき、最初にぶつかった相手への吹き飛ばし＋35%／40%／45%（生存している自分の火が1／2／3体）。1回の発射につき1回。'},
  earth:{name:'大地の守り',color:'#fbbf24',description:'相手の攻撃中、受ける吹き飛ばしを30%／33%／36%軽減（生存している自分の土が1／2／3体）。'},
  metal:{name:'貫通',color:'#cbd5e1',description:'発射したコマが相手にぶつかったとき、進行方向の減速を40%／45%／50%抑えて（生存している自分の金が1／2／3体）、連続撃破を狙う。'},
  water:{name:'流れ戻り',color:'#60a5fa',description:'自分の番の開始時、中心から盤面半径の65%以上離れていると、半径の最大16%／18%／20%だけ（生存している自分の水が1／2／3体）中央へ戻る。重なる場所には移動しません。'}
 };
 const get=item=>catalogue[typeof item==='string'?item:item?.attr]||null;
 const dot=(a,b)=>a.x*b.x+a.y*b.y;
 const active=b=>b.gameData&&!b.gameData.isOut;
 const count=(body,bodies=[])=>Math.max(1,Math.min(3,[...new Set([body,...bodies])].filter(b=>active(b)&&b.gameData.isPlayer===body.gameData.isPlayer&&b.gameData.attr===body.gameData.attr).length));
 const strength={fire:[.35,.40,.45],earth:[.30,.33,.36],metal:[.40,.45,.50],water:[.16,.18,.20]};
 const value=(body,bodies)=>strength[body.gameData.attr]?.[count(body,bodies)-1]||0;
 const inRange=(a,b)=>Vector.magnitude(Vector.sub(a.position,b.position))<140*(a.traitScale||1);
 function woodGuard(defender,bodies=[]){const helpers=[...new Set(bodies)].filter(h=>h!==defender&&active(h)&&h.gameData.attr==='wood'&&h.gameData.isPlayer===defender.gameData.isPlayer&&inRange(defender,h));const trio=defender.gameData.attr==='wood'&&active(defender)&&helpers.some((a,i)=>helpers.slice(i+1).some(b=>[defender,a,b].every(x=>[defender,a,b].every(y=>x===y||inRange(x,y)))));return trio ? .5 : 1-Math.pow(.75,Math.min(2,helpers.length));}
 function beginTurn(bodies,isPlayer,arena,notify){
  const alive=bodies.filter(active);
  for(const b of alive){b.gameData.elementLaunched=false;b.gameData.fireUsed=false;}
  for(const b of alive){
   if(b.gameData.isPlayer!==isPlayer||b.gameData.attr!=='water')continue;
   const offset=Vector.sub(b.position,arena.center),distance=Vector.magnitude(offset);
   if(distance<arena.radius*.65)continue;
   const original={...b.position},direction=Vector.normalise(offset);
   for(const step of [value(b,alive),.12,.08,.04,.02]){
    Body.setPosition(b,Vector.sub(original,Vector.mult(direction,arena.radius*step)));
    if(!Query.collides(b,alive.filter(a=>a!==b)).length){
     if(notify)notify(b,catalogue.water);break;
    }
    Body.setPosition(b,original);
   }
  }
 }
 function onLaunch(b){b.gameData.elementLaunched=true;b.gameData.fireUsed=false;}
 function queueCollision(a,b,options={}){
  if(!active(a)||!active(b)||a.gameData.isPlayer===b.gameData.isPlayer)return[];
  const n=Vector.normalise(Vector.sub(b.position,a.position)),actions=[];
  function attack(attacker,defender,normal){
   if(dot(attacker.velocity,normal)<=.8)return;
   const bonuses=[],guards=[];let factor=1;
   if(attacker.gameData.attr==='fire'&&attacker.gameData.elementLaunched&&!attacker.gameData.fireUsed){
    attacker.gameData.fireUsed=true;factor*=1+value(attacker,options.bodies);bonuses.push({body:attacker,skill:catalogue.fire});
   }
   if(defender.gameData.attr==='earth'&&typeof options.turnIsPlayer==='boolean'&&defender.gameData.isPlayer!==options.turnIsPlayer){factor*=1-value(defender,options.bodies);guards.push({body:defender,skill:catalogue.earth});}
   const protection=woodGuard(defender,options.bodies);
   if(protection){factor*=1-protection;guards.push({body:defender,skill:catalogue.wood});}
   const piercing=attacker.gameData.attr==='metal'&&attacker.gameData.elementLaunched;
   if(factor!==1||piercing)actions.push({attacker,defender,normal,before:{...defender.velocity},attackerBefore:{...attacker.velocity},factor,piercing,pierceFactor:value(attacker,options.bodies),bonuses,guards});
  }
  attack(a,b,n);attack(b,a,Vector.neg(n));return actions;
 }
 function applyQueued(actions,notify){
  // Sum from one post-collision state so two simultaneous contacts cannot
  // repeatedly restore momentum already restored by the other contact.
  const changes=new Map(),pierceChanges=new Map();
  const add=(body,delta)=>changes.set(body,Vector.add(changes.get(body)||{x:0,y:0},delta));
  for(const a of actions){
   if(a.attacker.gameData.traitSkippedBodyId===a.defender.id){if(a.bonuses.length)a.attacker.gameData.fireUsed=false;continue;}
   if(!active(a.defender))continue;
   const received=Math.max(0,dot(Vector.sub(a.defender.velocity,a.before),a.normal));
   if(received>.05){add(a.defender,Vector.mult(a.normal,Math.max(-8,Math.min(8,received*(a.factor-1)))));if(notify)for(const event of [...a.bonuses,...a.guards])notify(event.body,event.skill);}
   if(a.piercing&&active(a.attacker)){
    const direction=Vector.normalise(a.attackerBefore),beforeSpeed=Vector.magnitude(a.attackerBefore);
    const loss=Math.max(0,beforeSpeed-Math.max(0,dot(a.attacker.velocity,direction)));
    if(loss>.05){const delta=Vector.mult(direction,Math.min(4,loss*a.pierceFactor));if(Vector.magnitude(delta)>Vector.magnitude(pierceChanges.get(a.attacker)||{x:0,y:0}))pierceChanges.set(a.attacker,delta);if(notify)notify(a.attacker,catalogue.metal);}
   }
  }
  for(const [body,delta] of pierceChanges)add(body,delta);
  for(const [body,delta] of changes){const magnitude=Vector.magnitude(delta);Body.setVelocity(body,Vector.add(body.velocity,magnitude>8?Vector.mult(delta,8/magnitude):delta));}
 }
 return{catalogue,get,count,strength,value,woodGuard,beginTurn,onLaunch,queueCollision,applyQueued};
});
