(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiReplayVideo=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const types=['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'];
const audioTypes=['video/mp4;codecs="avc1.42E01E,mp4a.40.2"','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
function supported(env=globalThis,withAudio=false){if(!env.MediaRecorder||!env.HTMLCanvasElement?.prototype?.captureStream)return[];return (withAudio?audioTypes:types).filter(t=>{try{return env.MediaRecorder.isTypeSupported(t);}catch{return false;}});}
function profile(kind='auto',env=globalThis){const low=kind==='compact'||kind==='auto'&&((env.navigator?.deviceMemory||8)<=2||(env.navigator?.hardwareConcurrency||8)<=4);return low?{width:540,height:960,fps:20,bitrate:1500000,maxBytes:64*1024*1024}:{width:720,height:1280,fps:24,bitrate:3000000,maxBytes:96*1024*1024};}
async function container(blob){const bytes=new Uint8Array(await blob.slice(0,16).arrayBuffer());if(bytes.length>=8&&String.fromCharCode(...bytes.slice(4,8))==='ftyp')return {type:'video/mp4',extension:'mp4'};if(bytes.length>=4&&bytes[0]===0x1a&&bytes[1]===0x45&&bytes[2]===0xdf&&bytes[3]===0xa3)return {type:'video/webm',extension:'webm'};throw Error('動画の形式を確認できませんでした。別の対応ブラウザでお試しください。');}
function wrapped(ctx,text,x,y,width,size=24,maxLines=2,color='#dce5ef'){
 const chars=Array.from(String(text||''));let lines=[];
 while(true){lines=[];ctx.font=`400 ${size}px ${ctx.videoFont||'serif'}`;for(const c of chars){if(!lines.length)lines.push('');const n=lines.length-1;if(ctx.measureText(lines[n]+c).width>width&&lines[n])lines.push(c);else lines[n]+=c;}if(lines.length<=maxLines||size<=10)break;size=Math.max(10,Math.min(size-1,Math.floor(size*maxLines/lines.length)));}
 if(lines.length>maxLines){lines=lines.slice(0,maxLines);let end=lines.at(-1);while(end&&ctx.measureText(end+'…').width>width)end=Array.from(end).slice(0,-1).join('');lines[lines.length-1]=end+'…';}
 ctx.fillStyle=color;ctx.textAlign='left';ctx.textBaseline='top';lines.forEach((line,n)=>ctx.fillText(line,x,y+n*size*1.35));return lines.length*size*1.35;
}
function paint(canvas,board,record,time,{records,drawBoard,font='serif',finished=false}){
 const ctx=canvas.getContext('2d'),scale=canvas.width/720;ctx.save();ctx.scale(scale,scale);ctx.videoFont=font;ctx.fillStyle='#080f1d';ctx.fillRect(0,0,720,1280);
 wrapped(ctx,'漢字クラッシュ',36,34,648,44,1,'#e5c78e');wrapped(ctx,record.label,36,101,648,22,3);wrapped(ctx,'自分：'+record.names[record.side],36,193,310,18,2,'#8eddf0');wrapped(ctx,'相手：'+record.names[1-record.side],374,193,310,18,2,'#f3a7a7');
 const summary=drawBoard(board.getContext('2d'),record,time);ctx.drawImage(board,36,270,648,648);const {state,pCount,eCount,ratio}=summary;
 if(finished){wrapped(ctx,record.winner===null?'引き分け':record.winner===record.side?'勝利':'敗北',36,962,648,52,1,'#e5c78e');wrapped(ctx,record.reason,36,1044,648,26,3);wrapped(ctx,`自分 ${pCount}体 ／ 相手 ${eCount}体・${record.turns.length}手`,36,1160,648,23,2);}
 else{const turn=state.turn;wrapped(ctx,turn?`第${state.index+1}手・${turn.side===record.side?'自分':'相手'}の「${record.pieces[turn.key].char}」`:'初期配置',36,958,648,28,2,'#e5c78e');wrapped(ctx,`自分 ${pCount}体 ／ 相手 ${eCount}体・土俵 ${Math.round(ratio*100)}％`,36,1034,648,23,1);const event=turn?.events.filter(e=>e.t<=state.local&&e.t>state.local-800).at(-1);if(event)wrapped(ctx,`「${record.pieces[event.key].char}」${event.name}`,36,1090,648,27,3,'#a7f3d0');}
 wrapped(ctx,`${(time/1000).toFixed(1)} / ${(records.duration(record)/1000).toFixed(1)}秒`,36,1230,648,18,1,'#9aaec5');ctx.restore();return summary;
}
function create({canvas,record,draw,duration,quality='auto',onProgress=()=>{},env=globalThis,audio=null}){
 let recorder,stream,raf=0,watchdog=0,stopTimer=0,chunks=[],bytes=0,settled=false,stopping=false,completing=false,last=0,lastPaint=-Infinity;const p=profile(quality,env),total=duration+3000;let resolve,reject;const done=new Promise((a,b)=>{resolve=a;reject=b;});
 let recordedAudio=false;const schedule=fn=>env.requestAnimationFrame(fn),clear=()=>{env.cancelAnimationFrame(raf);env.clearTimeout(watchdog);env.clearTimeout(stopTimer);if(recorder){recorder.ondataavailable=recorder.onstop=recorder.onerror=null;}if(stream)for(const track of stream.getTracks()){track.onended=null;try{track.stop();}catch{}}audio?.close();chunks=[];canvas.width=canvas.height=1;};
 function fail(error){if(settled)return;settled=true;try{if(recorder&&recorder.state!=='inactive')recorder.stop();}catch{}clear();reject(error);}
 function cancel(){fail(Object.assign(Error('動画の作成を中止しました。リプレイは残っています。'),{name:'AbortError'}));}
 async function complete(){if(settled||completing)return;completing=true;try{if(!bytes)throw Error('動画を作成できませんでした。別の対応ブラウザでお試しください。');const raw=new env.Blob(chunks,{type:recorder.mimeType||chunks[0]?.type||''}),format=await container(raw);if(settled)return;if(audio){if(!audio.isLive()||!await audio.verify(raw,format.type))throw Error('音声トラックを確認できませんでした。音をオフにして再試行できます。');recordedAudio=true;}if(settled)return;const blob=new env.Blob([raw],{type:format.type});settled=true;clear();resolve({blob,...format,width:p.width,height:p.height,duration:total,hasAudio:recordedAudio});}catch(error){fail(error);}}
 try{
  const formats=supported(env,!!audio);if(!formats.length)throw Error('この環境は動画の書き出しに対応していません。SafariやChromeの対応版で開くか、端末の画面収録でリプレイを録画してください。');
  canvas.width=p.width;canvas.height=p.height;draw(canvas,0,false);stream=canvas.captureStream(p.fps);if(audio){const tracks=audio.stream.getAudioTracks();if(!audio.isLive()||tracks.length!==1)throw Error('音声トラックを追加できません。音をオフにして再試行してください。');stream.addTrack(tracks[0]);}for(const mimeType of formats){try{recorder=new env.MediaRecorder(stream,{mimeType,videoBitsPerSecond:p.bitrate,...(audio?{audioBitsPerSecond:128000}:{})});break;}catch{}}
  if(!recorder)throw Error('この端末では動画の作成を開始できません。別の対応ブラウザでお試しください。');
  recorder.ondataavailable=e=>{if(settled||!e.data?.size)return;bytes+=e.data.size;if(bytes>p.maxBytes){fail(Error('動画が大きくなりすぎたため中止しました。「軽量」で再試行してください。リプレイは残っています。'));return;}chunks.push(e.data);};
  recorder.onerror=()=>fail(Error('動画を作成できませんでした。端末の空き容量を確認し、「軽量」で再試行してください。'));recorder.onstop=()=>{if(!stopping){fail(Error('録画が途中で停止しました。リプレイは残っています。'));return;}complete();};
  for(const track of stream.getTracks())track.onended=()=>{if(!stopping)fail(Error('録画が中断されました。画面を開いたまま再試行してください。'));};
  recorder.start(1000);if(audio)audio.begin(record,800);const began=env.performance.now();last=began;watchdog=env.setTimeout(()=>fail(Error('動画の作成が進まないため中止しました。再試行してください。')),total+20000);
  function tick(now){if(settled||stopping)return;try{if(now-last>1500)throw Error('描画が止まったため動画作成を中止しました。「軽量」で再試行してください。');last=now;const elapsed=audio?audio.elapsed():Math.max(0,now-began);audio?.advance();const time=Math.min(duration,Math.max(0,elapsed-800));if(now-lastPaint>=1000/p.fps||elapsed>=total){draw(canvas,time,elapsed>=duration+800);onProgress(Math.min(1,elapsed/total));lastPaint=now;}if(elapsed>=total){stopping=true;stopTimer=env.setTimeout(()=>fail(Error('動画の仕上げに失敗しました。再試行してください。')),5000);recorder.stop();}else raf=schedule(tick);}catch(error){fail(error);}}
  raf=schedule(tick);
 }catch(error){fail(error);}
 return {done,cancel};
}
return {types,audioTypes,supported,profile,container,wrapped,paint,create};
});
