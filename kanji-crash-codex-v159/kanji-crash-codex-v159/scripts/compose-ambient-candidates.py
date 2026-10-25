"""Three original synthesized scores, CC0-1.0. No samples or third-party scores.
Stable IDs: moon-washi / quiet-garden / ink-ripples. Run from package root.
"""
from pathlib import Path
import numpy as np
import wave
SR=22050
OUT=Path('dist/audio/candidates');OUT.mkdir(parents=True,exist_ok=True)

def compose(name,duration,bpm,style):
    mix=np.zeros(round(SR*duration));rng=np.random.default_rng(20261025+style)
    beat=60/bpm
    def note(at,midi,length,amp,kind='koto'):
        t=np.arange(round(length*SR))/SR;f=440*2**((midi-69)/12)
        if kind=='koto':
            y=sum(a*np.sin(2*np.pi*f*h*t) for h,a in [(1,1),(2,.34),(3,.13),(4,.05)])
            env=(1-np.exp(-t/.008))*np.exp(-t/1.45)
        elif kind=='mallet':
            y=np.sin(2*np.pi*f*t)+.18*np.sin(2*np.pi*f*2.01*t)*np.exp(-t*5)
            env=(1-np.exp(-t/.006))*np.exp(-t/0.38)
        elif kind=='pad':
            y=sum(np.sin(2*np.pi*f*(1+d)*t) for d in [-.0018,0,.0018])/3+.07*np.sin(4*np.pi*f*t)
            env=np.minimum(1,t/1.8)*np.minimum(1,(length-t)/2.0)
        elif kind=='reed':
            phase=2*np.pi*f*t+.16*np.sin(2*np.pi*4.2*t)
            y=np.sin(phase)+.10*np.sin(phase*2)
            env=np.minimum(1,t/.3)*np.minimum(1,(length-t)/.8)
        elif kind=='drum':
            y=np.sin(2*np.pi*(90*t+2*(1-np.exp(-t*12))))
            env=(1-np.exp(-t/.003))*np.exp(-t/0.055)
        else: # soft, original noise percussion; no recorded samples
            noise=rng.normal(size=len(t));y=np.convolve(noise,np.ones(5)/5,mode='same')
            env=(1-np.exp(-t/.003))*np.exp(-t/.025)
        env*=np.minimum(1,(length-t)/.04)
        signal=y*env*amp
        delays=[(0,1),(.23,.12),(.49,.06)] if style!=1 else [(0,1),(.12,.04)]
        for delay,gain in delays:
            ids=(round((at+delay)*SR)+np.arange(len(t)))%len(mix)
            np.add.at(mix,ids,signal*gain)
    if style==0: # 60 BPM, sparse minor pentatonic, koto-like plucks and open space
        roots=[50,45,48,53,48,50];scale=[62,65,67,69,72,74]
        phrases=[[0,2],[3],[2,1],[4,2],[1],[3,2,0]]
        for bar in range(24):
            root=roots[bar//4]
            if bar%2==0:
                for interval in [0,7]:note(bar*4*beat,root+interval,9*beat,.045,'pad')
            phrase=phrases[(bar//2)%6]
            for k,degree in enumerate(phrase):note((bar*4+.5+k*1.3)*beat,scale[degree],3.8*beat,.17,'koto')
            if bar%8==6:note((bar*4+3)*beat,48,.16,.035,'drum')
    elif style==1: # 100 BPM, major pentatonic, syncopated mallets and light pulse
        roots=[48,53,55,48,45,53,55,48];scale=[60,62,64,67,69,72,74,76]
        motifs=[[0,2,3,5,3,2],[2,4,5,6,4,3],[3,5,7,6,5,2],[4,3,2,0,2,3]]
        for bar in range(40):
            root=roots[bar//5];motif=motifs[(bar//2)%4]
            for k,pos in enumerate([0,.75,1.5,2,2.75,3.5]):note((bar*4+pos)*beat,scale[motif[k]],.8*beat,.12,'mallet')
            for pos in [0,2]:note((bar*4+pos)*beat,root,1.2*beat,.085,'koto')
            for pos in [0,2]:note((bar*4+pos)*beat,45,.18,.055,'drum')
            for pos in [.5,1.5,2.5,3.5]:note((bar*4+pos)*beat,80,.12,.035,'noise')
    else: # 72 BPM, Dorian ensemble pads, sustained melody, broad slow swells
        roots=[50,53,55,57,53,55,50,57,50];scale=[62,64,65,67,69,71,72,74]
        for bar in range(36):
            root=roots[bar//4];at=bar*4*beat;swell=.65+.35*(.5-.5*np.cos(2*np.pi*at/duration))
            if bar%2==0:
                for interval in [0,7,14]:note(at,root+interval,10*beat,.07*swell,'pad')
            if bar%2==1:
                degree=[0,3,4,2,5,4,3,6,4][bar//4]
                note(at+.5*beat,scale[degree],5.5*beat,.10*swell,'reed')
            for k in range(2):note(at+(1+2*k)*beat,root+12+[0,7][k],3*beat,.045,'mallet')
    mix-=mix.mean();rms=np.sqrt(np.mean(mix**2));peak=np.max(np.abs(mix))
    mix*=min(.065/max(rms,1e-9),.48/max(peak,1e-9))
    pcm=(mix*32767).astype('<i2')
    with wave.open(str(OUT/(name+'.wav')),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
    print(name, 'bpm',bpm,'seconds',duration,'RMS',round(float(np.sqrt(np.mean(mix**2))),5),'peak',round(float(np.max(np.abs(mix))),5),'seam step',round(float(abs(mix[0]-mix[-1])),6))
compose('moon-washi',96,60,0)
compose('quiet-garden',96,100,1)
compose('ink-ripples',120,72,2)
