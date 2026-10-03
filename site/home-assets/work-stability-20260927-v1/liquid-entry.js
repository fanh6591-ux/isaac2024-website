(function () {
  const page = document.documentElement, fallback = document.querySelector('#liquid-fallback');
  let root, React, Renderer, generation = 0, started = false, retired = false, timer;
  function createRuntime(backend = 'auto') {
    const runtime = createIsaacGalleryRuntime({ document }); runtime.backend = backend;
    runtime.onError = recover; window.isaacGallery = runtime;
  }
  createRuntime();
  function clearStatus() {
    delete page.dataset.liquidFailed; delete page.dataset.liquidReady;
    page.dataset.liquidProgress = '0'; fallback.hidden = true;
  }
  function fail(error) {
    if (retired) return;
    clearTimeout(timer); page.dataset.liquidFailed = 'true'; fallback.hidden = false;
    console.error('Liquid gallery could not start', error);
  }
  function recover(error) {
    if (retired) return;
    if (generation >= 1 || !root) { fail(error); return; }
    generation++; page.dataset.liquidRecovery = String(generation);
    root.unmount(); window.isaacGallery.release(); window.isaacResetLiquid?.();
    createRuntime('webgl'); clearStatus();
    // The old canvas and scheduler are unmounted before a new graphics context starts.
    setTimeout(mount, 0);
  }
  function mount() {
    if (retired) return;
    clearTimeout(timer);
    root = window.isaacLiquidDOM.createRoot(document.querySelector('#liquid-root'));
    class Boundary extends React.Component {
      constructor(props) { super(props); this.state = { failed: false }; }
      static getDerivedStateFromError() { return { failed: true }; }
      componentDidCatch(error) { setTimeout(() => recover(error), 0); }
      render() { return this.state.failed ? null : this.props.children; }
    }
    root.render(React.createElement(Boundary, null, React.createElement(Renderer)));
    armTimeout();
  }
  function armTimeout() {
    clearTimeout(timer);
    if (page.dataset.liquidReady !== 'true') timer = setTimeout(() => {
      if (!document.hidden && page.dataset.liquidActive !== 'false' && page.dataset.liquidReady !== 'true') recover(new Error('Gallery loading timeout'));
    }, 30000);
  }
  function start() { if (started || retired) return; started = true; mount(); }
  function galleryError(error, filename = '') {
    if (error?.name === 'NotAllowedError' || error?.name === 'AbortError' || retired) return false;
    return /(?:\/work\/_next\/|gallery-bundle\.js)/.test(filename + ' ' + (error?.stack || ''));
  }
  addEventListener('error', event => { if (galleryError(event.error, event.filename)) recover(event.error || event.message); });
  addEventListener('unhandledrejection', event => { if (galleryError(event.reason)) recover(event.reason); });
  addEventListener('isaac:liquid-ready', () => {
    clearTimeout(timer); delete page.dataset.liquidFailed; fallback.hidden = true;
    document.querySelector('#case-links').dataset.ready = 'true';
  });
  addEventListener('isaac:page-activate', () => { start(); window.isaacGallery.setActive(true); armTimeout(); });
  addEventListener('isaac:page-pause', () => { clearTimeout(timer); window.isaacGallery.setActive(false); });
  function retire() {
    if (retired) return; retired = true; clearTimeout(timer);
    root?.unmount(); window.isaacGallery.release();
  }
  addEventListener('isaac:page-retire', retire);
  addEventListener('pagehide', event => { if (event.persisted) window.isaacGallery.setActive(false); else retire(); });
  addEventListener('pageshow', event => { if (event.persisted) window.isaacGallery.setActive(true); });
  document.addEventListener('visibilitychange', () => window.isaacGallery.setActive(!document.hidden));
  const retry = document.createElement('button'); retry.type = 'button'; retry.textContent = '重新加载画廊';
  retry.addEventListener('click', () => location.reload()); fallback.querySelector('p').append(' ', retry);
  try {
    globalThis.TURBOPACK.push(['isaac-liquid-entry', 918001, function (module) {
      React = module.i(71645); window.isaacLiquidDOM = module.i(46480); Renderer = module.i(9073).Renderer;
      if (window.parent === window || new URLSearchParams(location.search).get('portal-wait') !== '1') start();
    }]);
    globalThis.TURBOPACK.push(['isaac-liquid-boot', { otherChunks: [], runtimeModuleIds: [918001] }]);
  } catch (error) { fail(error); }
})();
