
// ---- Intersection Observer for scroll reveal ----
const observerOptions = {
  root: null,
  rootMargin: '0px 0px -60px 0px',
  threshold: 0.15
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ---- DLA layers sequential animation ----
const dlaContainer = document.querySelector('.dla-container');
let dlaAnimated = false;

const dlaObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !dlaAnimated) {
    dlaAnimated = true;
    const rows = entries[0].target.querySelectorAll('.dla-row');
    rows.forEach((row, i) => {
      row.style.opacity = '0';
      row.style.transform = 'translateX(-20px)';
      row.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
      setTimeout(() => {
        row.style.opacity = '1';
        row.style.transform = 'translateX(0)';
      }, i * 350);
    });
    // Animate chips within each row
    rows.forEach((row, i) => {
      const chips = row.querySelectorAll('.dla-chip');
      chips.forEach((chip, j) => {
        chip.style.opacity = '0';
        chip.style.transform = 'translateY(10px)';
        chip.style.transition = 'opacity 0.35s ease-out, transform 0.35s ease-out';
        setTimeout(() => {
          chip.style.opacity = '1';
          chip.style.transform = 'translateY(0)';
        }, i * 350 + 150 + j * 60);
      });
    });
  }
}, { threshold: 0.3 });

if (dlaContainer) {
  dlaObserver.observe(dlaContainer);
}

// ---- Phase bar sequential animation ----
const phaseBar = document.querySelector('.phase-bar');
let phaseAnimated = false;

const phaseObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && !phaseAnimated) {
    phaseAnimated = true;
    const steps = entries[0].target.querySelectorAll('.phase-step');
    steps.forEach((step, i) => {
      step.style.opacity = '0';
      step.style.transform = 'translateY(16px)';
      step.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
      setTimeout(() => {
        step.style.opacity = '1';
        step.style.transform = 'translateY(0)';
      }, i * 200);
    });
  }
}, { threshold: 0.4 });

if (phaseBar) {
  phaseObserver.observe(phaseBar);
}

// ---- Parallax on hero circles ----
const heroDeco = document.querySelector('.hero-decoration');
if (heroDeco) {
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const rotate = scrollY * 0.05;
    heroDeco.style.transform = `translateY(-50%) rotate(${rotate}deg)`;
  }, { passive: true });
}
