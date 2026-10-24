// Read-only extraction from the preserved game modules; writes docs only.
import {createRequire} from 'node:module';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const require=createRequire(import.meta.url),A=require('../dist/reading-abilities.js'),T=require('../dist/character-traits.js'),E=require('../dist/element-skills.js'),K=require('../dist/kanji-rules.js'),L=require('../dist/level-rules.js'),G=require('../dist/growth-rules.js'),C=require('../dist/cpu-difficulty.js'),P=require('../dist/promotion-rules.js'),O=require('../dist/online-rules.js');
const stacked=Object.values(A.abilities).map(a=>({id:a.id,name:a.name,stacks:[1,2,3].map(n=>{const readings=Array.from({length:n},(_,i)=>'検証'+i),override=Object.fromEntries(readings.map(v=>[v,a]));return A.resolveAll({char:'例',equippedReadings:readings},override)[0];})}));
const data={readingAbilities:stacked,traits:T.catalogue.map(t=>({...t,...T.get(t)})),elements:E.catalogue,rarity:K.rarity,levels:{player:L.max,cpu:L.cpuMax,maxTotalExp:L.maxTotal},growthRoles:G.roles,cpuDifficulty:C.profiles,promotionTiers:P.tiers,promotionChallenges:P.challenges,online:{level:O.level,budget:O.budget,costGuide:O.costGuide},gacha:require('../dist/gacha-rules.js').rates};
mkdirSync('docs/reference',{recursive:true});writeFileSync('docs/reference/rules-v159.json',JSON.stringify(data,null,2)+'\n');
const escape=s=>String(s).replace(/\|/g,'／').replace(/\n/g,' ');let text='\n## ルビ能力一覧（ソースから抽出）\n\n同系能力の重複は最大3段階。表は `resolveAll` の説明をそのまま抽出したもので、判定順・物理処理は `dist/battle-skills.js` が正です。\n\n| ID・名称 | 1段階 | 2段階 | 3段階 |\n|---|---|---|---|\n';
for(const a of stacked)text+='| '+a.id+'・'+a.name+' | '+a.stacks.map(s=>escape(s.description)).join(' | ')+' |\n';
text+='\n## 特殊文字一覧（ソースから抽出）\n\n| 文字 | 特性名 | 形状 | 説明 |\n|---|---|---|---|\n';for(const t of data.traits)text+='| '+[t.char,t.name,t.shape,t.description].map(escape).join(' | ')+' |\n';
text+='\n## 属性特性一覧\n\n| 属性ID | 特性 | 説明 |\n|---|---|---|\n';for(const [id,e]of Object.entries(E.catalogue))text+='| '+[id,e.name,e.description].map(escape).join(' | ')+' |\n';
writeFileSync('docs/reference/ability-tables.md',text);
