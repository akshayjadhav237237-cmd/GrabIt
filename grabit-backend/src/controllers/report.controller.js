const mongoose = require('mongoose');
const { Report, User, Product } = require('../models');

const VALID_REASONS = ['Spam', 'Inappropriate', 'Scam/Fraud', 'Other'];
const VALID_TARGET_TYPES = ['product', 'user'];

/**
 * Create a report for a product or user.
 * Protected via authMiddleware.
 *
 * POST /api/reports
 */
const createReport = async (req, res, next) => {
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

    const { targetType, targetId, reason, details } = req.body || {};

    // Validate targetType
    if (!targetType || !VALID_TARGET_TYPES.includes(targetType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target type. Must be "product" or "user"',
      });
    }

    // Validate targetId
    if (!targetId || !mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target ID',
      });
    }

    // Validate reason
    if (!reason || !VALID_REASONS.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: 'Reason must be one of: Spam, Inappropriate, Scam/Fraud, Other',
      });
    }

    // Create Report
    const report = await Report.create({
      reporterId: user._id,
      targetType,
      targetId,
      reason,
      details: details ? String(details).trim() : '',
      status: 'open',
    });

    return res.status(201).json({
      success: true,
      message: 'Report submitted successfully. Our team will review this report.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReport,
};
