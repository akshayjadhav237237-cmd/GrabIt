const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

/**
 * @route   GET /
 * @desc    Health check endpoint with database connection readiness
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  res.status(200).json({
    status: 'success',
    message: 'Grabit backend API is healthy',
    database: dbStatusMap[dbState] || 'standalone',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
