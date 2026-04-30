const crypto = require('crypto');
const slugify = require('slugify');
const { validationResult } = require('express-validator');
const UserRepository = require('../repositories/UserRepository');
const { SeoService, EmailService } = require('../services');

function safeRedirect(value, fallback = '/dashboard') {
  if (!value) return fallback;
  if (typeof value !== 'string') return fallback;
  if (!value.startsWith('/')) return fallback;
  return value;
}

function renderAuth(res, view, data = {}, path = '/auth') {
  return res.render(view, {
    pageTitle: data.pageTitle || 'Aptitude Booster Club',
    seo: data.seo || SeoService.buildSeo({ originalUrl: '/auth' }, {
      title: data.pageTitle || 'Aptitude Booster Club',
      description: 'Aptitude Booster Club user authentication.',
      path
    }),
    layout: 'layouts/main.ejs',
    ...data
  });
}

function makeUsername(name, email) {
  const base = slugify(String(name || email.split('@')[0] || 'user'), {
    lower: true,
    strict: true,
    trim: true
  }) || 'user';
  return `${base}-${Date.now().toString().slice(-4)}`;
}

class AuthController {
  async showLogin(req, res) {
    renderAuth(res, 'auth/login', {
      pageTitle: 'Login',
      redirectTo: safeRedirect(req.query.redirect)
    }, '/auth/login');
  }

  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      const redirectTo = safeRedirect(req.body.redirectTo || req.query.redirect);
      if (!errors.isEmpty()) {
        return renderAuth(res, 'auth/login', {
          pageTitle: 'Login',
          error: errors.array()[0].msg,
          redirectTo
        }, '/auth/login');
      }

      const { email, password } = req.body;
      const user = await UserRepository.comparePassword(email, password);
      if (!user) {
        return renderAuth(res, 'auth/login', {
          pageTitle: 'Login',
          error: 'Invalid email or password.',
          redirectTo
        }, '/auth/login');
      }

      req.session.user = {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        totalPoints: user.totalPoints || 0,
        quizzesAttempted: user.quizzesAttempted || 0,
        bestScore: user.bestScore || 0,
        averageScore: user.averageScore || 0,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        badges: user.badges || ['Beginner']
      };

      return res.redirect(redirectTo);
    } catch (error) {
      next(error);
    }
  }

  async showRegister(req, res) {
    renderAuth(res, 'auth/register', {
      pageTitle: 'Create Account',
      redirectTo: safeRedirect(req.query.redirect)
    }, '/auth/register');
  }

  async register(req, res, next) {
    try {
      const errors = validationResult(req);
      const redirectTo = safeRedirect(req.body.redirectTo || req.query.redirect);
      if (!errors.isEmpty()) {
        return renderAuth(res, 'auth/register', {
          pageTitle: 'Create Account',
          error: errors.array()[0].msg,
          redirectTo
        }, '/auth/register');
      }

      const { name, email, password } = req.body;
      const existing = await UserRepository.findByEmail(email);
      if (existing) {
        return renderAuth(res, 'auth/register', {
          pageTitle: 'Create Account',
          error: 'An account with this email already exists.',
          redirectTo
        }, '/auth/register');
      }

      const username = makeUsername(name, email);
      const user = await UserRepository.create({
        name,
        username,
        email,
        password,
        role: 'member',
        badges: ['Beginner']
      });

      req.session.user = {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        totalPoints: user.totalPoints || 0,
        quizzesAttempted: user.quizzesAttempted || 0,
        bestScore: user.bestScore || 0,
        averageScore: user.averageScore || 0,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
        badges: user.badges || ['Beginner']
      };

      await EmailService.sendWelcomeEmail(user).catch(() => null);
      req.flash('success', 'Welcome! Your account has been created.');
      return res.redirect(redirectTo);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res) {
    req.session.destroy(() => {
      res.redirect('/auth/login');
    });
  }

  async showForgotPassword(req, res) {
    renderAuth(res, 'auth/forgot-password', {
      pageTitle: 'Forgot Password'
    }, '/auth/forgot-password');
  }

  async sendResetLink(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return renderAuth(res, 'auth/forgot-password', {
          pageTitle: 'Forgot Password',
          error: errors.array()[0].msg
        }, '/auth/forgot-password');
      }

      const user = await UserRepository.findByEmail(req.body.email);
      if (!user) {
        return renderAuth(res, 'auth/forgot-password', {
          pageTitle: 'Forgot Password',
          success: 'If the email exists, a reset link has been sent.'
        }, '/auth/forgot-password');
      }

      const resetToken = user.generatePasswordResetToken();
      await user.save({ validateBeforeSave: false });

      const resetUrl = `${(process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '')}/auth/reset/${resetToken}`;
      await EmailService.sendPasswordResetEmail(user, resetUrl).catch(() => null);

      return renderAuth(res, 'auth/forgot-password', {
        pageTitle: 'Forgot Password',
        success: 'If the email exists, a reset link has been sent.'
      }, '/auth/forgot-password');
    } catch (error) {
      next(error);
    }
  }

  async showResetPassword(req, res, next) {
    try {
      const user = await UserRepository.findByResetToken(req.params.token);
      if (!user) {
        return renderAuth(res, 'auth/forgot-password', {
          pageTitle: 'Forgot Password',
          error: 'Reset link is invalid or expired.'
        }, '/auth/forgot-password');
      }

      renderAuth(res, 'auth/reset-password', {
        pageTitle: 'Reset Password',
        token: req.params.token
      }, '/auth/reset-password');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return renderAuth(res, 'auth/reset-password', {
          pageTitle: 'Reset Password',
          error: errors.array()[0].msg,
          token: req.body.token
        }, '/auth/reset-password');
      }

      const user = await UserRepository.findByResetToken(req.body.token);
      if (!user) {
        return renderAuth(res, 'auth/forgot-password', {
          pageTitle: 'Forgot Password',
          error: 'Reset link is invalid or expired.'
        }, '/auth/forgot-password');
      }

      user.password = req.body.password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      req.flash('success', 'Password updated successfully. Please login.');
      return res.redirect('/auth/login');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
