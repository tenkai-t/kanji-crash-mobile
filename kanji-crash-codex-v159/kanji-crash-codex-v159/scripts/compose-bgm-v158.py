"""Original deterministic D-minor pentatonic score. No sampled/third-party audio."""
from pathlib import Path
import numpy as np
import wave
SR=22050
SCALE=[62,65,67,69,72,74,77]
MOTIFS=[[0,2,3,2,1,0,2,4],[2,3,4,3,2,1,0,2],[4,3,2,0,1,2,3,2],[2,1,0,2,4,3,2,0]]
def compose(name,bpm):
    beat=60/bpm;duration=64*beat;out=np.zeros(round(duration*SR),dtype=np.float64)
    def note(start,midi,length,amp,kind):
        t=np.arange(round(length*SR))/SR;f=440*2**((midi-69)/12)
        if kind=='pluck':y=(np.sin(2*np.pi*f*t)+.33*np.sin(4*np.pi*f*t)+.12*np.sin(6*np.pi*f*t))*np.exp(-t*4)
        elif kind=='pad':y=(np.sin(2*np.pi*f*t)+.18*np.sin(2*np.pi*f*1.002*t))*.6
        else:y=np.sin(2*np.pi*f*t)*np.exp(-t*2)
        envelope=np.minimum(1,t/.015)*np.minimum(1,(length-t)/(.25 if kind=='pad' else .08));y*=envelope*amp
        at=round(start*SR)
        # Wrap natural tails across the loop boundary to avoid a clipped final note.
        for offset,gain in [(0,1),(.19,.13),(.37,.06)]:
            ids=(at+round(offset*SR)+np.arange(len(y)))%len(out);np.add.at(out,ids,y*gain)
    for bar in range(16):
        root=[50,48,53,45][bar%4]
        for interval in [0,7,12]:note(bar*4*beat,root+interval,4.5*beat,.05,'pad')
        motif=MOTIFS[(bar//2)%4]
        for n,degree in enumerate(motif):
            if name=='menu' and n in [3,7] and bar%2==0:continue
            note((bar*4+n*.5)*beat,SCALE[degree]+(12 if name=='battle' and bar>=8 and n%3==0 else 0),.95*beat,.12 if name=='menu' else .11,'pluck')
        for n in ([0,2] if name=='menu' else [0,1.5,2,3.5]):note((bar*4+n)*beat,root-12,.9*beat,.12,'bass')
        if name=='battle':
            for n in range(4):note((bar*4+n)*beat,38,.12,.10,'bass')
    # Stable RMS/peak; no random generator or gameplay state is involved.
    out=out/max(1,np.max(np.abs(out))/.67)
    target=Path('dist/audio')/(name+'-v158.wav')
    with wave.open(str(target),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((out*32767).astype('<i2').tobytes())
    print(name,round(duration,2),'seconds',target.stat().st_size,'bytes')
compose('menu',100);compose('battle',128)
