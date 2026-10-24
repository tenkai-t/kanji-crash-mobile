const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const G=require('../dist/gift-codes.js'),S=require('../dist/save-protection.js'),P=require('../dist/promotion-rules.js');
const code='KH-START-7M4Q',gift=G.get(code);
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v))};};
const initial={inventory:[{instanceId:'inst_keep',char:'龍',level:52,exp:123}],deck:['inst_keep'],rating:2345,coins:123,playerId:'keep-player',giftClaims:['old-claim'],cpuPromotions:{version:1,unlocked:0},onlineStats:{rating:1500,wins:7},playProgress:{challenges:{}}};
assert.equal(gift.coins,500000);assert.equal(gift.rating,10000);
assert.equal(G.get(' ｋｈ－ｓｔａｒｔ－７ｍ４ｑ ').id,gift.id);
assert.equal(G.describe(gift),'500,000文・10,000段位ポイント');
for(const rating of [0,2345,25000]){
  const before={...structuredClone(initial),rating},st=storage();st.setItem(S.key,JSON.stringify(before));
  const store=S.create(st,x=>x);store.load();const after=G.claim(before,store,st,code);
  assert.equal(after.coins,before.coins+500000);assert.equal(after.rating,rating+10000);
  const expected={...before,coins:before.coins+500000,rating:rating+10000,giftClaims:[...before.giftClaims,gift.id]};
  assert.deepEqual(after,expected);assert.deepEqual(JSON.parse(st.getItem(S.key)),expected);
  assert.equal(G.claim(after,store,st,code),null);assert.equal(G.claim(before,store,st,code),null);
  const restoredElsewhere=storage();assert.equal(G.claim(after,{replace(){throw Error('must not save twice');}},restoredElsewhere,code),null);
  const reopened=S.create(st,x=>x);assert.equal(G.claim(reopened.load().state,reopened,st,code),null);
  P.reconcile(after);assert.equal(after.cpuPromotions.unlocked,0,'points do not bypass promotion trials');
}
{
  const st=storage(),before=structuredClone(initial);
  assert.throws(()=>G.claim(before,{replace(){throw Error('quota');}},st,code),/quota/);
  assert.deepEqual(before,initial);assert.equal(st.getItem('kanji_gift_'+gift.id),null);
  assert.throws(()=>G.claim(before,{replace(){assert.fail();}},st,'invalid'),/invalid-gift/);
}
{
  const st=storage();st.setItem(S.key,JSON.stringify(initial));const store=S.create(st,x=>x);store.load();
  const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',value:'',disabled:false,classList:{add(){},remove(){}},focus(){},addEventListener(){}});return nodes.get(id);};
  let onload,saves=0;
  const c={window:{addEventListener:(_,f)=>onload=f},location:{search:'?gift='+code},URLSearchParams,document:{getElementById:el},gameState:structuredClone(initial),localStorage:st,saveStore:store,KanjiGiftCodes:G,switchTab(){},saveState(urgent){assert.equal(urgent,true);saves++;}};
  vm.runInNewContext(fs.readFileSync('dist/recovery-compensation.js','utf8'),c);onload();
  assert.equal(el('btn-recovery-compensation').textContent,'500,000文・10,000段位ポイントを受け取る');
  assert.equal(el('recovery-gift-description').textContent,'500,000文・10,000段位ポイントを受け取れます。1回限り。');
  el('btn-recovery-compensation').onclick();
  assert.equal(c.gameState.coins,500123);assert.equal(c.gameState.rating,12345);
  assert.equal(el('recovery-code-status').textContent,'500,000文・10,000段位ポイントを追加して保存しました。');
  el('btn-recovery-compensation').onclick();assert.equal(saves,1);
}
console.log('PASS new-site gift adds exactly 500,000 coins and 10,000 CPU rank points once; existing state/RP/trials preserved; reload, restored claims, duplicate clicks, failed saves and receipt UI checked (mock storage/DOM).');
