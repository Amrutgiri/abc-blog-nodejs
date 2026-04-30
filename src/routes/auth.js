const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const { requireGuest } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/production');

const router = express.Router();

router.get('/login', requireGuest, AuthController.showLogin);
router.post('/login',
  requireGuest,
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }),
  [
    body('email').isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
  ],
  AuthController.login
);

router.get('/register', requireGuest, AuthController.showRegister);
router.post('/register',
  requireGuest,
  createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }),
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name is required.'),
    body('email').isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match.')
  ],
  AuthController.register
);

router.post('/logout', AuthController.logout);

router.get('/forgot-password', requireGuest, AuthController.showForgotPassword);
router.post('/forgot-password',
  requireGuest,
  createRateLimiter({ windowMs: 60 * 60 * 1000, max: 5 }),
  [body('email').isEmail().withMessage('Please enter a valid email address.').normalizeEmail()],
  AuthController.sendResetLink
);

router.get('/reset/:token', requireGuest, AuthController.showResetPassword);
router.post('/reset',
  requireGuest,
  [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match.')
  ],
  AuthController.resetPassword
);

module.exports = router;
