const assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const base=process.argv[2]||'http://127.0.0.1:8817';assert.equal(new URL(base).hostname,'127.0.0.1');
(async()=>{const b=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const lost of [false,true]){
 const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true}),p=await c.newPage();await p.goto(base+'?qa=reconcile');await p.waitForFunction(()=>typeof backupGuestNow==='function');await p.evaluate(()=>closeModal('modal-toast'));await p.locator('#modal-login-bonus').waitFor({state:'visible'});await p.locator('#btn-login-bonus-close').click();await p.evaluate(()=>backupGuestNow({manual:true}));
 const id=await p.evaluate(()=>guestCredentials.guestId);
 await p.evaluate(async()=>{await guestRequest('/api/login-bonus','POST',{revision:guestCredentials.revision});gameState.coins-=71;gameState.rating+=300;gameState.characterFragments+=4;gameState.inventory.push({...gameState.inventory[0],instanceId:'inst_synthetic_new',level:9});saveState();await backupGuestNow({manual:true});});
 assert(await p.evaluate(()=>guestBackupConflict));const local=await p.evaluate(()=>JSON.parse(JSON.stringify(gameState)));assert.equal(local.loginBonusOrdinal,undefined);
 await p.evaluate(()=>{switchTab('rank');document.getElementById('guest-player-panel').open=true;});await p.locator('#btn-guest-diagnose').click();await p.locator('#btn-guest-repair-login').waitFor({state:'visible'});let posts=0;
 await p.route('**/api/guest/reconcile-login',async r=>{posts++;if(lost){await r.fetch();return r.abort('failed');}return r.continue();});
 p.once('dialog',d=>d.dismiss());await p.evaluate(()=>repairGuestLoginSave());assert.equal(posts,0);assert.deepEqual(await p.evaluate(()=>JSON.parse(JSON.stringify(gameState))),local);assert(await p.evaluate(()=>guestBackupConflict));
 p.once('dialog',d=>{assert.match(d.message(),/受取済み報酬は追加しません/);return d.accept()});await p.evaluate(()=>repairGuestLoginSave());assert.equal(posts,1);const expected={...local,loginBonusOrdinal:1};assert.deepEqual(await p.evaluate(()=>JSON.parse(JSON.stringify(gameState))),expected);assert.equal(await p.evaluate(()=>guestCredentials.guestId),id);assert.equal(await p.evaluate(()=>guestBackupConflict),false);assert.equal(await p.evaluate(()=>guestBackupStatus),'saved');
 assert.deepEqual(await p.evaluate(async()=> (await guestRequest('/api/guest/state')).state),expected);
 assert(await p.evaluate(async()=>{const history=await guestRequest('/api/guest/backups');return history.backups.some(x=>x.coins===3000&&x.owned===3&&x.rating===1200)}));
 await p.locator('#btn-record-login').click();await p.waitForFunction(()=>document.getElementById('btn-login-bonus-claim').textContent==='本日は受取済み');assert.equal(await p.evaluate(()=>gameState.coins),local.coins);await p.locator('#btn-login-bonus-close').click();await p.evaluate(()=>backupGuestNow({manual:true}));assert.equal(await p.evaluate(()=>guestBackupStatus),'saved');
 const unauth=await p.request.post(base+'/api/guest/reconcile-login',{data:{state:local,revision:0,ordinal:1,confirmPreserveDevice:true}});assert.equal(unauth.status(),401);
 console.log('PASS '+(lost?'lost response':'normal')+': cancellation, exact device data, identity, receipt preserved/no regrant, old server backup, resumed save, unauthorized rejection');await c.close();
 }
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
