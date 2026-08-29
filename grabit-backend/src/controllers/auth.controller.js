const { User } = require('../models');

/**
 * Generate a random referral code string (e.g. GRAB-A9B8C7)
 */
const generateReferralCodeString = () => {
  return `GRAB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
};

/**
 * Generate a guaranteed unique referral code
 */
const generateUniqueReferralCode = async () => {
  let code = generateReferralCodeString();
  let existing = await User.findOne({ referralCode: code });
  let attempts = 0;
  while (existing && attempts < 10) {
    code = generateReferralCodeString();
    existing = await User.findOne({ referralCode: code });
    attempts++;
  }
  return code;
};

/**
 * Sync authenticated Firebase user with MongoDB user profile.
 * Creates a new user record if it does not exist, or updates displayName/email if it does.
 *
 * POST /api/auth/sync
 */
const syncUser = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const email = (req.user && req.user.email) || (req.body && req.body.email);
    const displayName = (req.body && req.body.displayName !== undefined)
      ? req.body.displayName
      : (req.user && req.user.name);
    const inputReferralCode = (req.body && req.body.referralCode) ? String(req.body.referralCode).trim() : null;

    let userDoc = await User.findOne({ firebaseUid });

    if (userDoc) {
      let modified = false;
      if (displayName && userDoc.displayName !== displayName) {
        userDoc.displayName = displayName;
        modified = true;
      }
      if (email && userDoc.email !== email) {
        userDoc.email = email;
        modified = true;
      }
      if (!userDoc.referralCode) {
        userDoc.referralCode = await generateUniqueReferralCode();
        modified = true;
      }
      if (modified) {
        await userDoc.save();
      }

      return res.status(200).json({
        success: true,
        user: userDoc,
      });
    }

    const generatedReferralCode = await generateUniqueReferralCode();
    let referredBy = null;

    if (inputReferralCode) {
      const referrer = await User.findOne({
        referralCode: { $regex: new RegExp(`^${inputReferralCode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });
      if (referrer && referrer.firebaseUid !== firebaseUid) {
        referredBy = referrer._id;
      }
    }

    userDoc = await User.create({
      firebaseUid,
      email,
      displayName: displayName || '',
      verification: {
        status: 'unverified',
      },
      referralCode: generatedReferralCode,
      referredBy,
    });

    return res.status(201).json({
      success: true,
      user: userDoc,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve current authenticated user profile by Firebase UID.
 *
 * GET /api/auth/me
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const firebaseUid = req.user && req.user.uid;
    if (!firebaseUid) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const userDoc = await User.findOne({ firebaseUid });

    if (!userDoc) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: userDoc,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  syncUser,
  getCurrentUser,
};
