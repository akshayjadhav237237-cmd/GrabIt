const mongoose = require('mongoose');
const crypto = require('crypto');
const path = require('path');
const { User, Booking, Product } = require('../models');
const { uploadToS3 } = require('../config/s3');

/**
 * User Controller
 *
 * Handles user profiles, KYC/verification status, reputation, and push tokens.
 */

/**
 * Update user's Expo push notification token.
 * Protected via authMiddleware.
 *
 * PATCH /api/users/push-token
 */
const updatePushToken = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const { pushToken } = req.body;
    if (pushToken === undefined || typeof pushToken !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'pushToken must be a string',
      });
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { pushToken },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Push token updated',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload ID document for verification.
 * Protected via authMiddleware.
 *
 * POST /api/users/verify
 */
const verifyUser = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (req.fileValidationError) {
      return res.status(400).json({
        success: false,
        message: req.fileValidationError,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'idDocument file is required',
      });
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 5MB limit',
      });
    }

    // Determine extension
    let ext = 'jpg';
    if (req.file.mimetype === 'image/png') {
      ext = 'png';
    } else if (req.file.mimetype === 'image/webp') {
      ext = 'webp';
    } else if (req.file.mimetype === 'image/jpeg') {
      ext = 'jpg';
    } else if (req.file.originalname) {
      const parsedExt = path.extname(req.file.originalname).replace('.', '').toLowerCase();
      if (parsedExt) {
        ext = parsedExt === 'jpeg' ? 'jpg' : parsedExt;
      }
    }

    const userId = user._id ? user._id.toString() : user.id;
    const key = `users/${userId}/verification/${crypto.randomUUID()}.${ext}`;

    const idDocumentUrl = await uploadToS3(req.file.buffer, key, req.file.mimetype);

    if (!user.verification) {
      user.verification = {};
    }
    user.verification.idDocumentUrl = idDocumentUrl;
    user.verification.status = 'pending';
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'ID document uploaded for verification',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user verification status (Admin only).
 * Protected via authMiddleware.
 *
 * PATCH /api/users/:id/verify-status
 */
const updateVerifyStatus = async (req, res, next) => {
  try {
    // Admin check: check req.user.email against process.env.ADMIN_EMAILS
    const adminEmailsConfig = process.env.ADMIN_EMAILS || 'admin@grabit.com,test@grabit.com';
    const adminEmails = adminEmailsConfig
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    let callerEmail = (req.user && req.user.email ? req.user.email : '').toLowerCase();
    if (req.user && req.user.uid) {
      const dbCaller = await User.findOne({ firebaseUid: req.user.uid });
      if (dbCaller && dbCaller.email) {
        callerEmail = dbCaller.email.toLowerCase();
      }
    }

    if (!callerEmail || !adminEmails.includes(callerEmail)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin access required',
      });
    }

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const { status } = req.body || {};
    if (!status || (status !== 'verified' && status !== 'rejected')) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed values are 'verified' or 'rejected'",
      });
    }

    if (!targetUser.verification) {
      targetUser.verification = {};
    }
    targetUser.verification.status = status;
    if (status === 'verified') {
      targetUser.verification.verifiedAt = new Date();
    }
    await targetUser.save();

    return res.status(200).json({
      success: true,
      message: `User verification status updated to ${status}`,
      data: targetUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user's profile with strict whitelisting.
 * Protected via authMiddleware.
 *
 * PATCH /api/users/me
 */
const updateProfile = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (req.fileValidationError) {
      return res.status(400).json({
        success: false,
        message: req.fileValidationError,
      });
    }

    // If avatar file was uploaded
    if (req.file) {
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds 5MB limit',
        });
      }

      let ext = 'jpg';
      if (req.file.mimetype === 'image/png') {
        ext = 'png';
      } else if (req.file.mimetype === 'image/webp') {
        ext = 'webp';
      } else if (req.file.mimetype === 'image/jpeg') {
        ext = 'jpg';
      } else if (req.file.originalname) {
        const parsedExt = path.extname(req.file.originalname).replace('.', '').toLowerCase();
        if (parsedExt) {
          ext = parsedExt === 'jpeg' ? 'jpg' : parsedExt;
        }
      }

      const userId = user._id ? user._id.toString() : user.id;
      const key = `users/${userId}/avatar/${crypto.randomUUID()}.${ext}`;
      const avatarUrl = await uploadToS3(req.file.buffer, key, req.file.mimetype);
      user.avatarUrl = avatarUrl;
    }

    // Whitelist only: displayName, avatarUrl, phoneNumber.
    // STRICTLY IGNORE or prevent edits to email or firebaseUid.
    const { displayName, phoneNumber, avatarUrl } = req.body || {};

    if (displayName !== undefined) {
      user.displayName = String(displayName).trim();
    }

    if (phoneNumber !== undefined) {
      user.phoneNumber = String(phoneNumber).trim();
    }

    if (avatarUrl !== undefined && !req.file) {
      user.avatarUrl = String(avatarUrl).trim();
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get earnings summary for authenticated user.
 * Protected via authMiddleware.
 *
 * GET /api/users/me/earnings
 */
const getEarnings = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const bookings = await Booking.find({ owner: user._id });

    let totalEarned = 0;
    let pendingPayout = 0;
    let completedRentalsCount = 0;

    for (const booking of bookings) {
      if (booking.paymentStatus === 'paid') {
        const rentalFee = Number(booking.pricing && booking.pricing.rentalFee) || 0;
        if (booking.status === 'completed') {
          completedRentalsCount += 1;
          totalEarned += rentalFee;
        } else if (booking.status === 'confirmed' || booking.status === 'active') {
          pendingPayout += rentalFee;
        }
      }
    }

    totalEarned = Math.round(totalEarned * 100) / 100;
    pendingPayout = Math.round(pendingPayout * 100) / 100;

    return res.status(200).json({
      success: true,
      data: {
        totalEarned,
        pendingPayout,
        completedRentalsCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user notification preferences.
 * Protected via authMiddleware.
 *
 * PATCH /api/users/me/notification-prefs
 */
const updateNotificationPrefs = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const { bookingUpdates, chatMessages } = req.body || {};

    if (!user.notificationPrefs) {
      user.notificationPrefs = {
        bookingUpdates: true,
        chatMessages: true,
      };
    }

    if (bookingUpdates !== undefined) {
      user.notificationPrefs.bookingUpdates = Boolean(bookingUpdates);
    }

    if (chatMessages !== undefined) {
      user.notificationPrefs.chatMessages = Boolean(chatMessages);
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated',
      data: user.notificationPrefs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a product to current user's wishlist.
 * Protected via authMiddleware.
 *
 * POST /api/users/me/wishlist/:productId
 */
const addToWishlist = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const { productId } = req.params;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { $addToSet: { wishlist: productId } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Added to wishlist',
      wishlist: user.wishlist || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove a product from current user's wishlist.
 * Protected via authMiddleware.
 *
 * DELETE /api/users/me/wishlist/:productId
 */
const removeFromWishlist = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const { productId } = req.params;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID',
      });
    }

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { $pull: { wishlist: productId } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Removed from wishlist',
      wishlist: user.wishlist || [],
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve current user's wishlist with populated product details.
 * Protected via authMiddleware.
 *
 * GET /api/users/me/wishlist
 */
const getWishlist = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await User.findOne({ firebaseUid }).populate('wishlist');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user.wishlist || [],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updatePushToken,
  verifyUser,
  updateVerifyStatus,
  updateProfile,
  getEarnings,
  updateNotificationPrefs,
  addToWishlist,
  removeFromWishlist,
  getWishlist,
};


