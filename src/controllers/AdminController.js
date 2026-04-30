const UserRepository = require('../repositories/UserRepository');
const PostRepository = require('../repositories/PostRepository');
const QuizRepository = require('../repositories/QuizRepository');
const CategoryRepository = require('../repositories/CategoryRepository');
const TagRepository = require('../repositories/TagRepository');
const { EmailService, AnalyticsService, ContentService } = require('../services');
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

class AdminController {
  async login(req, res, next) {
    try {
      if (req.method === 'POST') {
        const { email, password } = req.body;
        const user = await UserRepository.comparePassword(email, password);
        if (!user) {
          return renderPlain(res.status(401), 'admin/login', {
            error: 'Invalid email or password'
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
      const [summary, recentPosts, totalUsers] = await Promise.all([
        AnalyticsService.getDashboardSummary(),
        PostRepository.findRecent(5),
        User.countDocuments()
      ]);
      const quizSummary = await Promise.all([
        QuizRepository.findAll({ limit: 1 }),
        QuizRepository.getTopAttempts(5)
      ]);

      renderAdmin(res, 'admin/dashboard', {
        pageTitle: 'Dashboard',
        stats: summary,
        recentPosts,
        totalViews: summary.totalViews,
        topPosts: summary.topPosts,
        chartData: summary.dailyViews,
        totalQuizzes: quizSummary[0].total,
        topQuizAttempts: quizSummary[1],
        totalUsers
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
        const { title, content, excerpt, featuredImage, category, tags, status, seo } = req.body;
        const scheduledAt = req.body.scheduledAt || null;
        const featured = req.body.featured === 'on';
        const slug = slugify(title, { lower: true, strict: true }) + '-' + Date.now();
        const parsedContent = ContentService.sanitizeEditorContent(content);

        const postData = {
          title,
          slug,
          content: parsedContent,
          excerpt,
          featuredImage,
          category,
          tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
          status: status || 'draft',
          author: req.session.user._id,
          seo,
          featured,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          readingTime: ContentService.calculateReadingTime(parsedContent),
          toc: ContentService.buildToc(parsedContent)
        };

        const post = await PostRepository.create(postData);

        if (status === 'published') {
          await EmailService.sendPostPublishedNotification(post, req.session.user);
        }

        req.flash('success', 'Post created successfully');
        return res.redirect(`/admin/posts/${post._id}/edit`);
      }

      const [categories, tags] = await Promise.all([
        CategoryRepository.findAll(),
        TagRepository.findAll()
      ]);

      renderAdmin(res, 'admin/post-form', {
        pageTitle: 'New Post',
        post: null,
        categories,
        tags
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
        const { title, content, excerpt, featuredImage, category, tags, status, seo } = req.body;
        const scheduledAt = req.body.scheduledAt || null;
        const featured = req.body.featured === 'on';
        const parsedContent = ContentService.sanitizeEditorContent(content);

        const postData = {
          title,
          content: parsedContent,
          excerpt,
          featuredImage,
          category,
          tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
          status: status || post.status,
          seo,
          featured,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          readingTime: ContentService.calculateReadingTime(parsedContent),
          toc: ContentService.buildToc(parsedContent)
        };

        if (status === 'published' && post.status !== 'published') {
          postData.publishedAt = new Date();
        }

        await PostRepository.update(req.params.id, postData);

        if (status === 'published' && post.status === 'draft') {
          await EmailService.sendPostPublishedNotification(post, req.session.user);
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
        tags
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
