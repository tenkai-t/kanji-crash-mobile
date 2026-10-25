"""Validate delivered audio files without external packages."""
from pathlib import Path
import array,hashlib,math,wave
hashes=[];levels=[]
for name in ['moon-washi','quiet-garden','ink-ripples']:
    path=Path('dist/audio/candidates')/(name+'.wav')
    with wave.open(str(path),'rb') as f:
        assert f.getnchannels()==1 and f.getsampwidth()==2 and f.getframerate()==22050
        duration=f.getnframes()/f.getframerate();pcm=f.readframes(f.getnframes())
    samples=array.array('h',pcm);rms=math.sqrt(sum(x*x for x in samples)/len(samples))/32768
    peak=max(abs(x) for x in samples)/32768;seam=abs(samples[0]-samples[-1]);largest=max(abs(samples[n]-samples[n-1]) for n in range(1,len(samples)))
    assert 90<=duration<=180 and .04<rms<.08 and peak<.49 and seam<=largest
    hashes.append(hashlib.sha256(pcm).hexdigest());levels.append(rms)
    print(name,'duration',duration,'RMS',round(rms,4),'peak',round(peak,4),'loop_boundary_step',seam)
assert len(set(hashes))==3 and max(levels)/min(levels)<1.1
print('PASS distinct PCM, matched RMS, unclipped levels, duration and loop seam bounds.')
