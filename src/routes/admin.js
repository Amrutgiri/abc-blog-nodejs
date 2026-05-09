const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const mongoose = require('mongoose');
const AdminController = require('../controllers/AdminController');
const AdminQuizController = require('../controllers/AdminQuizController');
const CategoryRepository = require('../repositories/CategoryRepository');
const TagRepository = require('../repositories/TagRepository');
const { ContentService } = require('../services');
const { isAuthenticated, isGuest, requireAdmin } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/production');

function normalizeIds(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function rejectHtmlMarkup(fieldLabel) {
  return (value) => {
    const raw = String(value || '');
    if (/[<>]/.test(raw) || /<\/?\s*script\b/i.test(raw)) {
      throw new Error(`${fieldLabel} cannot contain HTML or script tags.`);
    }
    return true;
  };
}

function validateAssetUrlOrPath(fieldLabel) {
  return (value) => {
    const raw = String(value || '').trim();
    if (!raw) return true;
    if (raw.startsWith('/') || /^https?:\/\//i.test(raw)) return true;
    throw new Error(`${fieldLabel} must be a valid URL or a site-relative path.`);
  };
}

const settingsValidationRules = [
  body('siteName')
    .trim()
    .custom(rejectHtmlMarkup('Website name'))
    .isLength({ min: 2, max: 120 })
    .withMessage('Website name must be between 2 and 120 characters.'),
  body('siteDescription')
    .trim()
    .custom(rejectHtmlMarkup('Website description'))
    .isLength({ min: 10, max: 255 })
    .withMessage('Website description must be between 10 and 255 characters.'),
  body('siteLogoUrl')
    .optional({ checkFalsy: true })
    .trim()
    .custom(validateAssetUrlOrPath('Logo URL')),
  body('faviconUrl')
    .optional({ checkFalsy: true })
    .trim()
    .custom(validateAssetUrlOrPath('Favicon URL')),
  body('footerAbout')
    .optional({ checkFalsy: true })
    .trim()
    .custom(rejectHtmlMarkup('Footer about text'))
    .isLength({ max: 300 })
    .withMessage('Footer about text cannot exceed 300 characters.'),
  body('whatsappChannelUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('WhatsApp channel link must be a valid URL.'),
  body('facebookUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Facebook link must be a valid URL.'),
  body('instagramUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Instagram link must be a valid URL.'),
  body('xUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('X link must be a valid URL.'),
  body('youtubeUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('YouTube link must be a valid URL.'),
  body('linkedinUrl')
    .optional({ checkFalsy: true })
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('LinkedIn link must be a valid URL.'),
  body('contactEmail')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Contact email must be a valid email address.'),
  body('supportPhone')
    .optional({ checkFalsy: true })
    .trim()
    .custom(rejectHtmlMarkup('Support phone'))
    .isLength({ max: 30 })
    .withMessage('Support phone cannot exceed 30 characters.'),
  body('copyrightText')
    .optional({ checkFalsy: true })
    .trim()
    .custom(rejectHtmlMarkup('Copyright text'))
    .isLength({ max: 120 })
    .withMessage('Copyright text cannot exceed 120 characters.')
];

const profileValidationRules = [
  body('name')
    .trim()
    .custom(rejectHtmlMarkup('Name'))
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters.'),
  body('avatar')
    .optional({ checkFalsy: true })
    .trim()
    .custom(rejectHtmlMarkup('Avatar URL'))
    .custom(validateAssetUrlOrPath('Avatar URL')),
  body('bio')
    .optional({ checkFalsy: true })
    .trim()
    .custom(rejectHtmlMarkup('Bio'))
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters.'),
  body('currentPassword')
    .optional({ checkFalsy: true })
    .isLength({ min: 6, max: 72 })
    .withMessage('Current password must be between 6 and 72 characters.'),
  body('newPassword')
    .optional({ checkFalsy: true })
    .isLength({ min: 6, max: 72 })
    .withMessage('New password must be between 6 and 72 characters.'),
  body('confirmPassword')
    .custom((value, { req }) => {
      const newPassword = String(req.body.newPassword || '').trim();
      const confirmPassword = String(value || '').trim();
      if (!newPassword && !confirmPassword) {
        return true;
      }
      if (!newPassword) {
        throw new Error('New password is required when changing password.');
      }
      if (!confirmPassword) {
        throw new Error('Please confirm your new password.');
      }
      if (newPassword !== confirmPassword) {
        throw new Error('New password and confirmation do not match.');
      }
      return true;
    })
];

const postValidationRules = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters.'),
  body('excerpt')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Excerpt cannot exceed 500 characters.'),
  body('content')
    .custom((value) => {
      if (!ContentService.isEditorContentValid(value)) {
        throw new Error('Please add at least one content block before saving.');
      }
      return true;
    }),
  body('featuredImage')
    .optional({ checkFalsy: true })
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Featured image must be a valid URL.'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required.')
    .bail()
    .isMongoId()
    .withMessage('Please choose a valid category.')
    .bail()
    .custom(async (value) => {
      const category = await CategoryRepository.findById(value);
      if (!category) {
        throw new Error('Please choose a valid category.');
      }
      return true;
    }),
  body('tags')
    .custom(async (value) => {
      const tagIds = normalizeIds(value);
      for (const id of tagIds) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error('One or more selected tags are invalid.');
        }
        const tag = await TagRepository.findById(id);
        if (!tag) {
          throw new Error('One or more selected tags are invalid.');
        }
      }
      return true;
    }),
  body('status')
    .isIn(['draft', 'published', 'scheduled', 'archived'])
    .withMessage('Please select a valid post status.'),
  body('scheduledAt')
    .custom((value, { req }) => {
      if (!value) {
        if (req.body.status === 'scheduled') {
          throw new Error('Please choose a publish date for scheduled posts.');
        }
        return true;
      }

      const scheduledDate = new Date(value);
      if (Number.isNaN(scheduledDate.getTime())) {
        throw new Error('Please enter a valid schedule date.');
      }

      if (req.body.status === 'scheduled' && scheduledDate <= new Date()) {
        throw new Error('Schedule date must be in the future.');
      }

      return true;
    }),
  body('seo.metaTitle')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 70 })
    .withMessage('Meta title cannot exceed 70 characters.'),
  body('seo.metaDescription')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 160 })
    .withMessage('Meta description cannot exceed 160 characters.'),
  body('seo.metaKeywords')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('Meta keywords cannot exceed 255 characters.')
];

router.get('/login', isGuest, AdminController.login);
router.post('/login', createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 }), AdminController.login);
router.get('/logout', isAuthenticated, AdminController.logout);
router.post('/logout', isAuthenticated, AdminController.logout);

router.use(isAuthenticated, requireAdmin, (req, res, next) => {
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
  } else if (req.path.startsWith('/contacts')) {
    res.locals.currentPage = 'contacts';
  } else if (req.path.startsWith('/subscribers')) {
    res.locals.currentPage = 'subscribers';
  } else if (req.path.startsWith('/settings')) {
    res.locals.currentPage = 'settings';
  } else if (req.path.startsWith('/profile')) {
    res.locals.currentPage = 'profile';
  } else if (req.path.startsWith('/users')) {
    res.locals.currentPage = 'users';
  } else {
    res.locals.currentPage = '';
  }

  next();
});

router.get('/', AdminController.dashboard);

router.get('/posts', AdminController.posts);
router.get('/posts/new', AdminController.newPost);
router.post('/posts', postValidationRules, AdminController.newPost);
router.post('/posts/import', AdminController.importPosts);
router.get('/posts/:id', AdminController.editPost);
router.put('/posts/:id', postValidationRules, AdminController.editPost);
router.delete('/posts/:id', AdminController.deletePost);

router.get('/categories', AdminController.categories);
router.post('/categories', AdminController.newCategory);
router.get('/categories/new', AdminController.newCategory);
router.get('/categories/:id/edit', AdminController.editCategory);
router.put('/categories/:id', AdminController.editCategory);
router.delete('/categories/:id', AdminController.deleteCategory);
router.delete('/categorys/:id', AdminController.deleteCategory);

router.get('/tags', AdminController.tags);
router.post('/tags', AdminController.newTag);
router.get('/tags/new', AdminController.newTag);
router.delete('/tags/:id', AdminController.deleteTag);

router.get('/contacts', AdminController.contacts);
router.get('/contacts/:id', AdminController.showContact);
router.delete('/contacts/:id', AdminController.deleteContact);

router.get('/settings', AdminController.settings);
router.post('/settings', settingsValidationRules, AdminController.settings);

router.get('/profile', AdminController.profile);
router.post('/profile', profileValidationRules, AdminController.profile);

router.get('/subscribers', AdminController.subscribers);
router.post('/subscribers/:id/toggle-status', AdminController.toggleSubscriberStatus);

router.get('/quizzes', AdminQuizController.index);
router.get('/quizzes/new', AdminQuizController.newQuiz);
router.post('/quizzes', AdminQuizController.createQuiz);
router.get('/quizzes/:id/edit', AdminQuizController.editQuiz);
router.put('/quizzes/:id', AdminQuizController.updateQuiz);
router.delete('/quizzes/:id', AdminQuizController.deleteQuiz);
router.get('/quizzes/:id/attempts', AdminQuizController.attempts);

router.get('/users', AdminController.users);
router.get('/users/:id/edit', AdminController.editUser);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);
router.post('/users/:id/toggle-status', AdminController.toggleUserStatus);

module.exports = router;
