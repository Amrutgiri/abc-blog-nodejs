const express = require('express');
const router = express.Router();
const HomeController = require('../controllers/HomeController');
const BlogController = require('../controllers/BlogController');
const QuizController = require('../controllers/QuizController');
const { createRateLimiter } = require('../middleware/production');
const authRoutes = require('./auth');
const profileRoutes = require('./profile');

router.get('/', HomeController.index);
router.get('/about', HomeController.about);
router.get('/contact', HomeController.contact);
router.post('/contact', HomeController.contact);

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
router.post('/newsletter/subscribe', createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 }), HomeController.subscribeNewsletter);

module.exports = router;
