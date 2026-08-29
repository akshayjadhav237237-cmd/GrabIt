const mongoose = require('mongoose');
const { Report, User, Product } = require('../models');
const memoryStore = require('../data/memoryStore');

const VALID_REASONS = ['Spam', 'Inappropriate', 'Scam/Fraud', 'Other'];
const VALID_TARGET_TYPES = ['product', 'user'];

const findUser = async (firebaseUid, extra = {}) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const u = await User.findOne({ firebaseUid });
      if (u) return u;
    } catch (err) {
      console.warn('[Report] User lookup notice:', err.message);
    }
  }
  return memoryStore.getOrCreateUserByUid(firebaseUid, extra);
};

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

    const user = await findUser(firebaseUid, req.user);
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
    if (!targetId) {
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

    let report = null;
    if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(targetId)) {
      try {
        report = await Report.create({
          reporterId: user._id,
          targetType,
          targetId,
          reason,
          details: details ? String(details).trim() : '',
          status: 'open',
        });
      } catch (dbErr) {
        console.warn('[Report] Report.create DB notice:', dbErr.message);
      }
    }

    if (!report) {
      report = {
        _id: 'rep_' + Math.random().toString(36).substring(2, 10),
        reporterId: user._id,
        targetType,
        targetId,
        reason,
        details: details ? String(details).trim() : '',
        status: 'open',
        createdAt: new Date(),
      };
      memoryStore.reportsList.push(report);
    }

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
