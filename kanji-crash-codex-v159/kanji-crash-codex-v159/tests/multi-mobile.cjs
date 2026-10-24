const {webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert'),os=require('os');
const root=path.join(__dirname,'../dist'),output=process.env.KANJI_QA_OUTPUT||os.tmpdir();
const server=http.createServer((req,res)=>{const url=req.url.split('?')[0],file=path.join(root,decodeURIComponent(url==='/'?'/index.html':url));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.webmanifest':'application/manifest+json','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await webkit.launch({headless:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await require('./start-gameplay.cjs')(p);await p.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'load'});await p.waitForFunction(()=>engine&&playerBodies.length===3);
 const fixture=await p.evaluate(()=>{
  const base=KANJI_DATABASE.find(k=>!KanjiTraits.get(k)&&getRealReadings(k.char).length>=4&&new Set(getRealReadings(k.char).map(r=>KanjiReadAbilities.resolve({...k,ruby:r}).id)).size===4);
  if(!base)throw Error('four real ability kinds unavailable');
  gameState.inventory=[0,1,2].map(i=>({...base,instanceId:`inst_multi_${i}`,ruby:getRealReadings(base.char)[0],unlockedReadings:getRealReadings(base.char),level:1,exp:0}));gameState.deck=gameState.inventory.map(i=>i.instanceId);saveState();return{char:base.char,words:getRealReadings(base.char)};
 });await p.reload();
 assert(await p.evaluate(()=>gameState.inventory.every(i=>i.equippedReadings.length===1)),'legacy equipped ruby remains the only equipped reading');
 await p.locator('#nav-deck').tap();await p.evaluate(()=>openRubyModal(gameState.inventory[0]));await p.getByRole('button',{name:'解放済みをすべて選択',exact:true}).tap();
 assert(await p.evaluate(()=>rubyDraft.length===getRealReadings(gameState.inventory[0].char).length));
 const expectedNames=await p.evaluate(()=>getReadingAbilities({...gameState.inventory[0],equippedReadings:rubyDraft}).map(a=>a.name));for(const name of expectedNames)assert((await p.locator('#ruby-ability-preview').innerText()).includes(name));
 await p.waitForTimeout(250);if(process.env.KANJI_QA_OUTPUT)await p.screenshot({path:path.join(output,'multi-ruby-phone.png')});
 await p.getByRole('button',{name:'選択した読みを装備する'}).tap();await p.locator('#modal-toast button').tap();await p.locator('#modal-ruby button[aria-label="閉じる"]').tap();
 await p.locator('#btn-deck-start').tap();assert(await p.evaluate(()=>playerBodies[0].gameData.readingAbilities.length===4&&Math.abs(playerBodies[0].mass-KanjiRules.getPhysics(getKanjiStats(playerBodies[0].gameData)).mass)<1e-8));
 // Equipment changes in the collection are deferred until the next match.
 assert(await p.evaluate(()=>{const before=playerBodies[0].gameData.equippedReadings.length;gameState.inventory[0].equippedReadings=[gameState.inventory[0].ruby];const frozen=playerBodies[0].gameData.equippedReadings.length===before;gameState.inventory[0].equippedReadings=getRealReadings(gameState.inventory[0].char).slice();saveState();return frozen;}));
 await p.reload();assert(await p.evaluate(()=>gameState.inventory[0].equippedReadings.length===getRealReadings(gameState.inventory[0].char).length&&playerBodies[0].gameData.readingAbilities.length===4));
 async function playerTurn(){await p.evaluate(()=>{resetBattle();clearTimeout(cpuTurnTimer);isPlayerTurn=true;isBattleEnded=false;runner.enabled=false;setBattleInputMode('shoot');showTurnBanner(true);});}
 const edges=[];
 for(const edge of ['left','right','top','bottom']){
  await playerTurn();await p.evaluate(edge=>{const b=playerBodies[2],distance=arenaRadius+b.circleRadius*.6;Body.setPosition(b,{x:arenaCenter.x+(edge==='left'?-distance:edge==='right'?distance:0),y:arenaCenter.y+(edge==='top'?-distance:edge==='bottom'?distance:0)});},edge);
  const pt=await p.evaluate(()=>{const b=playerBodies[2],r=canvas.getBoundingClientRect();return{x:Math.max(r.left+4,Math.min(r.right-4,r.left+b.position.x*r.width/canvas.width)),y:Math.max(r.top+4,Math.min(r.bottom-4,r.top+b.position.y*r.height/canvas.height))};});await p.touchscreen.tap(pt.x,pt.y);assert(await p.evaluate(()=>selectedShotBody===playerBodies[2]&&isPlayerTurn));const box=await p.locator('#game-canvas').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x,y+45);await p.mouse.up();assert(await p.evaluate(()=>{runner.enabled=false;clearTimeout(cpuTurnTimer);return !isPlayerTurn;}));edges.push(edge);
 }
 const sizes=[];for(const [width,height]of [[320,568],[375,667],[390,844],[430,932],[844,390]]){await p.setViewportSize({width,height});await p.waitForTimeout(150);await playerTurn();const layout=await p.evaluate(()=>({overflow:document.body.scrollWidth>innerWidth+1,board:canvas.clientHeight,noPad:!document.getElementById('modal-aim')&&!document.getElementById('btn-aim-pad')&&typeof openAimPad==='undefined',buttons:[...document.querySelectorAll('#battle-controls button')].every(b=>b.getBoundingClientRect().height>=44)}));assert(!layout.overflow&&layout.board>=200&&layout.noPad&&layout.buttons,JSON.stringify({width,height,...layout}));sizes.push({width,height,...layout});}
 // Real fall hooks: two victories then two KOs before losing => 2 wins / 8 kills.
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{gameState.endlessBest=0;gameState.endlessBestKills=0;gameState.endlessBestEstimated=false;startEndlessBattle();runner.enabled=false;});
 const record=await p.evaluate(()=>{
  const drop=b=>{b.gameData.wasHitByEnemy=false;Body.setPosition(b,{x:arenaCenter.x+arenaRadius+b.circleRadius+30,y:arenaCenter.y});};
  for(let wave=0;wave<2;wave++){cpuBodies.forEach(drop);checkArenaFalls();continueEndlessBattle();runner.enabled=false;}
  cpuBodies.slice(0,2).forEach(drop);checkArenaFalls();playerBodies.forEach(drop);checkArenaFalls();return{wins:gameState.endlessBest,kills:gameState.endlessBestKills,result:document.getElementById('result-message').textContent};
 });assert(record.wins===2&&record.kills===8&&record.result.includes('2連勝・8体撃破'));
 await p.locator('#btn-result-close').tap();assert((await p.locator('#endless-best').innerText()).includes('2連勝・8体撃破'));
 await p.locator('#endless-best').scrollIntoViewIfNeeded();if(process.env.KANJI_QA_OUTPUT)await p.screenshot({path:path.join(output,'endless-paired-record.png')});
 await p.locator('#app-help summary').tap();const download=p.waitForEvent('download');await p.getByRole('button',{name:'バックアップ保存',exact:true}).tap();const backup=path.join(output,'multi-record-backup.json');await(await download).saveAs(backup);const saved=JSON.parse(fs.readFileSync(backup,'utf8')).state;
 assert(saved.endlessBest===2&&saved.endlessBestKills===8&&saved.inventory[0].equippedReadings.length===fixture.words.length);
 await p.evaluate(()=>{gameState.endlessBest=1;gameState.endlessBestKills=3;gameState.inventory[0].equippedReadings=[gameState.inventory[0].ruby];saveState();});p.once('dialog',d=>d.accept());await p.locator('#save-file').setInputFiles(backup);await p.locator('#modal-toast button').tap();await p.reload();assert(await p.evaluate(()=>gameState.endlessBest===2&&gameState.endlessBestKills===8&&getReadingAbilities(gameState.inventory[0]).length===4));
 // Old records have no KO count; display the guaranteed minimum honestly.
 await p.evaluate(()=>{gameState.endlessBest=12;delete gameState.endlessBestKills;delete gameState.endlessBestEstimated;localStorage.setItem('moji_otoshi_save_v5',JSON.stringify(gameState));});await p.reload();assert(await p.evaluate(()=>gameState.endlessBestKills===36&&gameState.endlessBestEstimated&&document.getElementById('endless-best').textContent.includes('36体以上撃破')));
 // Old non-summonable characters without dictionary readings remain importable.
 assert(await p.evaluate(()=>{const base=KANJI_DATABASE.find(k=>!getRealReadings(k.char).length);if(!base)return true;const i=KanjiInventory.normalize({...base,instanceId:'inst_no_reading',level:3,exp:7},getRealReadings);return validSave({...gameState,inventory:[i],deck:[i.instanceId]});}));
 assert.deepStrictEqual(errors,[]);console.log(JSON.stringify({fixture,multiSaved:true,backup:true,edges,centralEdgeSelection:true,padRemoved:true,pairedRecord:record,legacyRecord:true,sizes,errors}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
