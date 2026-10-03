
// ===== Scroll Progress Bar =====
const progressBar = document.getElementById('scrollProgress');
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progressBar.style.width = progress + '%';
});

// ===== Top Nav Visibility =====
const topNav = document.getElementById('topNav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 500) {
    topNav.classList.add('visible');
  } else {
    topNav.classList.remove('visible');
  }
});

// ===== Scroll Reveal =====
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
revealElements.forEach(el => revealObserver.observe(el));

// ===== Add reveal to h2 inside sections =====
document.querySelectorAll('section.reveal h2').forEach(h2 => {
  h2.classList.add('reveal');
  revealObserver.observe(h2);
});
