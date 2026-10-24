const assert=require('assert'),R=require('../dist/battle-rewards.js');
const players=['A','B','C'],enemies=[1,2,3];
function victory({intact=true,sweep=true,won=true,small=false}={}) {
    const state=R.create(small?players.slice(0,2):players,enemies);
    if(sweep) R.beginShot(state,true,'A',enemies);
    enemies.forEach(id=>R.recordKill(state,id,'A',20));
    const result=R.settle(state,won,intact?players:['A']);
    assert.strictEqual(R.settle(state,won,players),null,'settlement cannot repeat');
    return result;
}
const full= victory({sweep:false}),sweep=victory({intact:false}),both=victory(),none=victory({intact:false,sweep:false});
assert.strictEqual(full.multiplier,1.5);assert.strictEqual(full.totalBonus,30);
assert.strictEqual(sweep.multiplier,2);assert.strictEqual(sweep.totalBonus,60);
assert.strictEqual(both.multiplier,2.5);assert.strictEqual(both.totalBonus,90);
assert.strictEqual(none.totalBonus,0);assert.strictEqual(victory({won:false}).totalBonus,0);
assert(!victory({small:true,sweep:false}).intact,'a two-piece deck is not full survival');
const turns=R.create(players,enemies);
R.beginShot(turns,true,'A',enemies);R.recordKill(turns,1,'A',20);
assert(!R.recordKill(turns,1,'A',20),'one enemy can award EXP only once');
R.beginShot(turns,false,null,[2,3]);R.recordKill(turns,2,'B',20);
R.beginShot(turns,true,'C',[3]);R.recordKill(turns,3,'C',20);
const split=R.settle(turns,true,players);assert(!split.sweep);assert.deepStrictEqual(split.awards,[{id:'A',base:20,bonus:10},{id:'B',base:20,bonus:10},{id:'C',base:20,bonus:10}]);
const chain=R.create(players,enemies);R.beginShot(chain,true,'A',enemies);
R.recordKill(chain,1,'A',20);R.recordKill(chain,2,'B',20);R.recordKill(chain,3,null,0);
const combo=R.settle(chain,true,['A','B']);assert(combo.sweep&&combo.totalBonus===40,'chain collisions belong to the same player shot');
const cpu=R.create(players,enemies);R.beginShot(cpu,false,null,enemies);enemies.forEach(id=>R.recordKill(cpu,id,'A',20));assert(!R.settle(cpu,true,players).sweep,'CPU self-destruction is not a player sweep');
assert.strictEqual(R.recordKill(chain,10,'A',50),false,'unknown or completed enemy does not grant EXP');
const fresh=R.create(players,enemies);assert(!fresh.sweep&&fresh.defeated.length===0,'new wave has a fresh reward ledger');
console.log(JSON.stringify({intact:full.multiplier,sweep:sweep.multiplier,both:both.multiplier,bonuses:[30,60,90],doubleAwardPrevented:true,turnBoundaries:true}));
