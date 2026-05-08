const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const HomeController = require('../controllers/HomeController');
const BlogController = require('../controllers/BlogController');
const QuizController = require('../controllers/QuizController');
const { createRateLimiter } = require('../middleware/production');
const { ContactService } = require('../services');
const authRoutes = require('./auth');
const profileRoutes = require('./profile');

function rejectHtmlMarkup(fieldLabel) {
  return (value) => {
    const raw = String(value || '');
    if (/[<>]/.test(raw) || /<\/?\s*script\b/i.test(raw)) {
      throw new Error(`${fieldLabel} cannot contain HTML or script tags.`);
    }
    return true;
  };
}

const contactValidationRules = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters.'),
  body('email')
    .isEmail()
    .withMessage('Please enter a valid email address.')
    .normalizeEmail()
    .custom((value) => {
      if (ContactService.isDisposableEmail(value)) {
        throw new Error('Disposable email addresses are not allowed.');
      }
      return true;
    }),
  body('message')
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Message must be between 10 and 2000 characters.')
];

router.get('/', HomeController.index);
router.get('/about', HomeController.about);
router.get('/contact', HomeController.contact);
router.post('/contact', createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10 }), contactValidationRules, HomeController.contact);

router.get('/blog', BlogController.index);
router.get('/blog/:slug', BlogController.show);
router.get('/category/:slug', BlogController.category);
router.get('/tag/:slug', BlogController.tag);
router.get('/search/suggest', BlogController.suggestions);
router.get('/search', BlogController.search);
router.get('/quizzes', QuizController.index);
router.get('/quizzes/:slug', QuizController.show);
router.get('/quizzes/:slug/take', QuizController.take);
router.post('/quizzes/:slug/take', QuizController.submit);
router.get('/quizzes/:slug/result/:attemptId', QuizController.result);
router.use('/auth', authRoutes);
router.use('/', profileRoutes);
router.post('/newsletter/subscribe',
  createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 }),
  [
    body('email')
      .trim()
      .custom(rejectHtmlMarkup('Email'))
      .isEmail()
      .withMessage('Please enter a valid email address.')
      .normalizeEmail(),
    body('email').custom((value) => {
      if (ContactService.isDisposableEmail(value)) {
        throw new Error('Disposable email addresses are not allowed.');
      }
      return true;
    })
  ],
  HomeController.subscribeNewsletter
);
router.get('/newsletter/unsubscribe/:token', HomeController.unsubscribeNewsletter);

module.exports = router;
