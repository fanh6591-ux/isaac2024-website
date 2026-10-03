(() => {
  const index = document.querySelector('details.case-index');
  if (!index) return;
  const links = [...index.querySelectorAll('.case-toc a[href^="#"]')];
  const sections = links.map(link => document.getElementById(link.hash.slice(1)));
  if (sections.some(section => !section)) return;
  const headings = sections.map(section => section.querySelector('.section-header') || section);
  const mobile = matchMedia('(max-width:1000px)');
  const sync = () => {index.open = !mobile.matches;};
  sync();
  if (mobile.addEventListener) mobile.addEventListener('change', sync);
  else mobile.addListener(sync);
  const setCurrent = current => links.forEach((link, i) => {
    if (i === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  links.forEach((link, i) => link.addEventListener('click', () => {
    setCurrent(i);
    if (mobile.matches) index.open = false;
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobile.matches && index.open) {
      index.open = false;
      index.querySelector('summary').focus();
    }
  });
  let scheduled = false;
  const markCurrent = () => {
    scheduled = false;
    let current = 0;
    const readingLine = Math.min(innerHeight - 1, Math.max(mobile.matches ? 146 : 110, innerHeight - 96));
    for (let i = 0; i < headings.length; i++) {
      if (headings[i].getBoundingClientRect().top <= readingLine) current = i;
    }
    const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
    if (height > innerHeight + 24 && scrollY + innerHeight >= height - 24) current = sections.length - 1;
    setCurrent(current);
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(markCurrent);
  };
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule);
  addEventListener('hashchange', schedule);
  schedule();
})();
