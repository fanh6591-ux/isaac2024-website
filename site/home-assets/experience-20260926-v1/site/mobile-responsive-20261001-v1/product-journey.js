import {sampleProductJourney,sampleJourneyCopy,ease,mix} from '/home-assets/experience-20260926-v1/site/home-depth-quality-20260929-v1/journey-math.js';

const isLandscape=()=>innerHeight<520&&innerWidth>700&&innerWidth>innerHeight;

export function applyJourneyPose(pose,t,mobile,reduced=false){
  const next=sampleProductJourney(t,{mobile,reduced,landscape:isLandscape(),aspect:innerWidth/innerHeight});
  if(next.weight<=0)return next;
  for(const key of ['camera','target','head','rotation'])pose[key]=pose[key].map((v,i)=>mix(v,next[key][i],next.weight));
  pose.scale=mix(pose.scale,next.scale,next.weight);
  return next;
}

export function createProductJourney({scene,lights,hero,camera,stage}) {
  const panels=[...document.querySelectorAll('.story-panel')];
  const product=document.getElementById('ai-customer-service'), contact=document.getElementById('contact');
  const rows=[...product.querySelectorAll('.product-row')].map(row=>({href:row.getAttribute('href'),name:row.querySelector('.product-name').textContent,description:row.querySelector('.product-summary').textContent}));
  const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const phone=contact.querySelector('a[href^="tel:"]');
  const layer=document.createElement('section');layer.className='product-journey-layer';layer.hidden=true;layer.setAttribute('aria-label','我们的产品与联系方式');
  layer.innerHTML=`<div class="journey-atmosphere" aria-hidden="true"></div><div class="journey-heading"><span>OUR PRODUCTS</span><h2>我们的产品</h2></div><div class="journey-list"><div class="journey-list-label"><span>我们的产品</span><span>从问题到行动</span></div><ol>${rows.map((r,i)=>`<li class="journey-row"><a href="${escape(r.href)}"><span class="journey-number">${String(i+1).padStart(2,'0')}</span><span>${escape(r.name)}</span></a><p>${escape(r.description)}<span aria-hidden="true">↗</span></p></li>`).join('')}</ol></div><div class="journey-contact"><span class="journey-eyebrow">LET’S MAKE IT REAL</span><h2>带着一个问题，<br>来聊聊</h2><p>何凡 Isaac · 企业服务咨询与 AI 落地</p><div class="journey-contact-actions"><a class="journey-phone" href="${escape(phone.getAttribute('href'))}">${escape(phone.textContent.replace(' ↗',''))} <span aria-hidden="true">↗</span></a><button type="button" class="journey-copy-phone">复制号码 <span aria-hidden="true">＋</span></button></div><a class="journey-play-link" href="#play">继续向下，走进互动世界 <span aria-hidden="true">↓</span></a></div><p class="journey-game-hint">继续向下，跟着骷髅进入互动世界 <span aria-hidden="true">↓</span></p>`;
  document.body.append(layer);
  const title=layer.querySelector('.journey-heading'),list=layer.querySelector('.journey-list'),items=[...layer.querySelectorAll('.journey-row')],details=layer.querySelector('.journey-contact'),hint=layer.querySelector('.journey-game-hint');
  const copy=layer.querySelector('.journey-copy-phone');
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(phone.getAttribute('href').slice(4));copy.textContent='已复制 ✓';setTimeout(()=>copy.innerHTML='复制号码 <span aria-hidden="true">＋</span>',1600)}catch{copy.textContent='请长按电话号码复制'}});
  layer.querySelector('.journey-play-link').addEventListener('click',e=>{e.preventDefault();history.pushState(null,'','#play');document.getElementById('play').scrollIntoView({behavior:'instant'});dispatchEvent(new Event('isaac:jump'))});
  const defaults=Object.fromEntries(['key','fill','rim'].map(k=>[k,{color:lights[k].color.clone(),position:lights[k].position.clone(),target:lights[k].target.position.clone()}]));
  const background=scene.background.clone().set('#211810');
  let wasActive=false,visible=false,foreground=false;
  const frameTimes=new Float32Array(180);let frameIndex=0,frameCount=0,reportAt=0,lastTime=0;
  const resetTiming=()=>{lastTime=0};
  document.addEventListener('visibilitychange',resetTiming);
  function update(t,ms,mobile,reduced=false,gameActive=false){
    const motion=sampleProductJourney(t,{mobile,reduced,landscape:isLandscape(),aspect:innerWidth/innerHeight});
    const inJourney=t>=29.6&&t<38.5;
    document.body.dataset.productJourney=inJourney?'active':'inactive';
    foreground=t>=29.6&&t<37.55&&!gameActive;document.body.dataset.journeyForeground=String(foreground);
    const show=motion.weight>.001&&!gameActive&&t<37.55;
    if(show!==visible){visible=show;layer.hidden=!show;layer.inert=!show}
    if(show){
      const view=sampleJourneyCopy(t,{mobile,reduced,landscape:isLandscape(),aspect:innerWidth/innerHeight});
      title.style.visibility=t<31.15?'visible':'hidden';
      title.style.transform=`translate3d(0,${view.titleY}svh,0)`;
      list.style.transform=`translate3d(0,${view.listY}svh,0)`;list.style.visibility=view.listVisible?'visible':'hidden';list.inert=!view.listVisible;
      list.dataset.scrollReady=String(mobile&&view.listVisible&&view.rowProgress.every(p=>p>=.98));
      if(list.dataset.scrollReady==='false')list.scrollTop=0;
      details.style.transform=`translate3d(0,${view.contactY}svh,0)`;details.style.visibility=view.contactVisible?'visible':'hidden';details.inert=!view.contactVisible;
      items.forEach((row,i)=>{const p=view.rowProgress[i];row.style.setProperty('--item-reveal',p);row.inert=p<.98;row.setAttribute('aria-hidden',String(p<=0))});
      hint.hidden=view.gameHint<.02;hint.style.opacity=String(view.gameHint);layer.style.setProperty('--journey-presence',motion.weight);
    }
    const active=motion.weight>0&&!gameActive&&t<38.5;
    if(active){
      const w=motion.weight,head=hero.position;
      scene.background.lerp(background,w);layer.style.setProperty("--journey-bg",scene.background.getStyle());scene.fog.color.copy(scene.background);scene.fog.near=mix(scene.fog.near,24,w);scene.fog.far=mix(scene.fog.far,60,w);
      scene.environmentIntensity=mix(scene.environmentIntensity,.42,w);
      lights.key.color.copy(defaults.key.color).lerp({r:1,g:.80,b:.59},w);
      lights.fill.color.copy(defaults.fill.color).lerp({r:.70,g:.82,b:1},w);
      lights.rim.color.copy(defaults.rim.color).lerp({r:1,g:.50,b:.18},w);
      lights.key.intensity=mix(lights.key.intensity,2.6,w);lights.fill.intensity=mix(lights.fill.intensity,.95,w);lights.rim.intensity=mix(lights.rim.intensity,3.3,w);
      if(lights.hemi)lights.hemi.intensity=mix(lights.hemi.intensity,.5,w);
      lights.key.position.set(head.x-3,head.y+5,head.z+5);lights.fill.position.set(head.x+4,head.y+1.5,head.z+4);lights.rim.position.set(head.x+2.5,head.y+3,head.z-4);
      for(const key of ['key','fill','rim']){lights[key].target.position.copy(head);lights[key].target.updateMatrixWorld()}
      // Readable diagnostics on the actual rendered frame, with no extra renderer.
      stage.dataset.journeyDepth=motion.depth.toFixed(4);stage.dataset.journeyYaw=hero.rotation.y.toFixed(4);stage.dataset.journeyScale=hero.scale.x.toFixed(4);
      if(lastTime&&!document.hidden&&ms>lastTime){frameTimes[frameIndex++%frameTimes.length]=ms-lastTime;frameCount=Math.min(frameCount+1,frameTimes.length)}
      if(ms-reportAt>1500&&frameCount>30){const sorted=Array.from(frameTimes.slice(0,frameCount)).sort((a,b)=>a-b);stage.dataset.journeyFrameP95=sorted[Math.floor(sorted.length*.95)].toFixed(1);stage.dataset.journeyFrameMax=sorted.at(-1).toFixed(1);reportAt=ms}
      lastTime=document.hidden?0:ms;
    }else{
      lastTime=0;
      if(wasActive)for(const key of ['key','fill','rim']){lights[key].color.copy(defaults[key].color);lights[key].position.copy(defaults[key].position);lights[key].target.position.copy(defaults[key].target);lights[key].target.updateMatrixWorld()}
    }
    wasActive=active;
  }
  return {update,render(renderer){
    const background=scene.background,alpha=renderer.getClearAlpha();
    if(foreground){scene.background=null;renderer.setClearAlpha(0)}
    try{renderer.render(scene,camera)}finally{scene.background=background;renderer.setClearAlpha(alpha)}
  },dispose(){document.removeEventListener('visibilitychange',resetTiming);layer.remove();delete document.body.dataset.productJourney;delete document.body.dataset.journeyForeground}};
}
