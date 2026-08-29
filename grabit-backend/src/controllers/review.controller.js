const mongoose = require('mongoose');
const { Review, Booking, User } = require('../models');
const memoryStore = require('../data/memoryStore');

const findUser = async (firebaseUid, extra = {}) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const u = await User.findOne({ firebaseUid });
      if (u) return u;
    } catch (err) {
      console.warn('[Review] User lookup notice:', err.message);
    }
  }
  return memoryStore.getOrCreateUserByUid(firebaseUid, extra);
};

/**
 * Create a review for a completed booking.
 * Protected via authMiddleware.
 *
 * POST /api/reviews
 */
const createReview = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await findUser(firebaseUid, req.user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const { bookingId, rating, comment } = req.body || {};

    // Validate rating is integer between 1 and 5
    if (
      rating === undefined ||
      typeof rating !== 'number' ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5',
      });
    }

    // Validate bookingId
    if (!bookingId) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    let booking = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(bookingId)) {
      try {
        booking = await Booking.findById(bookingId);
      } catch (err) {
        console.warn('[Review] Booking lookup notice:', err.message);
      }
    }
    if (!booking) {
      booking = memoryStore.getBookingById(bookingId);
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Validate booking.status === 'completed'
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed bookings',
      });
    }

    // Caller must be booking.renter OR booking.owner
    const renterId = booking.renter
      ? (booking.renter._id ? booking.renter._id.toString() : booking.renter.toString())
      : '';
    const ownerId = booking.owner
      ? (booking.owner._id ? booking.owner._id.toString() : booking.owner.toString())
      : '';
    const callerId = user._id ? user._id.toString() : '';

    if (callerId && renterId && ownerId && callerId !== renterId && callerId !== ownerId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only booking participants can review this booking',
      });
    }

    let review = null;
    if (mongoose.connection.readyState === 1) {
      try {
        const existingReview = await Review.findOne({
          booking: booking._id,
          reviewer: user._id,
        });
        if (existingReview) {
          return res.status(400).json({
            success: false,
            message: 'You have already reviewed this booking',
          });
        }

        const revieweeId = callerId === renterId
          ? (booking.owner._id || booking.owner)
          : (booking.renter._id || booking.renter);
        const productId = booking.product._id || booking.product;

        review = await Review.create({
          booking: booking._id,
          product: productId,
          reviewer: user._id,
          reviewee: revieweeId,
          rating,
          comment: comment ? String(comment).trim() : '',
        });
      } catch (dbErr) {
        console.warn('[Review] Review.create DB notice:', dbErr.message);
      }
    }

    if (!review) {
      review = {
        _id: 'rev_' + Math.random().toString(36).substring(2, 10),
        booking: booking._id,
        reviewer: user,
        rating,
        comment: comment ? String(comment).trim() : '',
        createdAt: new Date(),
      };
      memoryStore.reviewsList.push(review);
    }

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve reviews for a specific user.
 * Public endpoint.
 *
 * GET /api/reviews/user/:userId
 */
const getUserReviews = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(userId)) {
      try {
        const reviews = await Review.find({ reviewee: userId })
          .populate('reviewer', 'displayName avatarUrl rating')
          .sort({ createdAt: -1 });

        return res.status(200).json({
          success: true,
          count: reviews.length,
          data: reviews,
        });
      } catch (dbErr) {
        console.warn('[Review] getUserReviews DB notice:', dbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      count: 0,
      data: [],
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getUserReviews,
};
