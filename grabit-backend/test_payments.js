require('dotenv').config();
process.env.NODE_ENV = 'test';

const http = require('http');
const assert = require('assert');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { Booking, Product, User } = require('./src/models');
const { key_secret, key_id, isRazorpayConfigured } = require('./src/config/razorpay');
const app = require('./server');

async function runPaymentTests() {
  console.log('--- STARTING RAZORPAY PAYMENTS INTEGRATION TESTS ---\n');

  // In-memory mock stores
  const userStore = new Map();
  const productStore = new Map();
  const bookingStore = new Map();

  function mockUser(data) {
    const _id = data._id || new mongoose.Types.ObjectId();
    const user = {
      _id,
      firebaseUid: data.firebaseUid,
      email: data.email || `${data.firebaseUid}@grabit.com`,
      displayName: data.displayName || 'Test User',
      phoneNumber: data.phoneNumber || '+1234567890',
      avatarUrl: data.avatarUrl || 'https://example.com/avatar.jpg',
      verification: data.verification || { status: 'unverified' },
      rating: data.rating || { average: 4.8, count: 12 },
      pushToken: data.pushToken || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      async save() {
        this.updatedAt = new Date();
        userStore.set(this.firebaseUid, this);
        userStore.set(this._id.toString(), this);
        return this;
      },
    };
    userStore.set(user.firebaseUid, user);
    userStore.set(user._id.toString(), user);
    return user;
  }

  function sanitizeUser(userRef) {
    const idStr = userRef ? (userRef._id ? userRef._id.toString() : userRef.toString()) : '';
    const user = userStore.get(idStr);
    if (!user) return userRef;
    return {
      _id: user._id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      rating: user.rating,
      pushToken: user.pushToken,
    };
  }

  function mockProduct(data) {
    const _id = data._id || new mongoose.Types.ObjectId();
    const doc = {
      _id,
      owner: data.owner,
      title: data.title,
      description: data.description || '',
      category: data.category || 'Electronics',
      images: data.images || [],
      rentalPrice: {
        perDay: data.rentalPrice?.perDay || 100,
        perWeek: data.rentalPrice?.perWeek || 600,
        securityDeposit: data.rentalPrice?.securityDeposit || 0,
      },
      availability: {
        isAvailable: data.availability?.isAvailable !== undefined ? data.availability.isAvailable : true,
      },
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
      async save() {
        this.updatedAt = new Date();
        productStore.set(this._id.toString(), this);
        return this;
      },
      async populate(path) {
        if (path === 'owner') {
          this.owner = sanitizeUser(this.owner);
        }
        return this;
      },
    };
    productStore.set(_id.toString(), doc);
    return doc;
  }

  function mockBooking(data) {
    const _id = data._id || new mongoose.Types.ObjectId();
    const doc = {
      _id,
      product: data.product,
      renter: data.renter,
      owner: data.owner,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      totalDays: data.totalDays || 3,
      pricing: { ...data.pricing },
      damageProtectionOpted: Boolean(data.damageProtectionOpted),
      status: data.status || 'pending',
      paymentStatus: data.paymentStatus || 'unpaid',
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
      async save() {
        this.updatedAt = new Date();
        bookingStore.set(this._id.toString(), this);
        return this;
      },
      async populate(path, select) {
        const paths = Array.isArray(path) ? path : [{ path, select }];
        for (const p of paths) {
          const pPath = typeof p === 'string' ? p : p.path;
          if (pPath === 'product') {
            const prodId = this.product ? (this.product._id ? this.product._id.toString() : this.product.toString()) : '';
            const prod = productStore.get(prodId);
            this.product = prod ? { ...prod } : this.product;
          } else if (pPath === 'renter') {
            this.renter = sanitizeUser(this.renter);
          } else if (pPath === 'owner') {
            this.owner = sanitizeUser(this.owner);
          }
        }
        return this;
      },
    };
    bookingStore.set(_id.toString(), doc);
    return doc;
  }

  // Intercept User model methods
  User.findOne = async function (filter) {
    if (filter.firebaseUid) {
      return userStore.get(filter.firebaseUid) || null;
    }
    if (filter._id) {
      return userStore.get(filter._id.toString()) || null;
    }
    return null;
  };

  User.findById = async function (id) {
    const idStr = id ? (id._id ? id._id.toString() : id.toString()) : '';
    return userStore.get(idStr) || null;
  };

  // Intercept Product model methods
  Product.findById = function (id) {
    const idStr = id ? (id._id ? id._id.toString() : id.toString()) : '';
    const run = async () => {
      const doc = productStore.get(idStr);
      if (!doc) return null;
      return { ...doc };
    };
    return {
      populate() { return this; },
      then(resolve, reject) { return run().then(resolve, reject); },
    };
  };

  // Intercept Booking model methods
  Booking.findById = function (id) {
    const idStr = id ? (id._id ? id._id.toString() : id.toString()) : '';
    const populates = [];

    const run = async () => {
      const doc = bookingStore.get(idStr);
      if (!doc) return null;
      const clone = { ...doc };
      clone.save = async function () {
        doc.updatedAt = new Date();
        doc.status = this.status;
        doc.paymentStatus = this.paymentStatus;
        Object.assign(doc, this);
        return doc;
      };
      clone.populate = async function (path, select) {
        const paths = Array.isArray(path) ? path : [{ path, select }];
        for (const p of paths) {
          const pPath = typeof p === 'string' ? p : p.path;
          if (pPath === 'product') {
            const prodId = clone.product ? (clone.product._id ? clone.product._id.toString() : clone.product.toString()) : '';
            const prod = productStore.get(prodId);
            clone.product = prod ? { ...prod } : clone.product;
          } else if (pPath === 'renter') {
            clone.renter = sanitizeUser(clone.renter);
          } else if (pPath === 'owner') {
            clone.owner = sanitizeUser(clone.owner);
          }
        }
        return clone;
      };
      return clone;
    };

    const queryObj = {
      populate(path, select) {
        populates.push({ path, select });
        return queryObj;
      },
      then(resolve, reject) {
        return run().then(resolve, reject);
      },
    };
    return queryObj;
  };

  // Start HTTP test server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`✓ Test server listening on ${baseUrl}\n`);

  const makeRequest = (path, method = 'GET', headers = {}, body = null) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const reqHeaders = { ...headers };
      let payload = null;
      if (body) {
        payload = JSON.stringify(body);
        reqHeaders['Content-Type'] = 'application/json';
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(
        url,
        { method, headers: reqHeaders },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            let parsed = null;
            try {
              parsed = JSON.parse(data);
            } catch (e) {
              parsed = data;
            }
            resolve({ status: res.statusCode, body: parsed });
          });
        }
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  };

  try {
    // Seed users
    const owner = mockUser({
      firebaseUid: 'owner-uid-1',
      displayName: 'Alice Owner',
    });
    const renter = mockUser({
      firebaseUid: 'renter-uid-1',
      displayName: 'Bob Renter',
    });
    const thirdParty = mockUser({
      firebaseUid: 'third-uid-1',
      displayName: 'Charlie Thirdparty',
    });

    const ownerAuth = { Authorization: 'Bearer mock-token-owner-uid-1' };
    const renterAuth = { Authorization: 'Bearer mock-token-renter-uid-1' };
    const thirdAuth = { Authorization: 'Bearer mock-token-third-uid-1' };

    // Seed product
    const product = mockProduct({
      owner: owner._id,
      title: 'Fujifilm X-T5 Mirrorless Camera',
    });

    // Seed pending booking
    const booking = mockBooking({
      product: product._id,
      renter: renter._id,
      owner: owner._id,
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-04'),
      totalDays: 3,
      pricing: {
        rentalFee: 600,
        platformFee: 90,
        securityDeposit: 300,
        damageProtectionFee: 35,
        totalAmount: 1025,
      },
      status: 'pending',
      paymentStatus: 'unpaid',
    });

    console.log('[1] Testing 401 on unauthorized create-order...');
    const unauthOrderRes = await makeRequest(
      `/api/bookings/${booking._id}/create-order`,
      'POST'
    );
    assert.strictEqual(unauthOrderRes.status, 401, 'Expected 401 for missing token');
    assert.strictEqual(unauthOrderRes.body.success, false);
    console.log('✓ Passed: Unauthorized create-order rejected with 401.\n');

    console.log('[2] Testing 403 on non-renter create-order...');
    const nonRenterRes1 = await makeRequest(
      `/api/bookings/${booking._id}/create-order`,
      'POST',
      ownerAuth // Owner is not renter
    );
    assert.strictEqual(nonRenterRes1.status, 403, 'Expected 403 for owner trying to create payment order');
    assert.strictEqual(nonRenterRes1.body.success, false);

    const nonRenterRes2 = await makeRequest(
      `/api/bookings/${booking._id}/create-order`,
      'POST',
      thirdAuth // Third party is not renter
    );
    assert.strictEqual(nonRenterRes2.status, 403, 'Expected 403 for third party');
    console.log('✓ Passed: Non-renter create-order forbidden with 403.\n');

    console.log('[3] Testing 400 when booking is not confirmed (currently pending)...');
    const pendingOrderRes = await makeRequest(
      `/api/bookings/${booking._id}/create-order`,
      'POST',
      renterAuth
    );
    assert.strictEqual(pendingOrderRes.status, 400, 'Expected 400 for pending booking payment order');
    assert.strictEqual(pendingOrderRes.body.success, false);
    console.log('✓ Passed: Payment on pending booking rejected with 400.\n');

    // Confirm booking to allow payment order creation
    booking.status = 'confirmed';
    await booking.save();

    console.log('[4] Testing 200 on valid create-order (returns order id & amount in paise)...');
    const validOrderRes = await makeRequest(
      `/api/bookings/${booking._id}/create-order`,
      'POST',
      renterAuth
    );
    assert.strictEqual(validOrderRes.status, 200, 'Expected 200 for valid create-order');
    assert.strictEqual(validOrderRes.body.success, true);
    assert.ok(validOrderRes.body.order, 'Expected order object in response');
    assert.ok(validOrderRes.body.order.id, 'Expected order.id');
    // totalAmount: 1025 -> 102500 paise
    assert.strictEqual(validOrderRes.body.order.amount, 102500, 'Order amount should be 102500 paise');
    assert.strictEqual(validOrderRes.body.order.currency, 'INR');
    assert.ok(validOrderRes.body.key_id, 'Expected key_id in response');
    console.log(`✓ Passed: Order created successfully (ID: ${validOrderRes.body.order.id}, Amount: ${validOrderRes.body.order.amount} paise, Key: ${validOrderRes.body.key_id}).\n`);

    const orderId = validOrderRes.body.order.id;
    const paymentId = 'pay_mock_123456789';

    console.log('[5] Testing 400 on tampered/invalid signature in verify-payment...');
    const tamperedVerifyRes = await makeRequest(
      `/api/bookings/${booking._id}/verify-payment`,
      'POST',
      renterAuth,
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'tampered_invalid_signature_hex_123',
      }
    );
    assert.strictEqual(tamperedVerifyRes.status, 400, 'Expected 400 on tampered signature');
    assert.strictEqual(tamperedVerifyRes.body.success, false);
    assert.strictEqual(tamperedVerifyRes.body.message, 'Invalid payment signature');
    console.log('✓ Passed: Tampered signature rejected with 400.\n');

    console.log('[6] Testing 403 on non-renter verify-payment...');
    const nonRenterVerifyRes = await makeRequest(
      `/api/bookings/${booking._id}/verify-payment`,
      'POST',
      ownerAuth,
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: 'mock-signature',
      }
    );
    assert.strictEqual(nonRenterVerifyRes.status, 403);
    console.log('✓ Passed: Non-renter payment verification forbidden with 403.\n');

    console.log('[7] Testing 200 on valid signature in verify-payment (activates booking & marks paid)...');
    // Generate valid HMAC sha256 signature using key_secret
    const validSignature = crypto
      .createHmac('sha256', key_secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const validVerifyRes = await makeRequest(
      `/api/bookings/${booking._id}/verify-payment`,
      'POST',
      renterAuth,
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      }
    );
    assert.strictEqual(validVerifyRes.status, 200, 'Expected 200 on valid payment verification');
    assert.strictEqual(validVerifyRes.body.success, true);
    assert.strictEqual(validVerifyRes.body.message, 'Payment verified and booking activated');
    assert.strictEqual(validVerifyRes.body.data.status, 'active');
    assert.strictEqual(validVerifyRes.body.data.paymentStatus, 'paid');

    // Verify stored booking state
    const updatedStoredBooking = bookingStore.get(booking._id.toString());
    assert.strictEqual(updatedStoredBooking.status, 'active');
    assert.strictEqual(updatedStoredBooking.paymentStatus, 'paid');
    console.log('✓ Passed: Payment verified with HMAC sha256 signature, booking status set to active and paymentStatus set to paid.\n');

    console.log('[8] Testing 400 when booking is already paid on create-order...');
    const alreadyPaidOrderRes = await makeRequest(
      `/api/bookings/${booking._id}/create-order`,
      'POST',
      renterAuth
    );
    assert.strictEqual(alreadyPaidOrderRes.status, 400, 'Expected 400 when booking already paid');
    assert.strictEqual(alreadyPaidOrderRes.body.success, false);
    console.log('✓ Passed: Order creation on already-paid booking rejected with 400.\n');

    // ----------------------------------------------------------------
    // Wallet Payment Tests (POST /api/bookings/:id/pay-wallet)
    // ----------------------------------------------------------------
    console.log('--- TESTING WALLET PAYMENT (POST /api/bookings/:id/pay-wallet) ---\n');

    // Create a new pending booking for wallet testing with totalAmount > 500 (e.g. ₹850)
    const expensiveBooking = mockBooking({
      product: product._id,
      renter: renter._id,
      owner: owner._id,
      startDate: new Date('2026-11-10'),
      endDate: new Date('2026-11-12'),
      totalDays: 2,
      pricing: {
        rentalFee: 18000,
        platformFee: 2700,
        securityDeposit: 4300,
        totalAmount: 25000,
      },
      status: 'pending',
      paymentStatus: 'unpaid',
    });

    console.log('[9] Testing 401 on unauthorized pay-wallet...');
    const unauthWalletRes = await makeRequest(
      `/api/bookings/${expensiveBooking._id}/pay-wallet`,
      'POST'
    );
    assert.strictEqual(unauthWalletRes.status, 401, 'Expected 401 for unauthorized pay-wallet');
    assert.strictEqual(unauthWalletRes.body.success, false);
    console.log('✓ Passed: Unauthorized pay-wallet rejected with 401.\n');

    console.log('[10] Testing 403 on non-renter pay-wallet...');
    const nonRenterWalletRes = await makeRequest(
      `/api/bookings/${expensiveBooking._id}/pay-wallet`,
      'POST',
      ownerAuth // Owner is not renter
    );
    assert.strictEqual(nonRenterWalletRes.status, 403, 'Expected 403 for non-renter pay-wallet');
    assert.strictEqual(nonRenterWalletRes.body.success, false);
    console.log('✓ Passed: Non-renter pay-wallet forbidden with 403.\n');

    console.log('[11] Testing 400 on pay-wallet when booking is not confirmed (pending)...');
    const pendingWalletRes = await makeRequest(
      `/api/bookings/${expensiveBooking._id}/pay-wallet`,
      'POST',
      renterAuth
    );
    assert.strictEqual(pendingWalletRes.status, 400, 'Expected 400 for pending booking pay-wallet');
    assert.strictEqual(pendingWalletRes.body.success, false);
    console.log('✓ Passed: Pay-wallet on pending booking rejected with 400.\n');

    // Confirm expensiveBooking
    expensiveBooking.status = 'confirmed';
    await expensiveBooking.save();

    console.log('[12] Testing 400 on pay-wallet when totalAmount > ₹20,000 (Insufficient wallet balance)...');
    const insufficientWalletRes = await makeRequest(
      `/api/bookings/${expensiveBooking._id}/pay-wallet`,
      'POST',
      renterAuth
    );
    assert.strictEqual(insufficientWalletRes.status, 400, 'Expected 400 for insufficient wallet balance');
    assert.strictEqual(insufficientWalletRes.body.success, false);
    assert.strictEqual(insufficientWalletRes.body.message, 'Insufficient wallet balance for this booking');
    console.log('✓ Passed: Booking > ₹20,000 correctly rejected with 400 "Insufficient wallet balance for this booking".\n');

    // Create an affordable confirmed booking with totalAmount <= 20000 (e.g. ₹4500)
    const affordableBooking = mockBooking({
      product: product._id,
      renter: renter._id,
      owner: owner._id,
      startDate: new Date('2026-11-20'),
      endDate: new Date('2026-11-21'),
      totalDays: 1,
      pricing: {
        rentalFee: 3000,
        platformFee: 450,
        securityDeposit: 1050,
        totalAmount: 4500,
      },
      status: 'confirmed',
      paymentStatus: 'unpaid',
    });

    console.log('[13] Testing 200 on valid pay-wallet (totalAmount: ₹4,500 <= ₹20,000)...');
    const validWalletRes = await makeRequest(
      `/api/bookings/${affordableBooking._id}/pay-wallet`,
      'POST',
      renterAuth
    );
    assert.strictEqual(validWalletRes.status, 200, 'Expected 200 on successful wallet payment');
    assert.strictEqual(validWalletRes.body.success, true);
    assert.strictEqual(validWalletRes.body.message, 'Payment successful using Grabit Wallet');
    assert.strictEqual(validWalletRes.body.data.status, 'active');
    assert.strictEqual(validWalletRes.body.data.paymentStatus, 'paid');

    const updatedAffordable = bookingStore.get(affordableBooking._id.toString());
    assert.strictEqual(updatedAffordable.status, 'active');
    assert.strictEqual(updatedAffordable.paymentStatus, 'paid');
    console.log('✓ Passed: Valid wallet payment activated booking and updated paymentStatus to "paid".\n');

    console.log('[14] Testing 400 on pay-wallet when booking is already paid...');
    const alreadyPaidWalletRes = await makeRequest(
      `/api/bookings/${affordableBooking._id}/pay-wallet`,
      'POST',
      renterAuth
    );
    assert.strictEqual(alreadyPaidWalletRes.status, 400, 'Expected 400 on already-paid booking pay-wallet');
    assert.strictEqual(alreadyPaidWalletRes.body.success, false);
    console.log('✓ Passed: Pay-wallet on already-paid booking rejected with 400.\n');

    console.log('======================================================');
    console.log('ALL PAYMENTS & WALLET INTEGRATION TESTS PASSED (14/14)!');
    console.log('======================================================\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runPaymentTests().catch((err) => {
  console.error('Payment Test Suite Failed:', err);
  process.exit(1);
});
