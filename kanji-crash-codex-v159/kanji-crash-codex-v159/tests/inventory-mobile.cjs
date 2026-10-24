const {webkit}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('http'),fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert');
const root=path.join(__dirname,'../dist'),dir=process.env.KANJI_QA_OUTPUT || os.tmpdir();
const server=http.createServer((req,res)=>{const pathname=req.url.split('?')[0],file=path.join(root,pathname==='/'?'index.html':decodeURIComponent(pathname));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);res.end();return}const ext=path.extname(file);res.setHeader('Content-Type',{'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json'}[ext]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await webkit.launch({headless:true});try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await require('./start-gameplay.cjs')(p);await p.goto(`http://127.0.0.1:${server.address().port}`);await p.waitForFunction(()=>engine&&playerBodies.length===3);
 await p.evaluate(()=>{
  gameState.inventory=['重','守','撃'].map((char,i)=>({...KANJI_DATABASE.find(k=>k.char===char),instanceId:`inst_legacy_${i}`,level:i===0?4:1,exp:i===0?19:0,ruby:{重:'ジュウ',守:'シュ',撃:'ゲキ'}[char]}));
  gameState.deck=gameState.inventory.map(i=>i.instanceId);gameState.collectionSort='strength_asc';saveState();
 });await p.reload();
 assert(await p.evaluate(()=>gameState.inventory[0].ruby==='ジュウ'&&gameState.inventory[0].level===4&&gameState.inventory[0].exp===19&&JSON.stringify(gameState.inventory[0].unlockedReadings)==='["ジュウ"]'&&gameState.inventory.every(i=>i.locked===false)));
 assert(await p.evaluate(()=>gameState.collectionSort==='power_desc'&&document.getElementById('collection-sort').value==='power_desc'));
 await p.locator('#nav-deck').tap();await p.getByRole('button',{name:'重の詳細',exact:true}).tap();assert(await p.locator('.reading-option[data-reading="おもい"]').isDisabled());
 await p.evaluate(()=>{document.getElementById('ruby-input').value='おもい';equipReading('inst_legacy_0')});assert((await p.locator('#toast-msg').innerText()).includes('解放済み'));assert(await p.evaluate(()=>gameState.inventory[0].ruby==='ジュウ'));await p.locator('#modal-toast button').tap();
 await p.locator('#btn-ruby-lock').tap();assert(await p.locator('#btn-ruby-lock').getAttribute('aria-pressed')==='true');
 const duplicate=await p.evaluate(()=>{const hero=gameState.inventory[0],exp=hero.exp,count=gameState.inventory.length,result=grantGachaItem(KANJI_DATABASE.find(k=>k.char==='重'));saveState();openRubyModal(hero);return {id:result.item.instanceId,preserved:hero.exp===exp&&hero.ruby==='ジュウ'&&gameState.inventory.length===count+1&&result.duplicate&&result.item.unlockedReadings.length===1};});assert(duplicate.preserved);
 await p.locator('#btn-fuse-duplicate').tap();assert((await p.locator('#synthesis-review-list').innerText()).includes('残す：重'));await p.getByRole('button',{name:'キャンセル',exact:true}).tap();assert(await p.evaluate(()=>gameState.inventory.length===4));
 await p.locator('#btn-fuse-duplicate').tap();await p.locator('#btn-confirm-synthesis').tap();await p.locator('#modal-toast button').tap();
 const fusion=await p.evaluate(duplicateId=>{const i=gameState.inventory.find(i=>i.instanceId==='inst_legacy_0');return {locked:i.locked,ruby:i.ruby,level:i.level,exp:i.exp,readings:i.unlockedReadings,copyGone:!gameState.inventory.some(i=>i.instanceId===duplicateId)};},duplicate.id);
 assert(fusion.locked&&fusion.copyGone&&fusion.ruby==='ジュウ'&&fusion.level===4&&fusion.exp===59&&fusion.readings.length===2);
 const unlocked=fusion.readings.find(r=>r!=='ジュウ');await p.locator('.reading-option[data-reading="ジュウ"]').tap();await p.getByRole('button',{name:'選択した読みを装備する'}).tap();await p.locator('#modal-toast button').tap();await p.locator('#modal-ruby button[aria-label="閉じる"]').tap();
 assert(await p.evaluate(r=>gameState.inventory[0].ruby===r,unlocked));
 const bulkBefore=await p.evaluate(()=>{
  const base=KANJI_DATABASE.find(k=>k.char==='重'),pairs=getRealReadings('重').length-gameState.inventory[0].unlockedReadings.length;for(let i=0;i<pairs+1;i++)grantGachaItem(base);
  const last=gameState.inventory.at(-1);last.locked=true;gameState.inventory[1].locked=true;saveState();renderCollection();renderSynthesisGrid();
  return{pairs,lockedCopy:last.instanceId,protected:gameState.inventory.filter(i=>KanjiInventory.protectedItem(i,gameState.deck)).map(i=>i.instanceId),count:gameState.inventory.length,coins:gameState.coins};
 });
 const heroUnlock=p.locator('#collection-grid [data-instance-id="inst_legacy_0"] .ruby-unlock-action');
 await heroUnlock.tap();await p.getByRole('button',{name:'キャンセル',exact:true}).tap();assert(await p.evaluate(n=>gameState.inventory.length===n,bulkBefore.count));
 for(let i=0;i<bulkBefore.pairs;i++){await heroUnlock.tap();await p.locator('#btn-confirm-synthesis').tap();await p.locator('#modal-toast button').tap();}
 assert(await heroUnlock.isDisabled());
 assert(await p.evaluate(before=>gameState.inventory.length===before.count-before.pairs&&before.protected.every(id=>gameState.inventory.some(i=>i.instanceId===id))&&gameState.coins===before.coins&&gameState.inventory[0].locked&&gameState.inventory[0].ruby!== 'ジュウ'&&gameState.inventory[0].unlockedReadings.length===getRealReadings('重').length,bulkBefore));
 await p.locator('#nav-gacha').tap();await p.locator('#screen-gacha [data-workshop="synthesis"]').tap();assert(await p.locator('#bulk-synthesis-mode').count()===0);
 const sameBulk=await p.evaluate(()=>{gameState.inventory=gameState.inventory.filter(i=>KanjiInventory.protectedItem(i,gameState.deck));const before=gameState.inventory.map(i=>({id:i.instanceId,readings:[...i.unlockedReadings],exp:getTotalExp(i)}));const base=KANJI_DATABASE.find(k=>k.char==='亜');const copies=[grantGachaItem(base).item,grantGachaItem(base).item];saveState();renderSynthesisGrid();return{before,count:gameState.inventory.length,ids:copies.map(i=>i.instanceId)};});
 assert(await p.evaluate(()=>getBulkSynthesisPlan().mode==='synthesis'&&getBulkSynthesisPlan().operations.length===1&&getBulkSynthesisPlan().operations[0].type==='synthesis'));
 await p.locator('#btn-bulk-synthesis').tap();assert((await p.locator('#synthesis-review-title').innerText()).includes('通常錬成'));assert(!(await p.locator('#synthesis-review-list').innerText()).includes('残す'));await p.locator('#btn-confirm-synthesis').tap();await p.locator('#modal-toast button').tap();
 assert(await p.evaluate(before=>gameState.inventory.length===before.count-1&&before.ids.every(id=>!gameState.inventory.some(i=>i.instanceId===id))&&before.before.every(e=>{const i=gameState.inventory.find(i=>i.instanceId===e.id);return i&&JSON.stringify(i.unlockedReadings)===JSON.stringify(e.readings)&&getTotalExp(i)===e.exp;})&&gameState.inventory.at(-1).unlockedReadings.length===1&&getTotalExp(gameState.inventory.at(-1))===0,sameBulk));

 const normalBefore=await p.evaluate(()=>{
  gameState.inventory=gameState.inventory.filter(i=>KanjiInventory.protectedItem(i,gameState.deck));
  for(const char of ['木','火','土','水','金','力'])grantGachaItem(KANJI_DATABASE.find(k=>k.char===char));saveState();renderSynthesisGrid();
  return{count:gameState.inventory.length,protected:gameState.inventory.filter(i=>KanjiInventory.protectedItem(i,gameState.deck)).map(i=>i.instanceId)};
 });await p.locator('#bulk-synthesis-jis').selectOption('1');assert((await p.locator('#bulk-synthesis-summary').innerText()).includes('3回'));
 await p.locator('#btn-bulk-synthesis').tap();await p.evaluate(()=>{gameState.inventory.at(-1).locked=true;saveState()});await p.locator('#btn-confirm-synthesis').tap();assert((await p.locator('#toast-msg').innerText()).includes('変更されました'));assert(await p.evaluate(n=>gameState.inventory.length===n,normalBefore.count));await p.locator('#modal-toast button').tap();
 await p.evaluate(()=>{gameState.inventory.at(-1).locked=false;saveState();renderSynthesisGrid()});await p.locator('#btn-bulk-synthesis').tap();await p.locator('#btn-confirm-synthesis').tap();await p.locator('#modal-toast button').tap();
 assert(await p.evaluate(before=>gameState.inventory.length===before.count-3&&before.protected.every(id=>gameState.inventory.some(i=>i.instanceId===id)),normalBefore));
 // The original two-material flow still works and carries all earned EXP.
 const manual=await p.evaluate(()=>{const a=grantGachaItem(KANJI_DATABASE.find(k=>k.char==='木')).item,b=grantGachaItem(KANJI_DATABASE.find(k=>k.char==='火')).item;a.level=3;a.exp=17;b.level=2;b.exp=8;saveState();renderSynthesisGrid();return{ids:[a.instanceId,b.instanceId],count:gameState.inventory.length};});
 for(const id of manual.ids) await p.locator(`#synthesis-selectable-grid [data-instance-id="${id}"]`).tap();await p.locator('#btn-execute-synth').tap();await p.locator('#btn-confirm-synthesis').tap();await p.locator('#modal-toast button').tap();assert(await p.evaluate(before=>gameState.inventory.length===before.count-1&&getTotalExp(gameState.inventory.at(-1))===425,manual));
 // Backups preserve both locks and unlocked readings, then reload preserves them.
 await p.locator('#nav-deck').tap();
 assert(await p.evaluate(()=>{const options=[...document.getElementById('collection-sort').options];return options.length===11&&!options.some(o=>o.textContent.includes('強さ順')||o.textContent.includes('吹飛威力順'))&&options.some(o=>o.textContent==='威力順（低→高）')&&options.some(o=>o.textContent==='重量順（低→高）')&&options.some(o=>o.value==='unlocked_desc'&&o.textContent.includes('解放数'));}));
 const acquired=await p.evaluate(()=>gameState.inventory.map(i=>i.instanceId));
 for(const order of ['strokes_desc','strokes_asc','power_desc','power_asc','weight_desc','weight_asc','unlocked_desc','jis_desc','level_desc','acquired_asc','acquired_desc']){
  await p.locator('#collection-sort').selectOption(order);
  assert(await p.evaluate(({order,acquired})=>{
   const ids=[...document.querySelectorAll('#collection-grid>[data-instance-id]')].map(c=>c.dataset.instanceId),items=ids.map(id=>gameState.inventory.find(i=>i.instanceId===id));
   if(gameState.collectionSort!==order||JSON.parse(localStorage.getItem('moji_otoshi_save_v5')).collectionSort!==order)return false;
   if(JSON.stringify(gameState.inventory.map(i=>i.instanceId))!==JSON.stringify(acquired))return false;
   if(order.startsWith('acquired'))return JSON.stringify(ids)===JSON.stringify(order==='acquired_asc'?acquired:acquired.slice().reverse());
   const values=items.map(i=>order.startsWith('strokes')?KanjiTurnOrder.count(i):order==='jis_desc'?i.jis:order==='level_desc'?i.level:order==='unlocked_desc'?getUnlockedReadings(i).length:getKanjiStats(i)[order.startsWith('weight')?'weight':'power']);return values.every((n,i)=>!i||(order.endsWith('_asc')?n>=values[i-1]:n<=values[i-1]));
  },{order,acquired}));
 }
 await p.locator('#filter-1').tap();assert(await p.evaluate(()=>{const expected=gameState.inventory.filter(i=>i.jis===1).map(i=>i.instanceId).reverse();return JSON.stringify([...document.querySelectorAll('#collection-grid>[data-instance-id]')].map(c=>c.dataset.instanceId))===JSON.stringify(expected);}));await p.locator('#filter-all').tap();
 await p.locator('#collection-sort').selectOption('unlocked_desc');assert(await p.evaluate(()=>new Set(gameState.inventory.map(i=>getUnlockedReadings(i).length)).size>1));
 const expected=await p.evaluate(()=>KanjiInventory.fingerprint(gameState));await p.locator('#nav-rank').tap();await p.locator('#app-help summary').tap();const download=p.waitForEvent('download');await p.getByRole('button',{name:'バックアップ保存',exact:true}).tap();await (await download).saveAs(path.join(dir,'inventory-backup.json'));
 await p.evaluate(()=>{gameState.inventory[0].locked=false;gameState.inventory[0].unlockedReadings=[gameState.inventory[0].ruby];gameState.inventory[0].equippedReadings=[gameState.inventory[0].ruby];saveState()});p.on('dialog',d=>d.accept());await p.locator('#save-file').setInputFiles(path.join(dir,'inventory-backup.json'));await p.locator('#modal-toast button').tap();assert(await p.evaluate(e=>KanjiInventory.fingerprint(gameState)===e,expected));await p.reload();assert(await p.evaluate(e=>KanjiInventory.fingerprint(gameState)===e&&gameState.collectionSort==='unlocked_desc'&&document.getElementById('collection-sort').value==='unlocked_desc',expected));
 for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[844,390]]){
  await p.setViewportSize({width,height});for(const tab of ['deck','synthesis']){if(tab==='synthesis'){await p.locator('#nav-gacha').tap();await p.locator('#screen-gacha [data-workshop=synthesis]').tap();}else await p.locator('#nav-deck').tap();assert(await p.evaluate(width=>document.body.scrollWidth<=width+1,width));if(process.env.KANJI_QA_OUTPUT&&[320,390,844].includes(width)){await p.evaluate(tab=>document.getElementById(`screen-${tab}`).scrollTop=0,tab);await p.waitForTimeout(150);await p.screenshot({path:path.join(dir,`inventory-${tab}-${width}.png`)});if(tab==='deck'){await p.locator('#collection-grid').scrollIntoViewIfNeeded();await p.screenshot({path:path.join(dir,`inventory-lock-${width}.png`)});}}}
 }
 assert.deepStrictEqual(errors,[]);console.log(JSON.stringify({legacyMigration:true,lockAndSingleFusion:true,collectionUnlockCount:bulkBefore.pairs,bulkNormalCount:3,sameCharacterBulkIsNormal:true,strokeSortAndSave:true,staleRejected:true,backupAndReload:true,viewports:5,errors}));
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
