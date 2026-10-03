/* Coarse first-party counts; no visitor identifiers, IPs or raw referrers. */
(() => {
  if (window.__isaacFeedbackStarted) return;
  window.__isaacFeedbackStarted = true;
  const params = new URLSearchParams(location.search);
  if (params.get('isaac_preview') === '1' || navigator.doNotTrack === '1') return;
  const sources = ['baidu','bing','sogou','360','shenma','google','chatgpt','perplexity','deepseek','doubao','kimi','wechat','xiaohongshu','zhihu','bilibili'];
  const hosts = {'baidu.com':'baidu','bing.com':'bing','sogou.com':'sogou','so.com':'360','sm.cn':'shenma','google.com':'google','google.com.hk':'google','chatgpt.com':'chatgpt','chat.openai.com':'chatgpt','perplexity.ai':'perplexity','deepseek.com':'deepseek','doubao.com':'doubao','kimi.com':'kimi','kimi.moonshot.cn':'kimi','weixin.qq.com':'wechat','xiaohongshu.com':'xiaohongshu','zhihu.com':'zhihu','bilibili.com':'bilibili'};
  const sourceFromHost = host => Object.keys(hosts).find(x => host === x || host.endsWith('.'+x));
  let source='unknown',basis='unknown',external=false;
  const tag=(params.get('utm_source')||'').toLowerCase();
  if (sources.includes(tag)) {source=tag;basis='utm';external=true;}
  else if (document.referrer) {
    try { const host=new URL(document.referrer).hostname.toLowerCase();
      if (host !== location.hostname) {external=true;const key=sourceFromHost(host);source=key?hosts[key]:'other';basis='referrer';}
    } catch {}
  }
  const now=Date.now(),key='isaac-source-summary-v1';
  let previous; try {previous=JSON.parse(sessionStorage.getItem(key)||'null');} catch {}
  let newSession=!previous || now-previous.at > 30*60*1000 || (external && (previous.source!==source || previous.basis!==basis));
  if (!external && previous && !newSession && (sources.includes(previous.source)||['unknown','other'].includes(previous.source)) && ['utm','referrer','unknown'].includes(previous.basis)) {source=previous.source;basis=previous.basis;}
  try {sessionStorage.setItem(key,JSON.stringify({source,basis,at:now}));} catch {}
  const device=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)?'mobile':'desktop';
  const sent=new Set(); let clicks=0;
  const emit=(event, once=false) => {
    if (once && sent.has(event)) return;
    sent.add(event);
    const payload={page:location.pathname,source,basis,device,event};
    if(params.get('isaac_test')==='1') payload.test=true;
    const body=JSON.stringify(payload);
    fetch('/wp-json/isaac-site/v1/event',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body,keepalive:true}).catch(()=>{});
  };
  emit('pageview'); if(newSession) emit('landing');
  document.addEventListener('click',e=>{
    if(clicks>=20 || !(e.target instanceof Element)) return;
    const el=e.target.closest('a,button'); if(!el) return;
    const href=el.getAttribute('href')||''; let event;
    if(el.matches('[data-copy-phone]')) event='phone_copy';
    else if(href.startsWith('tel:')) event='phone_click';
    else if(href==='#contact'||href==='/#contact') event='contact_open';
    else if(href.startsWith('/services/')) event='service_open';
    else if(el.closest('#chapter-dialog') && href.startsWith('#')) event='chapter_open';
    else if(el.matches('.assistant-launch')) event='assistant_open';
    if(event){clicks++;emit(event);}
  },{passive:true});
})();
