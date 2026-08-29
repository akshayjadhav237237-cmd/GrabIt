const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { syncUser, getCurrentUser } = require('../controllers/auth.controller');

/**
 * Auth Routes
 *
 * POST /api/auth/sync - Sync Firebase user with MongoDB user profile
 * GET /api/auth/me   - Retrieve current authenticated user profile
 */
router.post('/sync', authMiddleware, syncUser);
router.get('/me', authMiddleware, getCurrentUser);

module.exports = router;
