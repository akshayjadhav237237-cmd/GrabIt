const express = require('express');
const router = express.Router();
const multer = require('multer');
const authMiddleware = require('../middleware/auth.middleware');
const {
  updatePushToken,
  verifyUser,
  updateVerifyStatus,
  updateProfile,
  getEarnings,
  updateNotificationPrefs,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
} = require('../controllers/user.controller');

// Multer memory storage configuration for user documents and avatar uploads
const storage = multer.memoryStorage();

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    req.fileValidationError = 'Only JPG, PNG, and WebP images are allowed';
    cb(null, false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter,
});

/**
 * User Routes
 */

// Update Expo push token for authenticated user
router.patch('/push-token', authMiddleware, updatePushToken);

// Upload ID document for verification (max 5MB, jpg/png/webp)
router.post('/verify', authMiddleware, upload.single('idDocument'), verifyUser);

// Update user profile (displayName, phoneNumber, optional avatar file upload)
router.patch('/me', authMiddleware, upload.single('avatar'), updateProfile);

// Update notification preferences (bookingUpdates, chatMessages)
router.patch('/me/notification-prefs', authMiddleware, updateNotificationPrefs);

// Get current user's earnings summary
router.get('/me/earnings', authMiddleware, getEarnings);

// Wishlist routes
router.get('/me/wishlist', authMiddleware, getWishlist);
router.post('/me/wishlist/:productId', authMiddleware, addToWishlist);
router.delete('/me/wishlist/:productId', authMiddleware, removeFromWishlist);

// Admin update user verification status (verified/rejected)
router.patch('/:id/verify-status', authMiddleware, updateVerifyStatus);

module.exports = router;
