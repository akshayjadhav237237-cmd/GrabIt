const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
  createReview,
  getUserReviews,
} = require('../controllers/review.controller');

router.post('/', authMiddleware, createReview);
router.get('/user/:userId', getUserReviews);

module.exports = router;
