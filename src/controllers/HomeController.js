const PostRepository = require('../repositories/PostRepository');
const CategoryRepository = require('../repositories/CategoryRepository');
const TagRepository = require('../repositories/TagRepository');
const { SeoService } = require('../services');
const NewsletterService = require('../services/NewsletterService');
const xss = require('xss');

class HomeController {
  async index(req, res, next) {
    try {
      const [featuredPost, recentPosts, categories, popularTags] = await Promise.all([
        PostRepository.findFeatured(),
        PostRepository.findRecent(6),
        CategoryRepository.findAllWithCounts(),
        TagRepository.findAllWithCounts()
      ]);

      const popularTagsList = popularTags.slice(0, 10);
      const seo = SeoService.buildSeo(req, {
        title: 'Aptitude Booster Club - Learn, Practice, Succeed',
        description: 'Master aptitude, reasoning, and competitive exam skills with focused practice and expert articles.',
        keywords: 'aptitude, reasoning, exam preparation, learning'
      });

      res.render('pages/index', {
        pageTitle: seo.title,
        seo,
        featuredPost,
        recentPosts,
        categories,
        popularTags: popularTagsList
      });
    } catch (error) {
      next(error);
    }
  }

  async about(req, res, next) {
    try {
      const seo = SeoService.buildSeo(req, {
        title: 'About Us - Aptitude Booster Club',
        description: 'Learn more about Aptitude Booster Club and our mission to help learners succeed.'
      });
      res.render('pages/about', {
        pageTitle: seo.title,
        seo
      });
    } catch (error) {
      next(error);
    }
  }

  async contact(req, res, next) {
    try {
      if (req.method === 'POST') {
        const { name, email, message } = req.body;
        if (!name || !email || !message) {
          return res.render('pages/contact', {
            pageTitle: 'Contact Us',
            error: 'All fields are required'
          });
        }
        const { EmailService } = require('../services');
        await EmailService.sendContactNotification(
          xss(String(name).trim()),
          xss(String(email).trim()),
          xss(String(message).trim())
        );
        return res.render('pages/contact', {
          pageTitle: 'Contact Us',
          success: 'Thank you! Your message has been sent.'
        });
      }
      const seo = SeoService.buildSeo(req, {
        title: 'Contact Us - Aptitude Booster Club',
        description: 'Get in touch with the Aptitude Booster Club team.'
      });
      res.render('pages/contact', {
        pageTitle: seo.title,
        seo
      });
    } catch (error) {
      next(error);
    }
  }

  async subscribeNewsletter(req, res, next) {
    try {
      const { email, name } = req.body;
      if (!email) {
        req.flash('error', 'Email is required to subscribe.');
        return res.redirect(req.headers.referer || '/');
      }

      await NewsletterService.subscribe({
        email,
        name,
        source: 'footer-form'
      });

      req.flash('success', 'Thanks for subscribing to our newsletter.');
      return res.redirect(req.headers.referer || '/');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HomeController();
