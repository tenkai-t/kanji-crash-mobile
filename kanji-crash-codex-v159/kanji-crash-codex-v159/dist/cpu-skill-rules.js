(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiCpuSkill=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const chars=['一','山','小'],formation=[{x:0,y:.28,angle:0},{x:-.43,y:.65,angle:0},{x:.43,y:.65,angle:0}];
const stages=[{id:'cpu-skill-basic',name:'CPU腕試し・基本',enemies:['二','木','口']},{id:'cpu-skill-defense',name:'CPU腕試し・突破',enemies:['大','川','盾']},{id:'cpu-skill-spin',name:'CPU腕試し・回転',enemies:['回','矢','凹']}].map(s=>Object.freeze({...s,kind:'cpu-skill',reward:0,condition:'廃止済み課題（読込互換用）',playerLevel:10,enemyLevel:10,points:formation}));
const firstSeason='2026-10',seasonId=(now=Date.now())=>new Date(now+9*3600000).toISOString().slice(0,7);
function validSeason(id){return /^20\d{2}-(0[1-9]|1[0-2])$/.test(id||'')&&id>=firstSeason;}
function bounds(id){if(!validSeason(id)||id==='legacy')return null;const [y,m]=id.split('-').map(Number);return{start:Date.UTC(y,m-1,1)-9*3600000,end:Date.UTC(y,m,1)-9*3600000};}
const monthIndex=id=>{const [y,m]=id.split('-').map(Number);return(y-2026)*12+m-10;};
const loans=[['一','山','小'],['大','矢','盾'],['木','火','水'],['回','弾','十']];
const foes=[['二','三','川'],['大','川','盾'],['回','矢','凹'],['金','土','火'],['木','水','山'],['風','独','粘'],['日','月','口']];
const layouts=[formation,[{x:0,y:.35,angle:0},{x:-.48,y:.62,angle:-.2},{x:.48,y:.62,angle:.2}],[{x:-.36,y:.37,angle:0},{x:.36,y:.37,angle:0},{x:0,y:.72,angle:.2}]];
const names=['基本','突破','回転','相性','応用'];
function seasonStages(id=seasonId()){if(id==='legacy')return[];if(!validSeason(id))return[];const n=monthIndex(id);return names.map((name,i)=>({id:'cpu-skill-season-'+(i+1),name:'CPU腕試し・'+name,kind:'cpu-skill',reward:0,playerLevel:10,enemyLevel:10,season:id,chars:loans[n%loans.length].slice(),enemies:foes[(i+n)%foes.length].slice(),formation:layouts[(n+i)%layouts.length].map(p=>({...p})),points:layouts[(n+i+1)%layouts.length].map(p=>({...p})),condition:'共通の貸出3体で勝利。生存数・発射回数を評価。同点時は早い撃破を優先'}));}
const get=(id,season=seasonId())=>stages.find(s=>s.id===id)||seasonStages(season).find(s=>s.id===id);
function team(database,stage=null){return(stage?.chars||chars).map((char,n)=>({...database.find(i=>i.char===char),instanceId:'inst_cpu_skill_'+n,level:10,exp:0,ruby:'',rubyUnlocked:false,equippedReadings:[],unlockedReadings:[],teamLink:undefined}));}
function power(e){return(e?.cpuSkill?.powers||[]).reduce((a,b)=>a+b,0);}
// Store thousandths for compatibility; current points are integers.
function recordScore(r){if(!r||r.shots<1)return 0;return (1000+r.survivors*100+Math.max(0,300-(r.shots-1)*20))*1000;}
function breakdown(e){if(e?.outcome!=='win'||!e.cleared)return{victory:0,survival:0,shots:0};return{victory:1000,survival:e.survivors*100,shots:Math.max(0,300-(e.shots-1)*20)};}
function score(e){if(e?.outcome!=='win'||!e.cleared)return 0;return e.cpuSkill?recordScore(e):1000+e.survivors*100+Math.max(0,100-e.shots*5);}
function killTotal(e){return e?.cpuSkill?.version===3?e.cpuSkill.killTurns.reduce((a,b)=>a+b,0):Math.max(1,e?.shots||1)*3;}
function better(a,b){return a.score>b.score||a.score===b.score&&(a.killTotal??a.shots*3)<(b.killTotal??b.shots*3);}
function valid(e){const c=get(e?.challenge,e?.cpuSkill?.season),loan=c?.chars||chars;if(!c||e.items?.length!==3||!e.items.every((i,n)=>i.char===loan[n])||e.shots!==e.items.reduce((sum,i)=>sum+i.shots,0)||e.survivors!==e.items.filter(i=>i.survived).length||e.shots<0||e.shots>36||e.cleared&&(e.outcome!=='win'||e.survivors<1||e.shots<1))return false;if(c.season&&e.cpuSkill?.version===3)return Array.isArray(e.cpuSkill.killTurns)&&e.cpuSkill.killTurns.length===3&&e.cpuSkill.killTurns.every((n,i,a)=>Number.isInteger(n)&&n>=1&&n<=e.shots+1&&(!i||n>=a[i-1]));if(c.season)return e.cpuSkill?.version===2&&Array.isArray(e.cpuSkill.powers)&&e.cpuSkill.powers.length===e.shots&&e.cpuSkill.powers.every(p=>Number.isInteger(p)&&p>=0&&p<=1000);return e.cpuSkill===undefined;}
function canSubmit(id,now=Date.now()){const b=bounds(id);return !!b&&now>=b.start&&now<b.end+15*60000;}
function formatScore(n,season){return(season==='legacy'?n:n/1000).toLocaleString('ja-JP',{minimumFractionDigits:0,maximumFractionDigits:3});}
function seasons(now=Date.now()){const current=seasonId(now),list=[];for(let n=monthIndex(current);n>=0;n--){const y=2026+Math.floor((n+9)/12),m=(n+9)%12+1,id=y+'-'+String(m).padStart(2,'0');list.push({id,label:`${y}年${m}月`,...bounds(id),current:id===current});}return{current,serverNow:now,seasons:list};}
return{chars,formation,stages,firstSeason,seasonId,validSeason,bounds,seasonStages,get,team,score,recordScore,breakdown,power,killTotal,better,valid,canSubmit,formatScore,seasons};
});
