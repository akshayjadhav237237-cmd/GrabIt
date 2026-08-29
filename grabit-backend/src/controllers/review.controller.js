const mongoose = require('mongoose');
const { Review, Booking, User } = require('../models');

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

    const user = await User.findOne({ firebaseUid });
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

    // Validate bookingId and existence
    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const booking = await Booking.findById(bookingId);
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
    const callerId = user._id.toString();

    if (callerId !== renterId && callerId !== ownerId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only booking participants can review this booking',
      });
    }

    // Check duplicate review
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

    // Assign reviewee
    const revieweeId = callerId === renterId
      ? (booking.owner._id || booking.owner)
      : (booking.renter._id || booking.renter);
    const productId = booking.product._id || booking.product;

    const review = await Review.create({
      booking: booking._id,
      reviewer: user._id,
      reviewee: revieweeId,
      product: productId,
      rating,
      comment: comment ? String(comment).trim() : '',
    });

    // Recalculate reviewee's User.rating.average and User.rating.count
    const allReviews = await Review.find({ reviewee: revieweeId });
    const count = allReviews.length;
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const average = count > 0 ? Math.round((totalRating / count) * 10) / 10 : 0;

    const revieweeUser = await User.findById(revieweeId);
    if (revieweeUser) {
      if (!revieweeUser.rating) {
        revieweeUser.rating = {};
      }
      revieweeUser.rating.average = average;
      revieweeUser.rating.count = count;
      await revieweeUser.save();
    }

    return res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get reviews received by a user.
 * Public endpoint.
 *
 * GET /api/reviews/user/:userId
 */
const getUserReviews = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    let page = parseInt(req.query.page, 10);
    if (isNaN(page) || page < 1) {
      page = 1;
    }

    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) {
      limit = 10;
    } else if (limit > 50) {
      limit = 50;
    }

    const skip = (page - 1) * limit;

    const filter = { reviewee: userId };
    const total = await Review.countDocuments(filter);
    const reviews = await Review.find(filter)
      .populate('reviewer', 'displayName avatarUrl')
      .populate('product', 'title images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    return res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page,
      totalPages,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getUserReviews,
};
