const host=document.querySelector('isaac-site-navigation[data-design="metalab"]');
if(host&&!(window.parent!==window&&new URLSearchParams(location.search).get('menu-frame')==='1')){
 let root=host.shadowRoot;
 if(!root){const template=host.querySelector('template');root=host.attachShadow({mode:'open'});root.append(template.content);template.remove()}
 const bar=root.querySelector('.bar'),menu=root.querySelector('.menu'),toggle=root.querySelector('.toggle'),details=root.querySelector('.services');
 const fullNav=document.createElement('nav');fullNav.className='full-navigation';fullNav.setAttribute('aria-label','完整主导航');
 const product=details.cloneNode(true);product.className='full-services';product.open=false;
 const allServices=document.createElement('a');allServices.href='/services/';allServices.textContent='查看全部服务 ↗';product.querySelector('nav').append(allServices);fullNav.append(product);
 const secondary=document.createElement('nav');secondary.className='full-secondary';secondary.setAttribute('aria-label','更多栏目');
 root.querySelectorAll('.destinations a').forEach(a=>{if(a.pathname==='/services/')return;const item=a.cloneNode(true);item.classList.add('nav-item');(a.pathname==='/enterprise-faq/'||a.pathname==='/about/'?secondary:fullNav).append(item)});bar.insertBefore(fullNav,bar.querySelector('.actions'));bar.querySelector('.actions').prepend(secondary);
 const styleURL='/home-assets/navigation-20260926-v1/site/unified-navigation-20260927/navigation-variants-v2.css';
 for(const container of [root,document.head]){const link=document.createElement('link');link.rel='stylesheet';link.href=styleURL;container.append(link)}
 let fullOpen=false,fullInert=[];
 const page=document.documentElement,body=document.body,reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let state='closed',savedY=0,priorFocus=null,moved=[],surface=null,finishClose=null,portalPreview=null;
 const activeFrame=()=>[...document.querySelectorAll('iframe.menu-page')].find(f=>!f.hidden&&f.style.opacity!=='0');
 function sync(){
  const path=location.pathname.replace(/^\/cases(?=\/|$)/,'/work').replace(/^\/products(?=\/|$)/,'/services');
  host.dataset.variant=(path==='/'||path==='/about'||path.startsWith('/about/'))?'full':'preview';
  root.querySelectorAll('.destinations a,.full-navigation a,.full-secondary a').forEach(a=>a.toggleAttribute('aria-current',path===a.pathname||path.startsWith(a.pathname)&&a.pathname!=='/'));
  root.querySelectorAll('[aria-current]').forEach(a=>a.setAttribute('aria-current','page'));
  if(state!=='closed')return;
  host.toggleAttribute('scrolled',scrollY>56||!!activeFrame());
  const doc=activeFrame()?.contentDocument||document;
  const tone=doc.body?.dataset.tone;
  if(tone){host.setAttribute('tone',tone);return}
  const rgb=getComputedStyle(doc.body).backgroundColor.match(/[\d.]+/g)||[];
  host.setAttribute('tone',rgb.length>=3&&Number(rgb[3]??1)>0&&(+rgb[0]*.2126+ +rgb[1]*.7152+ +rgb[2]*.0722)>155?'light':(host.dataset.defaultTone||'dark'));
 }
 function open(){
  if(state!=='closed')return;
  page.style.setProperty('--isaac-nav-duration',reduced.matches?'0ms':'240ms');
  state='open';dispatchEvent(new Event('isaac:page-pause'));savedY=scrollY;priorFocus=root.activeElement||document.activeElement;
  if(host.dataset.variant==='full'){
   fullOpen=true;product.open=false;
   fullInert=[...body.children].filter(el=>el!==host&&!['SCRIPT','LINK','STYLE','TEMPLATE'].includes(el.tagName)).map(el=>({el,inert:el.inert}));fullInert.forEach(({el})=>el.inert=true);
   page.classList.add('isaac-nav-full-active');menu.hidden=false;menu.scrollTop=0;
   toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','关闭网站菜单');
   requestAnimationFrame(()=>{if(state==='open'){host.setAttribute('open','');root.querySelector('.destinations a').focus({preventScroll:true})}});return;
  }
  page.style.setProperty('--isaac-page-height',`${body.scrollHeight}px`);
  page.style.setProperty('--isaac-reader-width',`${document.documentElement.clientWidth}px`);
  page.style.setProperty('--isaac-reader-offset',`${-savedY}px`);
  page.style.setProperty('--isaac-page-background',getComputedStyle(body).backgroundColor);
  page.style.setProperty('--isaac-menu-scroll','0px');
  surface=document.createElement('div');surface.id='isaac-nav-surface';surface.inert=true;surface.setAttribute('aria-hidden','true');
  const inner=document.createElement('div');inner.id='isaac-nav-surface-inner';surface.append(inner);
  portalPreview=activeFrame()||document.querySelector('#liquid-root');
  const reader=portalPreview?.getBoundingClientRect();
  page.style.setProperty('--isaac-reader-height',`${reader?.height||innerHeight}px`);
  if(reader)page.style.setProperty('--isaac-reader-width',`${reader.width}px`);
  portalPreview?.pauseFrames?.();
  const nodes=portalPreview?[]:[...body.children].filter(el=>el!==host&&!['SCRIPT','LINK','STYLE','TEMPLATE','IFRAME'].includes(el.tagName));
  if(portalPreview){portalPreview.classList.add('isaac-nav-portal-preview');portalPreview.inert=true;surface.hidden=true}
  page.classList.add('isaac-nav-active');body.append(surface);
  moved=nodes.map(el=>{const marker=document.createComment('navigation-position');el.before(marker);const record={el,marker,inert:el.inert};inner.append(el);return record});
  menu.hidden=false;menu.scrollTop=0;menu.prepend(bar);toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','关闭网站菜单');
  surface.getBoundingClientRect();
  requestAnimationFrame(()=>{if(state==='open'){host.setAttribute('open','');page.classList.add('isaac-nav-open');root.querySelector('.destinations a').focus({preventScroll:true})}});
 }
 function close({fast=false,immediate=false}={}){
  if(state==='closed')return Promise.resolve();if(state==='closing')return finishClose;
  product.open=false;
  const closeMs=(reduced.matches||immediate)?0:(fast?120:240);
  page.style.setProperty('--isaac-nav-duration',closeMs+'ms');
  if(fullOpen){
   state='closing';host.removeAttribute('open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','打开网站菜单');
   finishClose=new Promise(resolve=>setTimeout(()=>{menu.hidden=true;page.classList.remove('isaac-nav-full-active');fullInert.forEach(({el,inert})=>el.inert=inert);fullInert=[];fullOpen=false;state='closed';if(!fast)dispatchEvent(new Event('isaac:page-activate'));sync();(priorFocus?.isConnected?priorFocus:toggle).focus({preventScroll:true});resolve()},closeMs));return finishClose;
  }
  state='closing';host.removeAttribute('open');page.classList.remove('isaac-nav-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','打开网站菜单');
  finishClose=new Promise(resolve=>setTimeout(()=>{
   root.prepend(bar);menu.hidden=true;
   for(const {el,marker,inert} of moved){marker.replaceWith(el);el.inert=inert}moved=[];surface.remove();surface=null;
   if(portalPreview){portalPreview.classList.remove('isaac-nav-portal-preview');portalPreview.inert=false;if(!fast)portalPreview.resumeFrames?.();portalPreview=null}
   page.classList.remove('isaac-nav-active');
   for(const key of ['page-height','reader-width','reader-height','reader-offset','page-background','menu-scroll'])page.style.removeProperty('--isaac-'+key);
   scrollTo({top:savedY,behavior:'instant'});state='closed';if(!fast)dispatchEvent(new Event('isaac:page-activate'));sync();(priorFocus?.isConnected?priorFocus:toggle).focus({preventScroll:true});resolve();
  },closeMs));return finishClose;
 }
 async function navigate(url){
  product.open=false;const closed=close({fast:true,immediate:/^\/(strategy|enterprise-faq)\/?$/.test(url.pathname)});
  const event=new CustomEvent('isaac:navigate',{detail:{href:url.pathname+url.search+url.hash,closed},cancelable:true});
  if(!dispatchEvent(event))return;
  if(url.pathname===location.pathname&&url.search===location.search&&url.hash){await closed;const target=document.getElementById(url.hash.slice(1));if(target){history.pushState(null,'',url.hash);target.scrollIntoView({behavior:reduced.matches?'instant':'smooth'});target.focus({preventScroll:true});return}}
  if(url.pathname==='/'&&(!url.hash||url.hash==='#hello')&&location.pathname!=='/'){
   try{sessionStorage.setItem('isaac:return-home',JSON.stringify({at:Date.now()}))}catch{}
  }
  location.href=url.href;
 }
 host.closeNavigation=close;
 toggle.addEventListener('click',()=>state==='open'?close():open());
 root.querySelector('.preview-return').addEventListener('click',()=>close());
 root.addEventListener('click',event=>{
  const link=event.target.closest('a');if(!link||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||link.target==='_blank')return;
  const url=new URL(link.href,location.href);if(url.origin!==location.origin)return;
  event.preventDefault();event.stopPropagation();navigate(url);
 });
 root.addEventListener('keydown',event=>{
  event.stopPropagation();
  if(event.key==='Escape'&&product.open){product.open=false;product.querySelector('summary').focus();return}
  if(state!=='open')return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return}
  if(event.key==='Tab'){
   const candidates=[...root.querySelectorAll('a,button,summary')].filter(el=>el.getClientRects().length&&!el.disabled&&(!el.closest('details:not([open])')||el.tagName==='SUMMARY'));
   const idx=candidates.indexOf(root.activeElement),next=(idx+(event.shiftKey?-1:1)+candidates.length)%candidates.length;
   event.preventDefault();candidates[next].focus();
  }
 });
 for(const type of ['pointerdown','pointermove','pointerup','mousedown','mousemove','mouseup','touchstart','touchmove','touchend','wheel','keyup'])root.addEventListener(type,event=>event.stopPropagation(),{passive:true});
 menu.addEventListener('scroll',()=>page.style.setProperty('--isaac-menu-scroll',`${menu.scrollTop}px`),{passive:true});
 details.open=matchMedia('(min-width:761px)').matches;
 const desktop=matchMedia('(min-width:761px)');
 desktop.addEventListener('change',()=>close().then(()=>{details.open=desktop.matches;sync()}));
 addEventListener('scroll',sync,{passive:true});addEventListener('popstate',()=>close().then(sync));addEventListener('isaac:route-changed',sync);
 addEventListener('pageshow',()=>close().then(sync));
 addEventListener('isaac:close-navigation',()=>close());
 new MutationObserver(sync).observe(body,{attributes:true,attributeFilter:['data-tone']});sync();
 if(window.parent===window)fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
  if(!data?.user)return;
  const link=root.querySelector('.account');if(!link)return;
  const avatar=document.createElement('span');
  avatar.setAttribute('aria-hidden','true');
  avatar.textContent=Array.from(String(data.user.name||data.user.email||'我').trim())[0]?.toUpperCase()||'我';
  avatar.style.cssText='display:inline-grid;place-items:center;width:23px;height:23px;flex:0 0 23px;border:1px solid currentColor;border-radius:50%;font-size:11px;font-weight:600;line-height:1';
  const status=document.createElement('span');status.textContent='已登录';
  link.href='/account/';link.setAttribute('aria-label','已登录，打开我的 Isaac 账户');
  link.style.gap='6px';link.style.opacity='1';link.replaceChildren(avatar,status);
 }).catch(()=>{});
 document.addEventListener('click',event=>{if(!event.composedPath().includes(product))product.open=false});
 matchMedia('(min-width:1200px)').addEventListener('change',()=>{if(fullOpen)close()});
 host.dataset.ready='true';
}
