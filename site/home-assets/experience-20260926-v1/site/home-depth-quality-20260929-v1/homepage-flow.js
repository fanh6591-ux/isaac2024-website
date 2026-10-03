import {sampleCalmScene} from './calm-motion.js';
import {applyJourneyPose} from './product-journey.js';
import {createReturnCharge, wheelPixels} from './scroll-return-state.js';

export function sampleChapterScene(index,fraction,panels){return sampleCalmScene(index,fraction,panels)}

export function updateProductDirectory(panel, fraction, reduced = false) {
  if (panel?.dataset.layout !== 'product-list') return;
  const rows = [...panel.querySelectorAll('.product-row')];
  rows.forEach((row, index) => {
    const p = reduced ? 1 : Math.max(0, Math.min(1, fraction * (rows.length + 1) - index + 1));
    row.style.setProperty('--row-entry', String(p));
    row.inert = p < .98;
    row.setAttribute('aria-hidden', String(p <= 0));
  });
}

export function applyFlowPose(pose, panel, local, mobile, position, reduced=false) {
  applyJourneyPose(pose,position,mobile,reduced);
  if (panel?.id === 'face-the-fear') {
    pose.camera = [0,.25,10]; pose.target = [0,.1,0];
    pose.head = mobile ? [0,1.72,.1] : [2.25,.65,0];
    pose.scale = mobile ? 2.3 : 4.05; pose.rotation = [0,0,0];
  }
}

export function resetHomepage() {
  document.documentElement.classList.remove('game-playing','game-entering','game-exiting');
  document.body.classList.remove('in-game');
  history.replaceState(null, '', '#hello');
  window.scrollTo({top:0,behavior:'instant'});
  window.dispatchEvent(new Event('isaac:jump'));
  window.isaacHomeScene?.prepareHomeReturn?.();
  window.isaacHomeScene?.resumeInteraction?.();
  document.getElementById('hello')?.focus({preventScroll:true});
}

export function installScrollReturn({button, mount, onReturn}) {
  const state = createReturnCharge(), abort = new AbortController();
  let active = false, returning = false, raf = 0, frameWindow = null, touchY = null, blockUntil = 0;
  const dock = document.createElement('div'); dock.className = 'game-return-dock'; dock.hidden = true;
  button.before(dock); dock.append(button);
  button.setAttribute('aria-label','回到首页');
  button.innerHTML = '<svg class="return-ring" viewBox="0 0 300 84" preserveAspectRatio="none" aria-hidden="true"><rect class="return-track" x="2" y="2" width="296" height="80" rx="39"/><rect class="return-charge" x="2" y="2" width="296" height="80" rx="39" pathLength="100"/></svg><span class="return-label">回到首页 <b aria-hidden="true">↑</b></span>';
  const hint = document.createElement('p'); hint.textContent = '继续向下滚动，绕满一圈回到首页'; dock.append(hint);
  const meter = document.createElement('span'); meter.className = 'return-meter'; meter.setAttribute('role','progressbar'); meter.setAttribute('aria-label','返回首页进度'); meter.setAttribute('aria-valuemin','0'); meter.setAttribute('aria-valuemax','100'); dock.append(meter);
  const draw = value => {
    dock.style.setProperty('--return-charge', String(value.charge));
    dock.style.setProperty('--return-reveal', String(value.reveal));
    mount.style.setProperty('--game-lift', `${value.reveal * 100}px`);
    dock.dataset.charge = value.charge.toFixed(4); dock.dataset.reveal = value.reveal.toFixed(4);
    meter.setAttribute('aria-valuenow', String(Math.round(value.charge * 100)));
  };
  async function finish() {
    if (returning) return;
    returning = true; blockUntil = performance.now() + 1800; dock.dataset.state = 'returning';
    try { await onReturn(); } finally { blockUntil = performance.now() + 900; returning = false; setActive(false); }
  }
  function input(delta) {
    if (!active || returning) return;
    const value = state.input(delta, performance.now()); draw(value);
    if (value.complete) finish();
  }
  function wheel(event) {
    if (performance.now() < blockUntil) { event.preventDefault(); return; }
    if (!active || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (event.target?.closest?.('.site-header,dialog,[role="dialog"],input,textarea,select')) return;
    event.preventDefault(); event.stopImmediatePropagation(); input(wheelPixels(event, innerHeight));
  }
  function tick(now) {
    if (!active) return;
    draw(state.tick(now, !document.hidden)); raf = requestAnimationFrame(tick);
  }
  function setActive(value) {
    if (active === value) return;
    active = value; dock.hidden = !value; button.hidden = !value;
    state.reset(); draw(state.snapshot()); cancelAnimationFrame(raf);
    if (value) { dock.dataset.state = 'ready'; raf = requestAnimationFrame(tick); }
  }
  function bindFrame(frame) {
    const connect = () => {
      if (frameWindow) frameWindow.removeEventListener('wheel', wheel, true);
      try { frameWindow = frame.contentWindow; frameWindow.addEventListener('wheel', wheel, {capture:true,passive:false}); } catch { frameWindow = null; }
    };
    frame.addEventListener('load', connect, {signal:abort.signal}); connect();
  }
  window.addEventListener('wheel', wheel, {capture:true,passive:false,signal:abort.signal});
  button.addEventListener('click', event => { event.stopImmediatePropagation(); finish(); }, {capture:true,signal:abort.signal});
  dock.addEventListener('touchstart', event => { touchY=event.touches[0]?.clientY; }, {passive:true,signal:abort.signal});
  dock.addEventListener('touchmove', event => { if(touchY===null)return;const y=event.touches[0]?.clientY;if(y===undefined)return;event.preventDefault();input(touchY-y);touchY=y; }, {passive:false,signal:abort.signal});
  dock.addEventListener('touchend',()=>touchY=null,{signal:abort.signal});
  button.addEventListener('keydown',event=>{if(['PageDown','ArrowDown',' '].includes(event.key)){event.preventDefault();input(event.key==='ArrowDown'?100:180)}},{signal:abort.signal});
  return {setActive,bindFrame,dispose(){setActive(false);abort.abort();frameWindow?.removeEventListener('wheel',wheel,true);dock.remove();}};
}

export function initHomepageFlow() {
  const end = document.getElementById('return-home'), button = document.querySelector('[data-home-return]');
  if (end && button) {
    const controller = installScrollReturn({button,mount:document.getElementById('stage'),onReturn:resetHomepage});
    const update = () => controller.setActive(!document.body.classList.contains('in-game') && end.getBoundingClientRect().top < innerHeight*.4 && end.getBoundingClientRect().bottom > innerHeight*.5);
    addEventListener('scroll',update,{passive:true});addEventListener('isaac:jump',update);addEventListener('isaac:entered',update);update();
  }
}
