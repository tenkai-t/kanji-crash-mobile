const assert=require('node:assert/strict'),fs=require('node:fs'),S=require('../dist/avatar-style.js');
assert.equal(S.motions.orbit,'光のヴェール');assert.equal(S.motions.comet,'巡る光');assert.equal(Object.keys(S.motions).length,6);
const ids=new Set();for(const svg of [...Object.keys(S.basicFrames).map(x=>S.orbitSvg(x)),...Object.keys(S.specs).map(x=>S.frameSvg(x,'test'))]){
 const id=svg.match(/id="(avatar-motion-\d+)-rim"/)[1];assert(!ids.has(id));ids.add(id);
 for(const c of ['avatar-circling-light','avatar-circling-turn','avatar-veil-haze','avatar-veil-rim'])assert(svg.includes(c));
 assert(svg.includes('maskUnits="userSpaceOnUse"'));assert(svg.includes('xmlns="http://www.w3.org/1999/xhtml"'));assert(!svg.includes('avatar-smooth-meteor'));assert(!svg.includes('avatar-ripple'));assert(!svg.includes('undefined'));
 assert.equal((svg.match(/class="avatar-drift-ring avatar-drift-ring-/g)||[]).length,6);assert.equal((svg.match(/class="avatar-jewel-spark"/g)||[]).length,6);
}
for(const motion of ['orbit','comet','dust','shimmer'])assert.equal(S.normalize({motion}).motion,motion);
const css=fs.readFileSync('dist/avatar-style.css','utf8');assert(css.includes('background:conic-gradient('));assert(css.includes('avatar-circling-lap 7s linear infinite'));assert(css.includes('[data-motion] :is(.avatar-circling-turn,.avatar-veil,.avatar-veil-stop-a,.avatar-veil-stop-b,.avatar-veil-stop-c){animation:none!important}'));
console.log('PASS 79 outline masks, continuous circling gradients, colored veils, unchanged particles/jewel flashes, saved motion IDs and reduced-motion fallback.');
