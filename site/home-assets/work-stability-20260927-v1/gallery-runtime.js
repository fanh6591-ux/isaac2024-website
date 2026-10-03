// Gallery resources belong to one page and are released before it is retired.
(function (global) {
  function createGalleryRuntime({ document, timers = global, mediaTimeout = 8000 } = {}) {
    const videos = new Set(), textures = new Set(), renderers = new Set(), pending = new Set();
    let active = true, disposed = false, sceneState;
    const api = { backend: 'auto', onError: () => {} };
    const play = video => {
      if (!active || disposed || document.hidden) return;
      try { Promise.resolve(video.play()).catch(() => {}); } catch (_) {}
    };
    function releaseVideo(video) {
      videos.delete(video); video.pause(); video.removeAttribute('src'); video.load();
    }
    function configure(texture, THREE) {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      textures.add(texture); return texture;
    }
    function loadVideo(url, THREE) {
      return new Promise((resolve, reject) => {
        const video = document.createElement('video'); videos.add(video);
        Object.assign(video, { crossOrigin: 'anonymous', loop: true, muted: true, defaultMuted: true, playsInline: true, preload: 'auto' });
        video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
        let settled = false;
        const cleanup = () => {
          timers.clearTimeout(timer); pending.delete(cancel);
          for (const type of ['loadeddata', 'canplay', 'canplaythrough']) video.removeEventListener(type, ready);
          video.removeEventListener('error', fail);
        };
        const cancel = () => { if (settled) return; settled = true; cleanup(); reject(new Error('Gallery retired')); };
        const ready = () => {
          // A decoded first frame is sufficient; autoplay and full buffering are optional.
          if (settled || video.readyState < 2 || video.videoWidth <= 0) return;
          settled = true; cleanup(); const texture = configure(new THREE.VideoTexture(video), THREE);
          play(video); resolve(texture);
        };
        const fail = () => {
          if (settled) return; settled = true; cleanup(); releaseVideo(video);
          const poster = url.replace(/-loop\.mp4(?:\?.*)?$/, '.png');
          let finished = false, texture;
          const done = (value, error) => {
            if (finished) { value?.dispose(); return; }
            finished = true; timers.clearTimeout(posterTimer); pending.delete(cancelPoster);
            if (error) { texture?.dispose(); reject(error); }
            else { document.documentElement.dataset.liquidPosterCount = String(1 + Number(document.documentElement.dataset.liquidPosterCount || 0)); resolve(configure(value, THREE)); }
          };
          const cancelPoster = () => done(null, new Error('Gallery retired'));
          const posterTimer = timers.setTimeout(() => done(null, new Error('Case image timed out')), mediaTimeout);
          pending.add(cancelPoster);
          texture = new THREE.TextureLoader().load(poster, value => done(value), undefined, () => done(null, new Error('Case image unavailable')));
        };
        const timer = timers.setTimeout(fail, mediaTimeout); pending.add(cancel);
        for (const type of ['loadeddata', 'canplay', 'canplaythrough']) video.addEventListener(type, ready);
        video.addEventListener('error', fail); video.src = url; video.load(); ready();
      });
    }
    api.loadMedia = (urls, THREE, progress) => {
      const completed = new Set();
      return Promise.all(urls.map((url, index) => loadVideo(url, THREE).then(texture => {
        completed.add(index); progress(completed.size / urls.length * .9); return texture;
      })));
    };
    api.setActive = value => {
      active = value; document.documentElement.dataset.liquidActive = String(value);
      sceneState?.setFrameloop(value && !document.hidden ? 'always' : 'never');
      for (const video of videos) value ? play(video) : video.pause();
    };
    api.captureScene = state => { sceneState = state; api.setActive(active); };
    api.watchRenderer = renderer => {
      renderers.add(renderer);
      const lost = renderer.onDeviceLost?.bind(renderer);
      renderer.onDeviceLost = info => { lost?.(info); if (!disposed) api.onError(new Error('Gallery graphics device lost')); };
      return renderer;
    };
    api.release = () => {
      if (disposed) return; disposed = true;
      sceneState?.setFrameloop('never'); sceneState = null;
      for (const cancel of [...pending]) cancel();
      for (const video of [...videos]) releaseVideo(video);
      for (const texture of textures) texture.dispose(); textures.clear();
      for (const renderer of renderers) { try { renderer.setAnimationLoop?.(null); renderer.dispose(); } catch (_) {} } renderers.clear();
    };
    return api;
  }
  global.createIsaacGalleryRuntime = createGalleryRuntime;
})(globalThis);
