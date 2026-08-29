const multer = require('multer');

/**
 * Centralized Error Handling Middleware
 * Catches all errors passed via next(err) and formats a consistent JSON error response.
 */
const errorMiddleware = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err.code === 'LIMIT_FILE_SIZE') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 5MB limit',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err.message === 'Only JPG, PNG, and WebP images are allowed') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  const statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorMiddleware;

