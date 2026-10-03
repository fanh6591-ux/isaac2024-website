
/* ===== Scroll progress ===== */
const progressBar = document.getElementById('scrollProgress');
window.addEventListener('scroll', () => {
  const h = document.documentElement;
  const total = h.scrollHeight - h.clientHeight;
  progressBar.style.width = total > 0 ? (h.scrollTop / total * 100) + '%' : '0%';
}, { passive: true });

/* ===== Reveal on scroll ===== */
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.06 });
revealEls.forEach(el => revealObserver.observe(el));

/* Fallback: reveals in view get lit even if intersection frames are skipped */
function lightUpVisibleReveals() {
  const vh = window.innerHeight;
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) el.classList.add('visible');
  });
}
let revealTicking = false;
window.addEventListener('scroll', () => {
  if (revealTicking) return;
  revealTicking = true;
  requestAnimationFrame(() => { lightUpVisibleReveals(); revealTicking = false; });
}, { passive: true });
/* Safety nets: page loaded with #hash, and anchor jumps via smooth scroll */
setTimeout(lightUpVisibleReveals, 600);
window.addEventListener('hashchange', () => setTimeout(lightUpVisibleReveals, 400));

/* ===== Spectrum active state (scroll-linked) ===== */
const nodes = document.querySelectorAll('.spectrum-node');
const nodeIds = Array.from(nodes).map(n => n.getAttribute('href').slice(1));
const sections = nodeIds.map(id => document.getElementById(id)).filter(Boolean);

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      nodes.forEach(n => n.classList.toggle('active', n.getAttribute('href') === '#' + e.target.id));
    }
  });
}, { rootMargin: '-45% 0px -45% 0px' });
sections.forEach(s => sectionObserver.observe(s));
