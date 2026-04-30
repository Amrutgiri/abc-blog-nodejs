const User = require('../models/User');
const QuizAttempt = require('../models/QuizAttempt');

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayKey(date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function getBadgeList(totalPoints = 0) {
  if (totalPoints >= 1000) return ['Beginner', 'Intermediate', 'Expert'];
  if (totalPoints >= 300) return ['Beginner', 'Intermediate'];
  return ['Beginner'];
}

class UserProgressService {
  calculatePoints(result) {
    return Math.max(0, Number(result.correctAnswers || 0) * 10);
  }

  async recordQuizAttempt(userId, result, quiz, attemptId) {
    const user = await User.findById(userId);
    if (!user) return null;

    const now = new Date();
    const today = startOfDay(now);
    const lastAttempt = user.lastQuizAttemptAt ? startOfDay(user.lastQuizAttemptAt) : null;
    let currentStreak = user.currentStreak || 0;

    if (!lastAttempt) {
      currentStreak = 1;
    } else {
      const diffDays = Math.round((today - lastAttempt) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        currentStreak = Math.max(1, currentStreak);
      } else if (diffDays === 1) {
        currentStreak += 1;
      } else {
        currentStreak = 1;
      }
    }

    const quizzesAttempted = (user.quizzesAttempted || 0) + 1;
    const totalPoints = (user.totalPoints || 0) + this.calculatePoints(result);
    const averageScore = Math.round((((user.averageScore || 0) * (quizzesAttempted - 1)) + (result.percentage || 0)) / quizzesAttempted);
    const badges = getBadgeList(totalPoints);

    user.totalPoints = totalPoints;
    user.quizzesAttempted = quizzesAttempted;
    user.bestScore = Math.max(user.bestScore || 0, result.percentage || 0);
    user.averageScore = averageScore;
    user.totalCorrectAnswers = (user.totalCorrectAnswers || 0) + (result.correctAnswers || 0);
    user.totalWrongAnswers = (user.totalWrongAnswers || 0) + (result.wrongAnswers || 0);
    user.currentStreak = currentStreak;
    user.longestStreak = Math.max(user.longestStreak || 0, currentStreak);
    user.lastQuizAttemptAt = now;
    user.badges = badges;
    await user.save();

    return user;
  }

  async getDashboardData(userId) {
    const [user, attempts, attemptStats, dailyAttempts, scoreTimeline] = await Promise.all([
      User.findById(userId).select('-password'),
      QuizAttempt.find({ user: userId }).populate('quiz', 'title slug category').sort('-submittedAt').limit(10),
      QuizAttempt.aggregate([
        { $match: { user: userId } },
        {
          $group: {
            _id: null,
            totalAttempts: { $sum: 1 },
            averageScore: { $avg: '$percentage' },
            bestScore: { $max: '$percentage' },
            totalPoints: { $sum: '$pointsEarned' },
            totalTime: { $sum: '$timeTaken' }
          }
        }
      ]),
      QuizAttempt.aggregate([
        {
          $match: {
            user: userId,
            submittedAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$submittedAt' },
              month: { $month: '$submittedAt' },
              day: { $dayOfMonth: '$submittedAt' }
            },
            attempts: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),
      QuizAttempt.aggregate([
        {
          $match: {
            user: userId,
            submittedAt: { $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$submittedAt' },
              month: { $month: '$submittedAt' },
              day: { $dayOfMonth: '$submittedAt' }
            },
            score: { $avg: '$percentage' }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ])
    ]);

    const summary = attemptStats[0] || {
      totalAttempts: 0,
      averageScore: 0,
      bestScore: 0,
      totalPoints: 0,
      totalTime: 0
    };

    return {
      user,
      attempts,
      summary: {
        totalAttempts: summary.totalAttempts || 0,
        averageScore: Math.round(summary.averageScore || 0),
        bestScore: summary.bestScore || 0,
        totalPoints: summary.totalPoints || 0,
        totalTime: summary.totalTime || 0,
        currentStreak: user?.currentStreak || 0,
        longestStreak: user?.longestStreak || 0,
        badges: user?.badges || ['Beginner']
      },
      charts: {
        attemptLabels: dailyAttempts.map(item => `${item._id.month}/${item._id.day}`),
        attemptValues: dailyAttempts.map(item => item.attempts),
        scoreLabels: scoreTimeline.map(item => `${item._id.month}/${item._id.day}`),
        scoreValues: scoreTimeline.map(item => Math.round(item.score || 0))
      }
    };
  }
}

module.exports = new UserProgressService();
