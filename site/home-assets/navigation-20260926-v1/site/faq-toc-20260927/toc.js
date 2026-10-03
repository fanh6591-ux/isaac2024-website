const index = document.querySelector('.faq-index');
if (index) {
  const compact = matchMedia('(max-width: 1000px)');
  const sync = () => { index.open = !compact.matches; };
  sync();
  compact.addEventListener('change', sync);
  index.querySelector('summary').addEventListener('click', event => {
    if (!compact.matches) event.preventDefault();
  });
  index.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    if (compact.matches) index.open = false;
  }));
}
