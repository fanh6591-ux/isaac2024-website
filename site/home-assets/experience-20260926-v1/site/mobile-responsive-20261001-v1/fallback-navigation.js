// Reading navigation stays available when the optional WebGL scene fails.
export function initFallbackNavigation(){
 if(!document.body.classList.contains('home-page'))return;
 const panels=[...document.querySelectorAll('.story-panel')];
 let active=false,scheduled=false;
 const update=()=>{
  scheduled=false;if(!active)return;
  let index=0;panels.forEach((panel,i)=>{if(panel.getBoundingClientRect().top<=innerHeight*.35)index=i});
  const number=document.querySelector('#scene-number');if(number)number.textContent=`${String(index+1).padStart(2,'0')} / ${panels.length}`;
  const label=document.querySelector('#scene-label');if(label)label.textContent=panels[index].dataset.group||'';
  const progress=document.querySelector('.scroll-progress>div');if(progress)progress.style.width=`${Math.min(100,100*scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight))}%`;
 };
 const queue=()=>{if(active&&!scheduled){scheduled=true;requestAnimationFrame(update)}};
 const activate=()=>{
  if(!document.body.classList.contains('scene-unavailable')||active)return;
  active=true;
  const hello=document.querySelector('#hello'),poster=document.querySelector('.model-poster');
  if(hello&&poster&&!hello.querySelector('.fallback-hero-art')){
   const image=poster.cloneNode(false);image.className='fallback-hero-art';image.alt='Isaac 的骷髅与凤凰标志';hello.querySelector('.hero-footnote')?.after(image);
  }
  const play=document.querySelector('#play .story-copy');
  if(play&&!play.querySelector('.fallback-world-link')){const link=document.createElement('a');link.className='fallback-world-link';link.href='/play/';link.textContent='进入互动世界 ↗';play.append(link)}
  document.querySelectorAll('[data-home-return]').forEach(button=>button.addEventListener('click',()=>{if(!active)return;document.querySelector('#hello')?.scrollIntoView({behavior:'instant'});history.pushState(null,'','#hello');queue()}));
  observer.disconnect();update();
 };
 const observer=new MutationObserver(activate);observer.observe(document.body,{attributes:true,attributeFilter:['class']});
 addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);addEventListener('hashchange',queue);addEventListener('isaac:jump',queue);activate();
}

export function initMobileNavigation(){
 const host=document.querySelector('isaac-site-navigation');if(!host)return;
 const attach=()=>{
  const root=host.shadowRoot;if(!root)return false;
  if(!root.querySelector('[data-mobile-responsive]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./navigation-touch.css?no-inline',import.meta.url).href;link.dataset.mobileResponsive='';root.append(link)}
  return true;
 };
 if(attach())return;
 const observer=new MutationObserver(()=>{if(attach())observer.disconnect()});observer.observe(host,{childList:true});
}
initFallbackNavigation();
initMobileNavigation();
