const assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.argv[2]||'http://127.0.0.1:8813';assert.equal(new URL(base).hostname,'127.0.0.1');
(async()=>{const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||'/usr/bin/chromium',args:['--no-sandbox']});try{
 for(const standalone of [false,true]){
 const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),p=await c.newPage();await p.addInitScript(standalone=>Object.defineProperty(navigator,'standalone',{value:standalone}),standalone);
 // Synthetic insets exercise layout arithmetic, not Safari's actual system chrome.
 await p.route('**/*',async r=>{const path=new URL(r.request().url()).pathname;if(path!=='/'&&path!=='/usability.css')return r.continue();const res=await r.fetch();const body=(await res.text()).replace(/env\(safe-area-inset-(top|bottom|left|right)(?:,\s*0px)?\)/g,(_,side)=>`var(--test-inset-${side},0px)`);await r.fulfill({response:res,body});});
 await p.goto(base+'?qa=standalone');await p.waitForFunction(()=>document.getElementById('btn-game-settings'));await p.evaluate(()=>{closeModal('modal-toast');document.getElementById('btn-login-bonus-close')?.click();switchTab('play')});const initial=await p.evaluate(()=>JSON.stringify({coins:gameState.coins,rating:gameState.rating,inventory:gameState.inventory,deck:gameState.deck}));
 for(const [width,height,top,bottom]of [[390,844,47,34],[844,390,0,21],[768,1024,24,20],[1024,768,0,20]]){
 await p.setViewportSize({width,height});await p.evaluate(({top,bottom})=>{document.documentElement.style.setProperty('--test-inset-top',top+'px');document.documentElement.style.setProperty('--test-inset-bottom',bottom+'px');}, {top,bottom});
 const m=await p.evaluate(()=>{const rect=n=>n.getBoundingClientRect().toJSON(),nav=document.querySelector('body>nav');return{standalone:document.documentElement.classList.contains('standalone-layout'),head:rect(document.getElementById('app-header')),nav:rect(nav),padding:parseFloat(getComputedStyle(nav).paddingBottom),buttons:[...nav.children].map(n=>({rect:rect(n),text:rect(n.querySelector('span:last-child'))})),bodyWidth:document.body.clientWidth,scroll:document.body.scrollWidth};});
 assert.equal(m.standalone,standalone);assert(Math.abs(m.head.top-(top+(standalone?32:0)))<1);assert(Math.abs(m.nav.bottom-height)<1);assert.equal(m.buttons.length,5);assert(m.scroll<=m.bodyWidth+1);
 {assert.equal(m.padding,0);assert(Math.abs(m.nav.height-(height<500?50:56))<1);for(const b of m.buttons){assert(b.rect.height>=48);assert(Math.abs(b.rect.bottom-m.nav.bottom)<=1.1);assert(b.text.bottom<=height-1,'text stays inside menu');}}
 for(const tab of ['deck','gacha','rank','play']){await p.evaluate(tab=>switchTab(tab),tab);assert(await p.locator('#app-header').isVisible());}
 console.log(JSON.stringify({standalone,width,height,headerTop:m.head.top,menuHeight:m.nav.height,noSeparateBottomBand:true}));
 }
 assert.equal(await p.evaluate(()=>JSON.stringify({coins:gameState.coins,rating:gameState.rating,inventory:gameState.inventory,deck:gameState.deck})),initial);assert.equal(await p.locator('meta[name="apple-mobile-web-app-status-bar-style"]').getAttribute('content'),'black');await c.close();
 }
 console.log('PASS standalone flag, portrait/landscape, synthetic safe insets, 5 touch targets, no data changes. Not an iPhone Safari device test.');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
