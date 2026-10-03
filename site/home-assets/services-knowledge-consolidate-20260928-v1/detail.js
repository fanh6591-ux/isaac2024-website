(() => {
  'use strict';
  const realDocument = document;
  const real$ = window.jQuery;
  const dialog = document.getElementById('isaac-consult');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const narrow = matchMedia('(max-width: 1024px)').matches;
  let opener;
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-consult]');
    if (!trigger || !dialog) return;
    event.preventDefault(); opener = trigger;
    document.getElementById('consult-product').textContent = trigger.dataset.consult || document.body.dataset.product;
    dialog.showModal();
  });
  const close = () => {dialog.close(); opener?.focus();};
  dialog?.querySelector('.consult-close').addEventListener('click', close);
  dialog?.addEventListener('cancel', () => opener?.focus());
  dialog?.addEventListener('click', event => {
    if(event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if(event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) close();
  });
  const sections = [...document.querySelectorAll('.product-panel')];
  const continuous = document.body.dataset.continuousReading === 'true';
  const statuses = {};
  const selector = text => text.replace(/#([\w-]+)/g, (_, id) => `[data-source-id="${id}"]`);
  function start(details) {
    const root = details.querySelector('.merged-product');
    const slug = root.dataset.productSlug;
    if (root.dataset.uiReady) return;
    const errors = [];
    const run = (name, fn) => {try {fn();} catch(e) {errors.push({name, message:e.message}); console.error('Product interface:', slug, name, e);}};
    const query = text => root.querySelector(selector(text));
    const all = text => root.querySelectorAll(selector(text));
    const document = new Proxy(realDocument, {get(target, key) {
      if(key === 'querySelector') return query;
      if(key === 'querySelectorAll') return all;
      if(key === 'getElementById') return id => query(`#${id}`);
      const value = Reflect.get(target,key,target);
      return typeof value === 'function' ? value.bind(target) : value;
    }});
    const $ = (value, context) => {
      if(typeof value !== 'string' || value.trim().startsWith('<') || /^(html|body)(\s*,\s*(html|body))*$/.test(value)) return real$(value,context);
      return real$(context || root).find(selector(value));
    };
    Object.assign($,real$);
    const resolve = value => typeof value === 'string' ? query(value) : value;
    const vars = value => {
      const result = {...value};
      if(result.scrollTrigger && typeof result.scrollTrigger === 'object') result.scrollTrigger = {...result.scrollTrigger, trigger:resolve(result.scrollTrigger.trigger), endTrigger:resolve(result.scrollTrigger.endTrigger)};
      if(result.motionPath && typeof result.motionPath === 'object') result.motionPath = {...result.motionPath, path:resolve(result.motionPath.path), align:resolve(result.motionPath.align)};
      return result;
    };
    const ScrollTrigger = new Proxy(window.ScrollTrigger,{get(target,key){
      if(key === 'create') return value => target.create(vars({scrollTrigger:value}).scrollTrigger);
      const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
    }});
    const gsap = new Proxy(window.gsap,{get(target,key){
      if(['set','to','from'].includes(key)) return (objects, value) => target[key](typeof objects === 'string' ? [...all(objects)] : objects,vars(value));
      if(key === 'registerPlugin') return (...plugins) => target.registerPlugin(...plugins.map(p => p === ScrollTrigger ? window.ScrollTrigger : p));
      const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
    }});
    const options = value => {
      if(!value || typeof value !== 'object' || value.nodeType || ![Object.prototype,null].includes(Object.getPrototypeOf(value))) return value;
      return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,['nextEl','prevEl','el'].includes(key) ? resolve(item) : options(item)]));
    };
    function Swiper(element,settings) {return new window.Swiper(resolve(element),options(settings));}
    const ui = window.isaacSourceFactory($,document,gsap,ScrollTrigger,Swiper);
    root.querySelectorAll('img[data-isaac-mobile-src]').forEach(img => {if(narrow) img.src = img.dataset.isaacMobileSrc;});
    root.querySelectorAll('[data-consult]:not(a):not(button)').forEach(el => {
      el.tabIndex=0;
      el.addEventListener('keydown',event => {if(['Enter',' '].includes(event.key)){event.preventDefault();el.click();}});
    });
    for(const name of root.dataset.init.split(',').filter(Boolean)) run(name,() => ui[name]());
    if(query('.logo-anim .logo-list')) run('caseScroll2',() => ui.caseScroll2({px:60,num:narrow?2:4,delay:7}));
    if(window.Viewer) run('imgViewer',() => ui.imgViewer(query('.new-product') ? '.section-1 .img,.product-list .img-box' : '.show-section .img,.section-2 .item .rt,.viewImg'));
    root.querySelectorAll('.categorys-list .item,.info-1 .item,.item-box .info .item').forEach(el => {
      el.tabIndex=0;el.setAttribute('role','button');
      el.addEventListener('keydown',event => {if(['Enter',' '].includes(event.key)){event.preventDefault();el.click();}});
    });
    root.dataset.uiReady = errors.length ? 'partial' : 'complete';
    statuses[slug] = {errors};
    if(reduced) root.querySelectorAll('[data-aos],.wow').forEach(el => {el.style.visibility='visible';el.style.opacity='1';});
    window.AOS?.refreshHard();
    window.ScrollTrigger?.refresh();
  }
  function show(panel, scroll, target = panel) {
    if (continuous) {
      for (const section of sections) { section.hidden = false; start(section); }
      window.AOS?.refreshHard(); window.ScrollTrigger?.refresh();
      if (scroll) requestAnimationFrame(() => target.scrollIntoView({block: 'start', behavior: 'auto'}));
      return;
    }
    for (const other of sections) other.hidden = other !== panel;
    start(panel);
    for (const section of sections) section.querySelectorAll('.swiper,.swiper-container,.show-swiper').forEach(el => {
      if (section === panel && !reduced) el.swiper?.autoplay?.start(); else el.swiper?.autoplay?.stop();
      if (section === panel) el.swiper?.update();
    });
    window.AOS?.refreshHard(); window.ScrollTrigger?.refresh();
    if (scroll) requestAnimationFrame(() => {
      if (!panel.hidden) target.scrollIntoView({block: 'start', behavior: 'auto'});
    });
  }
  function fromHash(scroll) {
    let target;
    try {target=document.getElementById(decodeURIComponent(location.hash.slice(1)));} catch(_) {}
    if (!target && location.hash) { const legacy = {"website-support": "/services/solutions/customer-service/#website-support", "overseas-support": "/services/solutions/customer-service/#overseas-support", "douyin-support": "/services/solutions/customer-service/#douyin-support", "wechat-assistant": "/services/solutions/customer-service/#wechat-assistant", "wecom-support": "/services/solutions/customer-service/#wecom-support", "sales-assistant": "/services/solutions/customer-service/#sales-assistant", "smart-quotation": "/services/solutions/customer-service/#smart-quotation", "smart-tickets": "/services/solutions/customer-service/#smart-tickets", "knowledge-brain": "/services/solutions/knowledge-base/#knowledge-brain", "digital-teacher": "/services/solutions/knowledge-base/#digital-teacher", "digital-supervisor": "/services/solutions/knowledge-base/#digital-supervisor", "data-analysis": "/services/solutions/knowledge-base/#data-analysis", "content-review": "/services/solutions/knowledge-base/#content-review", "ai-search": "/services/solutions/knowledge-base/#ai-search", "service-desk": "/services/solutions/knowledge-base/#service-desk", "work-chat": "/services/#standard-products", "work-ai": "/services/solutions/knowledge-base/#work-ai", "content-creation": "/services/#standard-products", "proposal-writing": "/services/#standard-products", "productivity-coaching": "/services/solutions/ai-delivery/#productivity-coaching", "scenario-cocreation": "/services/solutions/ai-delivery/#scenario-cocreation", "document-agent": "/services/solutions/knowledge-base/#knowledge-brain", "context-graph": "/services/solutions/knowledge-base/#knowledge-brain", "permissions": "/services/solutions/knowledge-base/#knowledge-brain", "knowledge-chat": "/services/solutions/knowledge-base/#ai-search", "agents": "/services/solutions/knowledge-base/#work-ai", "magic-menu": "/services/#standard-products-shortcuts", "sales-followup": "/services/solutions/customer-service/#sales-assistant-followup", "agent-studio": "/services/#standard-products", "application-upgrade": "/services/#standard-products", "ai-hub": "/services/#standard-products", "ai-hub-plans": "/services/#standard-products", "skills": "/services/#standard-products"}; const key = decodeURIComponent(location.hash.slice(1)); if (legacy[key]) {location.replace(legacy[key]); return;} }
    const details=target?.closest('.product-panel') || sections.find(el=>!el.hidden) || sections[0];
    if(details) show(details,scroll,target || details);
  }
  if(window.AOS) AOS.init({duration:reduced?0:1600,offset:80,once:true});
  if(window.WOW && !reduced) new WOW({live:false}).init();
  window.addEventListener('hashchange',()=>fromHash(true));
  window.addEventListener('popstate',()=>fromHash(true));
  document.addEventListener('click',event => {if(event.target.closest('a[role="button"][href="#"]')) event.preventDefault();});
  fromHash(Boolean(location.hash));
  window.addEventListener('load',()=>{fromHash(Boolean(location.hash));window.ScrollTrigger?.refresh();});
  window.isaacMergedUi = {statuses,show};
})();
