const {webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert');
const root=path.join(__dirname,'../dist'),dir=process.env.KANJI_QA_OUTPUT||os.tmpdir();
const server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]),file=path.join(root,name==='/'?'index.html':name);if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.webmanifest':'application/manifest+json'}[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await webkit.launch({headless:true});try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await require('./start-gameplay.cjs')(p);await p.goto(`http://127.0.0.1:${server.address().port}`);await p.waitForFunction(()=>engine&&playerBodies.length===3);
 // Migrate a real old save containing shapes and rare pieces while preserving
 // levels, equipped readings, unlocked readings and all three layout slots.
 const legacy=await p.evaluate(()=>{
  const chars=['一','小','亜',SUMMON_POOLS[3][0].char,SUMMON_POOLS[4][0].char];
  const inventory=chars.map((char,n)=>{const item=autoEquipReading({...KANJI_DATABASE.find(k=>k.char===char),instanceId:`inst_old_${n}`,level:3+n,exp:11+n,locked:n===2});return{...item,unlockedReadings:[item.ruby]};});
  const layouts=[KanjiFormation.copy(KanjiFormation.defaults),null,KanjiFormation.copy(KanjiFormation.defaults)];
  const save={rating:1583,coins:9751,inventory,deck:inventory.slice(0,3).map(i=>i.instanceId),endlessBest:7,formationPresets:layouts,activeFormation:2};gameState=save;saveState();return save;
 });await p.reload();await p.waitForFunction(()=>engine&&playerBodies.length===3);
 assert(await p.evaluate(legacy=>gameState.coins===legacy.coins&&gameState.rating===legacy.rating&&gameState.endlessBest===7&&JSON.stringify(gameState.formationPresets)===JSON.stringify(legacy.formationPresets)&&gameState.inventory.every((i,n)=>i.level===legacy.inventory[n].level&&i.exp===legacy.inventory[n].exp&&i.ruby===legacy.inventory[n].ruby&&i.locked),legacy));
 await p.locator('#nav-deck').tap();await p.locator('#btn-traits').tap();assert.equal(await p.locator('.trait-card').count(),15);assert((await p.locator('#catalogue-progress').innerText()).includes('入手済み 2 / 15種'));
 await p.locator('[data-catalogue-filter="found"]').tap();assert.equal(await p.locator('.trait-card').count(),2);await p.locator('.trait-card[data-char="小"] button').tap();assert(await p.locator('#modal-ruby').isVisible());assert((await p.locator('#ruby-status-info').innerText()).includes('属性「'));
 await p.locator('#btn-ruby-lock').tap();assert(await p.evaluate(()=>!gameState.inventory.find(i=>i.char==='小').locked));await p.locator('#modal-ruby button[aria-label="閉じる"]').tap();await p.reload();await p.waitForFunction(()=>engine&&playerBodies.length===3);assert(await p.evaluate(()=>!gameState.inventory.find(i=>i.char==='小').locked));
 await p.locator('#nav-deck').tap();await p.locator('#auto-lock-panel summary').tap();await p.locator('#auto-lock-rarity').selectOption('2');assert(await p.evaluate(()=>!gameState.inventory.find(i=>i.char==='小').locked));
 // Newly acquired duplicates are protected separately from a manually
 // unlocked copy. A batch plan cannot consume the new locked copy.
 const newId=await p.evaluate(()=>{const item=grantGachaItem(KANJI_DATABASE.find(i=>i.char==='小')).item;saveState();renderCollection();return item.instanceId;});assert(await p.evaluate(id=>gameState.inventory.find(i=>i.instanceId===id).locked&&getBulkSynthesisPlan().operations.every(o=>o.materialId!==id&&!(o.ids||[]).includes(id)),newId));
 await p.locator('#auto-lock-special').uncheck();await p.locator('#auto-lock-rarity').selectOption('0');assert(await p.evaluate(id=>gameState.inventory.find(i=>i.instanceId===id).locked,newId));
 // This legacy acquisition suite tests other policies separately from recipe protection.
 await p.locator('#auto-lock-recipe-materials').uncheck();
 // Get a normal synthesis result that is special, then get a rare one.
 // The transaction hook must protect each result before the UI redraw.
 await p.locator('#auto-lock-special').check();await p.locator('#auto-lock-rarity').selectOption('3');
 for(const target of ['小',legacy.inventory[3].char]){
  const result=await p.evaluate(target=>{
   const a=grantGachaItem(KANJI_DATABASE.find(k=>k.char==='木')).item,b=grantGachaItem(KANJI_DATABASE.find(k=>k.char==='火')).item;
   gameState.synthesisSlot1=a.instanceId;gameState.synthesisSlot2=b.instanceId;const base=KANJI_DATABASE.find(k=>k.char===target),oldPool=SYNTHESIS_POOLS[1],random=Math.random;
   try{SYNTHESIS_POOLS[1]=[base];Math.random=()=>.9;executeSynthesis();confirmSynthesis();}finally{SYNTHESIS_POOLS[1]=oldPool;Math.random=random;}
   const item=gameState.inventory.at(-1);return{char:item.char,locked:item.locked,auto:item.autoLocked,discovered:gameState.specialDiscoveries.includes(target)};
  },target);assert(result.char===target&&result.locked&&result.auto);if(target==='小')assert(result.discovered);await p.locator('#modal-toast button').tap();
 }
 // New ordinary duplicate outputs are protected independently of rarity/special locks.
 await p.locator('#auto-lock-special').uncheck();await p.locator('#auto-lock-rarity').selectOption('0');assert(await p.locator('#auto-lock-synthesis-duplicates').isChecked());
 const duplicate=await p.evaluate(()=>{
  const base=SYNTHESIS_POOLS[1].find(k=>!KanjiTraits.get(k)&&getRealReadings(k.char).length>1&&!['木','火'].includes(k.char));
  const keep=grantGachaItem(base).item;keep.locked=true;keep.unlockedReadings=[keep.ruby];
  const a=grantGachaItem(KANJI_DATABASE.find(k=>k.char==='木')).item,b=grantGachaItem(KANJI_DATABASE.find(k=>k.char==='火')).item;
  gameState.synthesisSlot1=a.instanceId;gameState.synthesisSlot2=b.instanceId;const pool=SYNTHESIS_POOLS[1],rng=Math.random;
  try{SYNTHESIS_POOLS[1]=[base];Math.random=()=>.9;executeSynthesis();confirmSynthesis();}finally{SYNTHESIS_POOLS[1]=pool;Math.random=rng;}
  const made=gameState.inventory.at(-1);return{keep:keep.instanceId,id:made.instanceId,char:made.char,locked:made.locked,marked:made.synthesisDuplicate,readings:made.unlockedReadings.length};
 });assert(duplicate.locked&&duplicate.marked&&duplicate.readings===1);assert((await p.locator('#toast-msg').innerText()).includes('ルビ解放用・自動ロック'));await p.locator('#modal-toast button').tap();
 await p.locator('#auto-lock-synthesis-duplicates').uncheck();assert(await p.evaluate(id=>gameState.inventory.find(i=>i.instanceId===id).locked,duplicate.id));await p.locator('#auto-lock-synthesis-duplicates').check();
 // Unlock the material explicitly, then fuse into the protected original through the collection UI.
 await p.locator(`#collection-grid [data-instance-id="${duplicate.id}"] .item-lock`).tap();assert(await p.evaluate(id=>!gameState.inventory.find(i=>i.instanceId===id).locked,duplicate.id));
 await p.locator(`#collection-grid [data-instance-id="${duplicate.keep}"] .ruby-unlock-action`).tap();await p.locator('#btn-confirm-synthesis').tap();await p.locator('#modal-toast button').tap();assert(await p.evaluate(({keep,id})=>{const i=gameState.inventory.find(i=>i.instanceId===keep);return i.locked&&i.unlockedReadings.length===2&&i.equippedReadings.length===2&&!gameState.inventory.some(i=>i.instanceId===id);},duplicate));
 // Keep an unlocked marked copy in the backup to verify provenance and manual exemption restoration.
 await p.evaluate(({char})=>{const i=grantGachaItem(KANJI_DATABASE.find(k=>k.char===char)).item;i.synthesisDuplicate=true;KanjiCollection.autoLock(i,gameState.autoLockSettings);toggleItemLock(i.instanceId);saveState();},duplicate);
 await p.locator('#nav-gacha').tap();await p.locator('#screen-gacha [data-workshop="synthesis"]').tap();assert(await p.evaluate(()=>[...document.querySelectorAll('#synthesis-selectable-grid [data-instance-id]')].every(b=>!gameState.inventory.find(i=>i.instanceId===b.dataset.instanceId)?.locked||b.disabled)));
 // Discovery remains even with no owned copies, and is included in backups.
 await p.evaluate(()=>{gameState.inventory=gameState.inventory.filter(i=>i.char!=='小');gameState.deck=gameState.deck.filter(id=>gameState.inventory.some(i=>i.instanceId===id));saveState();renderCollection();renderDeckSlots();});await p.locator('#nav-deck').tap();await p.locator('#btn-traits').tap();assert((await p.locator('.trait-card[data-char="小"]').innerText()).includes('現在の所持なし'));await p.locator('[data-catalogue-filter="missing"]').tap();assert.equal(await p.locator('.trait-card').count(),13);await p.locator('#modal-traits button[aria-label="閉じる"]').tap();
 const expected=await p.evaluate(()=>JSON.parse(JSON.stringify({policy:gameState.autoLockSettings,found:gameState.specialDiscoveries,inventory:gameState.inventory})));await p.locator('#nav-rank').tap();await p.locator('#app-help summary').tap();const download=p.waitForEvent('download');await p.getByRole('button',{name:'バックアップ保存',exact:true}).tap();await (await download).saveAs(path.join(dir,'collection-backup.json'));
 await p.evaluate(()=>{gameState.specialDiscoveries=[];gameState.autoLockSettings={special:false,rareMin:0};saveState()});p.on('dialog',d=>d.accept());await p.locator('#save-file').setInputFiles(path.join(dir,'collection-backup.json'));await p.locator('#modal-toast button').tap();await p.reload();await p.waitForFunction(()=>engine&&playerBodies.length);assert.deepStrictEqual(await p.evaluate(()=>JSON.parse(JSON.stringify({policy:gameState.autoLockSettings,found:gameState.specialDiscoveries,inventory:gameState.inventory}))),expected);
 // Exercise all 5 skills through the real game's collision event handlers.
 const skills=await p.evaluate(()=>{
  runner.enabled=false;clearTimeout(cpuTurnTimer);clearTimeout(playerTurnTimer);battleMode='classic';
  function hit(attr,defender='wood',helpers=false,enabled=true){
   Composite.clear(engine.world);pendingAbilityActions=[];pendingAttributeActions=[];pendingTraitActions=[];pendingElementActions=[];isBattleEnded=false;elementTurnIsPlayer=true;fxTexts=[];
   const make=(attr,isPlayer,x,y=0)=>{const b=KanjiTraits.createBody({char:'亜'},arenaCenter.x+x,arenaCenter.y+y,1,{mass:1.5,friction:.05,frictionAir:.025,restitution:.85});b.gameData={char:'亜',attr,isPlayer,isOut:false,level:1,jis:1};Composite.add(engine.world,b);return b;};
   const a=make(attr,true,-30),b=make(defender,false,30);playerBodies=[a];cpuBodies=[b];if(helpers)cpuBodies.push(make('wood',false,60,65));Body.setVelocity(a,{x:8,y:0});KanjiElements.onLaunch(a);
   const original=KanjiElements.queueCollision;try{if(!enabled)KanjiElements.queueCollision=()=>[];for(let i=0;i<3;i++)Engine.update(engine,1000/60);}finally{KanjiElements.queueCollision=original;}
   return{a:a.velocity.x,b:b.velocity.x,labels:fxTexts.map(f=>f.text)};
  }
  const fire=hit('fire'),fireBase=hit('fire','wood',false,false),earth=hit('water','earth'),earthBase=hit('water','earth',false,false),wood=hit('water','metal',true),woodBase=hit('water','metal',true,false),metal=hit('metal'),metalBase=hit('metal','wood',false,false);
  const water=playerBodies[0];water.gameData.attr='water';Body.setPosition(water,{x:arenaCenter.x+arenaRadius*.85,y:arenaCenter.y});Body.setVelocity(water,{x:0,y:0});cpuBodies.forEach(b=>Body.setPosition(b,{x:arenaCenter.x-60,y:arenaCenter.y}));const before=water.position.x;beginAttributeTurn(true);const moved=before-water.position.x;
  resetBattle();clearTimeout(cpuTurnTimer);runner.enabled=false;
  return{fire:fire.b>fireBase.b&&fire.labels.includes('猛進！'),earth:earth.b<earthBase.b&&earth.labels.includes('大地の守り！'),wood:wood.b<woodBase.b&&wood.labels.includes('助け合い！'),metal:metal.a>metalBase.a&&metal.labels.includes('貫通！'),water:moved>0&&fxTexts.some(f=>f.text==='流れ戻り！')};
 });assert(skills.fire&&skills.earth&&skills.wood&&skills.metal); // Water reset clears FX, so verify movement separately.
 assert(await p.evaluate(()=>{runner.enabled=false;const b=playerBodies[0];b.gameData.attr='water';Body.setPosition(b,{x:arenaCenter.x+arenaRadius*.85,y:arenaCenter.y});const before=b.position.x;beginAttributeTurn(true);return before>b.position.x&&fxTexts.some(f=>f.text==='流れ戻り！');}));
 // Both scrollable sheets are usable at small portrait and landscape sizes.
 for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[844,390]]){
  await p.setViewportSize({width,height});await p.locator('#nav-deck').tap();await p.locator('#btn-traits').tap();await p.locator('[data-catalogue-filter="all"]').tap();
  assert(await p.evaluate(width=>document.body.scrollWidth<=width+1&&[...document.querySelectorAll('.trait-card')].every(c=>c.scrollWidth<=c.clientWidth+1),width));
  await p.locator('.trait-card[data-char="独"]').scrollIntoViewIfNeeded();assert(await p.locator('.trait-card[data-char="独"]').isVisible());await p.locator('#modal-traits button[aria-label="閉じる"]').tap();await p.locator('#btn-traits').tap();await p.evaluate(()=>document.querySelector('#modal-traits .editor-panel').scrollTop=0);
  if(process.env.KANJI_QA_OUTPUT)await p.screenshot({path:path.join(dir,`special-catalogue-${width}.png`)});
  await p.locator('#modal-traits button[aria-label="閉じる"]').tap();await p.locator('#auto-lock-panel summary').tap();await p.locator('#auto-lock-rarity').scrollIntoViewIfNeeded();if(process.env.KANJI_QA_OUTPUT)await p.screenshot({path:path.join(dir,`auto-lock-${width}.png`)});await p.locator('#auto-lock-panel summary').tap();
  await p.locator('#nav-battle').tap();await p.locator('#battle-matchup').tap();assert.equal(await p.locator('#element-skill-list .element-detail').count(),5);await p.locator('#modal-matchup button').scrollIntoViewIfNeeded();await p.locator('#modal-matchup button').tap();
  await p.locator('#mode-inspect').tap();const point=await p.evaluate(()=>{const b=playerBodies.find(b=>!b.gameData.isOut),r=canvas.getBoundingClientRect();return{x:r.left+b.position.x*r.width/canvas.width,y:r.top+b.position.y*r.height/canvas.height};});await p.touchscreen.tap(point.x,point.y);assert(await p.locator('#hud-element-skill').isVisible());await p.locator('#mode-shoot').tap();assert(await p.evaluate(()=>document.getElementById('kanji-param-hud').hidden&&!isDragging));
 }
 assert.deepStrictEqual(errors,[]);console.log(JSON.stringify({legacyMigration:true,policyAndExemption:true,acquisitionProtection:true,discoveryAndBackup:true,realElementHandlers:5,viewports:5,errors}));
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
