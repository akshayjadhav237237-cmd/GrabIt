const Razorpay = require('razorpay');

const rawKeyId = process.env.RAZORPAY_KEY_ID;
const rawKeySecret = process.env.RAZORPAY_KEY_SECRET;

const isPlaceholder = (val) =>
  !val ||
  val === 'your-razorpay-key-id' ||
  val === 'your-razorpay-key-secret' ||
  val.startsWith('your-') ||
  val.includes('placeholder') ||
  val === 'test';

const isRazorpayConfigured = Boolean(
  rawKeyId &&
  rawKeySecret &&
  !isPlaceholder(rawKeyId) &&
  !isPlaceholder(rawKeySecret)
);

const key_id = rawKeyId && !isPlaceholder(rawKeyId) ? rawKeyId : 'rzp_test_mockKeyId';
const key_secret = rawKeySecret && !isPlaceholder(rawKeySecret) ? rawKeySecret : 'mockSecret12345';

let razorpay = null;

if (isRazorpayConfigured) {
  try {
    razorpay = new Razorpay({
      key_id,
      key_secret,
    });
  } catch (error) {
    console.warn('[Razorpay] Failed to initialize Razorpay SDK:', error.message);
    console.warn('[Razorpay] Running in test/mock mode');
  }
} else {
  console.warn('[Razorpay] Running in test/mock mode');
}

// Mock fallback when not configured or SDK initialization failed
if (!razorpay) {
  razorpay = {
    orders: {
      create: async (options) => ({
        id: `order_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        entity: 'order',
        amount: options.amount,
        amount_paid: 0,
        amount_due: options.amount,
        currency: options.currency || 'INR',
        receipt: options.receipt,
        status: 'created',
        attempts: 0,
        notes: options.notes || {},
        created_at: Math.floor(Date.now() / 1000),
      }),
      fetch: async (orderId) => ({
        id: orderId,
        entity: 'order',
        status: 'created',
      }),
    },
    payments: {
      fetch: async (paymentId) => ({
        id: paymentId,
        entity: 'payment',
        status: 'captured',
      }),
    },
  };
}

module.exports = {
  razorpay,
  isRazorpayConfigured,
  key_id,
  key_secret,
};
