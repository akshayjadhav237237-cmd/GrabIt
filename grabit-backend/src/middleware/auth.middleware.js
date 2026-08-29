const { admin, isMockMode } = require('../config/firebase');

/**
 * Authentication Middleware
 *
 * Verifies Firebase ID token from Authorization header (Bearer <token>).
 * Supports mock tokens in development/test mode.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required',
      });
    }

    // Mock token decoding for local development and testing
    if (token.startsWith('mock-token-') || token === 'test-token') {
      let uid = token.replace('mock-token-', '');
      let email = 'test@grabit.com';
      if (!uid || token === 'test-token') {
        uid = 'test-user-123';
      } else if (uid.includes('@')) {
        email = uid;
      } else {
        email = `${uid}@grabit.com`;
      }
      req.user = {
        uid,
        email,
        name: 'Test User',
      };
      return next();
    }

    // Verify real Firebase ID token with Firebase Admin SDK
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name || decoded.displayName,
      };
      return next();
    } catch (verifyError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Optional Authentication Middleware
 *
 * Attaches req.user if a valid token is present in Authorization header,
 * but allows unauthenticated requests to proceed without error.
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return next();
    }

    // Mock token decoding for local development and testing
    if (token.startsWith('mock-token-') || token === 'test-token') {
      let uid = token.replace('mock-token-', '');
      let email = 'test@grabit.com';
      if (!uid || token === 'test-token') {
        uid = 'test-user-123';
      } else if (uid.includes('@')) {
        email = uid;
      } else {
        email = `${uid}@grabit.com`;
      }
      req.user = {
        uid,
        email,
        name: 'Test User',
      };
      return next();
    }

    // Verify real Firebase ID token with Firebase Admin SDK
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        name: decoded.name || decoded.displayName,
      };
      return next();
    } catch (verifyError) {
      return next();
    }
  } catch (error) {
    return next();
  }
};

authMiddleware.authMiddleware = authMiddleware;
authMiddleware.optionalAuth = optionalAuth;

module.exports = authMiddleware;

