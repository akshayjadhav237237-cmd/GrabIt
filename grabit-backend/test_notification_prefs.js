require('dotenv').config();
process.env.NODE_ENV = 'test';

const http = require('http');
const assert = require('assert');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { Booking, Product, User, Message } = require('./src/models');
const notificationService = require('./src/services/notification.service');
const { key_secret } = require('./src/config/razorpay');
const app = require('./server');

async function runNotificationPrefsTests() {
  console.log('========================================================');
  console.log('STARTING MODULE 8 — NOTIFICATION PREFERENCES TEST SUITE');
  console.log('========================================================\n');

  // Spy / capture notification service calls
  const capturedNotifications = [];
  notificationService.sendPushNotification = async (pushToken, payload) => {
    capturedNotifications.push({ pushToken, ...payload });
    return true;
  };

  // In-memory mock stores
  const userStore = new Map();
  const productStore = new Map();
  const bookingStore = new Map();
  const messageStore = [];

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
      pushToken: data.pushToken !== undefined ? data.pushToken : null,
      notificationPrefs: data.notificationPrefs || {
        bookingUpdates: true,
        chatMessages: true,
      },
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
      notificationPrefs: user.notificationPrefs,
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
      cancellationReason: data.cancellationReason || '',
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

  User.findOneAndUpdate = async function (filter, update, options) {
    let user = null;
    if (filter.firebaseUid) {
      user = userStore.get(filter.firebaseUid);
    } else if (filter._id) {
      user = userStore.get(filter._id.toString());
    }
    if (!user) return null;

    if (update.pushToken !== undefined) {
      user.pushToken = update.pushToken;
    }
    user.updatedAt = new Date();
    userStore.set(user.firebaseUid, user);
    userStore.set(user._id.toString(), user);
    return user;
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
    const run = async () => {
      const doc = bookingStore.get(idStr);
      if (!doc) return null;
      const clone = { ...doc };
      clone.save = async function () {
        doc.updatedAt = new Date();
        doc.status = this.status;
        doc.paymentStatus = this.paymentStatus;
        doc.cancellationReason = this.cancellationReason;
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
        return queryObj;
      },
      then(resolve, reject) {
        return run().then(resolve, reject);
      },
    };
    return queryObj;
  };

  // Intercept Message model methods
  Message.create = async function (data) {
    const _id = new mongoose.Types.ObjectId();
    const doc = {
      _id,
      booking: data.booking,
      sender: data.sender,
      text: data.text,
      createdAt: new Date(),
      updatedAt: new Date(),
      async populate(path, select) {
        if (path === 'sender') {
          this.sender = sanitizeUser(this.sender);
        }
        return this;
      },
    };
    messageStore.push(doc);
    return doc;
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
    const aliceOwner = mockUser({
      firebaseUid: 'alice-pref-uid',
      displayName: 'Alice Owner',
      pushToken: 'ExponentPushToken[alice_token]',
      notificationPrefs: { bookingUpdates: true, chatMessages: true },
    });

    const bobRenter = mockUser({
      firebaseUid: 'bob-pref-uid',
      displayName: 'Bob Renter',
      pushToken: 'ExponentPushToken[bob_token]',
      notificationPrefs: { bookingUpdates: true, chatMessages: true },
    });

    const aliceAuth = { Authorization: 'Bearer mock-token-alice-pref-uid' };
    const bobAuth = { Authorization: 'Bearer mock-token-bob-pref-uid' };

    const product = mockProduct({
      owner: aliceOwner._id,
      title: 'Sony Cinema Camera FX3',
    });

    const booking = mockBooking({
      product: product._id,
      renter: bobRenter._id,
      owner: aliceOwner._id,
      startDate: new Date('2026-12-01'),
      endDate: new Date('2026-12-05'),
      totalDays: 4,
      pricing: {
        rentalFee: 400,
        platformFee: 60,
        securityDeposit: 200,
        damageProtectionFee: 0,
        totalAmount: 660,
      },
      status: 'pending',
      paymentStatus: 'unpaid',
    });

    // ----------------------------------------------------
    // TEST 1: Schema Default Preferences Verification
    // ----------------------------------------------------
    console.log('[1] Checking User schema notificationPrefs structure...');
    assert(User.schema.paths['notificationPrefs.bookingUpdates'], 'bookingUpdates field must exist in schema');
    assert(User.schema.paths['notificationPrefs.chatMessages'], 'chatMessages field must exist in schema');
    assert.strictEqual(User.schema.paths['notificationPrefs.bookingUpdates'].defaultValue, true);
    assert.strictEqual(User.schema.paths['notificationPrefs.chatMessages'].defaultValue, true);
    console.log('✓ Passed: User schema correctly includes notificationPrefs with defaults set to true.\n');

    // ----------------------------------------------------
    // TEST 2: PATCH /api/users/me/notification-prefs - 401 Unauthorized
    // ----------------------------------------------------
    console.log('[2] Testing unauthorized PATCH /api/users/me/notification-prefs (401)...');
    const unauthRes = await makeRequest('/api/users/me/notification-prefs', 'PATCH', {}, { bookingUpdates: false });
    assert.strictEqual(unauthRes.status, 401);
    assert.strictEqual(unauthRes.body.success, false);
    console.log('✓ Passed: Unauthorized request rejected with 401.\n');

    // ----------------------------------------------------
    // TEST 3: PATCH /api/users/me/notification-prefs - 200 Update bookingUpdates
    // ----------------------------------------------------
    console.log('[3] Testing valid PATCH /api/users/me/notification-prefs: Disable bookingUpdates...');
    const updateBob1 = await makeRequest(
      '/api/users/me/notification-prefs',
      'PATCH',
      bobAuth,
      { bookingUpdates: false }
    );
    assert.strictEqual(updateBob1.status, 200);
    assert.strictEqual(updateBob1.body.success, true);
    assert.strictEqual(updateBob1.body.message, 'Notification preferences updated');
    assert.strictEqual(updateBob1.body.data.bookingUpdates, false);
    assert.strictEqual(updateBob1.body.data.chatMessages, true);
    assert.strictEqual(bobRenter.notificationPrefs.bookingUpdates, false);
    console.log('✓ Passed: bookingUpdates set to false, response data formatted correctly.\n');

    // ----------------------------------------------------
    // TEST 4: Booking Update Push Suppressed when bookingUpdates is false
    // ----------------------------------------------------
    console.log('[4] Testing notification suppression when renter bookingUpdates is false...');
    capturedNotifications.length = 0;
    const confirmRes = await makeRequest(
      `/api/bookings/${booking._id}/status`,
      'PATCH',
      aliceAuth,
      { status: 'confirmed' }
    );
    assert.strictEqual(confirmRes.status, 200);
    assert.strictEqual(
      capturedNotifications.length,
      0,
      'Notification should be suppressed when recipient bookingUpdates === false'
    );
    console.log('✓ Passed: Booking notification successfully suppressed due to recipient preference.\n');

    // ----------------------------------------------------
    // TEST 5: Re-enable bookingUpdates -> Notification triggers
    // ----------------------------------------------------
    console.log('[5] Re-enabling bookingUpdates and testing payment notification to owner...');
    // Enable bookingUpdates for Bob
    await makeRequest('/api/users/me/notification-prefs', 'PATCH', bobAuth, { bookingUpdates: true });
    assert.strictEqual(bobRenter.notificationPrefs.bookingUpdates, true);

    // Make sure Alice owner receives payment notification when her bookingUpdates is true
    const orderId = 'order_test_pref_1';
    const paymentId = 'pay_test_pref_1';
    const validSignature = crypto
      .createHmac('sha256', key_secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    capturedNotifications.length = 0;
    const paymentRes = await makeRequest(
      `/api/bookings/${booking._id}/verify-payment`,
      'POST',
      bobAuth,
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      }
    );
    assert.strictEqual(paymentRes.status, 200);
    assert.strictEqual(capturedNotifications.length, 1, 'Owner should receive payment notification');
    assert.strictEqual(capturedNotifications[0].pushToken, aliceOwner.pushToken);
    assert.strictEqual(capturedNotifications[0].title, 'Payment Received');
    console.log('✓ Passed: Payment notification delivered when owner bookingUpdates === true.\n');

    // ----------------------------------------------------
    // TEST 6: Disable chatMessages on Owner and Verify Chat Push Suppression
    // ----------------------------------------------------
    console.log('[6] Disabling chatMessages on Alice Owner and sending message from Bob...');
    const updateAlice1 = await makeRequest(
      '/api/users/me/notification-prefs',
      'PATCH',
      aliceAuth,
      { chatMessages: false }
    );
    assert.strictEqual(updateAlice1.status, 200);
    assert.strictEqual(updateAlice1.body.data.chatMessages, false);
    assert.strictEqual(aliceOwner.notificationPrefs.chatMessages, false);

    capturedNotifications.length = 0;
    const msgRes1 = await makeRequest(
      `/api/bookings/${booking._id}/messages`,
      'POST',
      bobAuth,
      { text: 'Hello Alice, see you at pickup!' }
    );
    assert.strictEqual(msgRes1.status, 201);
    assert.strictEqual(
      capturedNotifications.length,
      0,
      'Chat notification should be suppressed when recipient chatMessages === false'
    );
    console.log('✓ Passed: Chat push notification suppressed when recipient chatMessages === false.\n');

    // ----------------------------------------------------
    // TEST 7: Re-enable chatMessages on Alice Owner and Verify Chat Push Delivery
    // ----------------------------------------------------
    console.log('[7] Re-enabling chatMessages on Alice Owner and sending reply message...');
    await makeRequest(
      '/api/users/me/notification-prefs',
      'PATCH',
      aliceAuth,
      { chatMessages: true }
    );
    assert.strictEqual(aliceOwner.notificationPrefs.chatMessages, true);

    capturedNotifications.length = 0;
    const msgRes2 = await makeRequest(
      `/api/bookings/${booking._id}/messages`,
      'POST',
      bobAuth,
      { text: 'Are the batteries fully charged?' }
    );
    assert.strictEqual(msgRes2.status, 201);
    assert.strictEqual(capturedNotifications.length, 1, 'Chat notification should be delivered');
    assert.strictEqual(capturedNotifications[0].pushToken, aliceOwner.pushToken);
    assert.strictEqual(capturedNotifications[0].title, 'New message from Bob Renter');
    console.log('✓ Passed: Chat push notification delivered when recipient chatMessages === true.\n');

    console.log('========================================================');
    console.log('ALL NOTIFICATION PREFERENCES INTEGRATION TESTS PASSED (100% GREEN)');
    console.log('========================================================\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runNotificationPrefsTests().catch((err) => {
  console.error('Notification Preferences Test Suite Failed:', err);
  process.exit(1);
});
