const assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.argv[2]||'http://127.0.0.1:8787';assert.equal(new URL(base).hostname,'127.0.0.1');
(async()=>{const b=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const mode of ['lost','retry','reload','divergent']){
 const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true}),p=await c.newPage();let posts=0,failed=false;
 await p.goto(base+'?qa=recovery');await p.waitForFunction(()=>typeof closeModal==='function');await p.evaluate(()=>closeModal('modal-toast'));await p.locator('#modal-login-bonus').waitFor({state:'visible'});await p.waitForFunction(()=>!document.getElementById('btn-login-bonus-claim').disabled);
 const before=await p.evaluate(()=>({coins:gameState.coins,inv:JSON.stringify(gameState.inventory),id:guestCredentials.guestId}));
 await p.route('**/api/login-bonus',async r=>{if(r.request().method()==='POST'){posts++;if(mode==='retry'&&!failed){failed=true;return r.fulfill({status:503,json:{error:'temporary outage'}});}if(!failed){failed=true;await r.fetch();if(mode==='reload'||mode==='divergent'){await p.evaluate(()=>{window.qaBlockRead=true});}return r.abort('failed');}}if(await p.evaluate(()=>!!window.qaBlockRead))return r.fulfill({status:503,json:{error:'temporary outage'}});return r.continue();});
 await p.locator('#btn-login-bonus-claim').tap();
 if(mode==='retry'){await p.waitForFunction(()=>!document.getElementById('btn-login-bonus-claim').disabled);assert.equal(await p.evaluate(()=>guestBackupConflict),false);assert.equal(await p.evaluate(()=>gameState.coins),before.coins);await p.locator('#btn-login-bonus-claim').tap();}
 if(mode==='reload'||mode==='divergent'){
 await p.waitForFunction(()=>document.getElementById('modal-login-bonus').getAttribute('aria-busy')!=='true');
 if(mode==='divergent'){await p.evaluate(()=>{gameState.coins+=17;window.qaBlockRead=false});await p.locator('#btn-login-bonus-refresh').tap();await p.waitForFunction(()=>document.getElementById('login-bonus-status').dataset.error==='true');assert.equal(await p.evaluate(()=>gameState.coins),before.coins+17);assert(await p.locator('#btn-login-bonus-claim').isDisabled());assert.equal(posts,1);await c.close();console.log('PASS divergent progress is protected');continue;}
 await p.unroute('**/api/login-bonus');await p.reload();await p.waitForFunction(()=>typeof closeModal==='function');await p.evaluate(()=>{closeModal('modal-toast');switchTab('rank')});await p.locator('#btn-record-login').click();
 }
 await p.waitForFunction(()=>gameState.loginBonusOrdinal===1);assert.equal(await p.evaluate(()=>gameState.coins),before.coins+2000);assert.equal(await p.evaluate(()=>JSON.stringify(gameState.inventory)),before.inv);assert.equal(await p.evaluate(()=>guestCredentials.guestId),before.id);assert.equal(await p.evaluate(()=>guestBackupConflict),false);assert.equal(posts,mode==='retry'?2:1);
 await p.locator('#btn-login-bonus-close').click();
 for(const [w,h]of [[320,568],[390,844],[844,390],[768,1024],[1024,768]]){
 await p.setViewportSize({width:w,height:h});await p.evaluate(()=>switchTab('play'));const style=await p.locator('#app-header').evaluate(n=>{const s=getComputedStyle(n);return{filter:s.filter,backdrop:s.backdropFilter,transform:s.transform}});assert.deepEqual(style,{filter:'none',backdrop:'none',transform:'none'});
 await p.locator('#btn-start-cpu').click();const details=p.locator('#auto-prepare-options');assert.equal(await details.evaluate(n=>n.tagName),'DETAILS');assert.equal(await details.evaluate(n=>n.open),false);assert.match(await p.locator('#auto-prepare-title').textContent(),/OFF/);await p.locator('#auto-prepare-title').click();await p.locator('#auto-prepare-enabled').check();assert.match(await p.locator('#auto-prepare-title').textContent(),/ON/);await p.locator('#auto-prepare-enabled').uncheck();await p.locator('#auto-prepare-title').click();assert(await p.locator('#btn-battle-start').isVisible());await p.evaluate(()=>switchTab('play'));
 }
 await p.evaluate(()=>{for(const n of document.querySelectorAll('#app-header span,#app-header h1'))n.style.fontSize=(parseFloat(getComputedStyle(n).fontSize)*1.6)+'px';document.getElementById('header-rating').textContent='123,456 段位ポイント';});await p.setViewportSize({width:390,height:844});assert(await p.locator('#app-header').evaluate(n=>n.scrollWidth<=n.clientWidth+1));assert(await p.locator('#header-rating').evaluate(n=>{const r=n.getBoundingClientRect(),h=document.getElementById('app-header').getBoundingClientRect();return r.bottom<=h.bottom&&r.right<=h.right}));
 console.log('PASS '+mode+': exact-once reward, identity/inventory preserved, header composition and folded auto options');await c.close();
 }
 }finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
