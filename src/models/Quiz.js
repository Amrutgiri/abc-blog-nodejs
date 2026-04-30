const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
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
  description: {
    type: String,
    maxlength: 500
  },
  category: {
    type: String,
    enum: ['quantitative', 'logical', 'verbal'],
    required: true,
    index: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
    max: 240
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  negativeMarking: {
    type: Boolean,
    default: false
  },
  negativeMarkingValue: {
    type: Number,
    default: 0
  },
  randomizeQuestions: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'unpublished'],
    default: 'draft',
    index: true
  },
  blogPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  instructions: {
    type: String,
    maxlength: 1000
  },
  publishedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

quizSchema.index({ slug: 1 });
quizSchema.index({ category: 1, status: 1 });

quizSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Quiz', quizSchema);
