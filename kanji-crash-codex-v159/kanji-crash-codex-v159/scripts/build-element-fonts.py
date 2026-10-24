"""Extend IPAmj Mincho and subset a Ming-style fallback for element characters.
Usage: python scripts/build-element-fonts.py /path/ipamjm.ttf /path/BabelStoneHan.ttf
Requires fonttools and brotli. Source licenses are in dist/vendor/fonts/.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
import json,hashlib,sys,re
root=Path(__file__).resolve().parents[1]
primary,fallback=map(Path,sys.argv[1:3])
assert hashlib.md5(primary.read_bytes()).hexdigest()=='beee256d4ffec4c40493805a4d7e5cdd'
html=(root/'dist/index.html').read_text();chars={i['char'] for i in json.loads(re.search(r'const KANJI_DATABASE = (\[.*?\]);',html)[1])}
elements=json.loads((root/'data/element-characters.json').read_text())['items']
original=TTFont(primary);backup=TTFont(fallback);main=original.getBestCmap();extra=backup.getBestCmap()
missing=sorted(c for c in chars if ord(c)not in main)
assert len(missing)==14 and all(ord(c)in extra for c in missing)
assert all(any(ord(c)in f.getBestCmap() for f in [original,backup])for c in chars)
def save(font,codepoints,path,family):
 opts=subset.Options();opts.name_IDs=['*'];opts.name_legacy=True;opts.name_languages=['*'];opts.glyph_names=True
 sub=subset.Subsetter(opts);sub.populate(unicodes=codepoints);sub.subset(font)
 for name in font['name'].names:
  values={1:family,2:'Regular',3:family.replace(' ','')+'-Elements-v1',4:family,6:family.replace(' ',''),16:family,17:'Regular'}
  if name.nameID in values:name.string=values[name.nameID].encode(name.getEncoding())
 font.flavor='woff2';font.save(path)
save(original,{ord(c)for c in chars if ord(c)in main}|set(range(0x20,0x100))|set(range(0x3000,0x3100))|set(range(0xff00,0xfff0)),root/'dist/vendor/fonts/kanji-unified-mincho.woff2','Kanji Unified Mincho')
save(backup,{ord(c)for c in missing},root/'dist/vendor/fonts/kanji-element-mincho.woff2','Kanji Element Mincho')
report={'source':'IPAmj Mincho Ver.006.01','sourceMd5':hashlib.md5(primary.read_bytes()).hexdigest(),'gameCharacters':len(chars),'missing':[], 'primaryElementCharacters':len(elements)-len(missing),'fallbackElementCharacters':len(missing),'fallbackCharacters':missing,'fallbackSource':'BabelStone Han','fallbackVersion':TTFont(fallback)['name'].getDebugName(5),'fallbackSourceSha256':hashlib.sha256(fallback.read_bytes()).hexdigest()}
for prefix,name in [('font','kanji-unified-mincho.woff2'),('fallbackFont','kanji-element-mincho.woff2')]:
 p=root/'dist/vendor/fonts'/name;report[prefix+'Bytes']=p.stat().st_size;report[prefix+'Sha256']=hashlib.sha256(p.read_bytes()).hexdigest()
(root/'dist/vendor/fonts/character-font-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
