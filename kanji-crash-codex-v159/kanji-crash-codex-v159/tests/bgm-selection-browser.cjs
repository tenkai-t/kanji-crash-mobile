const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict');
const base=process.argv[2]||'http://127.0.0.1:8787';assert.equal(new URL(base).hostname,'127.0.0.1');
(async()=>{const browser=await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),headless:true,args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),requests=[];page.on('request',r=>{if(r.url().includes('/audio/'))requests.push(new URL(r.url()).pathname)});
 await page.goto(base);await page.waitForFunction(()=>typeof KanjiGameAudio!=='undefined'&&document.getElementById('btn-game-sound-settings'));
 await page.waitForTimeout(800);await page.evaluate(()=>{closeModal('modal-toast');closeModal('modal-tutorial');document.getElementById('btn-login-bonus-close').click()});await page.locator('#btn-game-settings').click();await page.locator('#btn-settings-audio').click();
 const before=await page.evaluate(()=>({fx:KanjiGameAudio.settings,bgm:KanjiGameAudio.bgmSettings}));
 for(const track of ['moon-washi','quiet-garden','ink-ripples']){await page.locator('#game-bgm-track').selectOption(track);await page.waitForFunction(id=>KanjiGameAudio.bgmSettings.track===id&&KanjiGameAudio.status().playingTrack===id&&KanjiGameAudio.activeMusic===1&&!KanjiGameAudio.status().loading,track);assert(requests.includes('/audio/candidates/'+track+'.wav'));}
 const after=await page.evaluate(()=>({fx:KanjiGameAudio.settings,bgm:KanjiGameAudio.bgmSettings}));assert.deepEqual(before.fx,after.fx);assert.equal(before.bgm.enabled,after.bgm.enabled);assert.equal(before.bgm.volume,after.bgm.volume);
 await page.reload();await page.waitForFunction(()=>typeof KanjiGameAudio!=='undefined');assert.equal(await page.evaluate(()=>KanjiGameAudio.bgmSettings.track),'ink-ripples');
 await page.evaluate(()=>KanjiGameAudio.configureBgm({enabled:false}));await page.reload();await page.waitForFunction(()=>typeof KanjiGameAudio!=='undefined');assert.equal(await page.evaluate(()=>KanjiGameAudio.bgmSettings.enabled),false);assert.equal(await page.evaluate(()=>KanjiGameAudio.activeMusic),0);
 await page.evaluate(()=>KanjiGameAudio.configureBgm({track:'../../bad'}));assert.equal(await page.evaluate(()=>KanjiGameAudio.bgmSettings.track),'ink-ripples');
 console.log('PASS three BGM tracks decode and play, choice survives reload, mute/volumes preserved, invalid selection rejected (Chromium).');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
