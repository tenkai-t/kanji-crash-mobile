"""Split the existing font without changing its character set or outlines.
Uses the system Brotli library when the optional Python binding is unavailable.
"""
import sys,types,ctypes,json,hashlib,re,io
from pathlib import Path
try: import brotli
except ImportError:
    m=types.ModuleType('brotli');m.MODE_FONT=2
    dec=ctypes.CDLL('libbrotlidec.so.1');enc=ctypes.CDLL('libbrotlienc.so.1')
    dec.BrotliDecoderDecompress.argtypes=[ctypes.c_size_t,ctypes.c_void_p,ctypes.POINTER(ctypes.c_size_t),ctypes.c_void_p]
    enc.BrotliEncoderMaxCompressedSize.argtypes=[ctypes.c_size_t];enc.BrotliEncoderMaxCompressedSize.restype=ctypes.c_size_t
    enc.BrotliEncoderCompress.argtypes=[ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_size_t,ctypes.c_void_p,ctypes.POINTER(ctypes.c_size_t),ctypes.c_void_p]
    def decompress(data):
        size=max(len(data)*8,1048576)
        while size<=134217728:
            out=ctypes.create_string_buffer(size);n=ctypes.c_size_t(size)
            if dec.BrotliDecoderDecompress(len(data),data,ctypes.byref(n),out)==1:return out.raw[:n.value]
            size*=2
        raise ValueError('Brotli decode failed')
    def compress(data,mode=2,quality=9,lgwin=22):
        n=ctypes.c_size_t(enc.BrotliEncoderMaxCompressedSize(len(data)));out=ctypes.create_string_buffer(n.value)
        if not enc.BrotliEncoderCompress(quality,lgwin,mode,len(data),data,ctypes.byref(n),out):raise ValueError('Brotli encode failed')
        return out.raw[:n.value]
    m.decompress=decompress;m.compress=compress;sys.modules['brotli']=m
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.pens.recordingPen import DecomposingRecordingPen
from html.parser import HTMLParser
root=Path(__file__).resolve().parent.parent
raw=(root/'dist/vendor/fonts/kanji-unified-mincho.woff2').read_bytes();source=TTFont(io.BytesIO(raw));cmap=source.getBestCmap()
class UI(HTMLParser):
    def __init__(self):super().__init__();self.skip=0;self.text=''
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style'):self.skip+=1
        if not self.skip:
            for k,v in attrs:
                if k in ('placeholder','aria-label','title') and v:self.text+=v
    def handle_endtag(self,tag):
        if tag in ('script','style'):self.skip=max(0,self.skip-1)
    def handle_data(self,data):
        if not self.skip:self.text+=data
ui=UI();ui.feed((root/'dist/index.html').read_text())
core={ord(c) for c in ui.text}|set(range(0x20,0x100))|set(range(0x3000,0x3100))|set(range(0xff00,0xfff0));core&=set(cmap)
groups={'core':core}
for cp in sorted(set(cmap)-core):groups.setdefault('extensions' if cp>=0x20000 else f'{cp//512:03x}',set()).add(cp)
out=root/'dist/vendor/fonts/character-parts';out.mkdir(exist_ok=True)
css=[];report={'originalBytes':len(raw),'originalCharacters':len(cmap),'parts':[]};covered=set();baseGlyphs=source.getGlyphSet()
for name,points in groups.items():
    cached=list(out.glob(name+'-*.woff2'))
    if cached:
        data=cached[0].read_bytes();file=cached[0].name
    else:
        font=TTFont(io.BytesIO(raw));options=subset.Options();options.name_IDs=['*'];options.name_legacy=True;options.name_languages=['*'];options.glyph_names=True
        sub=subset.Subsetter(options=options);sub.populate(unicodes=points);sub.subset(font);font.flavor='woff2';buffer=io.BytesIO();font.save(buffer);data=buffer.getvalue()
        digest=hashlib.sha256(data).hexdigest()[:12];file=f'{name}-{digest}.woff2';(out/file).write_bytes(data)
    check=TTFont(io.BytesIO(data));mapped=check.getBestCmap();assert set(mapped)==points
    newGlyphs=check.getGlyphSet()
    for cp in points:
        a,b=cmap[cp],mapped[cp];assert source['hmtx'][a]==check['hmtx'][b]
        pa=DecomposingRecordingPen(baseGlyphs);pb=DecomposingRecordingPen(newGlyphs);baseGlyphs[a].draw(pa);newGlyphs[b].draw(pb);assert pa.value==pb.value,hex(cp)
    covered|=points
    ranges=','.join(f'U+{cp:X}' for cp in sorted(points))
    css.append("@font-face{font-family:'Kanji Unified Mincho';font-style:normal;font-weight:400;font-display:swap;src:url('/vendor/fonts/character-parts/"+file+"') format('woff2');unicode-range:"+ranges+"}")
    report['parts'].append({'name':name,'file':file,'characters':len(points),'bytes':len(data)})
assert covered==set(cmap)
active={p['file'] for p in report['parts']}
for stale in out.glob('*.woff2'):
    if stale.name not in active:stale.unlink()
existing=(root/'dist/character-font.css').read_text();existing=re.sub(r"@font-face\{font-family:'Kanji Unified Mincho'.*?\}\n",'',existing)
(root/'dist/character-font.css').write_text('\n'.join(css)+'\n'+existing)
report['totalBytes']=sum(p['bytes'] for p in report['parts']);report['everyGlyphOutlineAndAdvanceVerified']=True
(root/'docs/font-parts-v154.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in report.items() if k!='parts'}));print('core',report['parts'][0])
