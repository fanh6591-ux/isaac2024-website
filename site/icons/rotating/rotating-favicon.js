// Isaac skull/phoenix: pre-rendered real 3D views; no additional WebGL context.
(() => {
  if (document.querySelector('[data-isaac-rotating-favicon]')) return;
  const scriptUrl = document.currentScript?.src;
  if (!scriptUrl) return;
  const marker = document.createElement('meta');
  marker.dataset.isaacRotatingFavicon = 'loading';
  document.head.append(marker);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const sheet = new Image();
  let timer = null;
  let index = 0;
  let icon = null;
  let frames = [];
  const stop = () => { clearInterval(timer); timer = null; };
  const show = (i) => {
    if (!icon || !frames.length) return;
    index = i;
    icon.href = frames[i];
    icon.dataset.frame = String(i);
    document.querySelectorAll('[data-favicon-preview]').forEach(img => { img.src = frames[i]; });
  };
  const sync = () => {
    stop();
    if (!frames.length) return;
    if (document.hidden || motion.matches) { show(0); return; }
    timer = setInterval(() => show((index + 1) % frames.length), 125);
  };
  sheet.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const context = canvas.getContext('2d');
      if (!context || sheet.width !== 512 || sheet.height !== 384) throw new Error('Invalid icon sheet');
      for (let i = 0; i < 48; i++) {
        context.clearRect(0, 0, 64, 64);
        context.drawImage(sheet, (i % 8) * 64, Math.floor(i / 8) * 64, 64, 64, 0, 0, 64, 64);
        frames.push(canvas.toDataURL('image/png'));
      }
      icon = document.createElement('link');
      icon.rel = 'icon'; icon.type = 'image/png'; icon.sizes = '64x64';
      icon.dataset.animatedSkull = 'true';
      icon.href = frames[0];
      // Keep ordinary icons until the sprite is decoded successfully.
      document.querySelectorAll('link[rel~="icon"]').forEach(node => node.remove());
      document.head.append(icon);
      marker.dataset.isaacRotatingFavicon = 'ready';
      show(0); sync();
    } catch {
      stop(); marker.dataset.isaacRotatingFavicon = 'static';
    }
  };
  sheet.onerror = () => { marker.dataset.isaacRotatingFavicon = 'static'; };
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', sync);
  sheet.src = new URL('./skull-rotation.png', scriptUrl).href;
})();
