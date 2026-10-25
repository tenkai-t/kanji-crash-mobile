(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiReplayAudio=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
let sessions=0;
const tones=Object.freeze({launch:{wave:'sine',frequency:150,end:450,ramp:'exponential',gain:.3,duration:.15},hit:{wave:'triangle',frequency:120,end:40,ramp:'exponential',gain:.5,duration:.12},ability:{wave:'sine',frequency:200,end:600,ramp:'linear',gain:.4,duration:.4},win:{wave:'triangle',frequency:400,notes:[[.1,520],[.2,660]],gain:.3,duration:.4},lose:{wave:'sawtooth',frequency:300,end:120,ramp:'linear',gain:.2,duration:.3}});
function timeline(record,intro=800){
 const events=[],seen=new Set(),fallen=new Set();let start=0,previous=record.initial;
 const add=(ms,type,id)=>{const key=type+':'+id;if(seen.has(key))return;seen.add(key);events.push({ms:Math.max(0,Math.round(ms)),type,id});};
 function falls(frame,offset){if(previous)frame[2].forEach((p,key)=>{if(p[3]&&!previous[2][key]?.[3]&&!fallen.has(key)){fallen.add(key);add(intro+offset+frame[0],'hit','fall_'+key);}});previous=frame;}
 record.initial[2].forEach((p,key)=>{if(p[3])fallen.add(key);});
 record.turns.forEach((turn,n)=>{add(intro+start,'launch','turn_'+n);for(const event of turn.events)add(intro+start+event.t,'ability',n+'_'+event.key+'_'+event.t+'_'+event.name);for(const frame of turn.frames)falls(frame,start);start+=turn.duration;});
 // Final snapshots can contain a fall after the last stored sample.
 if(record.final){const f=[0,record.final[1],record.final[2]];falls(f,start);}
 add(intro+start,record.winner===record.side?'win':'lose','result');return events.sort((a,b)=>a.ms-b.ms||a.id.localeCompare(b.id));
}
async function verify(blob,type){
 let budget=4096;const read=async(start,length)=>new Uint8Array(await blob.slice(start,start+length).arrayBuffer()),text=bytes=>String.fromCharCode(...bytes),uint=bytes=>bytes.reduce((a,b)=>a*256+b,0);
 async function mp4(start,end,parent='',depth=0){if(depth>6)return false;while(start+8<=end&&budget-->0){const b=await read(start,16);let size=uint(b.slice(0,4)),header=8;if(size===1){if(b.length<16)return false;size=uint(b.slice(8,16));header=16;}if(!size)size=end-start;if(!Number.isSafeInteger(size)||size<header||start+size>end)return false;const name=text(b.slice(4,8));if(parent==='mdia'&&name==='hdlr'&&size>=header+12&&text(await read(start+header+8,4))==='soun')return true;if((!parent&&name==='moov')||(parent==='moov'&&name==='trak')||(parent==='trak'&&name==='mdia'))if(await mp4(start+header,start+size,name,depth+1))return true;start+=size;}return false;}
 function vint(bytes,offset,id=false){const first=bytes[offset];if(!first)return null;let mask=128,length=1;while(!(first&mask)){mask>>=1;length++;}if(length>(id?4:8)||offset+length>bytes.length)return null;const payload=first&(mask-1),unknown=!id&&payload===mask-1&&bytes.slice(offset+1,offset+length).every(v=>v===255);let value=id?first:payload;for(let i=1;i<length;i++)value=value*256+bytes[offset+i];return {length,value:unknown?Infinity:value};}
 async function webm(start,end,parent=0,depth=0){if(depth>5)return false;while(start<end&&budget-->0){const b=await read(start,16),id=vint(b,0,true);if(!id)return false;const size=vint(b,id.length);if(!size)return false;const payload=start+id.length+size.length,next=size.value===Infinity?end:payload+size.value;if(!Number.isSafeInteger(next)||next>end||next<=start)return false;if(parent===0xae&&id.value===0x83&&next-payload<=8&&uint(await read(payload,next-payload))===2)return true;const child=(!parent&&id.value===0x18538067)||(parent===0x18538067&&id.value===0x1654ae6b)||(parent===0x1654ae6b&&id.value===0xae);if(child&&await webm(payload,next,id.value,depth+1))return true;start=next;}return false;}
 try{return type==='video/mp4'?await mp4(0,blob.size):type==='video/webm'?await webm(0,blob.size):false;}catch{return false;}
}
function prepare(env=globalThis,volume=60,options={}){
 const Constructor=env.AudioContext||env.webkitAudioContext;if(!Constructor)throw Error('この環境では音声を作成できません。「ゲームの音を入れる」をオフにして保存できます。');
 let counted=false,rejectReady;const cancelled=new Promise((resolve,reject)=>{rejectReady=reject;});cancelled.catch(()=>{});
 let ctx,destination,mix,level,compressor,limiter,musicSource,musicLevel,musicBuffer,musicRequest,timeout=0,closed=false,begun=false,epoch=0,cursor=0,events=[],failure=null,remaining=new Set();const gain=Math.min(100,Math.max(0,Number(volume)||0))/100;
 function close(){if(closed)return;closed=true;if(counted)sessions=Math.max(0,sessions-1);rejectReady(Object.assign(Error('cancelled'),{name:'AbortError'}));env.clearTimeout(timeout);musicRequest?.abort();if(musicSource){try{musicSource.stop();}catch{}try{musicSource.disconnect();}catch{}musicSource=null;}try{musicLevel?.disconnect();}catch{}musicBuffer=null;for(const voice of remaining){voice.osc.onended=null;try{voice.osc.stop();}catch{}try{voice.osc.disconnect();voice.gain.disconnect();}catch{}}remaining.clear();for(const node of [mix,level,compressor,limiter,destination])try{node?.disconnect();}catch{}for(const track of destination?.stream.getTracks()||[])try{track.stop();}catch{}if(ctx&&ctx.state!=='closed')try{Promise.resolve(ctx.close()).catch(()=>{});}catch{}events=[];}
 try{
  ctx=new Constructor();sessions++;counted=true;destination=ctx.createMediaStreamDestination();if(!destination.stream.getAudioTracks().length)throw Error('audio-track');
  mix=ctx.createGain();mix.gain.value=.32;level=ctx.createGain();level.gain.value=gain;compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.knee.value=6;compressor.ratio.value=12;compressor.attack.value=.003;compressor.release.value=.08;
  limiter=ctx.createWaveShaper();const curve=new Float32Array(4097);for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=.8*Math.tanh(2*x)/Math.tanh(2);}limiter.curve=curve;limiter.oversample='2x';mix.connect(level);level.connect(compressor);compressor.connect(limiter);limiter.connect(destination);
  // Resume inside the user's original button click, before loading/export awaits.
  const resume=Promise.resolve(ctx.resume());
  const musicReady=options.bgm===true?(async()=>{try{
   if(env.AbortController)musicRequest=new env.AbortController();
   const response=await env.fetch(['moon-washi','quiet-garden','ink-ripples'].includes(options.track)?'/audio/candidates/'+options.track+'.wav?v=20261025-arrangements':'/audio/battle-v158.wav',{credentials:'same-origin',...(musicRequest?{signal:musicRequest.signal}:{})});
   if(!response.ok)throw Error('bgm-http');const bytes=await response.arrayBuffer();if(closed)throw Object.assign(Error('cancelled'),{name:'AbortError'});
   const buffer=await ctx.decodeAudioData(bytes);if(closed)throw Object.assign(Error('cancelled'),{name:'AbortError'});musicBuffer=buffer;
  }catch(error){throw Object.assign(Error(error.message),{name:error.name,code:'BGM_LOAD_FAILED'});}})():Promise.resolve();
  const ready=Promise.race([cancelled,Promise.all([resume.then(()=>{if(closed)throw Object.assign(Error('音声の準備を中止しました。'),{name:'AbortError'});if(ctx.state!=='running')throw Error('audio-suspended');}),musicReady]),new Promise((resolve,reject)=>{timeout=env.setTimeout(()=>reject(Error('audio-timeout')),10000);})]).then(()=>env.clearTimeout(timeout)).catch(error=>{close();throw Object.assign(Error(error.name==='AbortError'?'音声の準備を中止しました。':error.code==='BGM_LOAD_FAILED'?'BGMを読み込めませんでした。「BGMを入れる」をオフにして再試行できます。':'音声を開始できません。「ゲームの音を入れる」をオフにして保存できます。'),{name:error.name==='AbortError'?'AbortError':'Error'});});ready.catch(()=>{});
  function elapsed(){if(closed||!begun||ctx.state!=='running')throw Error('音声が中断されました。画面を開いたまま再試行するか、音をオフにしてください。');if(failure)throw failure;return Math.max(0,(ctx.currentTime-epoch)*1000);}
  function voice(event){const recipe=tones[event.type],when=epoch+event.ms/1000,end=when+recipe.duration;
   const overlapping=[...remaining].filter(v=>v.when<end&&v.end>when);if(overlapping.length>=4&&event.type!=='win'&&event.type!=='lose')return;
   const osc=ctx.createOscillator(),g=ctx.createGain(),entry={osc,gain:g,when,end};remaining.add(entry);osc.type=recipe.wave;osc.frequency.setValueAtTime(recipe.frequency,when);if(recipe.end){const method=recipe.ramp==='exponential'?'exponentialRampToValueAtTime':'linearRampToValueAtTime';osc.frequency[method](recipe.end,end);}for(const [offset,frequency] of recipe.notes||[])osc.frequency.setValueAtTime(frequency,when+offset);
   g.gain.setValueAtTime(0,when);g.gain.linearRampToValueAtTime(recipe.gain,when+.005);g.gain.exponentialRampToValueAtTime(.01,end-.005);g.gain.linearRampToValueAtTime(0,end);osc.connect(g);g.connect(mix);osc.onended=()=>{remaining.delete(entry);osc.onended=null;osc.disconnect();g.disconnect();};osc.start(when);osc.stop(end);
  }
  function advance(){const ms=elapsed();while(cursor<events.length&&events[cursor].ms<=ms+200){const event=events[cursor++];if(event.ms<ms-100)throw Error('音と映像の同期が遅れたため中止しました。「軽量」または音をオフにして再試行してください。');voice({...event,ms:Math.max(ms,event.ms)});}}
  return {ready,verify,stream:destination.stream,volume:gain,close,elapsed,advance,begin(record,intro=800){if(closed||begun||ctx.state!=='running')throw Error('音声を開始できません。音をオフにして再試行できます。');events=timeline(record,intro);epoch=ctx.currentTime;if(musicBuffer){
   musicSource=ctx.createBufferSource();musicSource.buffer=musicBuffer;musicSource.loop=true;musicLevel=ctx.createGain();
   const end=epoch+(record.turns.reduce((sum,turn)=>sum+turn.duration,0)+3000)/1000;
   musicLevel.gain.setValueAtTime(0,epoch);musicLevel.gain.linearRampToValueAtTime(.16,epoch+.3);musicLevel.gain.setValueAtTime(.16,Math.max(epoch+.3,end-.6));musicLevel.gain.linearRampToValueAtTime(0,end);
   musicSource.connect(musicLevel);musicLevel.connect(level);musicSource.start(epoch);
  }begun=true;advance();},isLive:()=>!closed&&ctx.state==='running'&&destination.stream.getAudioTracks().some(t=>t.readyState==='live'),markFailed:error=>{failure=error;}};
 }catch{close();throw Error('音声を準備できません。「ゲームの音を入れる」をオフにして保存できます。');}
}
return {tones,timeline,verify,prepare,get busy(){return sessions>0;}};
});
