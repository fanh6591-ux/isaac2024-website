
// ===== 滚动进度条 + 顶栏 =====
const scrollProgress = document.getElementById('scrollProgress');
const topNav = document.getElementById('topNav');

window.addEventListener('scroll', () => {
  const doc = document.documentElement;
  const scrolled = doc.scrollTop / (doc.scrollHeight - doc.clientHeight);
  scrollProgress.style.width = (scrolled * 100) + '%';
  if (doc.scrollTop > 300) {
    topNav.classList.add('visible');
  } else {
    topNav.classList.remove('visible');
  }
}, { passive: true });

// ===== 滚动渐显 =====
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ===== Hero 总览图：点击节点跳转章节 =====
function jumpTo(target) {
  const el = document.querySelector(target);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

document.querySelectorAll('.hero-node').forEach(node => {
  const target = node.dataset.target;
  node.addEventListener('click', () => jumpTo(target));
  node.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      jumpTo(target);
    }
  });
});

// ===== 对比表行悬停微动效 =====
document.querySelectorAll('.comp-table tbody tr').forEach(row => {
  row.addEventListener('mouseenter', function() {
    this.style.transform = 'translateX(3px)';
    this.style.transition = 'transform 0.2s ease';
  });
  row.addEventListener('mouseleave', function() {
    this.style.transform = '';
  });
});

// ===== 减少动态效果偏好 =====
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (prefersReducedMotion.matches) {
  document.querySelectorAll('.flow-line').forEach(line => { line.style.animation = 'none'; });
  document.querySelectorAll('.draw-edge').forEach(edge => { edge.style.animation = 'none'; edge.style.strokeDashoffset = '0'; });
}

console.log('🚀 五张「图」讲明白 · 已就绪');
console.log('💡 点击顶部总览图中的节点，可直达对应章节');
