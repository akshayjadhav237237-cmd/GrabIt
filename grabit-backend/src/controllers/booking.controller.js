const crypto = require('crypto');
const mongoose = require('mongoose');
const { Booking, Product, User, Message } = require('../models');
const { razorpay, isRazorpayConfigured, key_id, key_secret } = require('../config/razorpay');
const notificationService = require('../services/notification.service');
const memoryStore = require('../data/memoryStore');

/**
 * Robust User Lookup (DB / mocks with memoryStore fallback).
 */
const findUser = async (firebaseUid, extra = {}) => {
  try {
    if (typeof User.findOne === 'function') {
      const u = await User.findOne({ firebaseUid });
      if (u) return u;
    }
  } catch (err) {
    console.warn('[Booking] User lookup notice:', err.message);
  }
  return memoryStore.getOrCreateUserByUid(firebaseUid, extra);
};

/**
 * Robust Product Lookup (DB / mocks with memoryStore fallback).
 */
const findProduct = async (productId) => {
  try {
    if (typeof Product.findById === 'function') {
      const p = await Product.findById(productId);
      if (p) return p;
    }
  } catch (err) {
    console.warn('[Booking] Product lookup notice:', err.message);
  }
  return memoryStore.getProductById(productId);
};

/**
 * Robust Booking Lookup (DB / mocks with memoryStore fallback).
 */
const findBooking = async (bookingId) => {
  try {
    if (typeof Booking.findById === 'function') {
      const b = await Booking.findById(bookingId);
      if (b) {
        if (typeof b.populate === 'function') {
          await b.populate('product');
          await b.populate('renter', 'displayName avatarUrl rating');
          await b.populate('owner', 'displayName avatarUrl rating');
        }
        return b;
      }
    }
  } catch (err) {
    console.warn('[Booking] Booking lookup notice:', err.message);
  }
  return memoryStore.getBookingById(bookingId);
};

/**
 * Helper to retrieve product title for push notifications.
 */
const getProductTitle = async (booking) => {
  if (booking.product && typeof booking.product === 'object' && booking.product.title) {
    return booking.product.title;
  }
  const prodId = booking.product ? (booking.product._id || booking.product) : null;
  if (prodId) {
    const prod = await findProduct(prodId);
    if (prod && prod.title) return prod.title;
  }
  return 'Item';
};

/**
 * Helper to retrieve user recipient document (with pushToken and notificationPrefs).
 */
const getUserRecipient = async (userId) => {
  if (!userId) return null;
  let user = null;
  const idStr = userId._id ? userId._id.toString() : (typeof userId === 'string' ? userId : (userId.toString ? userId.toString() : ''));
  try {
    if (typeof User.findById === 'function' && idStr) {
      user = await User.findById(idStr);
    }
  } catch {
    // ignore
  }
  if (!user && idStr) {
    user = memoryStore.getUserById(idStr);
  }
  if (!user && typeof userId === 'object') {
    user = userId;
  }
  return user;
};

/**
 * Helper to retrieve user's push notification token.
 */
const getUserPushToken = async (userId) => {
  const recipient = await getUserRecipient(userId);
  return recipient ? recipient.pushToken : null;
};

/**
 * Create a new booking request.
 * Protected via authMiddleware.
 *
 * POST /api/bookings
 */
const createBooking = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    // Resolve caller user
    const user = await findUser(firebaseUid, req.user);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const { productId, startDate, endDate, damageProtectionOpted } = req.body;

    // Validate productId format
    if (!productId) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Validate product existence
    const product = await findProduct(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Validate product availability
    if (product.availability && product.availability.isAvailable === false) {
      return res.status(400).json({
        success: false,
        message: 'Product is currently not available for rent',
      });
    }

    // Prevent self-booking
    const ownerId = product.owner
      ? (product.owner._id ? product.owner._id.toString() : product.owner.toString())
      : '';
    const userIdStr = user._id ? user._id.toString() : '';
    if (ownerId && userIdStr && ownerId === userIdStr) {
      return res.status(400).json({
        success: false,
        message: 'You cannot book your own product',
      });
    }

    // Date validations
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be strictly after start date',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return res.status(400).json({
        success: false,
        message: 'End date must be strictly after start date',
      });
    }

    // Blackout dates check
    if (
      product.availability &&
      Array.isArray(product.availability.blackoutDates) &&
      product.availability.blackoutDates.length > 0
    ) {
      const hasBlackoutOverlap = product.availability.blackoutDates.some((blackout) => {
        const bStart = new Date(blackout.startDate);
        const bEnd = new Date(blackout.endDate);
        if (isNaN(bStart.getTime()) || isNaN(bEnd.getTime())) {
          return false;
        }
        return start <= bEnd && end >= bStart;
      });

      if (hasBlackoutOverlap) {
        return res.status(400).json({
          success: false,
          message: 'Selected dates overlap with product blackout dates',
        });
      }
    }

    // Double-book protection
    let hasBookingOverlap = false;
    try {
      if (typeof Booking.exists === 'function') {
        hasBookingOverlap = Boolean(
          await Booking.exists({
            product: product._id,
            status: { $in: ['confirmed', 'active'] },
            startDate: { $lt: end },
            endDate: { $gt: start },
          })
        );
      } else if (typeof Booking.findOne === 'function') {
        hasBookingOverlap = Boolean(
          await Booking.findOne({
            product: product._id,
            status: { $in: ['confirmed', 'active'] },
            startDate: { $lt: end },
            endDate: { $gt: start },
          })
        );
      }
    } catch {
      hasBookingOverlap = false;
    }

    if (hasBookingOverlap) {
      return res.status(400).json({
        success: false,
        message: 'Selected dates overlap with an existing booking for this product',
      });
    }

    // Calculate total rental days (minimum 1)
    const diffMs = end.getTime() - start.getTime();
    const totalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Calculate pricing breakdown
    const perDayPrice = (product.rentalPrice && product.rentalPrice.perDay) || 0;
    const rentalFee = perDayPrice * totalDays;
    const platformFee = Math.round(rentalFee * 0.15 * 100) / 100;
    const securityDeposit = (product.rentalPrice && product.rentalPrice.securityDeposit) || 0;
    const isDamageProtectionAvailable = Boolean(product.damageProtection && product.damageProtection.isAvailable);
    const damageProtectionFee =
      damageProtectionOpted && isDamageProtectionAvailable
        ? (product.damageProtection && product.damageProtection.fee) || 0
        : 0;
    const totalAmount = Math.round((rentalFee + platformFee + securityDeposit + damageProtectionFee) * 100) / 100;

    let booking = null;

    try {
      if (typeof Booking.create === 'function') {
        booking = await Booking.create({
          product: product._id,
          renter: user._id,
          owner: product.owner?._id || product.owner,
          startDate: start,
          endDate: end,
          totalDays,
          pricing: {
            rentalFee,
            platformFee,
            securityDeposit,
            damageProtectionFee,
            totalAmount,
          },
          damageProtectionOpted: Boolean(damageProtectionOpted),
          status: 'confirmed',
          paymentStatus: 'unpaid',
        });

        if (typeof booking.populate === 'function') {
          await booking.populate('product');
          await booking.populate('renter', 'displayName avatarUrl rating');
          await booking.populate('owner', 'displayName avatarUrl rating');
        }
      }
    } catch (dbErr) {
      console.warn('[Booking] Booking.create DB notice:', dbErr.message);
    }

    if (!booking) {
      booking = memoryStore.createBooking({
        product,
        renter: user,
        owner: product.owner || { displayName: 'Grabit Host' },
        startDate: start,
        endDate: end,
        totalDays,
        pricing: {
          rentalFee,
          platformFee,
          securityDeposit,
          damageProtectionFee,
          totalAmount,
        },
        damageProtectionOpted: Boolean(damageProtectionOpted),
        status: 'confirmed',
        paymentStatus: 'unpaid',
      });
    }

    // Trigger instant booking notification to owner
    try {
      const ownerRecipient = await getUserRecipient(product.owner);
      if (ownerRecipient && ownerRecipient.pushToken && ownerRecipient.notificationPrefs?.bookingUpdates !== false) {
        const prodTitle = product.title || 'Item';
        await notificationService.sendPushNotification(ownerRecipient.pushToken, {
          title: 'New Instant Booking',
          body: `Your item "${prodTitle}" has been booked! Awaiting renter payment.`,
          data: { bookingId: booking._id.toString(), type: 'booking_created' },
        });
      }
    } catch (notifErr) {
      console.error('[Booking Controller] Push notification error on createBooking:', notifErr);
    }

    return res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve user's bookings split by role (as renter and as owner).
 * Protected via authMiddleware.
 *
 * GET /api/bookings/mine
 */
const getMyBookings = async (req, res, next) => {
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

    try {
      if (typeof Booking.find === 'function') {
        const asRenter = await Booking.find({ renter: user._id })
          .populate('product')
          .populate('owner', 'displayName avatarUrl rating')
          .sort({ createdAt: -1 });

        const asOwner = await Booking.find({ owner: user._id })
          .populate('product')
          .populate('renter', 'displayName avatarUrl rating')
          .sort({ createdAt: -1 });

        if (asRenter !== undefined && asOwner !== undefined) {
          return res.status(200).json({
            success: true,
            data: {
              asRenter,
              asOwner,
            },
          });
        }
      }
    } catch (dbErr) {
      console.warn('[Booking] getMyBookings DB notice:', dbErr.message);
    }

    const memBookings = memoryStore.getBookingsForUser(user._id);
    return res.status(200).json({
      success: true,
      data: {
        asRenter: memBookings.asRenter,
        asOwner: memBookings.asOwner,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve detailed booking by ID.
 * Protected via authMiddleware.
 * Only renter or owner can view.
 *
 * GET /api/bookings/:id
 */
const getBookingById = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await findUser(firebaseUid, req.user);
    const { id } = req.params;

    const booking = await findBooking(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const ownerId = booking.owner
      ? (booking.owner._id ? booking.owner._id.toString() : booking.owner.toString())
      : '';
    const renterId = booking.renter
      ? (booking.renter._id ? booking.renter._id.toString() : booking.renter.toString())
      : '';
    const userId = user._id ? user._id.toString() : '';

    if (userId && ownerId && renterId && ownerId !== userId && renterId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this booking',
      });
    }

    return res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update booking status (owner only).
 * Protected via authMiddleware.
 *
 * PATCH /api/bookings/:id/status
 */
const updateBookingStatus = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await findUser(firebaseUid, req.user);
    const { id } = req.params;

    const booking = await findBooking(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const { status, cancellationReason } = req.body || {};
    if (!status || (status !== 'confirmed' && status !== 'cancelled' && status !== 'completed')) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value. Allowed values are 'confirmed', 'cancelled', or 'completed'",
      });
    }

    const ownerId = booking.owner
      ? (booking.owner._id ? booking.owner._id.toString() : booking.owner.toString())
      : '';
    const renterId = booking.renter
      ? (booking.renter._id ? booking.renter._id.toString() : booking.renter.toString())
      : '';
    const callerId = user._id ? user._id.toString() : '';

    if (status === 'completed') {
      if (callerId !== ownerId && callerId !== renterId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only the booking renter or owner can complete a booking',
        });
      }

      if (booking.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Can only complete active bookings',
        });
      }
    } else if (status === 'cancelled') {
      if (callerId !== ownerId && callerId !== renterId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only the booking renter or owner can cancel a booking',
        });
      }

      if (booking.status === 'completed' || booking.status === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel an already completed or cancelled booking',
        });
      }

      const rawReason = req.body && (req.body.reason !== undefined ? req.body.reason : req.body.cancellationReason);
      if (!rawReason || typeof rawReason !== 'string' || !rawReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Cancellation reason is required',
        });
      }

      const trimmedReason = rawReason.trim();
      if (booking.status === 'confirmed' || booking.status === 'active') {
        const isLate = new Date(booking.startDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;
        if (isLate) {
          booking.cancellationReason = `[Late Cancellation (<24h)] ${trimmedReason}`;
        } else {
          booking.cancellationReason = trimmedReason;
        }
      } else {
        booking.cancellationReason = trimmedReason;
      }
    } else if (status === 'confirmed') {
      if (ownerId !== callerId) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Only the product owner can update booking status',
        });
      }

      if (booking.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending bookings can be confirmed',
        });
      }
    }

    const previousStatus = booking.status;
    booking.status = status;

    if (typeof booking.save === 'function') {
      await booking.save();
    } else {
      memoryStore.updateBooking(booking._id, {
        status,
        cancellationReason: booking.cancellationReason,
      });
    }

    // Trigger push notification
    try {
      const productTitle = await getProductTitle(booking);
      if (status === 'confirmed') {
        const recipient = await getUserRecipient(booking.renter);
        if (recipient && recipient.pushToken && recipient.notificationPrefs?.bookingUpdates !== false) {
          await notificationService.sendPushNotification(recipient.pushToken, {
            title: 'Booking Confirmed',
            body: `Your booking for ${productTitle} has been confirmed! Complete payment to activate.`,
            data: {
              bookingId: booking._id.toString(),
              type: 'booking_confirmed',
            },
          });
        }
      } else if (status === 'cancelled') {
        const otherPartyId = callerId === renterId ? ownerId : renterId;
        const recipient = await getUserRecipient(otherPartyId);
        if (recipient && recipient.pushToken && recipient.notificationPrefs?.bookingUpdates !== false) {
          const isDeclined = callerId === ownerId && previousStatus === 'pending';
          await notificationService.sendPushNotification(recipient.pushToken, {
            title: isDeclined ? 'Booking Declined' : 'Booking Cancelled',
            body: isDeclined
              ? `Your booking request for ${productTitle} was declined.`
              : `Booking for ${productTitle} was cancelled. Reason: ${booking.cancellationReason || 'No reason provided'}`,
            data: {
              bookingId: booking._id.toString(),
              type: 'booking_cancelled',
            },
          });
        }
      }
    } catch (notifyErr) {
      console.warn('[Notification] Failed to send booking status notification:', notifyErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}`,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Razorpay payment order for confirmed unpaid booking.
 * Protected via authMiddleware.
 *
 * POST /api/bookings/:id/create-order
 */
const createPaymentOrder = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await findUser(firebaseUid, req.user);
    const { id } = req.params;

    const booking = await findBooking(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const renterId = booking.renter
      ? (booking.renter._id ? booking.renter._id.toString() : booking.renter.toString())
      : '';
    const userIdStr = user._id ? user._id.toString() : '';

    if (userIdStr && renterId && renterId !== userIdStr) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the renter can initiate payment for this booking',
      });
    }

    if (booking.status !== 'confirmed' || booking.paymentStatus !== 'unpaid') {
      let message = 'Payment can only be initiated for confirmed unpaid bookings';
      if (booking.paymentStatus === 'paid') {
        message = 'Booking has already been paid';
      } else if (booking.status !== 'confirmed') {
        message = `Cannot initiate payment for booking with status '${booking.status}'`;
      }
      return res.status(400).json({
        success: false,
        message,
      });
    }

    const totalAmount = (booking.pricing && booking.pricing.totalAmount) || 0;
    const amountInPaise = Math.round(totalAmount * 100);

    let order = null;
    if (isRazorpayConfigured && razorpay) {
      order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `bkg_${booking._id.toString()}`,
        notes: {
          bookingId: booking._id.toString(),
        },
      });
    } else {
      order = {
        id: `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        amount: amountInPaise,
        currency: 'INR',
        receipt: `bkg_${booking._id.toString()}`,
        status: 'created',
      };
    }

    return res.status(200).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      key_id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Razorpay payment signature and activate booking.
 * Protected via authMiddleware.
 *
 * POST /api/bookings/:id/verify-payment
 */
const verifyPayment = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await findUser(firebaseUid, req.user);
    const { id } = req.params;

    const booking = await findBooking(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const renterId = booking.renter
      ? (booking.renter._id ? booking.renter._id.toString() : booking.renter.toString())
      : '';
    const userIdStr = user._id ? user._id.toString() : '';

    if (userIdStr && renterId && renterId !== userIdStr) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the renter can verify payment for this booking',
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters',
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const isValidSignature =
      expectedSignature === razorpay_signature ||
      (!isRazorpayConfigured && razorpay_signature === 'mock-signature');

    if (!isValidSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature',
      });
    }

    booking.paymentStatus = 'paid';
    booking.status = 'active';
    booking.paidAt = new Date();

    if (typeof booking.save === 'function') {
      await booking.save();
    } else {
      memoryStore.updateBooking(booking._id, {
        paymentStatus: 'paid',
        status: 'active',
        paidAt: new Date(),
      });
    }

    // Trigger push notification to owner that booking is active & paid
    try {
      const productTitle = await getProductTitle(booking);
      const recipient = await getUserRecipient(booking.owner);
      if (recipient && recipient.pushToken && recipient.notificationPrefs?.bookingUpdates !== false) {
        await notificationService.sendPushNotification(recipient.pushToken, {
          title: 'Payment Received',
          body: `Payment received! Booking for ${productTitle} is now active.`,
          data: {
            bookingId: booking._id.toString(),
            type: 'payment_verified',
          },
        });
      }
    } catch (notifyErr) {
      console.warn('[Notification] Failed to notify owner of payment:', notifyErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and booking activated',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a chat message for a booking.
 * Protected via authMiddleware.
 *
 * POST /api/bookings/:id/messages
 */
const sendMessage = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await findUser(firebaseUid, req.user);
    const { id } = req.params;

    const booking = await findBooking(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const renterId = booking.renter
      ? (booking.renter._id ? booking.renter._id.toString() : booking.renter.toString())
      : '';
    const ownerId = booking.owner
      ? (booking.owner._id ? booking.owner._id.toString() : booking.owner.toString())
      : '';
    const currentUserId = user._id ? user._id.toString() : '';

    if (currentUserId && renterId && ownerId && renterId !== currentUserId && ownerId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to send messages for this booking',
      });
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message text is required',
      });
    }

    let message = null;
    try {
      if (typeof Message.create === 'function') {
        message = await Message.create({
          booking: booking._id,
          sender: user._id,
          text: text.trim(),
        });
        if (typeof message.populate === 'function') {
          await message.populate('sender', 'displayName avatarUrl');
        }
      }
    } catch (dbErr) {
      console.warn('[Booking] Message.create DB notice:', dbErr.message);
    }

    if (!message) {
      message = {
        _id: 'msg_' + Math.random().toString(36).substring(2, 10),
        booking: booking._id,
        sender: user,
        text: text.trim(),
        createdAt: new Date(),
      };
      if (!memoryStore.messagesByBookingId.has(booking._id.toString())) {
        memoryStore.messagesByBookingId.set(booking._id.toString(), []);
      }
      memoryStore.messagesByBookingId.get(booking._id.toString()).push(message);
    }

    return res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve messages for a booking.
 * Protected via authMiddleware.
 *
 * GET /api/bookings/:id/messages
 */
const getMessages = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await findUser(firebaseUid, req.user);
    const { id } = req.params;

    const booking = await findBooking(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    try {
      if (typeof Message.find === 'function') {
        const messages = await Message.find({ booking: booking._id })
          .populate('sender', 'displayName avatarUrl')
          .sort({ createdAt: 1 });

        return res.status(200).json({
          success: true,
          data: messages,
        });
      }
    } catch (dbErr) {
      console.warn('[Booking] getMessages DB notice:', dbErr.message);
    }

    const msgs = memoryStore.messagesByBookingId.get(booking._id.toString()) || [];
    return res.status(200).json({
      success: true,
      data: msgs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request an extension on an active booking (renter only).
 * Protected via authMiddleware.
 *
 * POST /api/bookings/:id/extend
 */
const requestExtension = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await findUser(firebaseUid, req.user);
    const { id } = req.params;

    const booking = await findBooking(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const renterId = booking.renter
      ? (booking.renter._id ? booking.renter._id.toString() : booking.renter.toString())
      : '';
    const userIdStr = user._id ? user._id.toString() : '';

    if (userIdStr && renterId && renterId !== userIdStr) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the booking renter can request an extension',
      });
    }

    if (booking.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Extensions can only be requested for active bookings',
      });
    }

    const { newEndDate } = req.body || {};
    if (!newEndDate) {
      return res.status(400).json({
        success: false,
        message: 'New end date is required',
      });
    }

    const extEnd = new Date(newEndDate);
    const currentEnd = new Date(booking.endDate);

    if (isNaN(extEnd.getTime()) || isNaN(currentEnd.getTime()) || extEnd <= currentEnd) {
      return res.status(400).json({
        success: false,
        message: 'New end date must be strictly after current end date',
      });
    }

    const product = typeof booking.product === 'object' ? booking.product : await findProduct(booking.product);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product associated with this booking was not found',
      });
    }

    const diffMs = extEnd.getTime() - currentEnd.getTime();
    const additionalDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const perDayPrice = (product.rentalPrice && product.rentalPrice.perDay) || 0;
    const additionalRentalFee = perDayPrice * additionalDays;
    const additionalPlatformFee = Math.round(additionalRentalFee * 0.15 * 100) / 100;
    const additionalAmount = Math.round((additionalRentalFee + additionalPlatformFee) * 100) / 100;

    booking.extensionRequest = {
      newEndDate: extEnd,
      additionalDays,
      additionalRentalFee,
      additionalPlatformFee,
      additionalAmount,
      status: 'pending',
      requestedAt: new Date(),
    };

    if (typeof booking.save === 'function') {
      await booking.save();
    } else {
      memoryStore.updateBooking(booking._id, { extensionRequest: booking.extensionRequest });
    }

    return res.status(200).json({
      success: true,
      message: 'Rental extension request submitted to owner',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Respond to extension request (owner only).
 * Protected via authMiddleware.
 *
 * PATCH /api/bookings/:id/extend-response
 */
const respondExtension = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await findUser(firebaseUid, req.user);
    const { id } = req.params;

    const booking = await findBooking(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const ownerId = booking.owner
      ? (booking.owner._id ? booking.owner._id.toString() : booking.owner.toString())
      : '';
    const userIdStr = user._id ? user._id.toString() : '';

    if (userIdStr && ownerId && ownerId !== userIdStr) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the product owner can respond to extension requests',
      });
    }

    if (!booking.extensionRequest || booking.extensionRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'No pending extension request found for this booking',
      });
    }

    const { approve } = req.body || {};
    if (typeof approve !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'approve boolean field is required',
      });
    }

    if (approve === true) {
      booking.endDate = booking.extensionRequest.newEndDate;
      booking.totalDays = (booking.totalDays || 0) + (booking.extensionRequest.additionalDays || 0);
      if (!booking.pricing) {
        booking.pricing = {
          rentalFee: 0,
          platformFee: 0,
          securityDeposit: 0,
          damageProtectionFee: 0,
          totalAmount: 0,
        };
      }
      booking.pricing.rentalFee =
        Math.round(((booking.pricing.rentalFee || 0) + (booking.extensionRequest.additionalRentalFee || 0)) * 100) / 100;
      booking.pricing.platformFee =
        Math.round(((booking.pricing.platformFee || 0) + (booking.extensionRequest.additionalPlatformFee || 0)) * 100) / 100;
      booking.pricing.totalAmount =
        Math.round(((booking.pricing.totalAmount || 0) + (booking.extensionRequest.additionalAmount || 0)) * 100) / 100;
      booking.extensionRequest.status = 'approved';
    } else {
      booking.extensionRequest.status = 'rejected';
    }

    if (typeof booking.save === 'function') {
      await booking.save();
    } else {
      memoryStore.updateBooking(booking._id, {
        endDate: booking.endDate,
        totalDays: booking.totalDays,
        pricing: booking.pricing,
        extensionRequest: booking.extensionRequest,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Extension request ${approve ? 'approved' : 'rejected'}`,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Raise a dispute on a booking (renter or owner).
 * Protected via authMiddleware.
 *
 * PATCH /api/bookings/:id/dispute
 */
const raiseDispute = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await findUser(firebaseUid, req.user);
    const { id } = req.params;

    const booking = await findBooking(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

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
        message: 'Forbidden: Only the booking renter or owner can raise a dispute',
      });
    }

    const { reason } = req.body || {};
    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Dispute reason is required',
      });
    }

    booking.disputeFlag = {
      raised: true,
      raisedBy: user._id,
      reason: reason.trim(),
      raisedAt: new Date(),
    };

    if (typeof booking.save === 'function') {
      await booking.save();
    } else {
      memoryStore.updateBooking(booking._id, { disputeFlag: booking.disputeFlag });
    }

    return res.status(200).json({
      success: true,
      message: 'Dispute raised successfully. Our support team has been alerted.',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Pay for booking using Grabit Wallet (₹20,000 balance).
 * Protected via authMiddleware.
 *
 * POST /api/bookings/:id/pay-wallet
 */
const payWithWallet = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const user = await findUser(firebaseUid, req.user);
    const { id } = req.params;

    const booking = await findBooking(id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const renterId = booking.renter
      ? (booking.renter._id ? booking.renter._id.toString() : booking.renter.toString())
      : '';
    const userIdStr = user._id ? user._id.toString() : '';

    if (userIdStr && renterId && renterId !== userIdStr) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the renter can pay for this booking',
      });
    }

    if (booking.status !== 'confirmed' || booking.paymentStatus !== 'unpaid') {
      let message = 'Payment can only be made for confirmed unpaid bookings';
      if (booking.paymentStatus === 'paid') {
        message = 'Booking has already been paid';
      } else if (booking.status !== 'confirmed') {
        message = `Cannot pay for booking with status '${booking.status}'`;
      }
      return res.status(400).json({
        success: false,
        message,
      });
    }

    const totalAmount = (booking.pricing && booking.pricing.totalAmount) || 0;
    const MOCK_WALLET_BALANCE = 20000;
    if (totalAmount > MOCK_WALLET_BALANCE) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient wallet balance for this booking',
      });
    }

    booking.paymentStatus = 'paid';
    booking.status = 'active';
    booking.paidAt = new Date();

    if (typeof booking.save === 'function') {
      await booking.save();
    } else {
      memoryStore.updateBooking(booking._id, {
        paymentStatus: 'paid',
        status: 'active',
        paidAt: new Date(),
      });
    }

    // Trigger push notification to owner
    try {
      const productTitle = await getProductTitle(booking);
      const recipient = await getUserRecipient(booking.owner);
      if (recipient && recipient.pushToken && recipient.notificationPrefs?.bookingUpdates !== false) {
        await notificationService.sendPushNotification(recipient.pushToken, {
          title: 'Payment Received (Grabit Wallet)',
          body: `Payment of ₹${totalAmount} received via Grabit Wallet! Booking for ${productTitle} is now active.`,
          data: {
            bookingId: booking._id.toString(),
            type: 'payment_verified',
          },
        });
      }
    } catch (notifyErr) {
      console.warn('[Notification] Failed to notify owner of wallet payment:', notifyErr.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment successful using Grabit Wallet',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  createPaymentOrder,
  verifyPayment,
  payWithWallet,
  sendMessage,
  getMessages,
  requestExtension,
  respondExtension,
  raiseDispute,
};
