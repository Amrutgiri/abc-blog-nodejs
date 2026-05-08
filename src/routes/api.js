const express = require('express');
const multer = require('multer');
const { createRateLimiter } = require('../middleware/production');
const { isAuthenticated, requireAdmin } = require('../middleware/auth');
const { CloudinaryService } = require('../services');

const router = express.Router();

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  }
});

router.post('/upload',
  isAuthenticated,
  requireAdmin,
  createRateLimiter({ windowMs: 60 * 60 * 1000, max: 30 }),
  upload.any(),
  async (req, res, next) => {
  try {
    const file = (req.files && req.files[0]) || req.file || null;
    if (!file) {
      return res.status(400).json({
        success: 0,
        message: 'No file uploaded'
      });
    }

    const result = await CloudinaryService.uploadBuffer(file.buffer, {
      filename: file.originalname,
      mimetype: file.mimetype
    });

    return res.json({
      success: 1,
      file: {
        url: result.url
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
