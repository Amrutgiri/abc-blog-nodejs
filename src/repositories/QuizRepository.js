const Quiz = require('../models/Quiz');
const QuizQuestion = require('../models/QuizQuestion');
const QuizAttempt = require('../models/QuizAttempt');

class QuizRepository {
  async create(quizData, questions = []) {
    const quiz = await Quiz.create({
      ...quizData,
      totalQuestions: questions.length
    });

    if (questions.length > 0) {
      await this.replaceQuestions(quiz._id, questions);
    }

    return quiz;
  }

  async update(id, quizData, questions = null) {
    const quiz = await Quiz.findByIdAndUpdate(
      id,
      {
        ...quizData,
        ...(Array.isArray(questions) ? { totalQuestions: questions.length } : {})
      },
      { new: true, runValidators: true }
    );

    if (Array.isArray(questions)) {
      await this.replaceQuestions(id, questions);
    }

    return quiz;
  }

  async replaceQuestions(quizId, questions = []) {
    await QuizQuestion.deleteMany({ quiz: quizId });
    if (!questions.length) return [];

    const docs = questions.map((question, index) => ({
      quiz: quizId,
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      order: index + 1
    }));

    return await QuizQuestion.insertMany(docs);
  }

  async findById(id) {
    return await Quiz.findById(id).populate('blogPosts', 'title slug');
  }

  async findBySlug(slug) {
    return await Quiz.findOne({ slug }).populate('blogPosts', 'title slug');
  }

  async findQuestions(quizId) {
    return await QuizQuestion.find({ quiz: quizId }).sort('order');
  }

  async findAll(options = {}) {
    const { page = 1, limit = 12, status, category } = options;
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;

    const skip = (page - 1) * limit;
    const quizzes = await Quiz.find(query)
      .populate('blogPosts', 'title slug')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Quiz.countDocuments(query);
    return { quizzes, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findPublished(options = {}) {
    return this.findAll({ ...options, status: 'published' });
  }

  async findForList(options = {}) {
    const { page = 1, limit = 12, category } = options;
    const query = { status: 'published' };
    if (category) query.category = category;

    const skip = (page - 1) * limit;
    const quizzes = await Quiz.find(query)
      .populate('blogPosts', 'title slug')
      .sort('-publishedAt')
      .skip(skip)
      .limit(limit);

    const total = await Quiz.countDocuments(query);
    return { quizzes, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findRelatedForPost(post) {
    if (!post) return null;

    const byLink = await Quiz.findOne({ status: 'published', blogPosts: post._id }).populate('blogPosts', 'title slug');
    if (byLink) return byLink;

    if (post.category) {
      const slug = String(post.category.slug || post.category.name || '').toLowerCase();
      let category = 'quantitative';

      if (/(reason|logic|interview|aptitude)/.test(slug)) {
        category = 'logical';
      } else if (/(english|verbal|grammar|language)/.test(slug)) {
        category = 'verbal';
      } else if (/(math|quant|number|aptitude)/.test(slug)) {
        category = 'quantitative';
      }

      const related = await Quiz.findOne({ status: 'published', category }).sort('-publishedAt').populate('blogPosts', 'title slug');
      if (related) return related;
    }

    return await Quiz.findOne({ status: 'published' }).sort('-publishedAt').populate('blogPosts', 'title slug');
  }

  async delete(id) {
    await QuizQuestion.deleteMany({ quiz: id });
    await QuizAttempt.deleteMany({ quiz: id });
    return await Quiz.findByIdAndDelete(id);
  }

  async saveAttempt(attemptData) {
    return await QuizAttempt.create(attemptData);
  }

  async findAttemptById(id) {
    return await QuizAttempt.findById(id).populate('quiz', 'title slug duration category');
  }

  async getAttemptsForQuiz(quizId, limit = 10) {
    return await QuizAttempt.find({ quiz: quizId })
      .populate('user', 'username email')
      .sort('-score -percentage -submittedAt')
      .limit(limit);
  }

  async getTopAttempts(limit = 10) {
    return await QuizAttempt.find()
      .populate('quiz', 'title slug category')
      .populate('user', 'username email')
      .sort('-score -percentage -submittedAt')
      .limit(limit);
  }

  async getQuizAnalytics(quizId) {
    const attempts = await QuizAttempt.find({ quiz: quizId }).sort('-submittedAt');
    const totalAttempts = attempts.length;
    const averageScore = totalAttempts
      ? attempts.reduce((sum, item) => sum + (item.percentage || 0), 0) / totalAttempts
      : 0;

    return {
      totalAttempts,
      averageScore,
      attempts
    };
  }
}

module.exports = new QuizRepository();
