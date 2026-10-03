if(new URLSearchParams(location.search).get('menu-frame')!=='1'){
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
let busy=false,active=null,snapshot=null,homeScroll=0,progress=0,pending=null;
const homeTitle=document.title;
function makeFrame(){const f=document.createElement('iframe');f.className='menu-page';f.title='页面内容';f.hidden=true;return f}
let frame=makeFrame();
// These two static reading pages may be retained. Never retain GPU scenes.
const readingPages=new Map(),warmReadingPages=new Map();
const instantReading=path=>/^\/(strategy|enterprise-faq)\/?$/.test(path); 
const canRetain=path=>path==='/services/'||instantReading(path);
const veil=document.createElement('div');veil.className='menu-veil';veil.setAttribute('aria-hidden','true');
const status=document.createElement('div');status.className='menu-status';status.role='status';status.hidden=true;status.textContent='正在打开页面…';
const ready=()=>document.body?Promise.resolve():new Promise(r=>addEventListener('DOMContentLoaded',r,{once:true}));
await ready();document.body.append(frame,veil,status);
function capture(){const engine=window.isaacHomeScene;engine.pauseInteraction?.();const {camera,hero}=engine;return {camera:camera.position.clone(),quaternion:camera.quaternion.clone(),near:camera.near,fov:camera.fov,position:hero.position.clone(),scale:hero.scale.clone(),hero:hero.quaternion.clone(),eye:hero.position.clone(),height:hero.scale.x};}
function fixedHomeSnapshot(){
 scrollTo({top:0,behavior:'instant'});dispatchEvent(new Event('isaac:jump'));
 const engine=window.isaacHomeScene;
 if(!engine)return null;
 engine.prepareHomeReturn();homeScroll=0;return capture();
}
let scratch=null,animationEpoch=0;
const ease=x=>x*x*(3-2*x);
function draw(t){
 progress=t;document.documentElement.dataset.menuTransition=t.toFixed(3);
 const engine=window.isaacHomeScene;if(!engine||!snapshot)return;
 const {camera,hero,scene,renderer}=engine;
 // The live homepage model is used. Scroll choreography is suspended only here.
 if(!scratch)scratch={eye:hero.position.clone(),front:hero.position.clone(),aim:hero.position.clone(),destination:hero.position.clone(),point:hero.position.clone(),facing:camera.quaternion.clone(),upright:hero.quaternion.clone().set(0,0,0,1)};
 const turn=ease(Math.min(1,t/.38));hero.quaternion.copy(snapshot.hero).slerp(scratch.upright,turn);hero.updateWorldMatrix(true,false);
 const eye=scratch.eye.set(.10,.006,.281);eye.applyMatrix4(hero.matrixWorld);
 const front=scratch.front.copy(hero.position);front.z+=Math.max(4.5,snapshot.height*1.6);front.y+=.1;
 const aim=scratch.aim.copy(hero.position);aim.y+=.03;
 const zoom=ease(Math.max(0,(t-.30)/.70));
 camera.position.copy(snapshot.camera).lerp(front,turn);scratch.destination.copy(eye);scratch.destination.z+=.028;camera.position.lerp(scratch.destination,zoom);
 const target=aim.lerp(eye,zoom);camera.lookAt(target);if(t<.38){const facing=scratch.facing.copy(camera.quaternion);camera.quaternion.copy(snapshot.quaternion).slerp(facing,turn);}
 if(camera.near!==.001){camera.near=.001;camera.updateProjectionMatrix();}camera.updateMatrixWorld();renderer.render(scene,camera);
 const point=scratch.point.copy(eye).project(camera),x=(point.x*.5+.5)*innerWidth,y=(-point.y*.5+.5)*innerHeight;
 const reveal=ease(Math.max(0,(t-.62)/.38));const radius=reveal*Math.hypot(innerWidth,innerHeight);
 frame.style.clipPath=`circle(${radius}px at ${x}px ${y}px)`;
 document.body.style.setProperty('--menu-copy-opacity',String(1-ease(Math.min(t/.25,1))));
}
async function animate(from,to){
 const epoch=++animationEpoch,duration=reduced.matches?100:1350;let elapsed=0,last=null;
 await new Promise((resolve,reject)=>{function tick(now){
  try{
   if(epoch!==animationEpoch){resolve();return}
   if(document.hidden){last=null;requestAnimationFrame(tick);return}
   if(last!==null)elapsed+=Math.min(50,Math.max(0,now-last));last=now;
   const t=Math.min(1,elapsed/duration);draw(from+(to-from)*t);
   if(t<1)requestAnimationFrame(tick);else resolve();
  }catch(error){reject(error)}
 }requestAnimationFrame(tick)});
}

function restore(){animationEpoch++;if(snapshot&&window.isaacHomeScene){const {camera,hero}=window.isaacHomeScene;camera.position.copy(snapshot.camera);camera.quaternion.copy(snapshot.quaternion);camera.near=snapshot.near;camera.fov=snapshot.fov;camera.updateProjectionMatrix();hero.position.copy(snapshot.position);hero.scale.copy(snapshot.scale);hero.quaternion.copy(snapshot.hero);hero.updateMatrixWorld(true);window.isaacHomeScene.resumeInteraction?.()}window.isaacPortalFrame=null;snapshot=null;document.body.classList.remove('menu-transition','menu-page-open');document.body.style.removeProperty('--menu-copy-opacity');delete document.documentElement.dataset.menuTransition;}
function closeMenus(immediate=false){return document.querySelector('isaac-site-navigation')?.closeNavigation?.({fast:true,immediate})||Promise.resolve()}
function connectFrameLifecycle(target){
 const win=target.contentWindow;if(!win||target.pauseFrames)return;
 const request=win.requestAnimationFrame.bind(win),cancel=win.cancelAnimationFrame.bind(win);
 let suspended=false,serial=0;const jobs=new Map();
 function schedule(id,job){job.native=request(now=>{job.native=null;if(suspended)return;jobs.delete(id);job.callback(now)})}
 win.requestAnimationFrame=callback=>{const id=--serial,job={callback,native:null};jobs.set(id,job);if(!suspended)schedule(id,job);return id};
 win.cancelAnimationFrame=id=>{const job=jobs.get(id);if(job){if(job.native!==null)cancel(job.native);jobs.delete(id)}else cancel(id)};
 target.pauseFrames=()=>{win.dispatchEvent(new win.Event('isaac:page-pause'));if(suspended)return;suspended=true;for(const job of jobs.values()){if(job.native!==null)cancel(job.native);job.native=null}};
 target.resumeFrames=()=>{win.dispatchEvent(new win.Event('isaac:page-activate'));if(!suspended)return;suspended=false;for(const [id,job] of jobs)schedule(id,job)};
}

function connectEmbedded(target){
 connectFrameLifecycle(target);
 const doc=target.contentDocument;if(!doc)return;
 doc.documentElement.dataset.portalEmbedded='true';
 const css=doc.createElement('style');css.textContent='.site-header,isaac-site-navigation{display:none!important}body{padding-top:100px!important}';doc.head.append(css);
 doc.addEventListener('click',event=>{const a=event.composedPath().find(node=>node?.tagName==='A');if(!a||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||a.target==='_blank')return;const url=new URL(a.href);if(url.origin!==location.origin&&url.origin!=='https://isaac2024.online')return;if(url.pathname===new URL(target.src,location.origin).pathname&&url.hash)return;url.searchParams.delete('menu-frame');if(!isContentRoute(url))return;event.preventDefault();event.stopImmediatePropagation();go(url.pathname+url.search+url.hash)},true);
}
function isContentRoute(url){return url.pathname==='/'||/^\/(work|strategy|enterprise-faq|about|services|knowledge|cases)(\/|$)/.test(url.pathname)}
function frameDocumentReady(target){
 try{
  const doc=target.contentDocument;
  if(!doc||!doc.body||!doc.URL||doc.URL==='about:blank'||doc.readyState==='loading')return false;
  if(new URL(doc.URL).origin!==location.origin)return false;
  return [...doc.querySelectorAll('link[rel="stylesheet"]')].every(link=>link.disabled||(link.media&&!matchMedia(link.media).matches)||!!link.sheet);
 }catch{return false}
}
async function load(url,target=frame,{quiet=false}={}){
 if(!quiet)status.hidden=false;target.hidden=false;
 await new Promise((resolve,reject)=>{
  let done=false,poll;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);clearTimeout(poll);target.onload=null;try{connectEmbedded(target);resolve()}catch(error){reject(error)}};
  const probe=()=>{if(done)return;if(frameDocumentReady(target))finish();else poll=setTimeout(probe,32)};
  const timer=setTimeout(()=>{if(done)return;done=true;clearTimeout(poll);target.onload=null;reject(new Error('页面暂未载入，请稍后重试'))},20000);
  target.onload=finish;
  const destination=new URL(url,location.origin);destination.searchParams.set('menu-frame','1');if(!active&&destination.pathname==='/work/')destination.searchParams.set('portal-wait','1');
  const source=destination.pathname+destination.search+destination.hash;
  // Adopt parser-started frames without resetting src (which would reload them).
  if(target.getAttribute?.('src')!==source)target.src=source;
  poll=setTimeout(probe,0);
 });
}

function preparePage(path){
 if(active===path)return {target:frame,ready:Promise.resolve(frame)};
 const warmed=warmReadingPages.get(path);
 if(warmed){warmReadingPages.delete(path);warmed.target.inert=false;warmed.target.removeAttribute?.('aria-hidden');warmed.target.style.pointerEvents='';warmed.target.style.zIndex='112';warmed.target.hidden=false;return warmed}
 const cached=readingPages.get(path);
 const incoming=cached||makeFrame();incoming.resumeFrames?.();incoming.style.opacity='0';incoming.style.zIndex='112';incoming.hidden=false;
 if(!cached)document.body.append(incoming);
 const ready=cached?Promise.resolve(incoming):load(path,incoming).then(()=>incoming);
 // Attach rejection handling while the menu is closing, then propagate on await.
 ready.catch(()=>{});
 return {target:incoming,ready};
}
function warmReadingPage(path){
 if(active===path||readingPages.has(path)||warmReadingPages.has(path))return;
 const target=document.querySelector(`iframe[data-isaac-reading-preload="${path}"]`)||makeFrame();target.className='menu-page';target.style.opacity='0';target.style.pointerEvents='none';target.style.zIndex='0';if(!target.isConnected)document.body.append(target);
 const entry={target,ready:null};warmReadingPages.set(path,entry);
 entry.ready=load(path,target,{quiet:true}).then(()=>{if(warmReadingPages.get(path)===entry){target.pauseFrames?.();target.hidden=true}return target});
 entry.ready.catch(()=>{if(warmReadingPages.get(path)===entry){warmReadingPages.delete(path);target.remove()}});
}

function retirePage(path,target){
 target.pauseFrames?.();target.hidden=true;target.style.opacity='0';
 if(canRetain(path))readingPages.set(path,target);else{const win=target.contentWindow;win?.dispatchEvent(new win.Event('isaac:page-retire'));target.remove();}
}
async function switchPage(path,prepared){
 const incoming=prepared.target,outgoing=frame;
 if(incoming===outgoing)return;
 try{
  await prepared.ready;
  outgoing.pauseFrames?.();incoming.hidden=false;incoming.style.opacity='1';incoming.style.clipPath='none';
  // Composite the incoming document over the outgoing one, with no extra GPU scene.
  if(!instantReading(path)){const fade=incoming.animate([{opacity:0},{opacity:1}],{duration:reduced.matches?0:220,easing:'ease-out'});
  await fade.finished;}
  frame=incoming;frame.style.zIndex='110';retirePage(active,outgoing);
 }catch(error){if(incoming!==frame){incoming.remove();readingPages.delete(path)}throw error}
}

async function go(raw,{record=true,closed}={}){
 if(busy){pending={raw,record,closed};return}const url=new URL(raw.startsWith('#')?'/'+raw:raw,location.origin);if(![location.origin,'https://isaac2024.online'].includes(url.origin)){location.href=url.href;return}
 if(!isContentRoute(url)){location.href=url.href;return}status.textContent='正在打开页面…';
 const path=url.pathname+url.search+url.hash;const home=url.pathname==='/';busy=true;const started=performance.now();document.body.classList.add('menu-route-pending');status.hidden=false;
 let prepared;
 try{
 const closing=closed||closeMenus(instantReading(path));
 prepared=home?null:preparePage(path);
 await closing;
 if(active&&!home)frame.resumeFrames?.();
  if(home){
   // Publish the anchor before notifying scroll/game listeners.
   if(record)history.pushState({isaacMenu:path},'',path);
   if(active){frame.pauseFrames?.();if(!url.hash||url.hash==='#hello')snapshot=fixedHomeSnapshot();document.body.classList.remove('menu-page-open');draw(1);await animate(1,0);retirePage(active,frame);frame=makeFrame();document.body.append(frame);active=null;restore();scrollTo({top:homeScroll,behavior:'instant'});dispatchEvent(new Event('isaac:jump'));}
   if(url.hash&&url.hash!=='#hello'){document.getElementById(url.hash.slice(1))?.scrollIntoView({behavior:'instant'});dispatchEvent(new Event('isaac:jump'));}
   else if(url.hash==='#hello'){scrollTo({top:0,behavior:'instant'});dispatchEvent(new Event('isaac:jump'));}
  }else{
   if(!active){const placeholder=frame;frame=prepared.target;if(placeholder!==frame&&!placeholder.src)placeholder.remove();homeScroll=scrollY;snapshot=window.isaacHomeScene?capture():null;window.isaacPortalFrame=()=>true;document.body.classList.add('menu-transition');if(instantReading(path)){await prepared.ready;}else{draw(0);frame.style.opacity='1';await Promise.all([prepared.ready,animate(0,1)]);}frame.hidden=false;frame.style.opacity='1';frame.style.zIndex='110';}
   else{await switchPage(path,prepared);}
   frame.resumeFrames?.();active=path;frame.style.clipPath='none';document.body.classList.add('menu-page-open');
  }
  if(record&&!home)history.pushState({isaacMenu:path},'',path);
  document.title=home?homeTitle:(frame.contentDocument?.title||document.title);frame.title=home?'页面内容':document.title;const main=document.querySelector('#main');if(main)main.inert=!home;document.documentElement.dataset.navigationMs=String(Math.round(performance.now()-started));dispatchEvent(new Event('isaac:route-changed'));
 }catch(error){frame.resumeFrames?.();console.error('Menu navigation failed',error);status.textContent='页面暂未载入，可以重试菜单或';status.hidden=false;const direct=document.createElement('a');direct.href=path;direct.textContent='直接打开 ↗';direct.style.cssText='color:inherit;text-decoration:underline;margin-left:10px';status.append(direct);if(!active){frame.hidden=true;restore()}else{frame.style.clipPath='none';frame.style.opacity='1';document.body.classList.add('menu-page-open');history.replaceState({isaacMenu:active},'',active);dispatchEvent(new Event('isaac:route-changed'))}return;}finally{document.body.classList.remove('menu-route-pending');busy=false;if(status.textContent==='正在打开页面…')status.hidden=true;if(pending){const next=pending;pending=null;go(next.raw,{record:next.record,closed:next.closed})}}
}
addEventListener('isaac:navigate',event=>{const url=new URL(event.detail.href,location.origin);if(!isContentRoute(url))return;event.preventDefault();go(event.detail.href,{closed:event.detail.closed})});
addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='isaac-menu-route')return;go(event.data.href)});
addEventListener('popstate',event=>{if(active||event.state?.isaacMenu){event.stopImmediatePropagation();go(location.pathname+location.search+location.hash,{record:false})}},true);
// Reading pages start on navigation intent, after the opening scene is ready.
function warmReadingIntent(event){
 if(document.body.classList.contains('is-loading'))return;
 const link=event.composedPath().find(node=>node?.tagName==='A');
 if(!link)return;
 const url=new URL(link.href,location.href);
 if(url.origin!==location.origin||!instantReading(url.pathname))return;
 warmReadingPage(url.pathname.endsWith('/')?url.pathname:url.pathname+'/');
}
for(const type of ['pointerover','focusin','pointerdown'])document.addEventListener(type,warmReadingIntent,{capture:true,passive:true});
if(window.isaacReturnHome){
 busy=true;
 try{
  const deadline=performance.now()+14000;
  while(!window.isaacHomeScene&&!document.body.classList.contains('scene-unavailable')&&window.isaacReturnHome&&performance.now()<deadline)await wait(50);
  while(window.isaacEntry&&!['entered','skipped'].includes(window.isaacEntry.state)&&window.isaacReturnHome&&performance.now()<deadline)await wait(25);
  if(window.isaacHomeScene&&window.isaacReturnHome){
   scrollTo({top:0,behavior:'instant'});dispatchEvent(new Event('isaac:jump'));
   await new Promise(requestAnimationFrame);
   snapshot=fixedHomeSnapshot();window.isaacPortalFrame=()=>true;
   document.body.classList.add('menu-transition');draw(1);
   clearTimeout(window.isaacReturnGuard);document.documentElement.classList.remove('isaac-return-preparing');
   await animate(1,0);restore();dispatchEvent(new Event('isaac:jump'));
  }
 }finally{
  restore();
  clearTimeout(window.isaacReturnGuard);window.isaacReturnHome=false;document.documentElement.classList.remove('isaac-return-preparing');busy=false;
  if(pending){const next=pending;pending=null;go(next.raw,{record:next.record,closed:next.closed})}
 }
}

const initialRoute=location.pathname+location.search+location.hash;
history.replaceState({isaacMenu:initialRoute},'',location.href);
if(location.pathname!=='/'&&window.parent===window){while(!window.isaacHomeScene&&!document.body.classList.contains('scene-unavailable'))await wait(100);go(initialRoute,{record:false})}

}
