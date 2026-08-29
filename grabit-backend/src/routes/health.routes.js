const express = require('express');
const router = express.Router();

/**
 * @route   GET /
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Grabit backend API is healthy',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
