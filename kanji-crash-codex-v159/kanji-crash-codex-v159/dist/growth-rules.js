(function(root,factory){const api=factory(root.KANJI_STROKES||(typeof require==='function'?require('./strokes.js'):{}),root.KanjiLevels||(typeof require==='function'?require('./level-rules.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiGrowth=api;})(typeof window!=='undefined'?window:globalThis,function(strokes,Levels){
 'use strict';
 const roles={
  attack:{name:'攻撃型',initialPower:1.12,initialWeight:.94,growthPower:1.24,growthWeight:.76},
  weight:{name:'重量型',initialPower:.94,initialWeight:1.12,growthPower:.76,growthWeight:1.24},
  balanced:{name:'均衡型',initialPower:1.03,initialWeight:1.03,growthPower:1,growthWeight:1}
 };
 const roleOverrides={},cache=new Map();
 for(const [id,chars]of Object.entries({attack:'力剣刀矢弓刃牙撃斬拳槍雷炎火速一小山十弾風独',weight:'重岩石盾口凹粘土鉄鋼塊壁堅鎧',balanced:'中和平均調合回大苗種伸'}))for(const char of chars)roleOverrides[char]=id;
 function hash(char){let value=2166136261;for(const c of char)value=Math.imul(value^c.codePointAt(0),16777619)>>>0;return value;}
 function profile(item){
  const char=typeof item==='string'?item:String(item?.char||'');if(cache.has(char))return cache.get(char);
  const han=/^\p{Script=Han}$/u.test(char),seed=hash(char),roleId=han?(roleOverrides[char]||['attack','weight','balanced'][seed%3]):'balanced';
  const role=roles[roleId],tilt=han?((seed>>>16)%9-4)*.01:0;
  const strokeCount=Number.isInteger(strokes[char])&&strokes[char]>0?strokes[char]:1,strokeBonusPercent=(strokeCount-1)*3,strokeMultiplier=1+strokeBonusPercent/100;
  const value=Object.freeze({roleId,roleName:role.name,initialPower:han?role.initialPower:1,initialWeight:han?role.initialWeight:1,growthPower:role.growthPower+tilt,growthWeight:role.growthWeight-tilt,strokeCount,strokeBonusPercent,strokeMultiplier,description:`レベルアップごとの伸びは一定。${strokeCount}画：威力・重量の成長量+${strokeBonusPercent}%（1画増えるごとに+3%）。攻撃型・重量型など文字ごとの特徴も反映します。`});cache.set(char,value);return value;
 }
 function units(level,cpu=false){return Math.max(0,(cpu?Levels.clampCpu(level):Levels.clamp(level))-1);}
 function bonuses(item,jis,level){const p=profile(item),base=22*(1+(jis-1)*.15)*p.strokeMultiplier,amount=units(level,item.cpuControlled===true);return{profile:p,power:Math.round(amount*base*p.growthPower),weight:Math.round(amount*base*p.growthWeight)};}
 return{maxLevel:Levels.max,cpuMaxLevel:Levels.cpuMax,roles,profile,units,bonuses};
});
