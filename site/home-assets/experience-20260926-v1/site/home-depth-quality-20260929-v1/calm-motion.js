import {sampleProductJourney} from './journey-math.js';

export const clamp01=n=>Math.max(0,Math.min(1,n));
export const soft=(n,a=0,b=1)=>{const p=clamp01((n-a)/(b-a));return p*p*p*(p*(p*6-15)+10)};
const mix=(a,b,p)=>a+(b-a)*p;
// The product director takes over at 29.6 in both scroll directions.
export const readingCopyExit=t=>1-soft(t,29.3,29.59);
const pose=(camera,target,head,scale,rotation=[0,0,0])=>({camera,target,head,scale,rotation});

// Reading order is the motion timeline. Removed chapters must not leave their
// old camera moves hidden inside a short transition to the next visible chapter.
export function sampleCalmScene(index,fraction,panels){
  const panel=panels[index],start=Number(panel.dataset.scene);
  const end=Number(panel.dataset.sceneEnd??start),next=Number(panels[index+1]?.dataset.scene??end);
  const f=clamp01(fraction);
  if(panel.dataset.journey==='true')return mix(start,end,f);
  if(panel.id==='hello')return mix(start,next,soft(f,.08,1));
  if(f<.32)return mix(start,end,soft(f,0,.32));
  return mix(end,next,soft(f,.32,1));
}

function readingPose(id,{mobile=false,landscape=false,reduced=false,aspect=1.7}={}){
  const cam=mobile?[0,.25,10.3]:[0,.25,10.4],target=[0,.1,0];
  const front=(head,scale,rotation=[0,0,0])=>{const room=mobile?1:Math.min(1,aspect/1.4);return pose(cam.slice(),target.slice(),[head[0]*room,head[1],head[2]],scale*room,rotation)};
  if(id==='hello'){
    const room=soft(aspect,1.3,1.65);
    return mobile?pose([0,14,9.2],[0,0,-.4],[0,1.62,.3],3.75,[-Math.PI/2,-.08,0]):pose([-.15,11,6.5],[0,0,-.4],[mix(.55,.95,room),1.55,1.75],mix(2.95,3.65,room),[-Math.PI/2,-.08,0]);
  }
  if(id==='real-demand')return mobile?pose([0,.25,10.3],[0,0,0],[0,1.55,.1],1.92):pose([0,.55,10],[0,.15,0],[0,.68,0],2.78*Math.min(1,aspect/1.35));
  if(id==='define-the-result')return front(mobile?[0,1.75,.1]:[1.85,.35,.15],mobile?1.95:3.25);
  if(['first-principles','in-the-field'].includes(id))return front(mobile?[0,2.08,.1]:[1.85,.22,.15],mobile?1.25:2.4,[0,id==='first-principles'?-.07:.07,0]);
  if(['field-notes','dining-case','training-case','cocreation-case','evidence'].includes(id))return mobile?front([.6,1.92,.5],1.4):pose([0,.2,11],[0,0,0],[Math.min(4,2.52*aspect),2.15,.2],Math.min(.92,aspect*.74));
  if(['rebirth','follow-your-heart','face-the-fear'].includes(id))return front(mobile?[0,1.72,.1]:[2.25,.65,0],mobile?2.3:3.9);
  if(id==='from-courage-to-work')return front(mobile?[0,1.8,.1]:[1.8,.92,.1],mobile?1.7:3.35);
  if(id==='products'){const p=sampleProductJourney(30,{mobile,landscape,reduced,aspect});return pose(p.camera,p.target,p.head,p.scale,p.rotation)}
  return front(mobile?[0,1.65,.1]:[1.9,.35,.1],mobile?2.1:3.3);
}

export function sampleCalmPose(index,fraction,panels,options={}){
  const panel=panels[index],f=clamp01(fraction);
  if(panel.dataset.journey==='true'){
    const t=options.position??sampleCalmScene(index,f,panels),p=sampleProductJourney(t,options);
    return pose(p.camera,p.target,p.head,p.scale,p.rotation);
  }
  const a=readingPose(panel.id,options),b=readingPose(panels[index+1]?.id??panel.id,options);
  const p=soft(f,panel.id==='hello'?.08:.30,1);
  const result={scale:Math.exp(mix(Math.log(a.scale),Math.log(b.scale),p))};
  for(const key of ['camera','target','head','rotation'])result[key]=a[key].map((v,i)=>mix(v,b[key][i],p));
  // A restrained quarter-view during the lift replaces the compressed full spin.
  if(panel.id==='hello'&&!options.reduced){result.rotation[1]-=.20*Math.sin(Math.PI*p);result.rotation[2]+=.018*Math.sin(Math.PI*p)}
  return result;
}

export function applyCalmPose(current,index,fraction,panels,options){
  Object.assign(current,sampleCalmPose(index,fraction,panels,options));
}

export function rotationBlend(angle,dt,rate=9,maxSpeed=2.2){
  if(angle<1e-7)return 1;
  return Math.min(1-Math.exp(-rate*dt),maxSpeed*dt/angle);
}

// Protect wheel bursts and reversals from an instantaneous orientation change.
// Camera and object use the same damping so their relative placement stays coherent.
export function createCalmMotion({hero,camera,stage}){
  let state=null,reset=true;
  const markReset=()=>{reset=true};
  addEventListener('isaac:jump',markReset);addEventListener('isaac:entered',markReset);
  function update(dt,t,reduced,active){
    const target={head:hero.position.clone(),rotation:hero.quaternion.clone(),scale:hero.scale.x,camera:camera.position.clone(),cameraRotation:camera.quaternion.clone(),fov:camera.fov};
    if(!state||reset||reduced||active){state=target;reset=false;stage.dataset.motionStepDegrees='0';return}
    const amount=1-Math.exp(-9*dt),handoff=soft(t,37.65,37.92),a=mix(amount,1,handoff);
    const angle=state.rotation.angleTo(target.rotation),q=mix(rotationBlend(angle,dt),1,handoff);
    state.head.lerp(target.head,a);state.camera.lerp(target.camera,a);
    state.rotation.slerp(target.rotation,q);state.cameraRotation.slerp(target.cameraRotation,a);
    state.scale=Math.exp(mix(Math.log(state.scale),Math.log(target.scale),a));state.fov=mix(state.fov,target.fov,a);
    hero.position.copy(state.head);hero.quaternion.copy(state.rotation);hero.scale.setScalar(state.scale);
    camera.position.copy(state.camera);camera.quaternion.copy(state.cameraRotation);camera.fov=state.fov;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    stage.dataset.motionStepDegrees=(angle*q*180/Math.PI).toFixed(3);
    stage.dataset.motionScale=state.scale.toFixed(4);
    stage.dataset.motionPosition=hero.position.toArray().map(v=>v.toFixed(4)).join(',');
  }
  return{update,reset:markReset,dispose(){removeEventListener('isaac:jump',markReset);removeEventListener('isaac:entered',markReset)}};
}
