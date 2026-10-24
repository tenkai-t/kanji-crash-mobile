"""Build the game font from the original licensed IPAmj Mincho TTF.
Usage: python scripts/build-character-font.py /path/to/ipamjm.ttf
Requires fonttools and brotli. See dist/vendor/fonts/character-font-README.txt.
"""
import sys,json,hashlib
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools import subset
root=Path(__file__).resolve().parent.parent
source=Path(sys.argv[1]);font=TTFont(source)
assert hashlib.md5(source.read_bytes()).hexdigest()=='beee256d4ffec4c40493805a4d7e5cdd','Unexpected original font version'
chars={i['char'] for i in json.loads((root/'server/generated/catalogue.json').read_text())}
missing=sorted(c for c in chars if ord(c) not in font.getBestCmap())
assert not missing,'Missing game characters: '+''.join(missing)
options=subset.Options();options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*'];options.glyph_names=True
subsetter=subset.Subsetter(options=options);subsetter.populate(unicodes={ord(c) for c in chars}|set(range(0x20,0x100))|set(range(0x3000,0x3100))|set(range(0xff00,0xfff0)));subsetter.subset(font)
for name in font['name'].names:
 values={1:'Kanji Unified Mincho',2:'Regular',3:'KanjiUnifiedMincho-Game-v1',4:'Kanji Unified Mincho',6:'KanjiUnifiedMincho',16:'Kanji Unified Mincho',17:'Regular'}
 if name.nameID in values:name.string=values[name.nameID].encode(name.getEncoding())
output=root/'dist/vendor/fonts/kanji-unified-mincho.woff2';font.flavor='woff2';font.save(output)
check=TTFont(output);assert all(ord(c) in check.getBestCmap() for c in chars)
report={'source':'IPAmj Mincho Ver.006.01','sourceMd5':hashlib.md5(source.read_bytes()).hexdigest(),'gameCharacters':len(chars),'missing':[],'fontBytes':output.stat().st_size,'fontSha256':hashlib.sha256(output.read_bytes()).hexdigest()}
(root/'dist/vendor/fonts/character-font-coverage.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False))
