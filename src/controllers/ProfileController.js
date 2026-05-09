const { SeoService, UserProgressService, LeaderboardService } = require('../services');
const UserRepository = require('../repositories/UserRepository');
const QuizAttempt = require('../models/QuizAttempt');

class ProfileController {
  async index(req, res, next) {
    try {
      const [data, profileUser] = await Promise.all([
        UserProgressService.getDashboardData(req.session.user._id),
        UserRepository.findById(req.session.user._id)
      ]);

      const seo = SeoService.buildSeo(req, {
        title: SeoService.makePageTitle('My Profile'),
        description: 'View your account details, quiz activity, and progress.'
      });

      res.render('profile/index', {
        pageTitle: seo.title,
        seo,
        data,
        profileUser: profileUser || req.session.user
      });
    } catch (error) {
      next(error);
    }
  }

  async dashboard(req, res, next) {
    try {
      const data = await UserProgressService.getDashboardData(req.session.user._id);
      const seo = SeoService.buildSeo(req, {
        title: SeoService.makePageTitle('My Dashboard'),
        description: 'Track your quiz progress, scores, and streaks.'
      });

      res.render('profile/dashboard', {
        pageTitle: seo.title,
        seo,
        data
      });
    } catch (error) {
      next(error);
    }
  }

  async attempts(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 10;
      const skip = (page - 1) * limit;
      const attempts = await QuizAttempt.find({ user: req.session.user._id })
        .populate('quiz', 'title slug category')
        .sort('-submittedAt')
        .skip(skip)
        .limit(limit);
      const total = await QuizAttempt.countDocuments({ user: req.session.user._id });
      const seo = SeoService.buildSeo(req, {
        title: SeoService.makePageTitle('My Attempts'),
        description: 'Review your quiz history and performance.'
      });

      res.render('profile/attempts', {
        pageTitle: seo.title,
        seo,
        attempts,
        page,
        totalPages: Math.ceil(total / limit),
        total
      });
    } catch (error) {
      next(error);
    }
  }

  async leaderboard(req, res, next) {
    try {
      const timeframe = ['daily', 'weekly', 'all'].includes(req.query.timeframe) ? req.query.timeframe : 'all';
      const entries = await LeaderboardService.getLeaderboard(timeframe);
      const seo = SeoService.buildSeo(req, {
        title: SeoService.makePageTitle('Leaderboard'),
        description: 'Compete on the aptitude quiz leaderboard.'
      });

      res.render('profile/leaderboard', {
        pageTitle: seo.title,
        seo,
        entries,
        timeframe
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProfileController();
