const QuizAttempt = require('../models/QuizAttempt');

class LeaderboardService {
  async getLeaderboard(timeframe = 'all') {
    const now = new Date();
    let match = { user: { $ne: null } };

    if (timeframe === 'daily') {
      match.submittedAt = { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
    } else if (timeframe === 'weekly') {
      match.submittedAt = { $gte: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7) };
    }

    const rows = await QuizAttempt.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$user',
          totalAttempts: { $sum: 1 },
          totalScore: { $sum: '$pointsEarned' },
          bestScore: { $max: '$percentage' },
          averageScore: { $avg: '$percentage' },
          totalTime: { $sum: '$timeTaken' }
        }
      },
      { $sort: { totalScore: -1, totalAttempts: -1, bestScore: -1 } },
      { $limit: 100 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ]);

    return rows.map((item, index) => ({
      rank: index + 1,
      user: {
        _id: item.user._id,
        name: item.user.name,
        username: item.user.username,
        avatar: item.user.avatar
      },
      totalAttempts: item.totalAttempts,
      totalScore: item.totalScore,
      bestScore: item.bestScore,
      averageScore: Math.round(item.averageScore || 0),
      totalTime: item.totalTime
    }));
  }
}

module.exports = new LeaderboardService();
