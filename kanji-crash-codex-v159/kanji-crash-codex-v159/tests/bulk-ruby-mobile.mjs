import assert from 'node:assert/strict';
import {fixture} from './friend-server.mjs';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),{webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),f=fixture(),url=await f.start(),browser=await webkit.launch({headless:true}),errors=[],output=process.env.KANJI_QA_OUTPUT;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>soloBattlePending);
 const before=await page.evaluate(()=>{
  const make=(id,char,extra={})=>{const words=getRealReadings(char);return KanjiInventory.normalize({...KANJI_DATABASE.find(i=>i.char===char),instanceId:id,level:1,exp:0,ruby:words[0]||'',locked:false,autoLockProcessed:true,unlockedReadings:words.slice(0,1),...extra},getRealReadings);};
  const inventory=[make('inst_bulk_hero','重',{level:50,locked:true}),make('inst_bulk_protected','重',{locked:true}),make('inst_bulk_other-deck','重'),make('inst_bulk_b-hero','生',{level:100}),...Array.from({length:getRealReadings('重').length+3},(_,n)=>make('inst_bulk_a'+n,'重')),...Array.from({length:getRealReadings('生').length+2},(_,n)=>make('inst_bulk_b'+n,'生')),make('inst_bulk_secret','𠂉'),make('inst_bulk_secret2','𠂉'),make('inst_bulk_complete','山',{unlockedReadings:getRealReadings('山')}),make('inst_bulk_complete2','山',{unlockedReadings:getRealReadings('山')})];
  gameState.inventory=inventory;gameState.deck=['inst_bulk_hero','inst_bulk_other-deck','inst_bulk_secret'];gameState.coins=8765;gameState.rating=1678;KanjiCodex.initialize(gameState,KANJI_DATABASE);saveState();renderCollection();renderDeckSlots();
  const plan=KanjiInventory.rubyUnlockPlan(gameState,getRealReadings);return {state:JSON.parse(JSON.stringify(gameState)),count:plan.unlockedCount,consumed:plan.operations.length};
 });
 const layouts=[];for(const [width,height]of [[320,568],[375,667],[390,844],[430,932],[844,390]]){
  await page.setViewportSize({width,height});await page.locator('#nav-deck').tap();await page.locator('#btn-bulk-ruby-unlock').scrollIntoViewIfNeeded();assert(await page.locator('#btn-bulk-ruby-unlock').isEnabled());assert((await page.locator('#bulk-ruby-summary').innerText()).includes(`ルビ${before.count}個`));assert(await page.evaluate(()=>document.body.scrollWidth<=innerWidth+1&&document.getElementById('btn-bulk-ruby-unlock').getBoundingClientRect().height>=44));
  if(output&&width===390)await page.screenshot({path:path.join(output,'v33-bulk-ruby.png')});
  await page.locator('[data-deck-detail="inst_bulk_hero"]').tap();const detail=await page.locator('#ruby-status-info').innerText();for(const label of ['吹飛威力:','重量・耐久:','機動力:','属性相性アドバイス'])assert(detail.includes(label));assert(!/[⚡⚖💨⚔]/u.test(detail));await page.locator('#modal-ruby button[aria-label="閉じる"]').tap();layouts.push(width);
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#btn-bulk-ruby-unlock').tap();assert(await page.locator('#modal-synthesis-confirm').isHidden());assert((await page.locator('#toast-msg').innerText()).includes(`ルビ${before.count}個をまとめて解放`));await page.locator('#modal-toast button').tap();
 const after=await page.evaluate(()=>JSON.parse(JSON.stringify(gameState)));assert.equal(before.state.inventory.length-after.inventory.length,before.consumed);assert.equal(after.coins,before.state.coins);assert.equal(after.rating,before.state.rating);assert.deepEqual(after.deck,before.state.deck);assert.deepEqual(after.characterDiscoveries,before.state.characterDiscoveries);
 for(const id of ['inst_bulk_hero','inst_bulk_protected','inst_bulk_other-deck','inst_bulk_b-hero','inst_bulk_secret','inst_bulk_secret2','inst_bulk_complete','inst_bulk_complete2'])assert(after.inventory.some(i=>i.instanceId===id));
 assert(await page.evaluate(()=>['inst_bulk_hero','inst_bulk_b-hero'].every(id=>{const i=gameState.inventory.find(i=>i.instanceId===id);return getUnlockedReadings(i).length===getRealReadings(i.char).length&&getEquippedReadings(i).length===getRealReadings(i.char).length;})));
 assert(await page.evaluate(()=>gameState.inventory.find(i=>i.instanceId==='inst_bulk_b-hero').level===100&&gameState.inventory.find(i=>i.instanceId==='inst_bulk_b-hero').exp===0));
 await page.reload();await page.waitForFunction(()=>soloBattlePending);const restored=await page.evaluate(()=>JSON.parse(JSON.stringify(gameState)));assert.deepEqual(restored.inventory,after.inventory);assert.deepEqual(restored.deck,after.deck);assert.equal(restored.coins,after.coins);assert.equal(restored.rating,after.rating);
 // With only protected/complete/secret copies, no XP-only fusion is offered.
 await page.evaluate(()=>{gameState.inventory=gameState.inventory.filter(i=>['inst_bulk_hero','inst_bulk_protected','inst_bulk_other-deck','inst_bulk_b-hero','inst_bulk_secret','inst_bulk_secret2','inst_bulk_complete','inst_bulk_complete2'].includes(i.instanceId));gameState.inventory.find(i=>i.instanceId==='inst_bulk_protected').locked=true;saveState();renderCollection();});await page.locator('#nav-deck').tap();assert(await page.locator('#btn-bulk-ruby-unlock').isDisabled());assert.deepEqual(errors,[]);
 console.log(JSON.stringify({viewports:layouts,actualSingleTap:true,noConfirmationStep:true,protectedAndGrownRetained:true,autoEquipped:true,surplusRetained:true,reloadPersisted:true,balancesAndDiscoveriesPreserved:true,labelsWithoutEmoji:true,errors}));
}finally{await browser.close();await f.stop();}
