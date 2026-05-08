const QuizRepository = require('../repositories/QuizRepository');
const PostRepository = require('../repositories/PostRepository');
const { SeoService, QuizService, UserProgressService } = require('../services');
const xss = require('xss');

const CATEGORY_LABELS = {
  quantitative: 'Quantitative',
  logical: 'Logical',
  verbal: 'Verbal'
};

class QuizController {
  async index(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 9;
      const category = req.query.category && Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, req.query.category)
        ? req.query.category
        : '';

      const { quizzes, total, totalPages } = await QuizRepository.findForList({ page, limit, category });
      const seo = SeoService.buildSeo(req, {
        title: SeoService.makePageTitle('Aptitude Quizzes'),
        description: 'Practice aptitude quizzes for quantitative, logical, and verbal reasoning.',
        keywords: 'aptitude quiz, quantitative quiz, logical quiz, verbal quiz'
      });

      res.render('quizzes/index', {
        pageTitle: seo.title,
        seo,
        quizzes,
        total,
        page,
        totalPages,
        category,
        categoryLabels: CATEGORY_LABELS
      });
    } catch (error) {
      next(error);
    }
  }

  async show(req, res, next) {
    try {
      const quiz = await QuizRepository.findBySlug(req.params.slug);
      if (!quiz || quiz.status !== 'published') {
        return res.status(404).render('pages/404', { pageTitle: 'Quiz Not Found' });
      }

      const questions = await QuizRepository.findQuestions(quiz._id);
      const topAttempts = await QuizRepository.getAttemptsForQuiz(quiz._id, 10);
      const relatedPosts = quiz.blogPosts || [];
      const seo = SeoService.buildSeo(req, {
        title: SeoService.makePageTitle(`${quiz.title} - Quiz`),
        description: quiz.description || `Take the ${quiz.title} quiz.`,
        keywords: `${quiz.category}, quiz, aptitude`
      });

      res.render('quizzes/show', {
        pageTitle: seo.title,
        seo,
        quiz,
        totalQuestions: questions.length,
        topAttempts,
        relatedPosts
      });
    } catch (error) {
      next(error);
    }
  }

  async take(req, res, next) {
    try {
      const quiz = await QuizRepository.findBySlug(req.params.slug);
      if (!quiz || quiz.status !== 'published') {
        return res.status(404).render('pages/404', { pageTitle: 'Quiz Not Found' });
      }

      const rawQuestions = await QuizRepository.findQuestions(quiz._id);
      const questions = QuizService.prepareQuestions(quiz, rawQuestions.map(question => question.toObject()));
      const startedAt = Date.now();
      const seo = SeoService.buildSeo(req, {
        title: SeoService.makePageTitle(`Take ${quiz.title}`),
        description: quiz.description || `Attempt the ${quiz.title} quiz.`,
        keywords: `${quiz.category}, quiz`
      });

      res.render('quizzes/take', {
        pageTitle: seo.title,
        seo,
        quiz,
        questions,
        startedAt,
        durationSeconds: quiz.duration * 60
      });
    } catch (error) {
      next(error);
    }
  }

  async submit(req, res, next) {
    try {
      const quiz = await QuizRepository.findBySlug(req.params.slug);
      if (!quiz || quiz.status !== 'published') {
        return res.status(404).render('pages/404', { pageTitle: 'Quiz Not Found' });
      }

      const rawQuestions = await QuizRepository.findQuestions(quiz._id);
      const questions = rawQuestions.map(question => question.toObject());
      const answersObject = req.body.answers || {};
      const answers = Object.keys(answersObject).map(questionId => ({
        questionId,
        selectedAnswer: xss(String(answersObject[questionId] || '').trim())
      }));

      const startedAt = Number(req.body.startedAt || Date.now());
      const timeTaken = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
      const result = QuizService.calculateResult(questions, answers, quiz);
      const answerMap = new Map(answers.map(answer => [String(answer.questionId), answer.selectedAnswer]));
      const pointsEarned = UserProgressService.calculatePoints(result);
      const isLoggedIn = Boolean(req.session?.user?._id);

      const attemptPayload = {
        quiz: quiz._id,
        user: isLoggedIn ? req.session.user._id : undefined,
        answers: questions.map(question => ({
          question: question._id,
          questionText: question.question,
          options: question.options,
          selectedAnswer: answerMap.get(String(question._id)) || '',
          correctAnswer: question.correctAnswer,
          explanation: question.explanation || '',
          isCorrect: (answerMap.get(String(question._id)) || '') === question.correctAnswer
        })),
        score: result.score,
        accuracy: result.percentage,
        pointsEarned,
        correctAnswers: result.correctAnswers,
        wrongAnswers: result.wrongAnswers,
        percentage: result.percentage,
        timeTaken,
        totalQuestions: result.totalQuestions,
        startedAt: new Date(startedAt),
        submittedAt: new Date(),
        meta: {
          negativeMarking: quiz.negativeMarking,
          category: quiz.category
        }
      };

      if (!isLoggedIn) {
        return res.render('quizzes/result', {
          pageTitle: `${quiz.title} - Result`,
          seo: SeoService.buildSeo(req, {
            title: `${quiz.title} - Result`,
            description: `Your result for ${quiz.title}.`,
            keywords: `${quiz.category}, quiz result`
          }),
          quiz,
          attempt: attemptPayload,
          performanceMessage: QuizService.summarizePerformance(result.percentage),
          savedAttempt: false,
          promptLogin: true
        });
      }

      const attempt = await QuizRepository.saveAttempt(attemptPayload);
      const updatedUser = await UserProgressService.recordQuizAttempt(req.session.user._id, result, quiz, attempt._id);
      if (updatedUser) {
        req.session.user = {
          _id: updatedUser._id,
          name: updatedUser.name,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
          avatar: updatedUser.avatar,
          totalPoints: updatedUser.totalPoints,
          quizzesAttempted: updatedUser.quizzesAttempted,
          bestScore: updatedUser.bestScore,
          averageScore: updatedUser.averageScore,
          currentStreak: updatedUser.currentStreak,
          longestStreak: updatedUser.longestStreak,
          badges: updatedUser.badges
        };
      }

      return res.redirect(`/quizzes/${quiz.slug}/result/${attempt._id}`);
    } catch (error) {
      next(error);
    }
  }

  async result(req, res, next) {
    try {
      const attempt = await QuizRepository.findAttemptById(req.params.attemptId);
      if (!attempt || attempt.quiz.slug !== req.params.slug) {
        return res.status(404).render('pages/404', { pageTitle: 'Quiz Result Not Found' });
      }

      const quiz = attempt.quiz;
      const seo = SeoService.buildSeo(req, {
        title: `${quiz.title} - Result`,
        description: `Your result for ${quiz.title}.`,
        keywords: `${quiz.category}, quiz result`
      });

      res.render('quizzes/result', {
        pageTitle: seo.title,
        seo,
        quiz,
        attempt,
        performanceMessage: QuizService.summarizePerformance(attempt.percentage)
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QuizController();
