const xss = require('xss');

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlight(text, query) {
  const safeText = xss(String(text || ''));
  const term = String(query || '').trim();
  if (!term) return safeText;

  const pattern = new RegExp(`(${escapeRegex(xss(term))})`, 'ig');
  return safeText.replace(pattern, '<mark>$1</mark>');
}

function decoratePosts(posts = [], query = '') {
  return posts.map(post => ({
    ...post.toObject ? post.toObject() : post,
    highlightedTitle: highlight(post.title, query),
    highlightedExcerpt: highlight(post.excerpt || '', query)
  }));
}

function buildSuggestions(posts = [], query = '') {
  const seen = new Set();
  const list = [];
  const needle = String(query || '').toLowerCase().trim();

  for (const post of posts) {
    if (!post?.title) continue;
    const title = String(post.title);
    if (needle && !title.toLowerCase().includes(needle)) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ title, slug: post.slug });
    if (list.length >= 8) break;
  }

  return list;
}

module.exports = {
  escapeRegex,
  highlight,
  decoratePosts,
  buildSuggestions
};
