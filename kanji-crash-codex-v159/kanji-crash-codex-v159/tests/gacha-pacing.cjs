const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(reduced=false){
 let now=0,id=0;const timers=new Map(),nodes=new Map(),listeners={};
 function node(){const classes=new Set();return{hidden:false,disabled:false,dataset:{},children:[],textContent:'',isConnected:true,classList:{add(...xs){xs.forEach(x=>classes.add(x));},remove(...xs){xs.forEach(x=>classes.delete(x));},contains:x=>classes.has(x)},append(...xs){this.children.push(...xs);},replaceChildren(){this.children=[];},setAttribute(){},addEventListener(){},focus(){},get offsetWidth(){return 100;}};}
 const get=key=>{if(!nodes.has(key))nodes.set(key,node());return nodes.get(key);};
 const doc={hidden:false,activeElement:null,getElementById:get,createElement:node,querySelector:q=>get('gacha-result-grid').children[Number(q.match(/data-gacha-index="(\d+)"/)[1])],querySelectorAll:()=>[],addEventListener:(k,f)=>listeners[k]=f};
 const gameState={coins:12345,inventory:[{instanceId:'inst_keep',level:42}],rating:2345};
 const c={document:doc,gameState,gachaTimeouts:[],matchMedia:()=>({matches:reduced,addEventListener(){}}),MutationObserver:class{observe(){}},setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:f=>f(),playSound(){},getJisVisual:()=>({char:''}),getKanjiStats:()=>({power:100,weight:100}),ATTR_INFO:{metal:{name:'金'}},getCharacterTypeLabel:i=>'JIS'+i.jis,KanjiTraits:{get:()=>null},KanjiElements:{get:()=>null},getReadingAbilities:()=>[],KanjiSummonVisuals:require('../dist/summon-visuals.js')};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('dist/gacha-presentation.js','utf8'),c);
 return{c,get,timers,listeners,doc,advance(target){for(;;){const next=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];if(!next)break;const [id,t]=next;timers.delete(id);now=t.at;t.fn();}now=target;},revealed(){return get('gacha-result-grid').children.filter(n=>n.classList.contains('is-revealed')).length;}};
}
const results=(fresh=false)=>Array.from({length:10},(_,n)=>({item:{char:String.fromCodePoint(0x4e00+n),jis:n===1?4:1,attr:'metal',level:1,ruby:'イチ'},firstDiscovery:fresh,duplicate:!fresh}));
{
 const f=fixture(),r=results(true),before=JSON.stringify(f.c.gameState);f.c.showGachaResults(r,'normal');
 assert.equal(f.revealed(),0);assert.equal(f.timers.size,0);f.advance(30000);assert.equal(f.revealed(),0,'no automatic ten-pull reveals');
 assert.equal(f.get('btn-gacha-skip').textContent,'すべて開く');
 const cards=f.get('gacha-result-grid').children;
 cards[7].onclick();assert.equal(f.revealed(),1);assert.equal(f.get('gacha-selected-char').textContent,r[7].item.char);assert.equal(f.get('gacha-discovery-char').textContent,r[7].item.char);
 cards[2].onclick();assert.equal(f.revealed(),2);assert.equal(f.get('gacha-discovery-char').textContent,r[2].item.char);assert.equal(f.timers.size,1,'previous discovery cancelled');
 cards[7].onclick();assert.equal(f.revealed(),2);assert.equal(f.get('gacha-selected-char').textContent,r[7].item.char);assert(!f.get('gacha-discovery').hidden,'review keeps the selected central result visible');assert.equal(f.get('gacha-discovery-char').textContent,r[7].item.char);
 assert.equal(f.timers.size,0);f.advance(60000);assert.equal(f.revealed(),2);
 for(const n of [9,0,6,1,8,3,5,4])cards[n].onclick();assert.equal(f.revealed(),10);assert(f.c.isGachaPresentationBusy());f.advance(61800);assert(!f.c.isGachaPresentationBusy());assert(f.get('btn-gacha-skip').hidden);assert(!f.get('btn-gacha-repeat').hidden);
 assert.equal(f.get('gacha-selected-char').textContent,r[4].item.char);assert(!f.get('gacha-discovery').hidden,'last central reveal survives completion');f.advance(120000);assert(!f.get('gacha-discovery').hidden);assert.equal(f.get('gacha-discovery-char').textContent,r[4].item.char);assert.equal(JSON.stringify(f.c.gameState),before);
}
{
 const f=fixture();f.c.showGachaResults(results(true),'normal');for(const card of f.get('gacha-result-grid').children)card.onclick();
 assert.equal(f.revealed(),10);assert(f.c.isGachaPresentationBusy());f.c.skipGachaAnimation();assert(!f.c.isGachaPresentationBusy());assert(f.get('btn-gacha-skip').hidden);assert(!f.get('btn-gacha-repeat').hidden);assert.equal(f.timers.size,0);
}
{
 const f=fixture();f.c.showGachaResults(results(),'rare');f.get('gacha-result-grid').children[1].onclick();
 assert.equal(f.get('gacha-reveal-stamp').textContent,'所持済');assert.equal(f.get('gacha-reveal-eyebrow').textContent,'選んだ文字が目を覚ます');
 assert(f.get('gacha-discovery-meta').textContent.endsWith('重複'));assert.equal(f.revealed(),1);
}
for(const type of ['normal','rare','element']){
 const f=fixture(),before=JSON.stringify(f.c.gameState);f.c.showGachaResults(results(true),type);f.get('gacha-result-grid').children[3].onclick();f.c.skipGachaAnimation();f.c.skipGachaAnimation();
 assert.equal(f.revealed(),10);assert.equal(f.timers.size,0);assert(!f.c.isGachaPresentationBusy());assert(f.get('gacha-discovery').hidden);f.advance(30000);assert.equal(JSON.stringify(f.c.gameState),before);
}
{
 const f=fixture();f.c.showGachaResults(results(true),'normal');const oldCard=f.get('gacha-result-grid').children[0];oldCard.onclick();f.c.clearGachaPresentation();assert.equal(f.timers.size,0);f.advance(30000);assert(!f.c.isGachaPresentationBusy());
 f.c.showGachaResults(results(),'rare');oldCard.onclick();assert.equal(f.revealed(),0,'stale card cannot open a replacement batch');
}
{
 const f=fixture(true);f.c.showGachaResults(results(true),'normal');assert.equal(f.revealed(),0,'reduced motion retains manual choice');f.get('gacha-result-grid').children[4].onclick();assert.equal(f.revealed(),1);f.advance(30000);assert.equal(f.revealed(),1);
 const g=fixture();g.c.showGachaResults(results(true),'normal');g.get('gacha-result-grid').children[2].onclick();g.doc.hidden=true;g.listeners.visibilitychange();assert.equal(g.revealed(),1,'backgrounding preserves unopened cards');assert.equal(g.timers.size,0);g.advance(30000);assert.equal(g.revealed(),1);assert(!g.get('gacha-discovery').hidden,'returning from background keeps the central result');
}
{
 const f=fixture();f.c.showGachaResults(results(true).slice(0,1),'normal');f.advance(999);assert.equal(f.revealed(),0);f.advance(1000);assert.equal(f.revealed(),1);assert(f.c.isGachaPresentationBusy());f.advance(2800);assert(!f.c.isGachaPresentationBusy());assert(!f.get('gacha-discovery').hidden,'single result stays visible without blocking another draw');
 const g=fixture(true);g.c.showGachaResults(results(true).slice(0,1),'normal');assert.equal(g.revealed(),1);assert.equal(g.timers.size,0);
}
console.log('PASS manual ten-card order, no auto-open, one-card discovery/review, all-open idempotency, close/replacement cancellation, reduced motion/background choice, single-draw compatibility and unchanged game state (fake clock/DOM).');
