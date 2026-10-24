const Matter=require('../dist/vendor/matter.min.js'),Traits=require('../dist/character-traits.js'),Skills=require('../dist/battle-skills.js'),Elements=require('../dist/element-skills.js'),Attributes=require('../dist/attribute-rules.js'),Rules=require('../dist/kanji-rules.js'),Read=require('../dist/reading-abilities.js'),Formation=require('../dist/formation-rules.js'),Order=require('../dist/turn-order.js'),Pressure=require('../dist/battle-pressure.js');
const Levels=require('../dist/level-rules.js');
const Links=require('../dist/team-links.js');
const catalogue=require('./generated/catalogue.json'),dictionary=require('./generated/readings.json');
const bases=new Map(catalogue.map(k=>[k.char,k]));
const {Body,Engine,Composite,Vector,Events}=Matter,center={x:200,y:200},baseRadius=184;
const readingList=char=>[...new Set((dictionary[char]||[]).map(r=>String(r||'').replace(/[・()（）.]/g,'').replace(/^-/,'').replace(/-$/,'')).filter(r=>/^[ぁ-ゖァ-ヺー]+$/.test(r)))];
function roster(input){
 if(!input||!Array.isArray(input.items)||input.items.length!==3)throw Error('デッキに文字を3体編成してください。');
 const items=input.items.map((i,n)=>{const base=bases.get(i?.char);if(!base||!Number.isInteger(i.level)||i.level<1||i.level>Levels.max)throw Error('編成を確認してください。');
  const all=readingList(base.char);if(!Array.isArray(i.equippedReadings))throw Error('装備ルビを確認してください。');const equipped=[...new Set(i.equippedReadings)];if((all.length>0&&!equipped.length)||equipped.length>200||equipped.some(r=>!all.includes(r)))throw Error('装備ルビを確認してください。');
  return {...base,level:i.level,ruby:equipped[0]||'',equippedReadings:equipped,unlockedReadings:equipped,instanceId:'inst_friend_'+n};
 });
 if(input.formation&&!Formation.validPreset(input.formation))throw Error('配置を確認してください。');
 return {items,formation:Formation.fit(items,input.formation||Formation.defaults).points};
}
const normalizeTeam=team=>({...team,items:team.items.map(i=>({...i,level:Levels.clamp(i.level)}))});
const stats=d=>Rules.getStats(d,Read.bonusForReadings(d.equippedReadings),Read.resolveAll(d));
function createBodies(host,guest){return [host,guest].flatMap((team,side)=>Links.apply(team.items).map((item,n)=>{item={...item,level:Levels.clamp(item.level)};const pos=team.formation[n],p=stats(item),sign=side===0?1:-1,b=Traits.createBody(item,200+pos.x*baseRadius*sign,200+pos.y*baseRadius*sign,1,Rules.getPhysics(p),pos.angle+(side?Math.PI:0));
 b.gameData={...item,key:side*3+n,isPlayer:side===0,isOut:false,readingAbilities:Read.resolveAll(item),rubyState:{charge:0},traitState:{}};return b;}));}
function pack(b){return {key:b.gameData.key,x:b.position.x,y:b.position.y,angle:b.angle,velocity:{...b.velocity},angularVelocity:b.angularVelocity,baseMass:b.traitBaseMass,mass:b.mass,frictionAir:b.frictionAir,data:JSON.parse(JSON.stringify({...b.gameData,lastHitBy:undefined},(k,v)=>typeof v==='number'&&!Number.isFinite(v)?v>0?1e30:-1e30:v))};}
function hydrate(state){return state.pieces.map(p=>{const b=Traits.createBody(p.data,p.x,p.y,1,{...Rules.getPhysics(stats(p.data)),mass:p.baseMass},p.angle);b.gameData=JSON.parse(JSON.stringify({...p.data,level:Levels.clamp(p.data.level)}));b.gameData.readingAbilities=Read.resolveAll(b.gameData);b.frictionAir=p.frictionAir;Body.setVelocity(b,p.velocity);Body.setAngularVelocity(b,p.angularVelocity);if(b.gameData.isOut)b.collisionFilter.mask=0;return b;});}
function begin(bodies,side,arena,now){Skills.beginTurn(bodies);Traits.beginTurn(bodies);Elements.beginTurn(bodies,side===0,arena);Skills.beforeUpdate(bodies,arena,now);Traits.beforeUpdate(bodies,now);}
function initial(host,guest,rng=Math.random){const bodies=createBodies(host,guest),opening=Order.choose(host.items,guest.items,rng),turn=opening.playerFirst?0:1;begin(bodies,turn,{center,radius:baseRadius},0);return{turn,opening,medals:{comeback:[false,false],abilities:[[],[]],kills:[[0,0,0],[0,0,0]]},usage:[host,guest].map(t=>t.items.map(()=>({shots:0,kills:0,bestShot:0}))),pieces:bodies.map(pack),pressure:Pressure.create(),timestamp:0,winner:null,finished:false,lastShot:null,replay:null};}
function play(state,shot,side,rng=Math.random){
 if(state.finished||state.turn!==side)throw Error('相手の番です。');
 if(!Number.isInteger(shot.key)||shot.key<side*3||shot.key>=side*3+3||!Number.isFinite(shot.dx)||!Number.isFinite(shot.dy)||!Number.isFinite(shot.power)||shot.power<=0||shot.power>1||Math.hypot(shot.dx,shot.dy)<.001||!Number.isFinite(shot.spin)||Math.abs(shot.spin)>3)throw Error('発射内容を確認してください。');
 const next=JSON.parse(JSON.stringify(state)),bodies=hydrate(next),shooter=bodies.find(b=>b.gameData.key===shot.key&&!b.gameData.isOut);if(!shooter)throw Error('このコマは発射できません。');
 const engine=Engine.create({gravity:{x:0,y:0,scale:0}}),arena={center,radius:baseRadius*next.pressure.ratio};Composite.add(engine.world,bodies.filter(b=>!b.gameData.isOut));
 next.usage=next.usage||[0,1].map(()=>[0,1,2].map(()=>({shots:0,kills:0,bestShot:0})));next.usage[side][shot.key%3].shots++;
 next.medals=next.medals||{comeback:[false,false],abilities:[[],[]],kills:[[0,0,0],[0,0,0]]};
 const now=()=>next.timestamp+engine.timing.timestamp,events=[];const notify=(b,a)=>{if(a?.id&&Read.abilities[a.id]&&Read.resolveAll(b.gameData).some(v=>v.id===a.id)){const own=Math.floor(b.gameData.key/3);if(!next.medals.abilities[own].includes(a.id))next.medals.abilities[own].push(a.id);}if(a)events.push({key:b.gameData.key,name:a.name,color:a.color||'#a7f3d0',tick:Math.round(engine.timing.timestamp/ (1000/60))});};
 let attributes=[],traits=[],elements=[],abilities=[];
 Events.on(engine,'beforeUpdate',()=>{Skills.beforeUpdate(bodies,arena,now());Traits.beforeUpdate(bodies,now());});
 Events.on(engine,'collisionStart',e=>Traits.rootPairs(e.pairs).forEach(([a,b])=>{if(a.gameData.isPlayer!==b.gameData.isPlayer){a.gameData.lastHitBy=b;b.gameData.lastHitBy=a;}attributes.push(...Attributes.queueCollision(a,b));traits.push(...Traits.queueCollision(a,b,{bodies,arena,now:now()}));elements.push(...Elements.queueCollision(a,b,{bodies,turnIsPlayer:side===0}));abilities.push(...Skills.queueCollision(a,b,now(),{bodies,arena,rng}));}));
 const falls=()=>{for(const b of bodies){if(!b.gameData.isOut&&Traits.isOutside(b,center,arena.radius)){if(Traits.tryPreventFall(b,arena,bodies,notify)||Skills.tryPreventFall(b,arena,now(),{bodies,rng,notify}))continue;b.gameData.isOut=true;const killer=b.gameData.lastHitBy;if(killer?.gameData&&killer.gameData.isPlayer!==b.gameData.isPlayer)next.medals.kills[Math.floor(killer.gameData.key/3)][killer.gameData.key%3]++;Composite.remove(engine.world,b);}}const counts=[0,1].map(side=>bodies.filter(b=>Math.floor(b.gameData.key/3)===side&&!b.gameData.isOut).length);for(const side of [0,1])if(counts[side]===1&&counts[1-side]===3)next.medals.comeback[side]=true;};
 Events.on(engine,'afterUpdate',()=>{Attributes.applyQueued(attributes);Traits.applyQueued(traits,notify);Elements.applyQueued(elements,notify);Skills.applyQueued(abilities,notify);attributes=[];traits=[];elements=[];abilities=[];Skills.afterUpdate(bodies,arena,now(),{delta:1000/60,notify});for(const b of bodies){const d=b.gameData;if(d.isOut)continue;for(const [id,on]of Object.entries({backwater:d.rubyBackwater,resonance:d.rubyResonance,anchor:d.rubyState?.anchorMultiplier>1,charge:d.rubyState?.charge>0}))if(on&&!next.medals.abilities[Math.floor(d.key/3)].includes(id))notify(b,Read.resolveAll(d).find(a=>a.id===id));}Traits.afterUpdate(bodies,arena,now(),notify);falls();});
 Pressure.beginShot(next.pressure,bodies);const power=stats(shooter.gameData).power;
 Skills.onLaunch(shooter,now(),{bodies,arena,notify,power:shot.power});Traits.onLaunch(shooter,now(),shot.spin,{bodies,direction:Vector.normalise({x:shot.dx,y:shot.dy})});Elements.onLaunch(shooter);
 Body.applyForce(shooter,shooter.position,Vector.mult(Vector.normalise({x:shot.dx,y:shot.dy}),shot.power*.08*(power/100)));
 const frame=()=>bodies.map(b=>[b.position.x,b.position.y,b.angle,b.gameData.isOut?1:0]);const frames=[frame()];
 for(let tick=1;tick<=132;tick++){Engine.update(engine,1000/60);if(tick%4===0)frames.push(frame());}
 const shotKills=bodies.filter(b=>Math.floor(b.gameData.key/3)!==side&&b.gameData.isOut&&!state.pieces.find(p=>p.key===b.gameData.key).data.isOut).length;next.usage[side][shot.key%3].kills+=shotKills;next.usage[side][shot.key%3].bestShot=Math.max(next.usage[side][shot.key%3].bestShot,shotKills);
 const result=Pressure.completeShot(next.pressure,bodies);if(result.shrunk){arena.radius=baseRadius*next.pressure.ratio;falls();}
 const p=bodies.filter(b=>b.gameData.isPlayer&&!b.gameData.isOut).length,c=bodies.filter(b=>!b.gameData.isPlayer&&!b.gameData.isOut).length;
 if(!p||!c){next.finished=true;next.winner=!p&&!c?null:p?0:1;next.reason='全滅';}else if(result.judge){const v=Pressure.judge(bodies,center,arena.radius);next.finished=true;next.winner=v.winner===null?null:v.winner?0:1;next.reason=v.reason;}
 next.timestamp=now();next.turn=1-side;
 // Freeze between turns, so latency and screen size never affect the board.
 for(const b of bodies){Body.setVelocity(b,{x:0,y:0});Body.setAngularVelocity(b,0);}
 if(!next.finished)begin(bodies,next.turn,arena,next.timestamp);
 next.pieces=bodies.map(pack);next.lastShot={id:shot.id,side,key:shot.key,spin:shot.spin};next.replay={frames,events:events.slice(0,80),ratioBefore:state.pressure.ratio};
 Composite.clear(engine.world);Engine.clear(engine);return next;
}
module.exports={roster,initial,play,stats,bases,normalizeTeam};
