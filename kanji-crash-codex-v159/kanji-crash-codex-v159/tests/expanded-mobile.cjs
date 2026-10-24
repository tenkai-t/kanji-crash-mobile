const {webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'../dist');
const server=http.createServer((req,res)=>{const file=path.join(root,decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.webmanifest':'application/manifest+json','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await webkit.launch({headless:true});try{
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await require('./start-gameplay.cjs')(p);await p.goto(`http://127.0.0.1:${server.address().port}`);await p.waitForFunction(()=>engine&&playerBodies.length===3);
const examples=await p.evaluate(()=>{
 const ids=['counter','dodge','chase','magnet','glide','brake','return','backwater','resonance','charge'];
 const items=ids.map((id,index)=>{for(const base of KANJI_DATABASE)for(const ruby of getRealReadings(base.char))if(KanjiReadAbilities.abilities[id].readings.includes(KanjiReadAbilities.normalize(ruby))&&KanjiReadAbilities.resolve({...base,ruby}).id===id)return{...base,instanceId:`inst_new_${index}`,ruby,unlockedReadings:[ruby],equippedReadings:[ruby],level:1,exp:0};throw Error(id);});
 gameState.inventory=items;gameState.deck=items.slice(0,3).map(i=>i.instanceId);saveState();return items.map(i=>({char:i.char,ruby:i.ruby,id:getReadingAbility(i).id}));
});await p.reload();assert(await p.evaluate(()=>gameState.inventory.length===10&&new Set(gameState.inventory.map(i=>getReadingAbility(i).id)).size===10));
await p.locator('#nav-deck').tap();
for(let i=0;i<10;i++){
 await p.evaluate(i=>openRubyModal(gameState.inventory[i]),i);const preview=await p.locator('#ruby-ability-preview').innerText();assert(preview.includes(await p.evaluate(i=>getReadingAbility(gameState.inventory[i]).name,i)));assert(preview.length>20);await p.locator('#modal-ruby button[aria-label="閉じる"]').tap();
}
await p.locator('#btn-deck-start').tap();
const live=await p.evaluate(()=>{
 clearTimeout(cpuTurnTimer);clearTimeout(playerTurnTimer);runner.enabled=false;isBattleEnded=false;isPlayerTurn=true;setBattleInputMode('shoot');
 Composite.clear(engine.world,false);pendingAbilityActions=[];pendingAttributeActions=[];pendingTraitActions=[];pendingElementActions=[];fxTexts=[];
 const make=(ids,x,y,isPlayer)=>{const b=KanjiTraits.createBody({char:'亜'},arenaCenter.x+x,arenaCenter.y+y,1,KanjiRules.getPhysics(KanjiRules.getStats({char:'亜',power:1,weight:1,jis:1,level:1})));b.gameData={char:'亜',attr:'metal',jis:1,power:1,weight:1,level:1,instanceId:`test_${b.id}`,isPlayer,isOut:false,readingAbilities:ids.map(id=>KanjiReadAbilities.abilities[id]),equippedReadings:[],rubyState:{charge:0}};Composite.add(engine.world,b);return b;};
 const a=make(['glide','brake','magnet'],0,0,true),waiting=make(['charge','resonance'],0,100,true),edge=make(['backwater','return'],arenaRadius*.78,-65,true),target=make([],75,0,false),far=make([],0,-arenaRadius*.7,false);
 playerBodies=[a,waiting,edge];cpuBodies=[target,far];battleRewards=KanjiRewards.create(playerBodies.map(b=>b.gameData.instanceId),cpuBodies.map(b=>b.id));
 beginAttributeTurn(true);Engine.update(engine,1000/60);
 const stats=getKanjiStats(edge.gameData),massMatches=Math.abs(edge.mass-KanjiRules.getPhysics(stats).mass)<1e-8;
 const launched=launchPlayerShot(a,{x:1,y:0},22);clearTimeout(cpuTurnTimer);
 const charged=waiting.gameData.rubyState.charge===1;
 Engine.update(engine,1000/60);const sliding=a.frictionAir===.025*.45,pulled=target.velocity.x<0;
 for(let n=0;n<56;n++)Engine.update(engine,1000/60);
 const braked=a.gameData.rubyState.braked&&fxTexts.some(f=>f.text==='急停止！');
 // The real fall handler must rescue a self-launch once, and preserve the
 // ruby's identity independently of the renamed earth passive.
 beginAttributeTurn(true);KanjiBattleSkills.onLaunch(edge,engine.timing.timestamp);Body.setPosition(edge,{x:arenaCenter.x+arenaRadius+edge.circleRadius+25,y:arenaCenter.y});
 const random=Math.random;Math.random=()=>0;try{checkArenaFalls();}finally{Math.random=random;}
 const returned=!edge.gameData.isOut&&edge.gameData.rubyState.returnUsed&&fxTexts.some(f=>f.text==='帰還！');
 // Inspect is a separate input mode; opening the parameter HUD cannot fire.
 isPlayerTurn=true;setBattleInputMode('inspect');edge.gameData.attr='earth';edge.gameData.char='留';edge.gameData.ruby='とどまる';edge.gameData.unlockedReadings=['とどまる'];edge.gameData.equippedReadings=['とどまる'];edge.gameData.readingAbilities=[KanjiReadAbilities.abilities.sturdy];showBattleStats(edge);
 const separate=document.getElementById('hud-reading-ability').textContent.includes('復活')&&document.getElementById('hud-element-skill').textContent.includes('大地の守り');
 const snapshot=getCpuSnapshot(),copy=snapshot.pieces.find(b=>b.key===waiting.id);copy.rubyState.charge=3;const detached=waiting.gameData.rubyState.charge===1;
 return{launched,charged,massMatches,sliding,pulled,braked,returned,separate,detached,shootHudHidden:launchPlayerShot(edge,{x:1,y:0},80)===false};
});assert(Object.values(live).every(Boolean),JSON.stringify(live));
const sizes=[];
for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
 await p.setViewportSize(size);await p.evaluate(()=>{openMatchupTable();document.querySelector("#modal-matchup details").open=false;});await p.locator('#modal-matchup summary').tap();const guide=await p.locator('#ruby-skill-list').innerText();assert(guide.includes('反撃')&&guide.includes('蓄勢')&&guide.includes('共鳴'));
 const layout=await p.evaluate(()=>({overflow:document.body.scrollWidth>innerWidth+1,scrollable:document.querySelector('#modal-matchup>div').scrollHeight>=document.querySelector('#modal-matchup>div').clientHeight}));assert(!layout.overflow&&layout.scrollable);sizes.push({...size,...layout});
 if(process.env.KANJI_QA_OUTPUT&&size.width===390)await p.screenshot({path:path.join(process.env.KANJI_QA_OUTPUT,'ruby-abilities-guide.png')});await p.locator('#modal-matchup button').tap();
}
const collisions=await p.evaluate(()=>{
 Composite.clear(engine.world,false);pendingAbilityActions=[];pendingAttributeActions=[];pendingTraitActions=[];pendingElementActions=[];fxTexts=[];runner.enabled=false;isBattleEnded=false;
 const make=(ids,isPlayer,x)=>{const b=KanjiTraits.createBody({char:'亜'},arenaCenter.x+x,arenaCenter.y,1,KanjiRules.getPhysics(KanjiRules.getStats({char:'亜',power:1,weight:1,jis:1,level:1})));b.gameData={char:'亜',attr:'metal',isPlayer,isOut:false,readingAbilities:ids.map(id=>KanjiReadAbilities.abilities[id]),equippedReadings:[]};Composite.add(engine.world,b);return b;};
 const a=make(['chase'],true,-30),b=make(['counter','dodge'],false,30);playerBodies=[a];cpuBodies=[b];battleRewards=KanjiRewards.create([], [b.id]);Body.setVelocity(a,{x:8,y:0});
 const random=Math.random;Math.random=()=>0;try{for(let n=0;n<14;n++)Engine.update(engine,1000/60);}finally{Math.random=random;}
 return ['追撃！','反撃！','見切り！'].every(label=>fxTexts.some(f=>f.text===label));
});assert(collisions,'new collision effects must run through the real engine callbacks');
assert.deepStrictEqual(errors,[]);console.log(JSON.stringify({examples,live,sizes,collisions,errors}));
}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
