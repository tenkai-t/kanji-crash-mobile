const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),Ref=require('../dist/kanji-reference.js'),Game=require('../server/game.cjs');
const html=fs.readFileSync('dist/index.html','utf8'),db=JSON.parse(html.match(/const KANJI_DATABASE = (\[.*?\]);/s)[1]),context={window:{}};vm.runInNewContext(fs.readFileSync('dist/readings.js','utf8'),context);const read=c=>[...new Set((context.window.KANJI_READINGS[c]||[]).map(r=>r.replace(/[・()（）.-]/g,'')).filter(r=>/^[ぁ-ゖァ-ヺー]+$/.test(r)))];
assert.equal(Object.keys(Ref.entries).length,10050);assert.equal(Ref.supplemented.size,742);for(const b of db.filter(i=>i.jis!==5)){assert.equal(b.jis,Ref.entries[b.char][0]);assert(/^[12]-\d{2}-\d{2}$/.test(Ref.entries[b.char][1]));}
assert.deepEqual(Ref.entries['難'],[1,'1-38-81']);assert.deepEqual(Ref.entries['難'],[3,'1-93-67']);assert.equal(Ref.variantLabel('難'),'');assert.equal(Ref.variantLabel('難'),'「難」の異体字');
for(const [char,ruby]of [['歷','レキ'],['栁','やなぎ'],['㐂','キ'],['𣘹','たら'],['㐆','イン'],['𠎁','み']])assert(read(char).includes(ruby));
for(const char of Ref.supplemented){assert(read(char).length);assert(context.window.KANJI_READINGS[char].length);}
assert.deepEqual(new Set(db.filter(b=>!read(b.char).length).map(b=>b.char)),new Set(['𠂉','𠆢','𠦝','𡗗','𤇾','𦥯','𦰩','爫']));
console.log(JSON.stringify({JISAudited:10050,readingsAdded:742,secrets:8,similarGlyphsDistinguished:true,japaneseReadings:true}));
