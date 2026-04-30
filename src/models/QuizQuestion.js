const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
    index: true
  },
  question: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
    maxlength: 500
  },
  options: {
    type: [String],
    validate: {
      validator: function(options) {
        return Array.isArray(options) && options.length === 4;
      },
      message: 'Each question must have exactly 4 options'
    }
  },
  correctAnswer: {
    type: String,
    required: [true, 'Correct answer is required'],
    trim: true
  },
  explanation: {
    type: String,
    maxlength: 1000
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

quizQuestionSchema.index({ quiz: 1, order: 1 });

module.exports = mongoose.model('QuizQuestion', quizQuestionSchema);
