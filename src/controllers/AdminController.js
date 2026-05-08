const UserRepository = require('../repositories/UserRepository');
const PostRepository = require('../repositories/PostRepository');
const QuizRepository = require('../repositories/QuizRepository');
const CategoryRepository = require('../repositories/CategoryRepository');
const TagRepository = require('../repositories/TagRepository');
const ContactRepository = require('../repositories/ContactRepository');
const { validationResult } = require('express-validator');
const { EmailService, AnalyticsService, ContentService, NewsletterService, SiteSettingsService } = require('../services');
const slugify = require('slugify');

function renderAdmin(res, view, data = {}) {
  return res.render(view, {
    layout: 'admin/layout.ejs',
    ...data
  });
}

function renderPlain(res, view, data = {}) {
  return res.render(view, {
    layout: false,
    ...data
  });
}

function buildValidationMap(errors) {
  return errors.reduce((acc, error) => {
    if (!acc[error.path]) {
      acc[error.path] = error.msg;
    }
    return acc;
  }, {});
}

function parseEditorContent(value, fallback = { blocks: [{ type: 'paragraph', data: { text: '' } }] }) {
  if (!value) return fallback;

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return ContentService.normalizeContent(parsed);
  } catch (error) {
    return fallback;
  }
}

function normalizeArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function buildSettingsFormData(settings = {}, body = null) {
  const source = body || settings || {};
  return {
    siteName: source.siteName || '',
    siteDescription: source.siteDescription || '',
    siteLogoUrl: source.siteLogoUrl || '',
    faviconUrl: source.faviconUrl || '',
    footerAbout: source.footerAbout || '',
    whatsappChannelUrl: source.whatsappChannelUrl || '',
    facebookUrl: source.facebookUrl || '',
    instagramUrl: source.instagramUrl || '',
    xUrl: source.xUrl || '',
    youtubeUrl: source.youtubeUrl || '',
    linkedinUrl: source.linkedinUrl || '',
    contactEmail: source.contactEmail || '',
    supportPhone: source.supportPhone || '',
    copyrightText: source.copyrightText || ''
  };
}

function buildPostFormData(post = null, body = {}) {
  const postCategoryId = post?.category?._id ? String(post.category._id) : '';
  const postTagIds = Array.isArray(post?.tags) ? post.tags.map(tag => String(tag._id || tag)) : [];
  const bodySeo = body.seo || {};
  const contentFallback = post?.content || { blocks: [{ type: 'paragraph', data: { text: '' } }] };

  return {
    title: body.title ?? post?.title ?? '',
    excerpt: body.excerpt ?? post?.excerpt ?? '',
    content: parseEditorContent(body.content ?? post?.content, contentFallback),
    featuredImage: body.featuredImage ?? post?.featuredImage ?? '',
    category: body.category ?? postCategoryId,
    tags: normalizeArray(body.tags).length > 0 ? normalizeArray(body.tags) : postTagIds,
    status: body.status ?? post?.status ?? 'draft',
    scheduledAt: body.scheduledAt ?? (post?.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : ''),
    featured: body.featured === 'on' || body.featured === true || Boolean(post?.featured),
    seo: {
      metaTitle: bodySeo.metaTitle ?? post?.seo?.metaTitle ?? '',
      metaDescription: bodySeo.metaDescription ?? post?.seo?.metaDescription ?? '',
      metaKeywords: bodySeo.metaKeywords ?? post?.seo?.metaKeywords ?? ''
    }
  };
}

class AdminController {
  async login(req, res, next) {
    try {
      if (req.method === 'POST') {
        const { email, password } = req.body;
        const result = await UserRepository.authenticate(email, password);
        if (result.inactive) {
          return renderPlain(res.status(403), 'admin/login', {
            error: 'Your account is inactive. Please contact the administrator.'
          });
        }

        const user = result.user;
        if (!user) {
          return renderPlain(res.status(401), 'admin/login', {
            error: 'Invalid email or password'
          });
        }

        if (user.role !== 'admin') {
          return renderPlain(res.status(403), 'admin/login', {
            error: 'Admin access is restricted to administrators only.'
          });
        }

        req.session.user = {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        };
        return res.redirect('/admin');
      }
      renderPlain(res, 'admin/login', { pageTitle: 'Admin Login' });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res) {
    req.session.destroy();
    res.redirect('/admin/login');
  }

  async dashboard(req, res, next) {
    try {
      const User = require('../models/User');
      const [summary, recentPosts, totalUsers, contactStats] = await Promise.all([
        AnalyticsService.getDashboardSummary(),
        PostRepository.findRecent(5),
        User.countDocuments(),
        ContactRepository.getCounts()
      ]);
      const quizSummary = await Promise.all([
        QuizRepository.findAll({ limit: 1 }),
        QuizRepository.getTopAttempts(5)
      ]);

      renderAdmin(res, 'admin/dashboard', {
        pageTitle: 'Dashboard',
        recentPosts,
        totalViews: summary.totalViews,
        topPosts: summary.topPosts,
        chartData: summary.dailyViews,
        totalQuizzes: quizSummary[0].total,
        topQuizAttempts: quizSummary[1],
        totalUsers,
        contactStats,
        stats: {
          ...summary,
          totalContacts: contactStats.total,
          unreadContacts: contactStats.unread
        }
      });
    } catch (error) {
      next(error);
    }
  }

  async posts(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const status = req.query.status;

      const options = { page, limit, sort: '-createdAt' };
      if (status) options.status = status;

      const { posts, total, totalPages } = await PostRepository.findAll(options);

      renderAdmin(res, 'admin/posts', {
        pageTitle: 'Posts',
        posts,
        total,
        page,
        totalPages,
        status
      });
    } catch (error) {
      next(error);
    }
  }

  async newPost(req, res, next) {
    try {
      if (req.method === 'POST') {
        const errors = validationResult(req);
        const formData = buildPostFormData(null, req.body);

        if (!errors.isEmpty()) {
          const [categories, tags] = await Promise.all([
            CategoryRepository.findAll(),
            TagRepository.findAll()
          ]);
          const validationErrors = errors.array();
          return renderAdmin(res, 'admin/post-form', {
            pageTitle: 'New Post',
            post: null,
            categories,
            tags,
            formData,
            validationErrors,
            fieldErrorMap: buildValidationMap(validationErrors),
            error: validationErrors[0]?.msg || 'Please fix the errors below.'
          });
        }

        const slug = slugify(formData.title, { lower: true, strict: true }) + '-' + Date.now();
        const parsedContent = ContentService.sanitizeEditorContent(formData.content);
        const scheduledAt = formData.scheduledAt || null;

        const postData = {
          title: formData.title,
          slug,
          content: parsedContent,
          excerpt: formData.excerpt,
          featuredImage: formData.featuredImage,
          category: formData.category,
          tags: formData.tags,
          status: formData.status || 'draft',
          author: req.session.user._id,
          seo: formData.seo,
          featured: formData.featured,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          readingTime: ContentService.calculateReadingTime(parsedContent),
          toc: ContentService.buildToc(parsedContent)
        };

        const post = await PostRepository.create(postData);

        if (formData.status === 'published') {
          const category = await CategoryRepository.findById(formData.category).catch(() => null);
          await EmailService.sendPostPublishedNotification(post, req.session.user);
          await NewsletterService.sendAnnouncementToSubscribers({
            kind: 'post',
            title: post.title,
            description: post.excerpt || 'A new article has been published.',
            ctaUrl: `${(process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')}/blog/${post.slug}`,
            ctaLabel: 'Read Article',
            highlights: [
              `Category: ${category?.name || 'Uncategorized'}`,
              `Reading time: ${post.readingTime || 1} min`,
              `Author: ${req.session.user.username}`
            ],
            footnote: 'We hope you enjoy this new article.'
          }).catch(() => null);
        }

        req.flash('success', 'Post created successfully');
        return res.redirect('/admin/posts');
      }

      const [categories, tags] = await Promise.all([
        CategoryRepository.findAll(),
        TagRepository.findAll()
      ]);

      renderAdmin(res, 'admin/post-form', {
        pageTitle: 'New Post',
        post: null,
        categories,
        tags,
        formData: buildPostFormData()
      });
    } catch (error) {
      next(error);
    }
  }

  async editPost(req, res, next) {
    try {
      const post = await PostRepository.findById(req.params.id);
      if (!post) {
        return renderPlain(res.status(404), 'admin/error', { error: 'Post not found', statusCode: 404 });
      }

      if (req.method === 'PUT' || req.method === 'POST') {
        const errors = validationResult(req);
        const formData = buildPostFormData(post.toObject(), req.body);

        if (!errors.isEmpty()) {
          const [categories, tags] = await Promise.all([
            CategoryRepository.findAll(),
            TagRepository.findAll()
          ]);
          const validationErrors = errors.array();
          return renderAdmin(res, 'admin/post-form', {
            pageTitle: 'Edit Post',
            post,
            categories,
            tags,
            formData,
            validationErrors,
            fieldErrorMap: buildValidationMap(validationErrors),
            error: validationErrors[0]?.msg || 'Please fix the errors below.'
          });
        }

        const parsedContent = ContentService.sanitizeEditorContent(formData.content);
        const scheduledAt = formData.scheduledAt || null;

        const postData = {
          title: formData.title,
          content: parsedContent,
          excerpt: formData.excerpt,
          featuredImage: formData.featuredImage,
          category: formData.category,
          tags: formData.tags,
          status: formData.status || post.status,
          seo: formData.seo,
          featured: formData.featured,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          readingTime: ContentService.calculateReadingTime(parsedContent),
          toc: ContentService.buildToc(parsedContent)
        };

        if (formData.status === 'published' && post.status !== 'published') {
          postData.publishedAt = new Date();
        }

        await PostRepository.update(req.params.id, postData);

        if (formData.status === 'published' && post.status === 'draft') {
          const category = await CategoryRepository.findById(formData.category).catch(() => null);
          await EmailService.sendPostPublishedNotification(post, req.session.user);
          await NewsletterService.sendAnnouncementToSubscribers({
            kind: 'post',
            title: formData.title,
            description: formData.excerpt || 'A new article has been published.',
            ctaUrl: `${(process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')}/blog/${post.slug}`,
            ctaLabel: 'Read Article',
            highlights: [
              `Category: ${category?.name || 'Uncategorized'}`,
              `Reading time: ${ContentService.calculateReadingTime(parsedContent) || 1} min`,
              `Author: ${req.session.user.username}`
            ],
            footnote: 'We hope you enjoy this updated article.'
          }).catch(() => null);
        }

        req.flash('success', 'Post updated successfully');
        return res.redirect(`/admin/posts/${post._id}/edit`);
      }

      const [categories, tags] = await Promise.all([
        CategoryRepository.findAll(),
        TagRepository.findAll()
      ]);

      renderAdmin(res, 'admin/post-form', {
        pageTitle: 'Edit Post',
        post,
        categories,
        tags,
        formData: buildPostFormData(post.toObject())
      });
    } catch (error) {
      next(error);
    }
  }

  async deletePost(req, res, next) {
    try {
      await PostRepository.delete(req.params.id);
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(204).end();
      }
      req.flash('success', 'Post deleted successfully');
      res.redirect('/admin/posts');
    } catch (error) {
      next(error);
    }
  }

  async categories(req, res, next) {
    try {
      const categories = await CategoryRepository.findAll({ activeOnly: false });
      renderAdmin(res, 'admin/categories', {
        pageTitle: 'Categories',
        categories
      });
    } catch (error) {
      next(error);
    }
  }

  async newCategory(req, res, next) {
    try {
      if (req.method === 'POST') {
        const { name, description, image, isActive } = req.body;
        const slug = slugify(name, { lower: true, strict: true });

        await CategoryRepository.create({ name, slug, description, image, isActive: isActive === 'on' });
        req.flash('success', 'Category created successfully');
        return res.redirect('/admin/categories');
      }

      renderAdmin(res, 'admin/category-form', {
        pageTitle: 'New Category',
        category: null
      });
    } catch (error) {
      next(error);
    }
  }

  async editCategory(req, res, next) {
    try {
      const category = await CategoryRepository.findById(req.params.id);
      if (!category) {
        return renderPlain(res.status(404), 'admin/error', { error: 'Category not found', statusCode: 404 });
      }

      if (req.method === 'PUT' || req.method === 'POST') {
        const { name, description, image, isActive } = req.body;

        await CategoryRepository.update(req.params.id, {
          name,
          description,
          image,
          isActive: isActive === 'on'
        });

        req.flash('success', 'Category updated successfully');
        return res.redirect('/admin/categories');
      }

      renderAdmin(res, 'admin/category-form', {
        pageTitle: 'Edit Category',
        category
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCategory(req, res, next) {
    try {
      await CategoryRepository.delete(req.params.id);
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(204).end();
      }
      req.flash('success', 'Category deleted successfully');
      res.redirect('/admin/categories');
    } catch (error) {
      next(error);
    }
  }

  async tags(req, res, next) {
    try {
      const tags = await TagRepository.findAllWithCounts();
      renderAdmin(res, 'admin/tags', {
        pageTitle: 'Tags',
        tags
      });
    } catch (error) {
      next(error);
    }
  }

  async newTag(req, res, next) {
    try {
      if (req.method === 'POST') {
        const { name } = req.body;
        const slug = slugify(name, { lower: true, strict: true });

        await TagRepository.create({ name, slug });
        req.flash('success', 'Tag created successfully');
        return res.redirect('/admin/tags');
      }

      renderAdmin(res, 'admin/tag-form', {
        pageTitle: 'New Tag',
        tag: null
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTag(req, res, next) {
    try {
      await TagRepository.delete(req.params.id);
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(204).end();
      }
      req.flash('success', 'Tag deleted successfully');
      res.redirect('/admin/tags');
    } catch (error) {
      next(error);
    }
  }

  async contacts(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const status = req.query.status || '';
      const { messages, total, totalPages } = await ContactRepository.findAll({
        page,
        limit,
        status: status || undefined
      });
      const contactStats = await ContactRepository.getCounts();

      renderAdmin(res, 'admin/contacts', {
        pageTitle: 'Contact Messages',
        messages,
        total,
        page,
        totalPages,
        status,
        contactStats
      });
    } catch (error) {
      next(error);
    }
  }

  async settings(req, res, next) {
    try {
      const currentSettings = await SiteSettingsService.getSettings();

      if (req.method === 'POST') {
        const errors = validationResult(req);
        const formData = buildSettingsFormData(null, req.body);

        if (!errors.isEmpty()) {
          const validationErrors = errors.array();
          return renderAdmin(res, 'admin/settings', {
            pageTitle: 'Site Settings',
            settings: currentSettings,
            formData,
            validationErrors,
            fieldErrorMap: buildValidationMap(validationErrors),
            error: validationErrors[0]?.msg || 'Please fix the errors below.'
          });
        }

        await SiteSettingsService.saveSettings(formData);
        req.flash('success', 'Site settings updated successfully.');
        return res.redirect('/admin/settings');
      }

      return renderAdmin(res, 'admin/settings', {
        pageTitle: 'Site Settings',
        settings: currentSettings,
        formData: buildSettingsFormData(currentSettings)
      });
    } catch (error) {
      next(error);
    }
  }

  async subscribers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const status = req.query.status || '';
      const query = req.query.q || '';

      const [list, stats] = await Promise.all([
        NewsletterService.listSubscribers({ page, limit, status, query }),
        NewsletterService.getStats()
      ]);

      renderAdmin(res, 'admin/subscribers', {
        pageTitle: 'Newsletter Subscribers',
        subscribers: list.subscribers,
        total: list.total,
        page: list.page,
        totalPages: list.totalPages,
        status,
        query,
        stats
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleSubscriberStatus(req, res, next) {
    try {
      const subscriber = await NewsletterService.toggleSubscriberStatus(req.params.id);
      if (!subscriber) {
        return res.status(404).json({ error: 'Subscriber not found' });
      }

      if (req.headers.accept?.includes('application/json') || req.xhr) {
        return res.json({
          success: true,
          status: subscriber.status,
          message: `Subscriber ${subscriber.status === 'active' ? 'activated' : 'unsubscribed'} successfully.`
        });
      }

      req.flash('success', `Subscriber ${subscriber.status === 'active' ? 'activated' : 'unsubscribed'} successfully.`);
      return res.redirect('/admin/subscribers');
    } catch (error) {
      next(error);
    }
  }

  async showContact(req, res, next) {
    try {
      const contact = await ContactRepository.findById(req.params.id);
      if (!contact) {
        return renderPlain(res.status(404), 'admin/error', { error: 'Contact message not found', statusCode: 404 });
      }

      let currentContact = contact;
      if (contact.status === 'unread') {
        currentContact = await ContactRepository.update(req.params.id, { status: 'read' });
      }

      renderAdmin(res, 'admin/contact-detail', {
        pageTitle: 'Contact Message',
        contact: currentContact && currentContact.toObject ? currentContact.toObject() : currentContact
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteContact(req, res, next) {
    try {
      await ContactRepository.delete(req.params.id);
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(204).end();
      }
      req.flash('success', 'Contact message deleted successfully.');
      return res.redirect('/admin/contacts');
    } catch (error) {
      next(error);
    }
  }

  async users(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const { users, total, totalPages } = await UserRepository.findAll({ page, limit });

      renderAdmin(res, 'admin/users', {
        pageTitle: 'Users',
        users,
        total,
        page,
        totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  async editUser(req, res, next) {
    try {
      const user = await UserRepository.findById(req.params.id);
      if (!user) {
        return renderPlain(res.status(404), 'admin/error', { error: 'User not found', statusCode: 404 });
      }

      renderAdmin(res, 'admin/user-form', {
        pageTitle: 'Edit User',
        user
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const user = await UserRepository.findById(req.params.id);
      if (!user) {
        return renderPlain(res.status(404), 'admin/error', { error: 'User not found', statusCode: 404 });
      }

      const payload = {
        name: req.body.name,
        role: req.body.role,
        bio: req.body.bio,
        isActive: req.body.isActive === 'on',
        totalPoints: Number(req.body.totalPoints || 0),
        bestScore: Number(req.body.bestScore || 0)
      };

      await UserRepository.update(req.params.id, payload);
      req.flash('success', 'User updated successfully.');
      return res.redirect('/admin/users');
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      if (String(req.params.id) === String(req.session.user._id)) {
        return res.status(400).json({ error: 'You cannot delete your own account.' });
      }

      const user = await UserRepository.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.role === 'admin') {
        return res.status(403).json({ error: 'Admin accounts cannot be deleted.' });
      }

      await UserRepository.delete(req.params.id);
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(204).end();
      }

      req.flash('success', 'User deleted successfully.');
      return res.redirect('/admin/users');
    } catch (error) {
      next(error);
    }
  }

  async toggleUserStatus(req, res, next) {
    try {
      const user = await UserRepository.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (String(user._id) === String(req.session.user._id)) {
        return res.status(400).json({ error: 'You cannot change your own account status.' });
      }

      if (user.role === 'admin') {
        return res.status(403).json({ error: 'Admin accounts cannot be disabled.' });
      }

      const updated = await UserRepository.update(req.params.id, {
        isActive: !user.isActive
      });

      if (req.headers.accept?.includes('application/json') || req.xhr) {
        return res.json({
          success: true,
          isActive: updated.isActive,
          message: `User ${updated.isActive ? 'activated' : 'deactivated'} successfully.`
        });
      }

      req.flash('success', `User ${updated.isActive ? 'activated' : 'deactivated'} successfully.`);
      return res.redirect('/admin/users');
    } catch (error) {
      next(error);
    }
  }

  async importPosts(req, res, next) {
    try {
      const rawPosts = req.body.posts;
      const posts = Array.isArray(rawPosts)
        ? rawPosts
        : JSON.parse(rawPosts || '[]');

      let created = 0;

      for (const item of posts) {
        if (!item?.title) continue;
        const slug = slugify(item.title, { lower: true, strict: true }) + '-' + Date.now();
        const content = ContentService.sanitizeEditorContent(item.content || { blocks: [] });

        await PostRepository.create({
          title: item.title,
          slug,
          content,
          excerpt: item.excerpt || '',
          featuredImage: item.featuredImage || '',
          category: item.category || null,
          tags: Array.isArray(item.tags) ? item.tags : [],
          status: item.status || 'draft',
          featured: !!item.featured,
          scheduledAt: item.scheduledAt ? new Date(item.scheduledAt) : undefined,
          author: req.session.user._id,
          seo: item.seo || {},
          readingTime: ContentService.calculateReadingTime(content),
          toc: ContentService.buildToc(content)
        });
        created += 1;
      }

      req.flash('success', `${created} posts imported successfully.`);
      return res.redirect('/admin/posts');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
