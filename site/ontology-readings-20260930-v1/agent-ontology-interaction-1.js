
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
let lastScrollY = 0;
window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  if (scrollY > 500) {
    topNav.classList.add('visible');
  } else {
    topNav.classList.remove('visible');
  }
  lastScrollY = scrollY;
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

// ===== E2E Diagram Step Animation =====
const e2eSteps = document.querySelectorAll('#e2eSvg g[id^="e2eStep"]');
const e2eDots = document.querySelectorAll('#layerDots .layer-dot');
const e2eDiagram = document.getElementById('e2eDiagram');

function resetE2ESteps() {
  e2eSteps.forEach(step => { step.style.opacity = '0.35'; step.style.transition = 'opacity 0.4s ease'; });
  e2eDots.forEach(dot => dot.classList.remove('active'));
}

function highlightStep(index) {
  resetE2ESteps();
  if (e2eSteps[index]) {
    e2eSteps[index].style.opacity = '1';
  }
  if (e2eDots[index]) {
    e2eDots[index].classList.add('active');
  }
}

// Auto-animate E2E steps when diagram enters viewport
let e2eAnimationStarted = false;
const e2eObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !e2eAnimationStarted) {
      e2eAnimationStarted = true;
      let step = 0;
      highlightStep(step);
      const interval = setInterval(() => {
        step++;
        if (step >= e2eSteps.length) {
          clearInterval(interval);
          // After completion, keep all visible
          e2eSteps.forEach(s => { s.style.opacity = '1'; });
          e2eDots.forEach(d => d.classList.add('active'));
          return;
        }
        highlightStep(step);
      }, 1800);
    }
  });
}, { threshold: 0.3 });

if (e2eDiagram) {
  e2eObserver.observe(e2eDiagram);
}

// Click dots to navigate steps
e2eDots.forEach(dot => {
  dot.addEventListener('click', () => {
    const step = parseInt(dot.dataset.step);
    highlightStep(step);
  });
});

// Initialize E2E steps at reduced opacity
resetE2ESteps();
if (e2eSteps[0]) e2eSteps[0].style.opacity = '0.5';

// ===== Smooth SVG hover interactions for all arch layers =====
document.querySelectorAll('.arch-layer').forEach(layer => {
  layer.addEventListener('mouseenter', function() {
    this.style.filter = 'brightness(0.94)';
    this.style.cursor = 'pointer';
  });
  layer.addEventListener('mouseleave', function() {
    this.style.filter = '';
  });
});

// ===== Flow line animation — pause on reduced motion =====
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (prefersReducedMotion.matches) {
  document.querySelectorAll('.flow-line').forEach(line => {
    line.style.animation = 'none';
  });
}

// ===== Concept grid stagger animation =====
const conceptGrids = document.querySelectorAll('.concept-grid');
conceptGrids.forEach(grid => {
  const items = grid.querySelectorAll('.concept-item');
  items.forEach((item, i) => {
    item.style.transition = `opacity 0.5s ${i * 0.1}s ease, transform 0.5s ${i * 0.1}s ease`;
    item.style.opacity = '0';
    item.style.transform = 'translateY(16px)';
  });

  const gridObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        items.forEach(item => {
          item.style.opacity = '1';
          item.style.transform = 'translateY(0)';
        });
        gridObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  gridObserver.observe(grid);
});

// ===== Table row hover enhancement =====
document.querySelectorAll('.comp-table tbody tr').forEach(row => {
  row.addEventListener('mouseenter', function() {
    this.style.transform = 'translateX(3px)';
    this.style.transition = 'transform 0.2s ease';
  });
  row.addEventListener('mouseleave', function() {
    this.style.transform = '';
  });
});

console.log('🚀 Palantir Agent × Ontology 交互机制 · 交互式深度解析 已就绪');
console.log('📊 包含 ' + document.querySelectorAll('.diagram-container').length + ' 个可交互图表');
console.log('💡 滚动页面以触发动画 · 悬停图表以查看交互效果');
