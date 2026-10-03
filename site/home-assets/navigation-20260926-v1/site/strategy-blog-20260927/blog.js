const filters = [...document.querySelectorAll('[data-blog-filter]')];
const posts = [...document.querySelectorAll('[data-blog-category]')];
filters.forEach(button => button.addEventListener('click', () => {
  const category = button.dataset.blogFilter;
  filters.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  let visible = 0;
  posts.forEach(post => {
    post.hidden = category !== 'all' && post.dataset.blogCategory !== category;
    if (!post.hidden) visible += 1;
  });
  const count = document.querySelector('.blog-count');
  if (count) count.textContent = `${visible} 篇文章`;
}));
