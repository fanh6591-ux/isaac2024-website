(() => {
  'use strict';
  const directory=document.querySelector('.product-category-directory');
  if(!directory)return;
  const tabs=[...directory.querySelectorAll('[data-product-category]')];
  const panels=tabs.map(tab=>document.getElementById(tab.getAttribute('aria-controls')));
  const indexes=[...document.querySelectorAll('[data-product-index]')];
  const search=document.getElementById('solution-search');
  const entries=[...document.querySelectorAll('[data-catalog-entry]')];
  const groups=[...document.querySelectorAll('[data-catalog-group]')];
  const links=[...document.querySelectorAll('[data-catalog-target]')];
  const indexGroups=[...document.querySelectorAll('[data-catalog-index-group]')];
  let currentLink=null;
  let currentTarget=null;
  function setExpanded(group,expanded){
    const panel=group.querySelector('.catalog-index-children');
    if(!panel)return;
    const parent=group.querySelector('.catalog-index-parent');
    group.dataset.expanded=String(expanded);
    parent.setAttribute('aria-expanded',String(expanded));
    panel.inert=!expanded;
    panel.setAttribute('aria-hidden',String(!expanded));
  }
  function expand(group){
    indexGroups.forEach(other=>setExpanded(other,other===group));
    if(currentTarget)active(currentTarget,true);
  }
  indexGroups.forEach((group,i)=>{
    const members=[...group.querySelectorAll(':scope > .catalog-index-member')];
    if(!members.length)return;
    const parent=group.querySelector('.catalog-index-parent');
    const panel=document.createElement('div');
    const inner=document.createElement('div');
    panel.id='catalog-index-children-'+i;
    panel.className='catalog-index-children';
    inner.className='catalog-index-children-inner';
    members.forEach(member=>inner.appendChild(member));
    panel.appendChild(inner);
    group.appendChild(panel);
    parent.setAttribute('aria-controls',panel.id);
    setExpanded(group,false);
    parent.addEventListener('keydown',event=>{
      if(event.key==='ArrowRight'){event.preventDefault();expand(group);}
      if(event.key==='ArrowLeft'){event.preventDefault();setExpanded(group,false);active(currentTarget,true);}
    });
  });
  function select(category,focus=false,update=false){
    const active=tabs.findIndex(tab=>tab.dataset.productCategory===category);
    if(active<0)return;
    tabs.forEach((tab,i)=>{tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(i===active));tab.tabIndex=i===active?0:-1;panels[i].setAttribute('role','tabpanel');panels[i].hidden=i!==active;});
    indexes.forEach(index=>{index.hidden=index.dataset.productIndex!==category;});
    if(focus)tabs[active].focus();
    if(update)history.replaceState(history.state,'','#'+panels[active].id);
  }
  function filter(){
    const term=search.value.trim().toLocaleLowerCase();
    entries.forEach(entry=>{entry.hidden=!entry.dataset.search.toLocaleLowerCase().includes(term);});
    groups.forEach(group=>{if(!group.hasAttribute('data-catalog-entry'))group.hidden=![...group.querySelectorAll('[data-catalog-entry]')].some(entry=>!entry.hidden);});
    links.forEach(link=>{link.hidden=document.getElementById(link.dataset.catalogTarget).hidden;});
    indexGroups.forEach(group=>{group.hidden=document.getElementById(group.dataset.catalogIndexGroup).hidden;});
    if(term){
      indexGroups.forEach(group=>setExpanded(group,!group.hidden&&Boolean(group.querySelector('.catalog-index-member:not([hidden])'))));
    }else{
      indexGroups.forEach(group=>setExpanded(group,false));
    }
    active(currentTarget,true);
    const count=entries.filter(entry=>!entry.hidden).length;
    document.getElementById('solution-search-status').textContent=term?`找到 ${count} 项产品或服务`:'';
  }
  function targetFromHash(){
    let id;try{id=decodeURIComponent(location.hash.slice(1));}catch(_){return null;}
    let target=document.getElementById(id);
    const seen=new Set();
    while(target?.dataset.catalogAlias&&!seen.has(target.id)){
      seen.add(target.id);
      target=document.getElementById(target.dataset.catalogAlias);
    }
    if(target&&seen.size)history.replaceState(history.state,'','#'+target.id);
    return target;
  }
  function active(target,force=false){
    currentTarget=target;
    let next=target&&links.find(link=>link.dataset.catalogTarget===target.id);
    if(next?.closest('.catalog-index-children')?.inert){
      next=next.closest('.catalog-index-group').querySelector('.catalog-index-parent');
    }
    if(next?.hidden||next?.closest('[hidden]'))next=null;
    if(next===currentLink&&!force)return;
    if(currentLink&&currentLink!==next)currentLink.setAttribute('aria-current','false');
    if(next&&next!==currentLink)next.setAttribute('aria-current','true');
    currentLink=next;
  }
  function fromHash(scroll=false){
    const target=targetFromHash();
    const category=target?.closest('.product-group')?.id==='lab-products'?'lab':'ordinary';
    select(category);
    if(target&&(target.hidden||target.closest('[hidden]'))&&search.value){search.value='';filter();}
    const memberLink=target&&links.find(link=>link.dataset.catalogTarget===target.id);
    const memberGroup=memberLink?.closest('.catalog-index-children')?.closest('.catalog-index-group');
    if(memberGroup)expand(memberGroup);
    active(target);
    if(scroll&&target)requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:'instant'}));
  }
  directory.setAttribute('role','tablist');
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',event=>{event.preventDefault();select(tab.dataset.productCategory,false,true);active(null);});
    tab.addEventListener('keydown',event=>{
      let next;if(event.key==='ArrowRight')next=(i+1)%tabs.length;else if(event.key==='ArrowLeft')next=(i-1+tabs.length)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;
      event.preventDefault();select(tabs[next].dataset.productCategory,true,true);active(null);
    });
  });
  search.addEventListener('input',filter);
  links.forEach(link=>link.addEventListener('click',event=>{
    event.preventDefault();
    const group=link.classList.contains('catalog-index-parent')?link.closest('.catalog-index-group'):null;
    if(group?.querySelector('.catalog-index-children')){
      const next=group.dataset.expanded!=='true';
      indexGroups.forEach(other=>setExpanded(other,next&&other===group));
      active(currentTarget,true);
      return;
    }
    const target=document.getElementById(link.dataset.catalogTarget);
    if(search.value){search.value='';filter();}
    const memberGroup=link.closest('.catalog-index-children')?.closest('.catalog-index-group');
    if(memberGroup)expand(memberGroup);
    history.pushState(history.state,'','#'+target.id);select('ordinary');active(target);target.scrollIntoView({block:'start',behavior:'instant'});
    if(matchMedia('(max-width: 1000px)').matches)document.querySelector('.faq-index').open=false;
  }));
  window.addEventListener('hashchange',()=>fromHash(true));
  window.addEventListener('popstate',()=>fromHash(true));
  window.addEventListener('load',()=>fromHash(Boolean(location.hash)));
  let scheduled=false;
  function syncReadingPosition(){
    scheduled=false;
    const readingLine=Math.min(320,Math.max(220,innerHeight*.33));
    let target=null;
    for(const link of links){
      const section=document.getElementById(link.dataset.catalogTarget);
      if(!section||section.hidden||!section.getClientRects().length)continue;
      if(section.getBoundingClientRect().top<=readingLine)target=section;
    }
    active(target);
  }
  function scheduleReadingPosition(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(syncReadingPosition);
  }
  addEventListener('scroll',scheduleReadingPosition,{passive:true});
  addEventListener('resize',scheduleReadingPosition,{passive:true});
  filter();fromHash();scheduleReadingPosition();
  window.isaacCatalog={select,filter,fromHash};
})();
