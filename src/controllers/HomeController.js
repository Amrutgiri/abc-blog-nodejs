const PostRepository = require('../repositories/PostRepository');
const CategoryRepository = require('../repositories/CategoryRepository');
const TagRepository = require('../repositories/TagRepository');
const ContactRepository = require('../repositories/ContactRepository');
const { SeoService, ContactService, EmailService } = require('../services');
const NewsletterService = require('../services/NewsletterService');
const { validationResult } = require('express-validator');

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
        title: SeoService.makePageTitle('Learn, Practice, Succeed'),
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
        title: SeoService.makePageTitle('About Us'),
        description: 'Learn more about our mission to help learners succeed.'
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
      const seo = SeoService.buildSeo(req, {
        title: SeoService.makePageTitle('Contact Us'),
        description: 'Get in touch with our team.'
      });

      if (req.method === 'POST') {
        const errors = validationResult(req);
        const formData = {
          name: String(req.body.name || '').trim(),
          email: String(req.body.email || '').trim(),
          message: String(req.body.message || '').trim()
        };

        if (!errors.isEmpty()) {
          const validationErrors = errors.array();
          return res.render('pages/contact', {
            pageTitle: seo.title,
            seo,
            formData,
            validationErrors,
            fieldErrorMap: validationErrors.reduce((acc, error) => {
              if (!acc[error.path]) acc[error.path] = error.msg;
              return acc;
            }, {}),
            disposableDomains: ContactService.disposableDomains,
            error: validationErrors[0]?.msg || 'Please fix the errors below.'
          });
        }

        const payload = ContactService.buildContactPayload(req.body, req);
        if (ContactService.isDisposableEmail(payload.email)) {
          return res.render('pages/contact', {
            pageTitle: seo.title,
            seo,
            formData,
            disposableDomains: ContactService.disposableDomains,
            error: 'Disposable email addresses are not allowed.'
          });
        }

        await ContactRepository.create(payload);
        await EmailService.sendContactNotification(payload.name, payload.email, payload.message).catch(() => null);

        return res.render('pages/contact', {
          pageTitle: seo.title,
          seo,
          formData: { name: '', email: '', message: '' },
          disposableDomains: ContactService.disposableDomains,
          success: 'Thank you! Your message has been sent.'
        });
      }

      res.render('pages/contact', {
        pageTitle: seo.title,
        seo,
        formData: { name: '', email: '', message: '' },
        disposableDomains: ContactService.disposableDomains
      });
    } catch (error) {
      next(error);
    }
  }

  async subscribeNewsletter(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash('error', errors.array()[0].msg);
        return res.redirect(req.headers.referer || '/');
      }

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

  async unsubscribeNewsletter(req, res, next) {
    try {
      const seo = SeoService.buildSeo(req, {
        title: SeoService.makePageTitle('Unsubscribe'),
        description: 'Manage your email subscription.'
      });

      const token = String(req.params.token || '').trim();
      if (!token) {
        return res.status(400).render('pages/newsletter-unsubscribe', {
          pageTitle: seo.title,
          seo,
          success: false,
          message: 'Missing unsubscribe token.'
        });
      }

      const subscriber = await NewsletterService.unsubscribeByToken(token);
      if (!subscriber) {
        return res.status(404).render('pages/newsletter-unsubscribe', {
          pageTitle: seo.title,
          seo,
          success: false,
          message: 'This unsubscribe link is invalid or has expired.'
        });
      }

      return res.render('pages/newsletter-unsubscribe', {
        pageTitle: seo.title,
        seo,
        success: true,
        message: `${subscriber.email} has been unsubscribed from newsletter emails.`,
        subscriber
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new HomeController();
