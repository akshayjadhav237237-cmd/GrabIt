const express = require('express');
const router = express.Router();

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');
const bookingRoutes = require('./booking.routes');
const userRoutes = require('./user.routes');
const reviewRoutes = require('./review.routes');
const reportRoutes = require('./report.routes');

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/bookings', bookingRoutes);
router.use('/users', userRoutes);
router.use('/reviews', reviewRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
