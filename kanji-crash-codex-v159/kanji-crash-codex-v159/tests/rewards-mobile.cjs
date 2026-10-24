const {webkit}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert');
const root=path.join(__dirname,'../dist'),dir=process.env.KANJI_QA_OUTPUT||os.tmpdir();
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.webmanifest':'application/manifest+json','.png':'image/png'};
const server=http.createServer((req,res)=>{const url=req.url.split('?')[0],file=path.join(root,decodeURIComponent(url==='/'?'/index.html':url));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await webkit.launch({headless:true});
 try {
 const c=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),p=await c.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await require('./start-gameplay.cjs')(p);await p.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'load'});await p.waitForFunction(()=>engine&&playerBodies.length===3);
 await p.evaluate(()=>{clearTimeout(cpuTurnTimer);isPlayerTurn=true;runner.enabled=false;playerBodies[0].gameData.attr='wood';});
 async function point(){return p.evaluate(()=>{const b=playerBodies[0],r=canvas.getBoundingClientRect();return{x:r.left+b.position.x,y:r.top+b.position.y};});}
 let pt=await point();await p.touchscreen.tap(pt.x,pt.y);
 assert(!(await p.locator('#kanji-param-hud').isVisible()));assert((await p.locator('#matchup-focus').innerText()).includes('土に強い／金に弱い'));
 await p.mouse.move(pt.x,pt.y);assert(!(await p.locator('#kanji-param-hud').isVisible()));
 await p.evaluate(()=>{showBattleStats(playerBodies[0]);showAbilityActivation(playerBodies[0],{name:'検証',color:'#fff'});});assert(!(await p.locator('#kanji-param-hud').isVisible()),'ability callbacks must not reopen shooting-mode parameters');
 await p.locator('#mode-inspect').tap();pt=await point();await p.touchscreen.tap(pt.x,pt.y);assert(await p.locator('#kanji-param-hud').isVisible());
 await p.mouse.move(pt.x,pt.y);await p.mouse.down();await p.mouse.move(pt.x,pt.y+60);await p.mouse.up();assert(await p.evaluate(()=>isPlayerTurn&&!isDragging));
 await p.locator('#mode-shoot').tap();assert(!(await p.locator('#kanji-param-hud').isVisible()));pt=await point();await p.touchscreen.tap(pt.x,pt.y);pt=await p.evaluate(()=>{const r=canvas.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});await p.mouse.move(pt.x,pt.y);await p.mouse.down();await p.mouse.move(pt.x,pt.y+60);await p.mouse.up();assert(await p.evaluate(()=>!isPlayerTurn&&battleRewards.shot.enemies.length===3));assert(!(await p.locator('#kanji-param-hud').isVisible()));
 await p.evaluate(()=>{resetBattle();clearTimeout(cpuTurnTimer);isPlayerTurn=true;runner.enabled=false;});
 const sizes=[];
 for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[844,390]]) {
  await p.setViewportSize({width,height});await p.waitForTimeout(120);await p.locator('#battle-matchup').tap();
  assert(await p.locator('#modal-matchup').isVisible());assert.strictEqual(await p.locator('#matchup-table tbody tr').count(),5);
  const table=await p.locator('#matchup-table').innerText();assert(table.includes('有利な相手')&&table.includes('不利な相手')&&table.includes('×1.45')&&table.includes('×0.75'));
  assert(await p.evaluate(width=>document.body.scrollWidth<=width+1&&!runner.enabled,width));
  if(process.env.KANJI_QA_OUTPUT&&[320,390,844].includes(width)) await p.screenshot({path:path.join(dir,`matchup-table-${width}.png`)});
  await p.getByRole('button',{name:'対局に戻る',exact:true}).tap();await p.evaluate(()=>runner.enabled=false);await p.waitForTimeout(100);
  const layout=await p.evaluate(({width,height})=>{const board=document.getElementById('battle-matchup').getBoundingClientRect(),nav=document.getElementById('nav-rank').getBoundingClientRect(),arena=canvas.getBoundingClientRect();return{width,height,boardHeight:board.height,boardRight:board.right,arenaHeight:arena.height,navBottom:nav.bottom,overflow:document.body.scrollWidth>width+1};},{width,height});
  assert(!layout.overflow&&layout.boardRight<=width+1&&layout.boardHeight>=44&&layout.arenaHeight>=120&&layout.navBottom<=height+1,JSON.stringify(layout));sizes.push(layout);
  if(process.env.KANJI_QA_OUTPUT&&[320,390,844].includes(width)) {await p.waitForFunction(()=>ctx.getImageData(Math.floor(arenaCenter.x),Math.floor(arenaCenter.y),1,1).data[3]===255);await p.screenshot({path:path.join(dir,`matchup-shoot-${width}.png`)});}
 }
 await p.setViewportSize({width:390,height:844});
 async function setup(mode='classic',count=3) {await p.evaluate(({mode,count})=>{
  document.querySelectorAll('[id^="modal-"]').forEach(el=>el.classList.add('hidden'));
  gameState.inventory=['木','火','水'].map((char,i)=>({...autoEquipReading(KANJI_DATABASE.find(k=>k.char===char)),instanceId:`inst_reward_${i}`,level:1,exp:0,locked:false}));
  gameState.deck=gameState.inventory.slice(0,count).map(i=>i.instanceId);currentCpuDifficulty='normal';battleMode=mode;endlessRun=mode==='endless'?KanjiEndless.create(gameState.inventory.slice(0,count)):null;
  saveState();switchTab('battle');resetBattle();clearTimeout(cpuTurnTimer);isPlayerTurn=true;runner.enabled=false;setBattleInputMode('shoot');
  [...playerBodies,...cpuBodies].forEach(b=>{b.gameData.readingAbility=null;b.gameData.wasHitByEnemy=false;});
 },{mode,count});await p.waitForTimeout(70);}
 async function sweepLaunch(){let pt=await point();await p.touchscreen.tap(pt.x,pt.y);pt=await p.evaluate(()=>{const r=canvas.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});await p.mouse.move(pt.x,pt.y);await p.mouse.down();await p.mouse.move(pt.x,pt.y+55);await p.mouse.up();assert(await p.evaluate(()=>!!battleRewards.shot));}
 async function finish({split=false,loseAlly=false}={}) {return p.evaluate(({split,loseAlly})=>{
  const hero=playerBodies[0];if(loseAlly){const ally=playerBodies.at(-1);Body.setPosition(ally,{x:arenaCenter.x+arenaRadius+ally.circleRadius+40,y:arenaCenter.y});checkArenaFalls();}
  cpuBodies.forEach((b,i)=>{
   if(split) KanjiRewards.beginShot(battleRewards,true,hero.gameData.instanceId,cpuBodies.filter(b=>!b.gameData.isOut).map(b=>b.id));
   b.gameData.lastHitBy=hero;Body.setPosition(b,{x:arenaCenter.x+arenaRadius+b.circleRadius+40,y:arenaCenter.y});checkArenaFalls();
  });
  const item=gameState.inventory[0],before=getTotalExp(item);checkWinCondition();applyBattleExperienceBonuses(true);
  return{total:getTotalExp(item),level:item.level,exp:item.exp,doublePrevented:getTotalExp(item)===before,summary:document.getElementById('result-exp-info').textContent,sweep:battleRewards.sweep};
 },{split,loseAlly});}
 await setup();const full=await finish({split:true});assert(full.total===90&&full.level===1&&full.exp===90&&!full.sweep&&full.summary.includes('1.5倍')&&full.doublePrevented);
 await setup();await sweepLaunch();const one=await finish({loseAlly:true});assert(one.total===120&&one.level===2&&one.exp===20&&one.summary.includes('2倍')&&!one.summary.includes('3体生存'));
 await setup();await sweepLaunch();const both=await finish();assert(both.total===150&&both.level===2&&both.exp===50&&both.summary.includes('2.5倍')&&both.summary.includes('追加 +90')&&both.doublePrevented);
 if(process.env.KANJI_QA_OUTPUT) await p.screenshot({path:path.join(dir,'xp-bonus-phone.png')});
 await p.reload();assert(await p.evaluate(()=>gameState.inventory[0].level===2&&gameState.inventory[0].exp===50),'bonus and level-up must survive reload');
 await setup('classic',2);const small=await finish({split:true});assert(small.total===60&&!small.summary.includes('3体生存'));
 await setup();const loss=await p.evaluate(()=>{
  const enemy=cpuBodies[0];enemy.gameData.lastHitBy=playerBodies[0];Body.setPosition(enemy,{x:arenaCenter.x+arenaRadius+enemy.circleRadius+40,y:arenaCenter.y});checkArenaFalls();
  playerBodies.forEach(b=>Body.setPosition(b,{x:arenaCenter.x+arenaRadius+b.circleRadius+40,y:arenaCenter.y}));checkArenaFalls();
  return{total:getTotalExp(gameState.inventory[0]),panelHidden:document.getElementById('result-exp-info').hidden};
 });assert(loss.total===20&&loss.panelHidden);
 await setup('endless');await sweepLaunch();const endless=await finish();assert(endless.total===150&&endless.summary.includes('2.5倍'));await p.locator('#btn-endless-next').tap();assert(await p.evaluate(()=>endlessRun.wave===2&&battleRewards.defeated.length===0&&!battleRewards.settled&&Object.keys(battleRewards.earned).length===0&&endlessRun.team[0].level===1));
 assert.deepStrictEqual(errors,[]);console.log(JSON.stringify({shootingHudHidden:true,inspectSafe:true,matchupViewports:sizes,EXP:{full:full.total,one:one.total,both:both.total,small:small.total,loss:loss.total,endless:endless.total},levelReload:true,errors}));
 } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
