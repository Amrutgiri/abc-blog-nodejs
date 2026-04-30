const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  answers: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuizQuestion'
    },
    questionText: String,
    options: [String],
    selectedAnswer: String,
    correctAnswer: String,
    explanation: String,
    isCorrect: Boolean
  }],
  score: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number,
    default: 0
  },
  pointsEarned: {
    type: Number,
    default: 0
  },
  correctAnswers: {
    type: Number,
    default: 0
  },
  wrongAnswers: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  timeTaken: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

quizAttemptSchema.index({ quiz: 1, score: -1 });
quizAttemptSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
