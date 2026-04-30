const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  excerpt: {
    type: String,
    maxlength: 500
  },
  featuredImage: {
    type: String,
    default: ''
  },
  featured: {
    type: Boolean,
    default: false
  },
  readingTime: {
    type: Number,
    default: 0
  },
  toc: [{
    level: Number,
    text: String,
    slug: String
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'scheduled', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  scheduledAt: {
    type: Date
  },
  views: {
    type: Number,
    default: 0
  },
  seo: {
    metaTitle: {
      type: String,
      maxlength: 70
    },
    metaDescription: {
      type: String,
      maxlength: 160
    },
    metaKeywords: String,
    ogImage: String
  }
}, {
  timestamps: true
});

postSchema.index({ slug: 1 });
postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ category: 1 });
postSchema.index({ author: 1 });
postSchema.index({ title: 'text', excerpt: 'text', slug: 'text' });

postSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Post', postSchema);
