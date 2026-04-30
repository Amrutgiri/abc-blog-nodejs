const cron = require('node-cron');
const Post = require('../models/Post');
const EmailService = require('./EmailService');

class ScheduledPostService {
  start() {
    if (this.job) return this.job;

    this.job = cron.schedule('* * * * *', async () => {
      try {
        await this.publishDuePosts();
      } catch (error) {
        console.error('Scheduled publish failed:', error);
      }
    });

    return this.job;
  }

  async publishDuePosts() {
    const now = new Date();
    const duePosts = await Post.find({
      status: 'scheduled',
      scheduledAt: { $lte: now }
    }).populate('author', 'username email');

    for (const post of duePosts) {
      post.status = 'published';
      post.publishedAt = post.publishedAt || now;
      post.scheduledAt = undefined;
      await post.save();

      if (post.author) {
        await EmailService.sendPostPublishedNotification(post, post.author);
      }
    }

    return duePosts.length;
  }
}

module.exports = new ScheduledPostService();
