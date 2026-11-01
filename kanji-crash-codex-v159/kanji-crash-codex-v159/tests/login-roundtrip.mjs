import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fixture} from './friend-server.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const f=fixture({identityForRequest:()=>null}),base=await f.start(),browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const c=await browser.newContext({viewport:{width:390,height:844}}),p=await c.newPage();await p.goto(base+'?qa=roundtrip');await p.waitForFunction(()=>typeof backupGuestNow==='function');await p.evaluate(()=>closeModal('modal-toast'));await p.locator('#modal-login-bonus').waitFor({state:'visible'});await p.locator('#btn-login-bonus-close').click();await p.evaluate(()=>backupGuestNow({manual:true}));
 const id=await p.evaluate(()=>guestCredentials.guestId);
 // Recreate and explicitly repair a prior missing receipt, with newer device progress.
 await p.evaluate(async()=>{await guestRequest('/api/login-bonus','POST',{revision:guestCredentials.revision});gameState.coins-=50;gameState.rating+=200;saveState();await backupGuestNow({manual:true});switchTab('rank');document.getElementById('guest-player-panel').open=true;await inspectGuestSave();});p.once('dialog',d=>d.accept());await p.evaluate(()=>repairGuestLoginSave());assert.equal(await p.evaluate(()=>gameState.loginBonusOrdinal),1);
 const schedule=[{coins:2000,fragments:0},{coins:0,fragments:10},{coins:3000,fragments:0},{coins:0,fragments:20},{coins:5000,fragments:20},{coins:0,fragments:30},{coins:10000,fragments:50}];
 for(let ordinal=2;ordinal<=8;ordinal++){
  // Only this independent memory DB: make prior receipts belong to earlier days.
  f.sqlite.prepare('UPDATE login_bonus_claims SET day=day-1 WHERE player_id=?').run(id);
  await p.evaluate(()=>switchTab('rank'));await p.locator('#btn-record-login').click();await p.waitForFunction(()=>!document.getElementById('btn-login-bonus-claim').disabled);
  const before=await p.evaluate(()=>({coins:gameState.coins,fragments:gameState.characterFragments||0,rating:gameState.rating}));let posts=0;
  await p.route('**/api/login-bonus',async r=>{if(r.request().method()!=='POST'){if(await p.evaluate(()=>!!window.qaBlockRead))return r.fulfill({status:503,json:{error:'synthetic outage'}});return r.continue();}posts++;if(ordinal===6&&posts===1)return r.fulfill({status:503,json:{error:'synthetic pre-commit failure'}});const response=await r.fetch();
   // Model asynchronous profile/progress writes while the award response is pending.
   await p.evaluate(n=>{gameState.playerProfile.name='並行更新'+n;gameState.coins-=3;saveState();},ordinal);
   if(ordinal===5){await p.evaluate(()=>window.qaBlockRead=true);return r.abort('failed');}
   if(ordinal===4){await p.evaluate(()=>window.qaLost=true);return r.abort('failed');}
   return r.fulfill({response});
  });
  if(ordinal===8){await p.evaluate(()=>{window.qaStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('kanji_login_bonus_pending_v1:'))throw new DOMException('synthetic quota','QuotaExceededError');return window.qaStorageSet.call(this,key,value);};});await p.locator('#btn-login-bonus-claim').click();await p.waitForFunction(()=>document.getElementById('modal-login-bonus').getAttribute('aria-busy')!=='true');assert.equal(posts,0);assert.match(await p.locator('#login-bonus-status').textContent(),/受取を開始していません/);await p.evaluate(()=>Storage.prototype.setItem=window.qaStorageSet);}
  if(ordinal===6){await p.locator('#btn-login-bonus-claim').click();await p.waitForFunction(()=>document.getElementById('modal-login-bonus').getAttribute('aria-busy')!=='true');assert.equal(await p.evaluate(()=>gameState.loginBonusOrdinal),5);await p.evaluate(async()=>{gameState.coins-=1;saveState();await backupGuestNow({manual:true});});before.coins-=1;await p.locator('#btn-login-bonus-refresh').click();await p.waitForFunction(()=>!document.getElementById('btn-login-bonus-claim').disabled);assert.equal(await p.evaluate(()=>localStorage.getItem('kanji_login_bonus_pending_v1:'+guestCredentials.guestId)),null);}
  await p.locator('#btn-login-bonus-claim').click();
  if(ordinal===5){await p.waitForFunction(()=>document.getElementById('modal-login-bonus').getAttribute('aria-busy')!=='true');assert.equal(await p.evaluate(()=>gameState.loginBonusOrdinal),4);assert(await p.evaluate(()=>!!localStorage.getItem('kanji_login_bonus_pending_v1:'+guestCredentials.guestId)));await p.unroute('**/api/login-bonus');await p.reload();await p.waitForFunction(()=>typeof closeModal==='function');await p.evaluate(()=>{closeModal('modal-toast');switchTab('rank')});await p.locator('#btn-record-login').click();}
  await p.waitForFunction(n=>gameState.loginBonusOrdinal===n,ordinal);await p.waitForFunction(()=>!guestRestoring&&!guestBackupBusy);assert.equal(posts,ordinal===6?2:1);
  const reward=schedule[(ordinal-1)%7];assert.equal(await p.evaluate(()=>gameState.coins),before.coins-3+reward.coins);assert.equal(await p.evaluate(()=>gameState.characterFragments||0),before.fragments+reward.fragments);if(ordinal!==5)assert.equal(await p.evaluate(()=>gameState.playerProfile.name),'並行更新'+ordinal);assert.equal(await p.evaluate(()=>gameState.rating),before.rating);
  await p.locator('#btn-login-bonus-close').click();await p.evaluate(()=>backupGuestNow({manual:true}));await p.waitForFunction(()=>!guestBackupBusy&&!guestBackupDirty&&guestBackupStatus==='saved');assert.equal(await p.evaluate(()=>guestBackupConflict),false);
  const server=await p.evaluate(async()=>(await guestRequest('/api/guest/state')).state);assert.equal(server.loginBonusOrdinal,ordinal);assert.equal(server.coins,before.coins-3+reward.coins);assert.equal(f.sqlite.prepare('SELECT COUNT(*) n FROM login_bonus_claims WHERE player_id=?').get(id).n,ordinal);
  await p.unroute('**/api/login-bonus');await p.reload();await p.waitForFunction(()=>typeof closeModal==='function');await p.evaluate(()=>closeModal('modal-toast'));await p.waitForTimeout(850);assert.equal(await p.evaluate(()=>gameState.loginBonusOrdinal),ordinal);assert.equal(await p.evaluate(()=>gameState.coins),server.coins);assert.equal(await p.evaluate(()=>guestCredentials.guestId),id);assert.equal(await p.evaluate(()=>localStorage.getItem('kanji_login_bonus_pending_v1:'+guestCredentials.guestId)),null);
  console.log('PASS receipt '+ordinal+': repaired device -> claim with concurrent update -> exact reward -> save -> reload');
 }
 await c.close();
}finally{await browser.close();await f.stop();}
