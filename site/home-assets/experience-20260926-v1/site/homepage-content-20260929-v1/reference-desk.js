import {dt as Vector2,ft as Vector3,k as Group,L as Mesh,G as PlaneGeometry,tt as ShaderMaterial,ot as Texture} from '/home-assets/experience-20260926-v1/site/assets/world-runtime-performance-20260927-v1.js';
import {OryzoPropPhysics,heroScenePropsData} from './oryzo-physics.js';

const UNIT=.0042;
const vertexShader=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
// ORYZO provides three angular color views and a height channel in one atlas.
// Blend the same neighboring color views using the original oscillation value.
const fragmentShader=`
uniform sampler2D colorMap;uniform sampler2D alphaMap;
uniform vec3 angleInfo;uniform float opacity;uniform bool shadow;
varying vec2 vUv;
void main(){
 float a=texture2D(alphaMap,vUv).r*opacity;
 if(a<.002)discard;
 vec3 c1=pow(texture2D(colorMap,vec2((vUv.x+angleInfo.x)*.25,vUv.y)).rgb,vec3(2.2));
 vec3 c2=pow(texture2D(colorMap,vec2((vUv.x+angleInfo.y)*.25,vUv.y)).rgb,vec3(2.2));
 vec3 color=shadow?vec3(.035,.031,.025):pow(mix(c1,c2,angleInfo.z),vec3(1.0/2.2));
 gl_FragColor=vec4(color,a);
}`;

function imageTexture(url,signal){
 return new Promise((resolve,reject)=>{
  const image=new Image();
  const abort=()=>{image.src='';reject(new DOMException('Aborted','AbortError'))};
  signal.addEventListener('abort',abort,{once:true});
  image.onload=()=>{signal.removeEventListener('abort',abort);const texture=new Texture(image);texture.needsUpdate=true;resolve(texture)};
  image.onerror=()=>{signal.removeEventListener('abort',abort);reject(new Error('Unable to load ORYZO prop '+url))};
  image.src=url;
 });
}

export function createReferenceDeskProps(desk){
 const root=new Group();root.name='ORYZO_original_interactive_props';desk.add(root);
 const control=new AbortController(),signal=control.signal;
 const props=[],textures=[],materials=[],geometry=[];
 const pointer=new Vector2(),point=new Vector3(),direction=new Vector3(),origin=new Vector3();
 const eased=new Vector2();let pointerSeen=false,easingStarted=false,disposed=false;
 let lastScreenX=0,lastScreenY=0,interactions=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const onPointer=event=>{
  if(document.querySelector('dialog[open]')||document.documentElement.matches('.menu-page-open,.menu-transition,.game-playing')||document.body.matches('.menu-page-open,.menu-transition,.game-playing')){pointerSeen=false;return}
  if(event.target.closest?.('a,button:not(.hero-drag-surface),input,dialog,.site-header')){pointerSeen=false;return}
  lastScreenX=event.clientX;lastScreenY=event.clientY;
  pointer.set(event.clientX/innerWidth*2-1,1-event.clientY/innerHeight*2);pointerSeen=true;
 };
 window.addEventListener('pointermove',onPointer,{passive:true,capture:true,signal});
 window.addEventListener('pointerdown',onPointer,{passive:true,signal});
 const clearTouch=event=>{if(event.pointerType==='touch'){pointerSeen=false;easingStarted=false}};
 window.addEventListener('pointerup',clearTouch,{passive:true,signal});
 window.addEventListener('pointercancel',clearTouch,{passive:true,signal});
 window.addEventListener('blur',()=>{pointerSeen=false;easingStarted=false},{signal});
 document.addEventListener('pointerleave',()=>{pointerSeen=false;easingStarted=false},{signal});
 const ready=Promise.all(Object.entries(heroScenePropsData).map(async([id,data])=>{
  const pair=await Promise.all(['color','alpha'].map(channel=>imageTexture(new URL('./oryzo-props/'+id+'_'+channel+'.webp',import.meta.url).href,signal)));
  if(disposed){pair.forEach(t=>t.dispose());return}
  textures.push(...pair);
  const physics=new OryzoPropPhysics(id,data),group=new Group();
  group.name='oryzo_'+id;group.rotation.x=-Math.PI/2;root.add(group);
  const uniforms={colorMap:{value:pair[0]},alphaMap:{value:pair[1]},angleInfo:{value:new Vector3(1,2,0)},opacity:{value:1},shadow:{value:false}};
  const mat=new ShaderMaterial({uniforms,vertexShader,fragmentShader,transparent:true,depthWrite:false,toneMapped:false});
  const geo=new PlaneGeometry(data.width*UNIT,data.height*UNIT);
  const mesh=new Mesh(geo,mat);mesh.renderOrder=3;group.add(mesh);
  const shadowMat=new ShaderMaterial({uniforms:{...uniforms,opacity:{value:.32},shadow:{value:true}},vertexShader,fragmentShader,transparent:true,depthWrite:false,toneMapped:false});
  const shadow=new Mesh(geo,shadowMat);shadow.position.set(-.018,-.032,-.024);shadow.renderOrder=2;group.add(shadow);
  materials.push(mat,shadowMat);geometry.push(geo);
  props.push({id,physics,group,mat,shadowMat});
  group.position.set(physics.position.x*UNIT,.105,-physics.position.y*UNIT);
  group.rotation.z=physics.rotation;
 }));
 ready.catch(error=>{if(!disposed){root.userData.error=error.message;console.error(error)}});
 return {root,ready,
  update(dt,camera,fade,paused=false){
   if(disposed)return;
   root.visible=fade<.999;
   const active=root.visible&&!paused&&!reduced.matches;
   const steps=Math.max(1,Math.ceil(Math.min(dt,.05)/(1/120))),step=Math.min(dt,.05)/steps;
   let inputValid=false;
   if(active&&pointerSeen){
    camera.updateMatrixWorld();desk.updateWorldMatrix(true,false);
    origin.copy(camera.position);point.set(pointer.x,pointer.y,.5).unproject(camera);direction.copy(point).sub(origin).normalize();
    desk.worldToLocal(origin);point.copy(camera.position).add(direction);desk.worldToLocal(point);direction.copy(point).sub(origin);
    const distance=(.105-origin.y)/direction.y;
    if(Number.isFinite(distance)&&distance>0){
     point.copy(origin).addScaledVector(direction,distance);
     const target=new Vector2(point.x/UNIT,-point.z/UNIT);
     if(!easingStarted){eased.copy(target);props.forEach(({physics:p})=>p.mouse.copy(eased));easingStarted=true}
     eased.lerp(target,1-Math.exp(-dt*22));inputValid=true;
    }
   }else easingStarted=false;
   for(const item of props){
    const p=item.physics;
    p.mouseVelocity.copy(eased).sub(p.mouse).divideScalar(Math.max(dt,.001));p.mouse.copy(eased);
    for(let index=0;active&&index<steps;index++){
     if(inputValid){const hit=p.getInteraction();if(hit){p.applyForces(step,hit);interactions++}}
     // The original uses the prop axis for oscillation; keep it fresh even without a hit.
     else p.getInteraction();
     p.integrate(step);p.updateCoords();
    }
    item.group.position.set((p.position.x+p.oscillationDisplacement.x)*UNIT,.105,-(p.position.y+p.oscillationDisplacement.y)*UNIT);
    item.group.rotation.z=p.rotation;
    const angle=Math.max(0,Math.min(2,p.oscillationPosition/p.physics.angularRGBRange+1)),a=Math.floor(angle);
    item.mat.uniforms.angleInfo.value.set(a,Math.min(a+1,2),angle%1);
    item.mat.uniforms.opacity.value=1-fade*fade;item.shadowMat.uniforms.opacity.value=.32*(1-fade*fade);
   }
   root.userData.interactions=interactions;
   root.userData.pointer={seen:pointerSeen,active,inputValid,screenX:lastScreenX,screenY:lastScreenY,x:eased.x,y:eased.y};
   root.userData.props=props.map(({id,physics:p})=>({id,displacement:p.positionDisplacement.length(),rotation:p.rotationDisplacement,oscillation:p.oscillationPosition}));
  },
  dispose(){if(disposed)return;disposed=true;control.abort();root.removeFromParent();textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometry.forEach(g=>g.dispose())}
 };
}
