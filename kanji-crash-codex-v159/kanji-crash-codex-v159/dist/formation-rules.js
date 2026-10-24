(function(root,factory){const api=factory(root.Matter||(typeof require==='function'?require('./vendor/matter.min.js'):null),root.KanjiTraits||(typeof require==='function'?require('./character-traits.js'):null));if(typeof module==='object'&&module.exports)module.exports=api;else root.KanjiFormation=api;})(typeof window!=='undefined'?window:globalThis,function(Matter,Traits){
 'use strict';
 const defaults=[{x:0,y:.28,angle:0},{x:-.43,y:.65,angle:0},{x:.43,y:.65,angle:0}];
 const copy=points=>points.map(p=>({x:p.x,y:p.y,angle:p.angle||0}));
 function validPreset(points){return Array.isArray(points)&&points.length===3&&points.every(p=>p&&['x','y','angle'].every(k=>Number.isFinite(p[k]))&&Math.abs(p.x)<=1&&p.y>=0&&p.y<=1&&Math.abs(p.angle)<=Math.PI);}
 function validSave(data){if(data.formationPresets===undefined&&data.activeFormation===undefined)return true;
  if(!Array.isArray(data.formationPresets)||data.formationPresets.length!==3||data.formationPresets.some(p=>p!==null&&!validPreset(p)))return false;
  return data.activeFormation===null||(Number.isInteger(data.activeFormation)&&data.activeFormation>=0&&data.activeFormation<3&&data.formationPresets[data.activeFormation]!==null);
 }
 function normalize(data){data.formationPresets=Array.isArray(data.formationPresets)?data.formationPresets.map(p=>p?copy(p):null):[null,null,null];data.activeFormation=Number.isInteger(data.activeFormation)&&data.formationPresets[data.activeFormation]?data.activeFormation:null;return data;}
 function makeBodies(items,points,scale=1/150){return items.map((item,i)=>Traits.createBody(item,points[i].x,points[i].y,scale,{},points[i].angle));}
 function inside(b){if(!b.traitOutline)return b.position.y-b.circleRadius>=.015&&Math.hypot(b.position.x,b.position.y)+b.circleRadius<=.97;
  return (b.parts.length>1?b.parts.slice(1):[b]).every(p=>p.vertices.every(v=>v.y>=.015&&Math.hypot(v.x,v.y)<=.97));
 }
 const physicalParts=b=>b.parts.length>1?b.parts.slice(1):[b];
 function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
 function edgeDistance(point,vertices){return Math.min(...vertices.map((v,i)=>segmentDistance(point,v,vertices[(i+1)%vertices.length])));}
 function overlap(a,b){
  // At normalized editor scale Matter approximates circles with fewer vertices.
  // Use exact circles and a 0.9px-at-150px gap so real match pieces never start touching.
  const gap=.006,roundA=!a.traitOutline,roundB=!b.traitOutline;
  if(roundA&&roundB)return Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y)<=a.circleRadius+b.circleRadius+gap;
  if(roundA||roundB){const circle=roundA?a:b,polygon=roundA?b:a;return Matter.Query.point([polygon],circle.position).length>0||physicalParts(polygon).some(p=>edgeDistance(circle.position,p.vertices)<=circle.circleRadius+gap);}
  return physicalParts(a).some(p=>physicalParts(b).some(q=>Matter.Collision.collides(p,q)!==null||p.vertices.some(v=>edgeDistance(v,q.vertices)<gap)||q.vertices.some(v=>edgeDistance(v,p.vertices)<gap)));
 }
 function valid(items,points){if(!points||points.length<items.length)return false;const bodies=makeBodies(items,points);return bodies.every((b,i)=>inside(b)&&bodies.slice(0,i).every(a=>!overlap(a,b)));}
 function fit(items,requested=defaults){const result=copy(defaults),placed=[];let adjusted=false;
  for(let i=0;i<items.length;i++){
   const want=requested?.[i]||defaults[i],angle=Number.isFinite(want.angle)?want.angle:0;
   const candidates=[{x:want.x,y:want.y,angle}];
   const grid=[];for(let y=.08;y<=.87;y+=.05)for(let x=-.8;x<=.81;x+=.05)grid.push({x,y,angle});
   grid.sort((a,b)=>Math.hypot(a.x-want.x,a.y-want.y)-Math.hypot(b.x-want.x,b.y-want.y));candidates.push(...grid);
   let chosen=null,body;
   for(const p of candidates){const b=Traits.createBody(items[i],p.x,p.y,1/150,{},p.angle);if(inside(b)&&placed.every(a=>!overlap(a,b))){chosen=p;body=b;break;}}
   if(!chosen)throw Error('配置できる場所がありません');
   result[i]=chosen;placed.push(body);adjusted||=Math.hypot(chosen.x-want.x,chosen.y-want.y)>.0001;
  }
  return{points:result,adjusted};
 }
 function move(items,points,index,next){const result=copy(points);result[index]=next;return valid(items,result)?result:null;}
 function random(items,rng=Math.random){
  const points=copy(defaults),placed=[];
  const sample=item=>{const distance=.30+rng()*.43,a=.32+rng()*(Math.PI-.64),x=Math.cos(a)*distance,y=Math.sin(a)*distance;
   const directional=['山','矢','盾','凹'].includes(item.char);
   return{x,y,angle:wrapAngle(directional?Math.atan2(-x,y)+(rng()-.5)*.24:(rng()-.5)*Math.PI*2)};
  };
  for(let i=0;i<items.length;i++){
   let body=null;
   for(let attempt=0;attempt<100;attempt++){const p=sample(items[i]),candidate=Traits.createBody(items[i],p.x,p.y,1/150,{},p.angle);
    if(inside(candidate)&&placed.every(b=>!overlap(b,candidate)&&Math.hypot(b.position.x-p.x,b.position.y-p.y)>=.40)){points[i]=p;body=candidate;break;}
   }
   if(!body){
    try{return fit(items,defaults.map((p,n)=>({...p,x:p.x+(rng()-.5)*.10,y:p.y+(rng()-.5)*.10,angle:0}))).points;}
    // Some random orientations leave no room for the last piece. Neutral
    // placement fits every supported shape combination and keeps the match usable.
    catch{return fit(items,items.map((item,n)=>({...defaults[n],angle:0}))).points;}
   }
   placed.push(body);
  }
  return points;
 }
 function wrapAngle(angle){return Math.atan2(Math.sin(angle),Math.cos(angle));}
 return{defaults,copy,validPreset,validSave,normalize,makeBodies,inside,overlap,valid,fit,random,move,wrapAngle};
});
