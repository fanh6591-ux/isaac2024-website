(() => {
  const index=document.querySelector('.ai-support-index');
  if(!index)return;
  const links=[...index.querySelectorAll('[data-support-target]')];
  const sections=links.map(a=>document.getElementById(a.dataset.supportTarget));
  let scheduled=false, current;
  function update() {
    scheduled=false;
    let next=0;
    sections.forEach((section,i)=>{if(section?.getBoundingClientRect().top<=130)next=i;});
    if(current===links[next])return;
    current?.removeAttribute('aria-current');current=links[next];current?.setAttribute('aria-current','location');
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  links.forEach((a,i)=>a.addEventListener('click',event=>{
    event.preventDefault();const section=sections[i];if(!section)return;
    history.pushState(history.state,'','#'+section.id);
    window.isaacMergedUi?.show(section,false);
    section.scrollIntoView({block:'start',behavior:'instant'});
    schedule();
  }));
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  addEventListener('load',schedule);schedule();
})();
