"""Rebuild bundled reading and stroke indexes from KANJIDIC2."""
from pathlib import Path
import argparse, gzip, json, re, urllib.request, xml.etree.ElementTree as ET
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, help='Use an already downloaded KANJIDIC2 XML.gz')
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
html = (root/'dist/index.html').read_text()
characters = {k['char'] for k in json.loads(re.search(r'const KANJI_DATABASE = (\[.*?\]);', html).group(1))}
if args.source:
    tree = ET.fromstring(gzip.decompress(args.source.read_bytes()))
else:
    with urllib.request.urlopen('https://www.edrdg.org/kanjidic/kanjidic2.xml.gz', timeout=45) as response:
        tree = ET.fromstring(gzip.decompress(response.read()))
readings, strokes = {}, {}
for node in tree.findall('character'):
    char = node.findtext('literal')
    if char not in characters:
        continue
    values = [r.text for r in node.findall('.//reading') if r.get('r_type') in ('ja_on', 'ja_kun')] + [r.text for r in node.findall('.//nanori')]
    readings[char] = list(dict.fromkeys(values))
    # The DTD defines the first count as accepted; later counts are common miscounts.
    strokes[char] = int(node.findtext('misc/stroke_count'))
supplements = json.loads((root/'data/reading-supplements.json').read_text())['items']
for char, entry in supplements.items():
    if char in characters and not readings.get(char): readings[char] = entry['readings']
for entry in json.loads((root/'data/element-characters.json').read_text())['items']:
    char=entry['char']
    if char in characters:
        readings[char]=list(dict.fromkeys(readings.get(char,[])+[entry['reading']]))
        strokes.setdefault(char,entry['strokes'])
assert set(readings) == characters and set(strokes) == characters
assert all(0 < n < 100 for n in strokes.values())
date = tree.findtext('header/date_of_creation')
notice = '/* Supplemental Japanese readings: Unihan 17.0 and verified dictionaries; see /credits.html. */\n/* KANJIDIC2 © EDRDG, CC BY-SA 4.0. {kind} derivative; see /credits.html. Dictionary date: '+date+' */\n'
(root/'dist/readings.js').write_text(notice.format(kind='Reading-only')+'window.KANJI_READINGS = '+json.dumps(readings, ensure_ascii=False, separators=(',', ':'))+';\n')
(root/'dist/strokes.js').write_text(notice.format(kind='Accepted stroke-count')+"(function(root){const counts="+json.dumps(strokes, ensure_ascii=False, separators=(',', ':'))+";if(typeof module==='object'&&module.exports)module.exports=counts;else root.KANJI_STROKES=counts;})(typeof window!=='undefined'?window:globalThis);\n")
print(f'Updated readings and accepted stroke counts for {len(readings)} characters, source date {date}')
