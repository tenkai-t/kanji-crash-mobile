const {webkit}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert');
const root=path.join(__dirname,'../dist'),dir=process.env.KANJI_QA_OUTPUT||os.tmpdir();
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=http.createServer((req,res)=>{const url=req.url.split('?')[0],file=path.join(root,decodeURIComponent(url==='/'?'/index.html':url));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await webkit.launch({headless:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await require('./start-gameplay.cjs')(p);await p.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'load'});await p.waitForFunction(()=>engine&&playerBodies.length===3);
 const original=await p.evaluate(()=>JSON.parse(JSON.stringify(gameState)));
 const liveAttribute=await p.evaluate(()=>{
  runner.enabled=false;
  const a=playerBodies[0],b=cpuBodies[0];
  Composite.allBodies(engine.world).filter(body=>body!==a&&body!==b).forEach(body=>Composite.remove(engine.world,body));
  a.gameData.attr='wood';b.gameData.attr='earth';a.gameData.readingAbility=null;b.gameData.readingAbility=null;a.gameData.readingAbilities=[];b.gameData.readingAbilities=[];
  Body.setPosition(a,{x:arenaCenter.x-25,y:arenaCenter.y});Body.setPosition(b,{x:arenaCenter.x+25,y:arenaCenter.y});Body.setVelocity(a,{x:3,y:0});Body.setVelocity(b,{x:0,y:0});
  fxTexts=[];Engine.update(engine,1000/60);const feedback=fxTexts.some(f=>f.text==='相性 +45%');resetBattle();runner.enabled=false;return feedback;
 });assert(liveAttribute,'live collision must display the applied attribute effect');
 assert(await p.evaluate(()=>[...document.querySelectorAll('[data-gacha-rate]')].every(el=>{const [type,tier]=el.dataset.gachaRate.split('-');return el.textContent===`${KanjiGacha.rates[type][tier-1].toFixed(1)}%`})));
 // Use a fixed, non-conditional enemy reading so this fixture isolates run growth.
 await p.locator('#nav-matches').tap();
 await p.evaluate(()=>{window.qaPoolOne=SUMMON_POOLS[1];SUMMON_POOLS[1]=[{...KANJI_DATABASE.find(k=>k.char==='守'),ruby:'まもる'}];});
 await p.locator('#btn-start-endless').tap();
 await p.evaluate(()=>{SUMMON_POOLS[1]=window.qaPoolOne;delete window.qaPoolOne;});
 const initial=await p.evaluate(()=>{runner.enabled=false;return{stats:cpuBodies.map(b=>getKanjiStats(b.gameData)),mass:cpuBodies.map(b=>b.mass),chars:cpuBodies.map(b=>b.gameData.char),team:playerBodies.map(b=>getKanjiStats(b.gameData)),coins:gameState.coins,rp:gameState.rating};});
 assert(await p.evaluate(()=>battleMode==='endless'&&endlessRun.wave===1&&!document.getElementById('endless-status').hidden));
 // Remove one enemy via the actual fall hook; survivors gain effective mass and power.
 const killed=await p.evaluate(()=>{
  const enemy=cpuBodies[0];enemy.gameData.wasHitByEnemy=false;Body.setPosition(enemy,{x:arenaCenter.x+arenaRadius+enemy.circleRadius+20,y:arenaCenter.y});checkArenaFalls();checkArenaFalls();
  return{kills:endlessRun.kills,stats:cpuBodies.slice(1).map(b=>getKanjiStats(b.gameData)),mass:cpuBodies.slice(1).map(b=>b.mass),team:playerBodies.map(b=>getKanjiStats(b.gameData)),status:document.getElementById('endless-status-text').textContent};
 });assert.strictEqual(killed.kills,1);assert(killed.status.includes('+3%'));assert.deepStrictEqual(killed.team,initial.team);
 killed.stats.forEach((s,i)=>{assert.strictEqual(s.power,Math.round(initial.stats[i+1].power*1.03));assert.strictEqual(s.weight,Math.round(initial.stats[i+1].weight*1.03));assert(Math.abs(killed.mass[i]-s.weight/100*1.5)<1e-9);});
 async function clearEnemies(){return p.evaluate(()=>{runner.enabled=false;cpuBodies.filter(b=>!b.gameData.isOut).forEach(b=>{b.gameData.wasHitByEnemy=false;Body.setPosition(b,{x:arenaCenter.x+arenaRadius+b.circleRadius+25,y:arenaCenter.y});});checkArenaFalls();const coins=gameState.coins;checkWinCondition();return{wins:endlessRun.wins,kills:endlessRun.kills,coins,rp:gameState.rating,best:gameState.endlessBest,duplicateReward:gameState.coins===coins};});}
 const first=await clearEnemies();assert.strictEqual(first.wins,1);assert.strictEqual(first.kills,3);assert.strictEqual(first.coins,initial.coins+50);assert.strictEqual(first.rp,initial.rp);assert(first.duplicateReward&&first.best===1);assert(await p.locator('#btn-endless-next').isVisible());
 if(process.env.KANJI_QA_OUTPUT) await p.screenshot({path:path.join(dir,'endless-result-phone.png')});
 // Inventory training during a run does not silently strengthen the frozen team.
 await p.evaluate(()=>gameState.inventory.find(i=>i.instanceId===endlessRun.team[0].instanceId).level=80);
 await p.locator('#btn-endless-next').tap();
 const next=await p.evaluate(()=>{runner.enabled=false;continueEndlessBattle();return{wave:endlessRun.wave,stats:cpuBodies.map(b=>getKanjiStats(b.gameData)),chars:cpuBodies.map(b=>b.gameData.char),team:playerBodies.map(b=>getKanjiStats(b.gameData))};});
 assert.strictEqual(next.wave,2);assert.deepStrictEqual(next.chars,initial.chars);assert.deepStrictEqual(next.team,initial.team);next.stats.forEach((s,i)=>assert(s.power>initial.stats[i].power&&s.weight>initial.stats[i].weight));
 // Starting a different match must give the player a chance to retain their run.
 p.once('dialog',d=>d.dismiss());await p.evaluate(()=>startMatchmaking());assert(await p.evaluate(()=>battleMode==='endless'&&endlessRun.wave===2));
 const sizes=[];
 for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[844,390]]){
  await p.setViewportSize({width,height});await p.waitForTimeout(180);
  await p.waitForFunction(()=>ctx.getImageData(Math.floor(arenaCenter.x),Math.floor(arenaCenter.y),1,1).data[3]===255);
  const layout=await p.evaluate(({width,height})=>{const arena=canvas.getBoundingClientRect(),nav=document.getElementById('nav-rank').getBoundingClientRect(),controls=document.getElementById('battle-controls').getBoundingClientRect(),status=document.getElementById('endless-status').getBoundingClientRect();return{width,height,overflow:document.body.scrollWidth>width+1,arenaHeight:arena.height,navBottom:nav.bottom,controlsTop:controls.top,statusBottom:status.bottom,arenaTop:arena.top,allInside:[...playerBodies,...cpuBodies].filter(b=>!b.gameData.isOut).every(b=>Math.hypot(b.position.x-arenaCenter.x,b.position.y-arenaCenter.y)+b.circleRadius<arenaRadius)};},{width,height});
  assert(!layout.overflow&&layout.arenaHeight>=120&&layout.navBottom<=height+1&&layout.controlsTop>=0&&layout.statusBottom<=height-45&&layout.allInside,JSON.stringify(layout));sizes.push(layout);
  if(process.env.KANJI_QA_OUTPUT&&[320,390,844].includes(width)) await p.screenshot({path:path.join(dir,`endless-battle-${width}.png`)});
 }
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(100);
 // Simulate continued victories through the first two rarity promotions.
 const progress=await p.evaluate(()=>{
  const squads=[];runner.enabled=false;
  // Keep a character's reading fixed while measuring growth. Strongest-reading
  // scoring can legitimately pick a different reading as power/weight grow.
  const equip=autoEquipReading,readings=new Map(cpuBodies.map(b=>[b.gameData.char,{ruby:b.gameData.ruby,equippedReadings:b.gameData.equippedReadings?.slice()}]));
  autoEquipReading=(item,...args)=>{const cached=readings.get(item.char),value=cached?{...item,...cached}:equip(item,...args);if(!cached)readings.set(item.char,{ruby:value.ruby,equippedReadings:value.equippedReadings?.slice()});return value;};
  for(let wave=2;wave<=12;wave++){
   const stats=cpuBodies.map(b=>getKanjiStats(b.gameData));squads.push({wave,jis:cpuBodies[0].gameData.jis,stats,chars:cpuBodies.map(b=>b.gameData.char),multipliers:cpuBodies.map(b=>b.gameData.battleMultiplier)});
   cpuBodies.forEach(b=>{b.gameData.wasHitByEnemy=false;Body.setPosition(b,{x:arenaCenter.x+arenaRadius+b.circleRadius+25,y:arenaCenter.y});});checkArenaFalls();
   continueEndlessBattle();runner.enabled=false;
  }
  autoEquipReading=equip;return{wave:endlessRun.wave,kills:endlessRun.kills,wins:endlessRun.wins,best:gameState.endlessBest,rp:gameState.rating,squads};
 });assert.strictEqual(progress.wave,13);assert.strictEqual(progress.kills,36);assert.strictEqual(progress.best,12);assert.strictEqual(progress.rp,initial.rp);
 progress.squads.forEach((s,i)=>{assert.strictEqual(s.jis,Math.min(4,1+Math.floor((s.wave-1)/5)));if(i){const previous=progress.squads[i-1];s.multipliers.forEach((m,k)=>assert(m>previous.multipliers[k]));if(s.jis===previous.jis){assert.deepStrictEqual(s.chars,previous.chars);s.stats.forEach((stat,k)=>assert(stat.power>previous.stats[k].power&&stat.weight>previous.stats[k].weight,JSON.stringify({wave:s.wave,char:s.chars[k],stat,previous:previous.stats[k]})));}else s.stats.forEach(stat=>assert(Number.isFinite(stat.power)&&Number.isFinite(stat.weight)&&stat.power>0&&stat.weight>0));}});
 // Losing grants no win reward or RP, and prevents a stale continue action.
 const loss=await p.evaluate(()=>{const coins=gameState.coins;playerBodies.forEach(b=>{b.gameData.wasHitByEnemy=false;Body.setPosition(b,{x:arenaCenter.x+arenaRadius+b.circleRadius+25,y:arenaCenter.y});});checkArenaFalls();continueEndlessBattle();return{finished:endlessRun.finished,wave:endlessRun.wave,coinsSame:gameState.coins===coins,rp:gameState.rating};});assert(loss.finished&&loss.wave===13&&loss.coinsSame&&loss.rp===initial.rp);assert(!(await p.locator('#btn-endless-next').isVisible()));
 await p.locator('#btn-result-close').tap();assert(await p.evaluate(()=>battleMode==='classic'&&!endlessRun&&document.getElementById('endless-status').hidden));assert((await p.locator('#endless-best').innerText()).includes('12連勝'));
 // Restore the fixture's inventory, retain the earned record, and verify backups/reload.
 await p.evaluate(original=>{gameState.inventory=original.inventory;gameState.deck=original.deck;saveState();},original);
 await p.locator('#nav-rank').tap();await p.locator('#app-help summary').tap();const download=p.waitForEvent('download');await p.getByRole('button',{name:'バックアップ保存',exact:true}).tap();const backupPath=path.join(dir,'endless-backup.json');await(await download).saveAs(backupPath);assert.strictEqual(JSON.parse(fs.readFileSync(backupPath,'utf8')).state.endlessBest,12);
 await p.evaluate(()=>{gameState.endlessBest=0;saveState();});p.once('dialog',d=>d.accept());await p.locator('#save-file').setInputFiles(backupPath);await p.locator('#modal-toast button').tap();assert(await p.evaluate(()=>gameState.endlessBest===12));await p.reload();assert(await p.evaluate(()=>battleMode==='classic'&&endlessRun===null&&gameState.endlessBest===12));
 // A new challenge resets enemy growth, and exiting keeps the best record.
 await p.locator('#nav-matches').tap();await p.locator('#btn-start-endless').tap();assert(await p.evaluate(()=>endlessRun.wave===1&&endlessRun.kills===0&&cpuBodies.every(b=>b.gameData.battleMultiplier===1)));
 p.once('dialog',d=>d.accept());await p.getByRole('button',{name:'終了',exact:true}).tap();assert(await p.evaluate(()=>battleMode==='classic'&&gameState.endlessBest===12));
 // Classic rewards and progression still use the selected difficulty.
 await p.evaluate(()=>{startMatchmaking();runner.enabled=false;selectCpuDifficulty('normal');resetBattle();});const classic=await p.evaluate(()=>{const coins=gameState.coins,rp=gameState.rating;cpuBodies.forEach(b=>{b.gameData.wasHitByEnemy=false;Body.setPosition(b,{x:arenaCenter.x+arenaRadius+b.circleRadius+25,y:arenaCenter.y});});checkArenaFalls();return{rp:gameState.rating-rp,coins:gameState.coins-coins,best:gameState.endlessBest};});assert.deepStrictEqual(classic,{rp:25,coins:80,best:12});assert(!(await p.locator('#btn-endless-next').isVisible()));
 assert.deepStrictEqual(errors,[]);console.log(JSON.stringify({rareRates:[15,60,20,5],killBoost:true,waveBoost:true,frozenTeam:true,record:progress.best,classic,sizes,errors}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
