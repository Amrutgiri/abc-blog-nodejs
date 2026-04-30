const crypto = require('crypto');
const PageView = require('../models/PageView');
const Post = require('../models/Post');
const Subscriber = require('../models/Subscriber');
const Category = require('../models/Category');
const Tag = require('../models/Tag');

function hashIp(ip = '') {
  return crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 24);
}

class AnalyticsService {
  async recordPageView({ req, post, title }) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '';
    await PageView.create({
      path: req.originalUrl,
      title: title || post?.title,
      post: post?._id,
      referrer: req.headers.referer || req.headers.referrer || '',
      userAgent: req.headers['user-agent'] || '',
      ipHash: hashIp(Array.isArray(ip) ? ip[0] : ip)
    });

    if (post?._id) {
      await Post.findByIdAndUpdate(post._id, { $inc: { views: 1 } });
    }
  }

  async getDashboardSummary() {
    const [totalPosts, publishedPosts, totalViews, totalSubscribers, totalCategories, totalTags, topPosts, dailyViews] = await Promise.all([
      Post.countDocuments(),
      Post.countDocuments({ status: 'published' }),
      Post.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: null, totalViews: { $sum: '$views' } } }
      ]),
      Subscriber.countDocuments({ status: 'active' }),
      Category.countDocuments(),
      Tag.countDocuments(),
      Post.find({ status: 'published' })
        .select('title slug views featuredImage publishedAt')
        .sort('-views')
        .limit(7),
      PageView.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14)
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            views: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ])
    ]);

    return {
      totalPosts,
      publishedPosts,
      totalViews: totalViews[0]?.totalViews || 0,
      totalSubscribers,
      totalCategories,
      totalTags,
      topPosts,
      dailyViews
    };
  }
}

module.exports = new AnalyticsService();
