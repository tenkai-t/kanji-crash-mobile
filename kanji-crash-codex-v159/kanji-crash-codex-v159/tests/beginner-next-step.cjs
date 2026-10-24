const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(cpuWins,count){
 const nodes=new Map(),calls=[];const get=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:''});return nodes.get(id);};
 const state={inventory:Array.from({length:count},(_,n)=>({instanceId:'inst_'+n,ruby:'イチ',unlockedReadings:['イチ'],equippedReadings:['イチ']})),deck:['inst_0','inst_1','inst_2'],coins:123,rating:1200};
 const before=JSON.stringify(state);
 const c={document:{getElementById:get,querySelectorAll:()=>[]},localStorage:{getItem:k=>k==='kanji_beginner_v1'?JSON.stringify({newcomer:true,seen:true,cpuWins}):null},gameState:state,friendRoom:null,battleMode:'classic',soloBattlePending:false,isBattleEnded:true,preparationEditing:false,filterCollection(){},switchTab:tab=>calls.push(tab),showRanking(){},finishBattleResult(){},addEventListener(){},selectCpuDifficulty:d=>calls.push(d),startMatchmaking:()=>calls.push('match')};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync('dist/beginner-ui.js','utf8'),c);c.renderPlayHub();return{c,get,calls,before};
}
const first=fixture(0,3);assert.match(first.get('beginner-next-note').textContent,/最初の3文字/);first.c.takeBeginnerNextStep();assert.deepEqual(first.calls,['normal','match']);
const summon=fixture(1,3);assert.equal(summon.get('btn-beginner-next').textContent,'召喚へ');summon.c.takeBeginnerNextStep();assert.deepEqual(summon.calls,['gacha']);
const team=fixture(1,4);assert.equal(team.get('btn-beginner-next').textContent,'編成を見る');assert.match(team.get('beginner-next-note').textContent,/威力・重量・装備中のルビ能力を確認/);assert(!team.get('beginner-next-note').textContent.includes('ルビを試そう'));team.c.takeBeginnerNextStep();assert.deepEqual(team.calls,['deck']);assert.equal(JSON.stringify(team.c.gameState),team.before);
console.log('PASS beginner steps route to CPU/summon/team; one unlocked reading per character is sufficient; no save or reward changes.');
