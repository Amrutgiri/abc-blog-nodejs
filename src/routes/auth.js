const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const { requireGuest } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/production');
const { ContactService } = require('../services');

const router = express.Router();

function rejectHtmlMarkup(fieldLabel) {
  return (value) => {
    const raw = String(value || '');
    if (/[<>]/.test(raw) || /<\/?\s*script\b/i.test(raw)) {
      throw new Error(`${fieldLabel} cannot contain HTML or script tags.`);
    }
    return true;
  };
}

router.get('/login', requireGuest, AuthController.showLogin);
router.post('/login',
  requireGuest,
  createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }),
  [
    body('email').trim().custom(rejectHtmlMarkup('Email')).isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.')
  ],
  AuthController.login
);

router.get('/register', requireGuest, AuthController.showRegister);
router.post('/register',
  requireGuest,
  createRateLimiter({ windowMs: 60 * 60 * 1000, max: 10 }),
  [
    body('name').trim().custom(rejectHtmlMarkup('Name')).isLength({ min: 2 }).withMessage('Name is required.'),
    body('email').trim().custom(rejectHtmlMarkup('Email')).isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
    body('email').custom((value) => {
      if (ContactService.isDisposableEmail(value)) {
        throw new Error('Disposable email addresses are not allowed.');
      }
      return true;
    }),
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
  [
    body('email').trim().custom(rejectHtmlMarkup('Email')).isEmail().withMessage('Please enter a valid email address.').normalizeEmail(),
    body('email').custom((value) => {
      if (ContactService.isDisposableEmail(value)) {
        throw new Error('Disposable email addresses are not allowed.');
      }
      return true;
    })
  ],
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
