const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const AdminQuizController = require('../controllers/AdminQuizController');
const { isAuthenticated, isGuest, requireAdmin } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/production');

router.get('/login', isGuest, AdminController.login);
router.post('/login', createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }), AdminController.login);
router.get('/logout', isAuthenticated, AdminController.logout);
router.post('/logout', isAuthenticated, AdminController.logout);

router.use((req, res, next) => {
  if (req.path === '/' || req.path === '') {
    res.locals.currentPage = 'dashboard';
  } else if (req.path.startsWith('/posts')) {
    res.locals.currentPage = 'posts';
  } else if (req.path.startsWith('/categories')) {
    res.locals.currentPage = 'categories';
  } else if (req.path.startsWith('/tags')) {
    res.locals.currentPage = 'tags';
  } else if (req.path.startsWith('/quizzes')) {
    res.locals.currentPage = 'quizzes';
  } else if (req.path.startsWith('/users')) {
    res.locals.currentPage = 'users';
  } else {
    res.locals.currentPage = '';
  }

  next();
});

router.get('/', isAuthenticated, AdminController.dashboard);

router.get('/posts', isAuthenticated, AdminController.posts);
router.get('/posts/new', isAuthenticated, AdminController.newPost);
router.post('/posts', isAuthenticated, AdminController.newPost);
router.post('/posts/import', isAuthenticated, AdminController.importPosts);
router.get('/posts/:id', isAuthenticated, AdminController.editPost);
router.put('/posts/:id', isAuthenticated, AdminController.editPost);
router.delete('/posts/:id', isAuthenticated, AdminController.deletePost);

router.get('/categories', isAuthenticated, AdminController.categories);
router.post('/categories', isAuthenticated, AdminController.newCategory);
router.get('/categories/new', isAuthenticated, AdminController.newCategory);
router.get('/categories/:id/edit', isAuthenticated, AdminController.editCategory);
router.put('/categories/:id', isAuthenticated, AdminController.editCategory);
router.delete('/categories/:id', isAuthenticated, AdminController.deleteCategory);
router.delete('/categorys/:id', isAuthenticated, AdminController.deleteCategory);

router.get('/tags', isAuthenticated, AdminController.tags);
router.post('/tags', isAuthenticated, AdminController.newTag);
router.get('/tags/new', isAuthenticated, AdminController.newTag);
router.delete('/tags/:id', isAuthenticated, AdminController.deleteTag);

router.get('/quizzes', isAuthenticated, AdminQuizController.index);
router.get('/quizzes/new', isAuthenticated, AdminQuizController.newQuiz);
router.post('/quizzes', isAuthenticated, AdminQuizController.createQuiz);
router.get('/quizzes/:id/edit', isAuthenticated, AdminQuizController.editQuiz);
router.put('/quizzes/:id', isAuthenticated, AdminQuizController.updateQuiz);
router.delete('/quizzes/:id', isAuthenticated, AdminQuizController.deleteQuiz);
router.get('/quizzes/:id/attempts', isAuthenticated, AdminQuizController.attempts);

router.get('/users', requireAdmin, AdminController.users);
router.get('/users/:id/edit', requireAdmin, AdminController.editUser);
router.put('/users/:id', requireAdmin, AdminController.updateUser);
router.delete('/users/:id', requireAdmin, AdminController.deleteUser);

module.exports = router;
