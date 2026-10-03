
const tip = document.getElementById('tip');
document.querySelectorAll('.term').forEach(el => {
  el.addEventListener('mouseenter', e => {
    const t = el.getAttribute('data-tip');
    if (!t) return;
    tip.textContent = t;
    tip.classList.add('on');
    move(e);
  });
  el.addEventListener('mousemove', move);
  el.addEventListener('mouseleave', () => tip.classList.remove('on'));
});
function move(e) {
  const m = 14, tw = tip.offsetWidth, th = tip.offsetHeight;
  let x = e.clientX + m, y = e.clientY - th - m;
  if (x + tw > window.innerWidth - m) x = e.clientX - tw - m;
  if (y < m) y = e.clientY + m;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}
