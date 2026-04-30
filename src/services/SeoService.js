const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

function absoluteUrl(url = '/') {
  if (!url) return SITE_URL;
  if (/^https?:\/\//i.test(url)) return url;
  return `${SITE_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

function canonicalPath(req) {
  const raw = req.originalUrl || '/';
  return raw.split('?')[0] || '/';
}

function buildSeo(req, options = {}) {
  const path = options.path || canonicalPath(req);
  const title = options.title || 'Aptitude Booster Club';
  const description = options.description || 'Your go-to resource for aptitude tests, competitive exams, and skill development.';
  const keywords = options.keywords || 'aptitude, reasoning, exams, blog';
  const image = absoluteUrl(options.image || '/images/og-default.jpg');

  return {
    title,
    description,
    keywords,
    url: path,
    canonical: absoluteUrl(path),
    image,
    robots: options.robots || 'index,follow',
    type: options.type || 'website',
    siteName: 'Aptitude Booster Club'
  };
}

function buildPostSeo(req, post) {
  return buildSeo(req, {
    title: post.seo?.metaTitle || post.title,
    description: post.seo?.metaDescription || post.excerpt || '',
    keywords: post.seo?.metaKeywords || (post.tags || []).map(tag => tag.name).join(', '),
    image: post.seo?.ogImage || post.featuredImage || '/images/og-default.jpg',
    type: 'article'
  });
}

function buildBlogPostingJsonLd(post, req) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seo?.metaDescription || post.excerpt || '',
    image: [absoluteUrl(post.seo?.ogImage || post.featuredImage || '/images/og-default.jpg')],
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : new Date(post.createdAt).toISOString(),
    dateModified: new Date(post.updatedAt || post.createdAt).toISOString(),
    author: {
      '@type': 'Person',
      name: post.author?.username || 'Aptitude Booster Club'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Aptitude Booster Club',
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/images/og-default.jpg')
      }
    },
    mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
    url: absoluteUrl(`/blog/${post.slug}`)
  };
}

function buildBreadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url)
    }))
  };
}

module.exports = {
  SITE_URL,
  absoluteUrl,
  buildSeo,
  buildPostSeo,
  buildBlogPostingJsonLd,
  buildBreadcrumbJsonLd
};
