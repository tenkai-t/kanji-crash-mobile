"""Original synthesized scores; no samples or third-party compositions. CC0-1.0."""
from pathlib import Path
import numpy as np
import wave
SR=22050
DURATION=96
outdir=Path('dist/audio/candidates');outdir.mkdir(parents=True,exist_ok=True)
for variant,name in enumerate(['moon-washi','quiet-garden','ink-ripples']):
    mix=np.zeros(SR*DURATION)
    def tone(at,midi,seconds,level,pluck=False):
        t=np.arange(round(seconds*SR))/SR;f=440*2**((midi-69)/12)
        env=(1-np.exp(-t/(.018 if pluck else 1.4)))*np.minimum(1,(seconds-t)/(.65 if pluck else 2))
        if pluck:env*=np.exp(-t/1.25)
        signal=(np.sin(2*np.pi*f*t)+(.17 if pluck else .035)*np.sin(4*np.pi*f*t))*env*level
        for delay,gain in [(0,1),(.23,.13),(.49,.06)]:
            ids=(round((at+delay)*SR)+np.arange(len(t)))%len(mix);np.add.at(mix,ids,signal*gain)
    roots=[50,50,45,48,53,48,45,50]
    scale=[62,65,67,69,72]
    for section,root in enumerate(roots):
        for interval in [0,7,12]:tone(section*12,root+interval,15,.035)
        for k in range(3+variant):
            degree=(section*3+k*2+variant)%len(scale)
            tone(section*12+1+k*(3.1-variant*.35),scale[degree],4,.11 if variant!=1 else .075,True)
        if variant==2:tone(section*12+7,root+12,2,.045,True)
    mix*=.55/max(.55,np.max(np.abs(mix)))
    with wave.open(str(outdir/(name+'.wav')),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((mix*32767).astype('<i2').tobytes())
    print(name,'96 seconds, seam delta',abs(float(mix[0]-mix[-1])))
