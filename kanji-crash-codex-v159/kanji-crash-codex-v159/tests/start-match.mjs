export async function startMatch(pages){
 for(const p of pages)await p.waitForFunction(()=>friendRoom?.status==='preparing');
 // The slower preparation checks must display any peer's saved lineup before both starts.
 const revision=Math.max(...await Promise.all(pages.map(p=>p.evaluate(()=>friendRoom.lineupRevision))));
 for(const p of pages)await p.waitForFunction(revision=>friendRoom.lineupRevision>=revision,revision);
 for(const p of pages)await p.locator('#btn-battle-start').tap();
 for(const p of pages)await p.waitForFunction(()=>friendRoom?.status==='playing');
}
