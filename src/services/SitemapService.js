const { SITE_URL } = require('./SeoService');
const PostRepository = require('../repositories/PostRepository');
const CategoryRepository = require('../repositories/CategoryRepository');
const TagRepository = require('../repositories/TagRepository');

function xmlEscape(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, lastmod) {
  return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    ${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ''}
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
}

class SitemapService {
  async generateXml() {
    const [posts, categories, tags] = await Promise.all([
      PostRepository.findAllForSitemap(),
      CategoryRepository.findAll({ activeOnly: true }),
      TagRepository.findAll()
    ]);

    const urls = [
      urlEntry(`${SITE_URL}/`, new Date()),
      urlEntry(`${SITE_URL}/blog`, new Date()),
      urlEntry(`${SITE_URL}/about`, new Date()),
      urlEntry(`${SITE_URL}/contact`, new Date())
    ];

    for (const post of posts) {
      urls.push(urlEntry(`${SITE_URL}/blog/${post.slug}`, post.updatedAt || post.publishedAt || post.createdAt));
    }

    for (const category of categories) {
      urls.push(urlEntry(`${SITE_URL}/category/${category.slug}`, category.updatedAt || category.createdAt));
    }

    for (const tag of tags) {
      urls.push(urlEntry(`${SITE_URL}/tag/${tag.slug}`, tag.updatedAt || tag.createdAt));
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
  }
}

module.exports = new SitemapService();
