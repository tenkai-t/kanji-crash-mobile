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
 const f=fixture(),before=JSON.stringify(f.c.gameState);f.c.showGachaResults(results(),'normal');
 f.advance(1799);assert.equal(f.revealed(),0);f.advance(1800);assert.equal(f.revealed(),1);
 assert.equal(f.get('gacha-selected-char').textContent,results()[0].item.char);
 f.advance(2699);assert.equal(f.revealed(),1);f.advance(2700);assert.equal(f.revealed(),2);
 assert.equal(f.get('gacha-selected-char').textContent,results()[1].item.char);
 f.advance(4099);assert.equal(f.revealed(),2);f.advance(4100);assert.equal(f.revealed(),3);
 assert.equal(f.get('gacha-selected-char').textContent,results()[2].item.char);
 f.advance(20000);assert.equal(f.revealed(),10);assert(!f.c.isGachaPresentationBusy());assert.equal(JSON.stringify(f.c.gameState),before);
}
{
 const f=fixture(),r=results(true);f.c.showGachaResults(r,'rare');
 f.advance(1800);assert.equal(f.revealed(),1);assert.equal(f.get('gacha-discovery-char').textContent,r[0].item.char);
 f.advance(3599);assert(!f.get('gacha-discovery').hidden);assert.equal(f.revealed(),1);
 f.advance(3600);assert(f.get('gacha-discovery').hidden);f.advance(3799);assert.equal(f.revealed(),1);
 f.advance(3800);assert.equal(f.revealed(),2);assert.equal(f.get('gacha-discovery-char').textContent,r[1].item.char);
 assert(f.c.isGachaPresentationBusy());f.advance(19800);assert.equal(f.revealed(),10);assert(f.c.isGachaPresentationBusy());
 f.advance(21600);assert(!f.c.isGachaPresentationBusy());assert(f.get('btn-gacha-skip').hidden);
}
for(const when of [0,1800,3800]){
 const f=fixture(),before=JSON.stringify(f.c.gameState);f.c.showGachaResults(results(true),'normal');f.advance(when);f.c.skipGachaAnimation();f.c.skipGachaAnimation();
 assert.equal(f.revealed(),10);assert.equal(f.timers.size,0);assert(!f.c.isGachaPresentationBusy());assert(f.get('gacha-discovery').hidden);f.advance(30000);assert.equal(JSON.stringify(f.c.gameState),before);
}
{
 const f=fixture();f.c.showGachaResults(results(true),'normal');f.advance(1800);f.c.clearGachaPresentation();assert.equal(f.timers.size,0);f.advance(30000);assert(!f.c.isGachaPresentationBusy());
}
{
 const f=fixture();f.c.showGachaResults(results(true),'normal');f.c.showGachaResults(results(),'rare');f.advance(1800);assert.equal(f.revealed(),1);assert(f.get('gacha-discovery').hidden);
}
{
 const f=fixture(true);f.c.showGachaResults(results(true),'normal');assert.equal(f.revealed(),10);assert.equal(f.timers.size,0);
 const g=fixture();g.c.showGachaResults(results(true),'normal');g.doc.hidden=true;g.listeners.visibilitychange();assert.equal(g.revealed(),10);assert.equal(g.timers.size,0);
}
console.log('PASS timed normal/rare reveals, live details, non-overlapping first discoveries, final hold, skip/close/replacement cancellation, reduced motion/background and unchanged game state (fake clock/DOM).');
