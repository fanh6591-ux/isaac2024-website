/* Small, independent boot UI: it must work even if the 3D module cannot load. */
(() => {
  const gate = document.querySelector('#entry-gate');
  if (!gate) return;
  const body = document.body;
  const title = gate.querySelector('[data-entry-title]');
  const detail = gate.querySelector('[data-entry-detail]');
  const progress = gate.querySelector('progress');
  const percent = gate.querySelector('[data-entry-percent]');
  const start = gate.querySelector('[data-entry-start]');
  const skip = gate.querySelector('[data-entry-skip]');
  const retry = gate.querySelector('[data-entry-retry]');
  const controller = new AbortController();
  const background = [...body.children].filter(el => el !== gate && !['SCRIPT', 'NOSCRIPT'].includes(el.tagName));
  let state = 'loading';
  let completionTimer;gate.style.setProperty('--entry-progress','.08');
  const savedRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  background.forEach(el => { el.inert = true; });
  gate.dataset.state = state;
  // GPU work may pause in a background tab. Only visible waiting counts as a timeout.
  function visibleTimeout(fn, delay) {
    let timer, remaining=delay, startedAt;
    function change() {
      if (document.hidden) {
        if (timer !== undefined) { remaining=Math.max(0,remaining-(Date.now()-startedAt)); clearTimeout(timer); timer=undefined; }
      } else if (timer === undefined && state === 'loading') {
        startedAt=Date.now();timer=setTimeout(()=>{timer=undefined;document.removeEventListener('visibilitychange',change);fn();},remaining);
      }
    }
    document.addEventListener('visibilitychange',change);change();
    return ()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',change);};
  }
  const cancelSlow = visibleTimeout(() => {
    if (state === 'loading') {detail.hidden=false;detail.textContent='加载稍慢，可以先阅读内容。';skip.hidden=false;}
  }, 12000);
  const cancelDeadline = visibleTimeout(() => fail(), 45000);
  function clearTimers() { cancelSlow(); cancelDeadline(); clearTimeout(completionTimer); }
  function setState(next) { state = next; gate.dataset.state = next; }
  function release(reading) {
    if (state === 'entered' || state === 'skipped') return;
    const returnFocus=gate.contains(document.activeElement);
    clearTimers();
    setState(reading ? 'skipped' : 'entered');
    if (reading) {
      controller.abort();
      body.classList.remove('scene-ready');
      body.classList.add('scene-unavailable');
      document.querySelector('#scene-status').textContent = '文字浏览模式 · 可从菜单查看产品与文章';
    }
    body.classList.remove('is-loading');
    gate.hidden = true;
    background.forEach(el => { el.inert = false; });
    history.scrollRestoration = savedRestoration;
    let target = document.querySelector('#hello');
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))) || target; } catch {}
    requestAnimationFrame(() => {
      target?.scrollIntoView({behavior: 'instant', block: 'start'});
      if(returnFocus)document.querySelector('.brand')?.focus({preventScroll: true});
      window.dispatchEvent(new Event('isaac:entered'));
    });
  }
  function fail() {
    if (state !== 'loading') return;
    clearTimers(); setState('failed');
    release(true);
  }
  start.addEventListener('click', () => {
    if (state === 'ready') release(false);
    else if (state === 'failed') release(true);
  });
  skip.addEventListener('click', () => release(true));
  retry.addEventListener('click', () => location.reload());
  gate.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const buttons = [...gate.querySelectorAll('button')].filter(el => !el.disabled && !el.hidden);
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.isaacEntry = {
    signal: controller.signal,
    get state() { return state; },
    progress(label, fraction = null) {
      if (state !== 'loading') return;
      title.textContent = '加载中';
      if (Number.isFinite(fraction)) {
        progress.value = Math.max(0, Math.min(1, fraction));
        percent.textContent = Math.round(progress.value * 100) + '%';
        gate.style.setProperty('--entry-progress',String(.08+progress.value*.84));
      } else { progress.removeAttribute('value'); percent.textContent = ''; }
    },
    ready() {
      if (state !== 'loading') return;
      clearTimers(); setState('closing');
      progress.value = 1; percent.textContent = '100%';gate.style.setProperty('--entry-progress','1');
      completionTimer=setTimeout(()=>release(false),window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?80:620);
    },
    fail
  };
})();
