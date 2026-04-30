const express = require('express');
const ProfileController = require('../controllers/ProfileController');
const { requireUser } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', requireUser, ProfileController.dashboard);
router.get('/profile/attempts', requireUser, ProfileController.attempts);
router.get('/leaderboard', ProfileController.leaderboard);

module.exports = router;
