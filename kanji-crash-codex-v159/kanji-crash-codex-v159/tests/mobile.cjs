const {webkit}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'../dist');
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=http.createServer((req,res)=>{const p=path.join(root,decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!p.startsWith(root)||!fs.existsSync(p)){res.writeHead(404);res.end();return}res.setHeader('Content-Type',types[path.extname(p)]||'application/octet-stream');res.end(fs.readFileSync(p))});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const b=await webkit.launch({headless:true});try{
const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await require('./start-gameplay.cjs')(p);await p.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'load'});await p.waitForFunction(()=>engine&&playerBodies.length===3);
assert(await p.evaluate(()=>document.getElementById('battle-legend').textContent.includes('木火土金水')&&playerBodies.every(b=>Math.abs(b.mass-KanjiRules.getPhysics(getKanjiStats(b.gameData)).mass)<1e-8)));
// Validate every available summon has a dictionary reading, and both draw types equip it.
const gacha=await p.evaluate(()=>{
 const pools=Object.fromEntries(Object.entries(SUMMON_POOLS).map(([jis,pool])=>[jis,{count:pool.length,readable:pool.every(i=>getRealReadings(i.char).length>0)}]));
 const granted=[];for(const jis of [1,2,3,4])for(const base of [SUMMON_POOLS[jis][0],SUMMON_POOLS[jis].at(-1)]){const r=grantGachaItem(base);granted.push(!!r.item.ruby&&r.item.rubyUnlocked&&r.item.readingEquipped&&getRealReadings(base.char).includes(r.item.ruby));}
 const item=gameState.inventory[0];item.ruby=getRealReadings(item.char).at(-1);item.equippedReadings=[item.ruby];item.unlockedReadings=[item.ruby];const chosen=item.ruby;const duplicate=grantGachaItem(KANJI_DATABASE.find(x=>x.char===item.char));const preserved=duplicate.duplicate&&item.ruby===chosen&&duplicate.item.instanceId!==item.instanceId;
 gameState.coins=10000;saveState();return {pools,granted,preserved,chosen};
});assert(Object.values(gacha.pools).every(x=>x.count>0&&x.readable));assert(gacha.granted.every(Boolean));assert(gacha.preserved);
await p.reload();assert(await p.evaluate(chosen=>gameState.inventory[0].ruby===chosen,gacha.chosen));
for(const [type,cost] of [['normal',100],['rare',300]]){
 const coins=await p.evaluate(()=>gameState.coins);await p.evaluate(type=>drawGacha(type),type);
 assert((await p.locator('#toast-msg').innerText()).includes('読み仮名：'));assert(!(await p.locator('#toast-msg').innerText()).includes('未装備'));
 assert(await p.evaluate(coins=>gameState.coins===coins,coins-cost));await p.locator('#modal-toast button').tap();
}
await p.locator('#nav-gacha').tap();await p.getByRole('button',{name:'10連召喚 (1,000文)',exact:true}).tap();await p.waitForFunction(()=>document.querySelectorAll('#gacha-result-grid>div').length===10);assert(!(await p.locator('#gacha-result-grid').innerText()).includes('未装備'));assert(await p.locator('#gacha-result-grid .piece-stat-strip').count()===10);await p.locator('#modal-gacha button').tap();
await p.evaluate(()=>drawTenGacha('rare'));await p.waitForFunction(()=>document.querySelectorAll('#gacha-result-grid>div').length===10);assert(!(await p.locator('#gacha-result-grid').innerText()).includes('未装備'));await p.locator('#modal-gacha button').tap();await p.locator('#nav-battle').tap();
// Equip an actual dictionary reading, preview its skill, apply the recommended deck,
// reload it, and start a match with the saved readings and effective masses.
const savedBeforeSkills = await p.evaluate(()=>JSON.parse(JSON.stringify(gameState)));
await p.evaluate(()=>{
 const ruby={重:'ジュウ',留:'ル',守:'シュ',撃:'ゲキ'};
 gameState.inventory=Object.keys(ruby).map((char,i)=>({...KANJI_DATABASE.find(k=>k.char===char),instanceId:`inst_skill_${i}`,ruby:ruby[char],level:1,exp:0,rubyUnlocked:true,readingEquipped:true,unlockedReadings:getRealReadings(char)}));
 gameState.deck=gameState.inventory.slice(0,3).map(i=>i.instanceId);saveState();renderCollection();renderDeckSlots();
});await p.locator('#nav-deck').tap();await p.getByRole('button',{name:'重の詳細',exact:true}).tap();
await p.locator('.reading-option[data-reading="おもい"]').tap();assert((await p.locator('#ruby-ability-preview').innerText()).includes('重し'));if(process.env.KANJI_QA_OUTPUT){await p.locator('#ruby-ability-preview').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(process.env.KANJI_QA_OUTPUT,'ruby-skills-phone.png')});}
await p.getByRole('button',{name:'選択した読みを装備する'}).tap();await p.locator('#modal-toast button').tap();await p.locator('#modal-ruby button[aria-label="閉じる"]').tap();
await p.locator('#btn-deck-start').tap();assert(await p.evaluate(()=>playerBodies.find(b=>b.gameData.char==='重').gameData.readingAbility.id==='anchor'));
await p.locator('#nav-deck').tap();await p.locator('#btn-recommend-deck').tap();const recommended=await p.evaluate(()=>({deck:[...gameState.deck],readings:gameState.deck.map(id=>{const i=gameState.inventory.find(i=>i.instanceId===id);return{char:i.char,ruby:i.ruby,ability:getReadingAbility(i).id}})}));
assert(recommended.deck.length===3&&new Set(recommended.deck).size===3);assert((await p.locator('#deck-recommendation-status').innerText()).includes('攻撃役'));
if(process.env.KANJI_QA_OUTPUT) await p.screenshot({path:path.join(process.env.KANJI_QA_OUTPUT,'recommended-deck-phone.png')});
for(const [width,height] of [[320,568],[844,390]]){
 await p.setViewportSize({width,height});await p.locator('#btn-recommend-deck').tap();
 assert(await p.evaluate(width=>document.body.scrollWidth<=width+1&&[...document.querySelectorAll('#deck-slots-container .ability-list')].every(el=>el.querySelectorAll('.ability-chip').length>=1),width));
 if(process.env.KANJI_QA_OUTPUT) await p.screenshot({path:path.join(process.env.KANJI_QA_OUTPUT,`recommended-deck-${width}.png`)});
 await p.getByRole('button',{name:'重の詳細',exact:true}).tap();await p.locator('.reading-option[data-reading="おもい"]').tap();assert((await p.locator('#ruby-ability-preview').innerText()).includes('重し'));
 await p.locator('#ruby-ability-preview').scrollIntoViewIfNeeded();assert(await p.evaluate(width=>document.body.scrollWidth<=width+1,width));
 if(process.env.KANJI_QA_OUTPUT) await p.screenshot({path:path.join(process.env.KANJI_QA_OUTPUT,`ruby-skills-${width}.png`)});
 await p.locator('#modal-ruby button[aria-label="閉じる"]').tap();
}
await p.setViewportSize({width:390,height:844});
await p.reload();assert(await p.evaluate(expected=>JSON.stringify(gameState.deck)===JSON.stringify(expected.deck)&&expected.readings.every(e=>gameState.inventory.some(i=>i.char===e.char&&i.ruby===e.ruby)),recommended));
await p.locator('#nav-deck').tap();await p.locator('#btn-deck-start').tap();assert(await p.evaluate(()=>playerBodies.every(b=>b.gameData.readingAbility.id===getReadingAbility(b.gameData).id&&Math.abs(b.mass-KanjiRules.getPhysics(getKanjiStats(b.gameData)).mass)<1e-8)));
const liveSkills=await p.evaluate(()=>{
 resetBattle();clearTimeout(cpuTurnTimer);isPlayerTurn=true;runner.enabled=false;
 const defender=playerBodies[0],attacker=cpuBodies[0];
 [...playerBodies.slice(1),...cpuBodies.slice(1)].forEach(b=>{b.gameData.isOut=true;Composite.remove(engine.world,b)});
 defender.gameData.readingAbility=KanjiReadAbilities.abilities.guard;defender.gameData.readingAbilities=[KanjiReadAbilities.abilities.guard];attacker.gameData.readingAbility=KanjiReadAbilities.abilities.strike;attacker.gameData.readingAbilities=[KanjiReadAbilities.abilities.strike];
 Body.setMass(defender,1.5);Body.setMass(attacker,1.5);
 Body.setPosition(attacker,{x:arenaCenter.x-26.5,y:arenaCenter.y});Body.setPosition(defender,{x:arenaCenter.x+26.5,y:arenaCenter.y});
 Body.setVelocity(attacker,{x:8,y:0});Body.setVelocity(defender,{x:0,y:0});
 const originalRandom=Math.random;let collisionFlash=false,stayed=false;
 try{
  Math.random=()=>0.01;Engine.update(engine,1000/60);
  collisionFlash=attacker.gameData.skillFlashUntil>performance.now()&&defender.gameData.skillFlashUntil>performance.now();
  defender.gameData.readingAbility=KanjiReadAbilities.abilities.sturdy;defender.gameData.readingAbilities=[KanjiReadAbilities.abilities.sturdy];defender.gameData.sturdyUsed=false;defender.gameData.wasHitByEnemy=true;defender.gameData.lastEnemyHitAt=engine.timing.timestamp;
  Body.setPosition(defender,{x:arenaCenter.x+arenaRadius+defender.circleRadius+8,y:arenaCenter.y});Body.setVelocity(defender,{x:8,y:0});
  checkArenaFalls();stayed=!defender.gameData.isOut&&defender.gameData.sturdyUsed&&defender.velocity.x===0&&Math.hypot(defender.position.x-arenaCenter.x,defender.position.y-arenaCenter.y)<arenaRadius;
 }finally{Math.random=originalRandom;}
 return{collisionFlash,stayed};
});assert(liveSkills.collisionFlash&&liveSkills.stayed);
await p.evaluate(original=>{gameState=original;saveState();renderCollection();renderDeckSlots();resetBattle();clearTimeout(cpuTurnTimer);isPlayerTurn=true;runner.enabled=false;},savedBeforeSkills);
async function reset(){await p.evaluate(()=>{resetBattle();clearTimeout(cpuTurnTimer);isPlayerTurn=true;runner.enabled=false;setBattleInputMode('shoot');});await p.waitForTimeout(50);}
async function point(edge=false){return p.evaluate(edge=>{const body=playerBodies[0],r=canvas.getBoundingClientRect();return{x:r.left+body.position.x+(edge?body.circleRadius*.95:0),y:r.top+body.position.y}},edge);}
// Shooting-mode taps, jitter and piece motion neither fire nor show parameters.
await reset();let pt=await point(true);await p.touchscreen.tap(pt.x,pt.y);assert(await p.evaluate(()=>isPlayerTurn&&!isDragging&&document.getElementById('kanji-param-hud').hidden));
pt=await point();await p.mouse.move(pt.x,pt.y);await p.mouse.down();await p.mouse.move(pt.x+8,pt.y+7);await p.mouse.up();assert(await p.evaluate(()=>isPlayerTurn&&!isDragging));
pt=await point();await p.mouse.move(pt.x,pt.y);await p.mouse.down();await p.evaluate(()=>Body.translate(playerBodies[0],{x:30,y:0}));await p.mouse.up();assert(await p.evaluate(()=>isPlayerTurn&&!isDragging));
await reset();await p.locator('#mode-inspect').tap();assert(await p.locator('#mode-inspect').getAttribute('aria-pressed')==='true');pt=await point();await p.mouse.move(pt.x,pt.y);await p.mouse.down();await p.mouse.move(pt.x,pt.y+70);await p.mouse.up();assert(await p.evaluate(()=>isPlayerTurn&&!isDragging));await p.waitForTimeout(100);if(process.env.KANJI_QA_OUTPUT) await p.screenshot({path:path.join(process.env.KANJI_QA_OUTPUT,'inspect-phone.png')});
await p.locator('#mode-shoot').tap();pt=await point();await p.touchscreen.tap(pt.x,pt.y);pt=await p.evaluate(()=>{const r=canvas.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});await p.mouse.move(pt.x,pt.y);await p.mouse.down();await p.mouse.move(pt.x,pt.y+60);await p.mouse.up();assert(await p.evaluate(()=>!isPlayerTurn));await reset();
// Optional future per-reading abilities keep default balance unchanged and update both detail displays.
const ability=await p.evaluate(()=>{
 setBattleInputMode('inspect');
 const body=playerBodies[0],item=body.gameData,before=getKanjiStats(item);const key=normalizeReading(item.ruby).replace(/[ァ-ヶ]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0x60));
 window.KANJI_READING_ABILITIES[key]={id:'fixture',name:'検証用能力',description:'検証中のみ有効',bonuses:{power:7,weight:3,speed:2}};
 const generic=getKanjiStats(item);window.KANJI_READING_ABILITIES[`${item.char}:${key}`]={id:'override',name:'文字別の検証',description:'検証中のみ有効',bonuses:{power:11}};const specific=getKanjiStats(item);showBattleStats(body);openRubyModal(item);
 const displays=document.getElementById('hud-reading-ability').textContent.includes('文字別の検証')&&document.getElementById('ruby-status-info').textContent.includes('文字別の検証');
 window.KANJI_READING_ABILITIES={};const after=getKanjiStats(item);closeModal('modal-ruby');return{generic:generic.power-before.power===7&&generic.weight-before.weight===3&&generic.speed-before.speed===2,specific:specific.power-before.power===11,displays,restored:after.power===before.power};
});assert(Object.values(ability).every(Boolean));
const cpu=await p.evaluate(()=>{
 selectCpuDifficulty('boss');resetBattle();clearTimeout(cpuTurnTimer);isPlayerTurn=true;runner.enabled=false;isPlayerTurn=false;const before=performance.now();executeCpuTurn();const ms=performance.now()-before;const fired=cpuBodies.some(b=>Math.hypot(b.force.x,b.force.y)>0);const masses=cpuBodies.every(b=>Math.abs(b.mass-getKanjiStats(b.gameData).weight/100*1.5)<1e-8);return{ms:Math.round(ms),fired,masses};
});assert(cpu.fired&&cpu.masses);await p.waitForFunction(()=>isPlayerTurn,{timeout:5000});assert.deepStrictEqual(errors,[]);console.log(JSON.stringify({gacha,gesturesPassed:true,ability,recommended,liveSkills,cpu,errors}));
}finally{await b.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
