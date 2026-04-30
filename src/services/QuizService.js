const xss = require('xss');

function shuffleArray(items = []) {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function normalizeQuestion(question) {
  return {
    _id: String(question._id),
    question: question.question,
    options: shuffleArray(question.options || []),
    explanation: question.explanation || '',
    order: question.order || 0
  };
}

function prepareQuestions(quiz, questions) {
  const ordered = quiz.randomizeQuestions ? shuffleArray(questions) : [...questions];
  return ordered.map(normalizeQuestion);
}

function calculateResult(questions, answers = [], quiz = {}) {
  const answerMap = new Map();
  for (const entry of answers) {
    answerMap.set(String(entry.questionId), String(entry.selectedAnswer || ''));
  }

  let correctAnswers = 0;
  let wrongAnswers = 0;
  const evaluated = questions.map((question) => {
    const selectedAnswer = answerMap.get(String(question._id)) || '';
    const isCorrect = selectedAnswer === question.correctAnswer;
    if (isCorrect) {
      correctAnswers += 1;
    } else {
      wrongAnswers += 1;
    }

    return {
      questionId: question._id,
      question: question.question,
      options: question.options,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      isCorrect
    };
  });

  let score = correctAnswers;
  if (quiz.negativeMarking) {
    score = correctAnswers - (wrongAnswers * Number(quiz.negativeMarkingValue || 0));
  }

  const totalQuestions = questions.length;
  const percentage = totalQuestions ? Math.max(0, Math.round((score / totalQuestions) * 100)) : 0;

  return {
    correctAnswers,
    wrongAnswers,
    score: Math.max(0, Number(score.toFixed ? score.toFixed(2) : score)),
    percentage,
    totalQuestions,
    evaluated
  };
}

function summarizePerformance(percentage) {
  if (percentage >= 85) return 'Excellent work';
  if (percentage >= 70) return 'Strong performance';
  if (percentage >= 50) return 'Good effort';
  return 'Keep practicing';
}

function sanitizeQuizText(value) {
  return xss(String(value || '').trim());
}

function parseManualQuestions(manualQuestions = []) {
  return manualQuestions
    .map((item) => ({
      question: sanitizeQuizText(item.question),
      options: (item.options || []).map(opt => sanitizeQuizText(opt)).filter(Boolean).slice(0, 4),
      correctAnswer: sanitizeQuizText(item.correctAnswer),
      explanation: sanitizeQuizText(item.explanation)
    }))
    .filter(question => question.question && question.options.length === 4 && question.correctAnswer);
}

function parseBulkQuestions(payload) {
  if (!payload) return [];
  let raw;
  try {
    raw = typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch (error) {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  return parseManualQuestions(raw);
}

module.exports = {
  shuffleArray,
  prepareQuestions,
  calculateResult,
  summarizePerformance,
  parseManualQuestions,
  parseBulkQuestions,
  sanitizeQuizText
};
