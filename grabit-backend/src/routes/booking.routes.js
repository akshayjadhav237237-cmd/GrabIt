const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const {
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
} = require('../controllers/booking.controller');

// Create booking request
router.post('/', authMiddleware, createBooking);

// Get current user's bookings (as renter and owner)
router.get('/mine', authMiddleware, getMyBookings);

// Payment endpoints
router.post('/:id/create-order', authMiddleware, createPaymentOrder);
router.post('/:id/verify-payment', authMiddleware, verifyPayment);
router.post('/:id/pay-wallet', authMiddleware, payWithWallet);

// Extension endpoints
router.post('/:id/extend', authMiddleware, requestExtension);
router.patch('/:id/extend-response', authMiddleware, respondExtension);

// Dispute endpoint
router.patch('/:id/dispute', authMiddleware, raiseDispute);

// Chat endpoints
router.post('/:id/messages', authMiddleware, sendMessage);
router.get('/:id/messages', authMiddleware, getMessages);

// Get booking by ID (only renter or owner)
router.get('/:id', authMiddleware, getBookingById);

// Update booking status (owner only)
router.patch('/:id/status', authMiddleware, updateBookingStatus);

module.exports = router;
