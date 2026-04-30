const mongoose = require('mongoose');

const pageViewSchema = new mongoose.Schema({
  path: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  referrer: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  ipHash: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

pageViewSchema.index({ post: 1, createdAt: -1 });
pageViewSchema.index({ path: 1, createdAt: -1 });

module.exports = mongoose.model('PageView', pageViewSchema);
