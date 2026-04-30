const PostRepository = require('../repositories/PostRepository');
const QuizRepository = require('../repositories/QuizRepository');
const CategoryRepository = require('../repositories/CategoryRepository');
const TagRepository = require('../repositories/TagRepository');
const { SeoService, ContentService, AnalyticsService, SearchService } = require('../services');
const xss = require('xss');

class BlogController {
  async index(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 12;
      const category = req.query.category;
      const search = xss(String(req.query.q || '').trim());

      let postsResult;
      if (search) {
        postsResult = await PostRepository.search(search, { page, limit });
      } else {
        const options = { page, limit, status: 'published' };
        if (category) options.category = category;
        postsResult = await PostRepository.findAll(options);
      }

      let { posts, total, totalPages } = postsResult;
      if (search) {
        posts = SearchService.decoratePosts(posts, search);
      }
      const categories = await CategoryRepository.findAllWithCounts();
      const suggestions = search ? await PostRepository.suggest(search) : [];
      const seo = SeoService.buildSeo(req, {
        title: search ? `Search results for "${search}" - Aptitude Booster Club` : 'Blog - Aptitude Booster Club',
        description: search
          ? `Browse search results for ${search} on Aptitude Booster Club.`
          : 'Read practical aptitude, reasoning, and exam preparation articles.',
        keywords: search || 'aptitude blog, reasoning, exam preparation'
      });

      res.render('pages/blog', {
        pageTitle: seo.title,
        seo,
        posts,
        total,
        page,
        totalPages,
        categories,
        searchQuery: search,
        suggestions
      });
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const post = await PostRepository.findBySlug(req.params.slug);
      if (!post) {
        return res.status(404).render('pages/404', { pageTitle: 'Post Not Found' });
      }

      const toc = ContentService.buildToc(post.content);
      const readingTime = ContentService.calculateReadingTime(post.content);
      const cleanContent = ContentService.sanitizeEditorContent(post.content);
      await AnalyticsService.recordPageView({ req, post });
      post.views = (post.views || 0) + 1;

      const relatedPosts = await PostRepository.findRelated(post._id, post.category?._id, 3);
      const recentPosts = await PostRepository.findRecent(5);
      const categories = await CategoryRepository.findAllWithCounts();
      const relatedQuiz = await QuizRepository.findRelatedForPost(post);
      const seo = SeoService.buildPostSeo(req, post);
      const jsonLd = SeoService.buildBlogPostingJsonLd(post, req);
      const breadcrumbJsonLd = SeoService.buildBreadcrumbJsonLd([
        { name: 'Home', url: '/' },
        { name: 'Blog', url: '/blog' },
        ...(post.category ? [{ name: post.category.name, url: `/category/${post.category.slug}` }] : []),
        { name: post.title, url: `/blog/${post.slug}` }
      ]);

      res.render('pages/single-post', {
        pageTitle: seo.title,
        seo,
        post: {
          ...post.toObject(),
          content: cleanContent,
          toc,
          readingTime
        },
        relatedPosts,
        recentPosts,
        categories,
        relatedQuiz,
        jsonLd,
        breadcrumbJsonLd
      });
    } catch (error) {
      next(error);
    }
  }

  async category(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 12;

      const category = await CategoryRepository.findBySlug(req.params.slug);
      if (!category) {
        return res.status(404).render('pages/404', { pageTitle: 'Category Not Found' });
      }

      const { posts, total, totalPages } = await PostRepository.findByCategory(category._id, { page, limit });
      const categories = await CategoryRepository.findAllWithCounts();
      const seo = SeoService.buildSeo(req, {
        title: `${category.name} - Aptitude Booster Club`,
        description: category.description || `Browse articles under ${category.name}.`,
        keywords: category.name
      });

      res.render('pages/category', {
        pageTitle: seo.title,
        seo,
        posts,
        category,
        total,
        page,
        totalPages,
        categories
      });
    } catch (error) {
      next(error);
    }
  }

  async tag(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 12;

      const tag = await TagRepository.findBySlug(req.params.slug);
      if (!tag) {
        return res.status(404).render('pages/404', { pageTitle: 'Tag Not Found' });
      }

      const { posts, total, totalPages } = await PostRepository.findByTag(tag._id, { page, limit });
      const categories = await CategoryRepository.findAllWithCounts();
      const seo = SeoService.buildSeo(req, {
        title: `${tag.name} - Aptitude Booster Club`,
        description: `Browse articles tagged with ${tag.name}.`,
        keywords: tag.name
      });

      res.render('pages/tag', {
        pageTitle: seo.title,
        seo,
        posts,
        tag,
        total,
        page,
        totalPages,
        categories
      });
    } catch (error) {
      next(error);
    }
  }

  async search(req, res, next) {
    try {
      const query = xss(String(req.query.q || '').trim());
      if (!query) {
        return res.redirect('/blog');
      }

      const page = parseInt(req.query.page) || 1;
      const limit = 12;

      const { posts, total, totalPages } = await PostRepository.search(query, { page, limit });
      const categories = await CategoryRepository.findAllWithCounts();
      const seo = SeoService.buildSeo(req, {
        title: `Search: ${query} - Aptitude Booster Club`,
        description: `Search results for ${query} on Aptitude Booster Club.`,
        keywords: query
      });

      res.render('pages/search', {
        pageTitle: seo.title,
        seo,
        posts: SearchService.decoratePosts(posts, query),
        searchQuery: query,
        total,
        page,
        totalPages,
        categories
      });
    } catch (error) {
      next(error);
    }
  }

  async suggestions(req, res, next) {
    try {
      const query = xss(String(req.query.q || '').trim());
      if (!query) {
        return res.json({ suggestions: [] });
      }

      const suggestions = await PostRepository.suggest(query);
      res.json({ suggestions });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new BlogController();
