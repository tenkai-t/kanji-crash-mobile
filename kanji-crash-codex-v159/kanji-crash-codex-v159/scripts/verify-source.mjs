import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const expected=JSON.parse(readFileSync('docs/migration/source-files-v159.json','utf8'));let checked=0;
const exceptions=new Set(['README.md','QA.md','package.json','package-lock.json','.gitignore']);
for(const f of expected.files){if(exceptions.has(f.path))continue;const actual=createHash('sha256').update(readFileSync(f.path)).digest('hex');if(actual!==f.sha256)throw Error('Source mismatch: '+f.path);checked++;}
console.log('PASS '+checked+' original files match published v159; only documented migration files exempt.');
