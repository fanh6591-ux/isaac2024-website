(() => {
  'use strict';
  const search=document.getElementById('solution-search');
  const disclosures=[...document.querySelectorAll('[data-catalog-disclosure]')];
  if(!disclosures.length)return;

  function revealHash(){
    let id;
    try{id=decodeURIComponent(location.hash.slice(1));}catch(_){return;}
    const target=document.getElementById(id);
    const disclosure=target&&disclosures.find(item=>item.contains(target));
    if(!disclosure)return;
    disclosure.open=true;
    requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:'instant'}));
  }

  document.addEventListener('click',event=>{
    const link=event.target.closest('[data-catalog-target]');
    const target=link&&document.getElementById(link.dataset.catalogTarget);
    const disclosure=target&&disclosures.find(item=>item.contains(target));
    if(disclosure)disclosure.open=true;
  },true);

  search?.addEventListener('input',()=>{
    if(!search.value.trim())return;
    for(const disclosure of disclosures){
      if(disclosure.querySelector('[data-catalog-entry]:not([hidden])'))disclosure.open=true;
    }
  });
  addEventListener('hashchange',revealHash);
  addEventListener('popstate',revealHash);
  addEventListener('load',revealHash);
  revealHash();
})();
