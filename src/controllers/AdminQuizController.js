const slugify = require('slugify');
const QuizRepository = require('../repositories/QuizRepository');
const PostRepository = require('../repositories/PostRepository');
const { QuizService, NewsletterService } = require('../services');

function renderAdmin(res, view, data = {}) {
  return res.render(view, {
    layout: 'admin/layout.ejs',
    ...data
  });
}

function parseBlogPosts(blogPosts) {
  if (!blogPosts) return [];
  if (Array.isArray(blogPosts)) return blogPosts.filter(Boolean);
  return [blogPosts].filter(Boolean);
}

function parseQuestions(body) {
  if (body.bulkQuestions) {
    return QuizService.parseBulkQuestions(body.bulkQuestions);
  }

  const manualQuestions = Object.values(body.questions || {});
  return QuizService.parseManualQuestions(manualQuestions);
}

class AdminQuizController {
  async index(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const { quizzes, total, totalPages } = await QuizRepository.findAll({ page, limit });

      renderAdmin(res, 'admin/quizzes', {
        pageTitle: 'Quizzes',
        quizzes,
        total,
        page,
        totalPages
      });
    } catch (error) {
      next(error);
    }
  }

  async newQuiz(req, res, next) {
    try {
      const posts = await PostRepository.findAll({ status: 'published', limit: 100, sort: '-publishedAt' });
      renderAdmin(res, 'admin/quiz-form', {
        pageTitle: 'New Quiz',
        quiz: null,
        questions: [],
        posts: posts.posts || [],
        quizQuestions: []
      });
    } catch (error) {
      next(error);
    }
  }

  async createQuiz(req, res, next) {
    try {
      const { title, description, category, duration, status, instructions, negativeMarking, negativeMarkingValue, randomizeQuestions } = req.body;
      const questions = parseQuestions(req.body);
      const blogPosts = parseBlogPosts(req.body.blogPosts);

      if (!questions.length) {
        req.flash('error', 'Please add at least one valid question.');
        return res.redirect('/admin/quizzes/new');
      }

      const slug = slugify(title, { lower: true, strict: true });

      await QuizRepository.create({
        title,
        slug,
        description,
        category,
        duration: Number(duration),
        status: status || 'draft',
        instructions,
        negativeMarking: negativeMarking === 'on',
        negativeMarkingValue: Number(negativeMarkingValue || 0),
        randomizeQuestions: randomizeQuestions !== 'off',
        blogPosts,
        createdBy: req.session.user._id,
        publishedAt: status === 'published' ? new Date() : undefined
      }, questions);

      if (status === 'published') {
        await NewsletterService.sendAnnouncementToSubscribers({
          kind: 'quiz',
          title,
          description: description || 'A new quiz is now available.',
          ctaUrl: `${(process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')}/quizzes/${slug}`,
          ctaLabel: 'Take Quiz',
          highlights: [
            `Category: ${category}`,
            `Duration: ${Number(duration)} minutes`,
            `Questions: ${questions.length}`
          ],
          footnote: 'Challenge yourself with the latest quiz.'
        }).catch(() => null);
      }

      req.flash('success', 'Quiz created successfully.');
      return res.redirect('/admin/quizzes');
    } catch (error) {
      next(error);
    }
  }

  async editQuiz(req, res, next) {
    try {
      const quiz = await QuizRepository.findById(req.params.id);
      if (!quiz) {
        return res.status(404).render('admin/error', { layout: false, error: 'Quiz not found', statusCode: 404 });
      }

      const posts = await PostRepository.findAll({ status: 'published', limit: 100, sort: '-publishedAt' });
      const quizQuestions = await QuizRepository.findQuestions(quiz._id);
      renderAdmin(res, 'admin/quiz-form', {
        pageTitle: 'Edit Quiz',
        quiz,
        quizQuestions,
        posts: posts.posts || [],
        questions: quizQuestions
      });
    } catch (error) {
      next(error);
    }
  }

  async updateQuiz(req, res, next) {
    try {
      const quiz = await QuizRepository.findById(req.params.id);
      if (!quiz) {
        return res.status(404).render('admin/error', { layout: false, error: 'Quiz not found', statusCode: 404 });
      }

      const { title, description, category, duration, status, instructions, negativeMarking, negativeMarkingValue, randomizeQuestions } = req.body;
      const questions = parseQuestions(req.body);
      const blogPosts = parseBlogPosts(req.body.blogPosts);

      await QuizRepository.update(req.params.id, {
        title,
        description,
        category,
        duration: Number(duration),
        status: status || 'draft',
        instructions,
        negativeMarking: negativeMarking === 'on',
        negativeMarkingValue: Number(negativeMarkingValue || 0),
        randomizeQuestions: randomizeQuestions !== 'off',
        blogPosts,
        publishedAt: status === 'published' && !quiz.publishedAt ? new Date() : quiz.publishedAt
      }, questions.length > 0 ? questions : null);

      if (status === 'published' && quiz.status !== 'published') {
        await NewsletterService.sendAnnouncementToSubscribers({
          kind: 'quiz',
          title,
          description: description || 'A new quiz is now available.',
          ctaUrl: `${(process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')}/quizzes/${quiz.slug}`,
          ctaLabel: 'Take Quiz',
          highlights: [
            `Category: ${category}`,
            `Duration: ${Number(duration)} minutes`,
            `Questions: ${questions.length || quiz.totalQuestions || 0}`
          ],
          footnote: 'Challenge yourself with the latest quiz.'
        }).catch(() => null);
      }

      req.flash('success', 'Quiz updated successfully.');
      return res.redirect('/admin/quizzes');
    } catch (error) {
      next(error);
    }
  }

  async deleteQuiz(req, res, next) {
    try {
      await QuizRepository.delete(req.params.id);
      if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(204).end();
      }
      req.flash('success', 'Quiz deleted successfully.');
      return res.redirect('/admin/quizzes');
    } catch (error) {
      next(error);
    }
  }

  async attempts(req, res, next) {
    try {
      const quiz = await QuizRepository.findById(req.params.id);
      if (!quiz) {
        return res.status(404).render('admin/error', { layout: false, error: 'Quiz not found', statusCode: 404 });
      }

      const analytics = await QuizRepository.getQuizAnalytics(quiz._id);
      const attempts = await QuizRepository.getAttemptsForQuiz(quiz._id, 50);

      renderAdmin(res, 'admin/quiz-attempts', {
        pageTitle: `${quiz.title} Attempts`,
        quiz,
        analytics,
        attempts
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminQuizController();
