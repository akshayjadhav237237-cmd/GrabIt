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

async function runNotificationTests() {
  console.log('--- STARTING NOTIFICATIONS & CHAT INTEGRATION TESTS ---\n');

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
    const populates = [];

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
        populates.push({ path, select });
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

  Message.find = function (filter) {
    let sortOrder = 1;
    let populatePath = null;

    const run = async () => {
      let list = messageStore.filter((m) => {
        if (filter.booking) {
          const mBId = m.booking ? (m.booking._id ? m.booking._id.toString() : m.booking.toString()) : '';
          const fBId = filter.booking ? (filter.booking._id ? filter.booking._id.toString() : filter.booking.toString()) : '';
          if (mBId !== fBId) return false;
        }
        return true;
      });

      list.sort((a, b) => (new Date(a.createdAt) - new Date(b.createdAt)) * sortOrder);

      return list.map((item) => {
        const clone = { ...item };
        if (populatePath === 'sender') {
          clone.sender = sanitizeUser(clone.sender);
        }
        return clone;
      });
    };

    const queryObj = {
      populate(path, select) {
        populatePath = path;
        return queryObj;
      },
      sort(s) {
        if (s && s.createdAt === -1) sortOrder = -1;
        else sortOrder = 1;
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
      firebaseUid: 'owner-notif-1',
      displayName: 'Alice Owner',
      pushToken: 'ExponentPushToken[owner_mock_token]',
    });
    const renter = mockUser({
      firebaseUid: 'renter-notif-1',
      displayName: 'Bob Renter',
      pushToken: 'ExponentPushToken[renter_mock_token]',
    });
    const thirdParty = mockUser({
      firebaseUid: 'third-notif-1',
      displayName: 'Charlie Thirdparty',
    });

    const ownerAuth = { Authorization: 'Bearer mock-token-owner-notif-1' };
    const renterAuth = { Authorization: 'Bearer mock-token-renter-notif-1' };
    const thirdAuth = { Authorization: 'Bearer mock-token-third-notif-1' };

    // Seed product
    const product = mockProduct({
      owner: owner._id,
      title: 'Sony Alpha A7 IV Camera',
    });

    // Seed bookings
    const booking1 = mockBooking({
      product: product._id,
      renter: renter._id,
      owner: owner._id,
      startDate: new Date('2026-11-01'),
      endDate: new Date('2026-11-04'),
      totalDays: 3,
      pricing: {
        rentalFee: 450,
        platformFee: 67.5,
        securityDeposit: 200,
        damageProtectionFee: 0,
        totalAmount: 717.5,
      },
      status: 'pending',
      paymentStatus: 'unpaid',
    });

    const booking2 = mockBooking({
      product: product._id,
      renter: renter._id,
      owner: owner._id,
      startDate: new Date('2026-11-10'),
      endDate: new Date('2026-11-12'),
      totalDays: 2,
      pricing: {
        rentalFee: 300,
        platformFee: 45,
        securityDeposit: 200,
        damageProtectionFee: 0,
        totalAmount: 545,
      },
      status: 'pending',
      paymentStatus: 'unpaid',
    });

    // ----------------------------------------------------
    // PART 1: User Push Token Endpoint
    // ----------------------------------------------------
    console.log('[1] Testing unauthorized PATCH /api/users/push-token (401)...');
    const unauthPushRes = await makeRequest('/api/users/push-token', 'PATCH', {}, { pushToken: 'ExponentPushToken[abc]' });
    assert.strictEqual(unauthPushRes.status, 401);
    assert.strictEqual(unauthPushRes.body.success, false);
    console.log('✓ Passed: Unauthorized update rejected with 401.\n');

    console.log('[2] Testing invalid body on PATCH /api/users/push-token (400)...');
    const invalidPushRes = await makeRequest('/api/users/push-token', 'PATCH', renterAuth, { pushToken: 12345 });
    assert.strictEqual(invalidPushRes.status, 400);
    assert.strictEqual(invalidPushRes.body.success, false);
    console.log('✓ Passed: Non-string push token rejected with 400.\n');

    console.log('[3] Testing valid PATCH /api/users/push-token (200)...');
    const newRenterToken = 'ExponentPushToken[updated_renter_push_token_999]';
    const validPushRes = await makeRequest(
      '/api/users/push-token',
      'PATCH',
      renterAuth,
      { pushToken: newRenterToken }
    );
    assert.strictEqual(validPushRes.status, 200);
    assert.strictEqual(validPushRes.body.success, true);
    assert.strictEqual(validPushRes.body.message, 'Push token updated');

    const updatedRenter = userStore.get(renter.firebaseUid);
    assert.strictEqual(updatedRenter.pushToken, newRenterToken);
    console.log('✓ Passed: Push token updated and verified in User store.\n');

    // ----------------------------------------------------
    // PART 2: Notification Triggers on Status Update & Payment
    // ----------------------------------------------------
    capturedNotifications.length = 0; // Clear captured

    console.log('[4] Testing notification trigger when booking is confirmed...');
    const confirmRes = await makeRequest(
      `/api/bookings/${booking1._id}/status`,
      'PATCH',
      ownerAuth,
      { status: 'confirmed' }
    );
    assert.strictEqual(confirmRes.status, 200);
    assert.strictEqual(capturedNotifications.length, 1, 'Expected 1 notification captured');
    const confirmNotif = capturedNotifications[0];
    assert.strictEqual(confirmNotif.pushToken, newRenterToken, 'Notification should target renter pushToken');
    assert.strictEqual(confirmNotif.title, 'Booking Confirmed');
    assert.strictEqual(
      confirmNotif.body,
      'Your booking for Sony Alpha A7 IV Camera has been confirmed! Complete payment to activate.'
    );
    assert.strictEqual(confirmNotif.data.bookingId, booking1._id.toString());
    assert.strictEqual(confirmNotif.data.type, 'booking_confirmed');
    console.log('✓ Passed: Confirmation notification delivered to renter with exact prompt format.\n');

    console.log('[5] Testing notification trigger when booking is cancelled (declined)...');
    const cancelRes = await makeRequest(
      `/api/bookings/${booking2._id}/status`,
      'PATCH',
      ownerAuth,
      { status: 'cancelled', cancellationReason: 'Dates unavailable' }
    );
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(capturedNotifications.length, 2, 'Expected 2 total notifications');
    const cancelNotif = capturedNotifications[1];
    assert.strictEqual(cancelNotif.pushToken, newRenterToken);
    assert.strictEqual(cancelNotif.title, 'Booking Declined');
    assert.strictEqual(
      cancelNotif.body,
      'Your booking request for Sony Alpha A7 IV Camera was declined.'
    );
    assert.strictEqual(cancelNotif.data.bookingId, booking2._id.toString());
    assert.strictEqual(cancelNotif.data.type, 'booking_cancelled');
    console.log('✓ Passed: Cancellation notification delivered to renter with exact prompt format.\n');

    console.log('[6] Testing notification trigger when payment is verified...');
    const orderId = 'order_test_notif_123';
    const paymentId = 'pay_test_notif_456';
    const validSignature = crypto
      .createHmac('sha256', key_secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const paymentRes = await makeRequest(
      `/api/bookings/${booking1._id}/verify-payment`,
      'POST',
      renterAuth,
      {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      }
    );
    assert.strictEqual(paymentRes.status, 200);
    assert.strictEqual(capturedNotifications.length, 3, 'Expected 3 total notifications');
    const paymentNotif = capturedNotifications[2];
    assert.strictEqual(paymentNotif.pushToken, owner.pushToken, 'Notification should target owner pushToken');
    assert.strictEqual(paymentNotif.title, 'Payment Received');
    assert.strictEqual(
      paymentNotif.body,
      'Payment received! Booking for Sony Alpha A7 IV Camera is now active.'
    );
    assert.strictEqual(paymentNotif.data.bookingId, booking1._id.toString());
    assert.strictEqual(paymentNotif.data.type, 'payment_verified');
    console.log('✓ Passed: Payment notification delivered to owner with exact prompt format.\n');

    // ----------------------------------------------------
    // PART 3: Chat Backend (Messages POST & GET)
    // ----------------------------------------------------
    console.log('[7] Testing unauthorized POST /api/bookings/:id/messages (401)...');
    const unauthMsgRes = await makeRequest(
      `/api/bookings/${booking1._id}/messages`,
      'POST',
      {},
      { text: 'Hello' }
    );
    assert.strictEqual(unauthMsgRes.status, 401);
    console.log('✓ Passed: Unauthorized message creation rejected with 401.\n');

    console.log('[8] Testing 403 Forbidden for non-parties on POST & GET messages...');
    const thirdPartyPostRes = await makeRequest(
      `/api/bookings/${booking1._id}/messages`,
      'POST',
      thirdAuth,
      { text: 'Can I join this rental?' }
    );
    assert.strictEqual(thirdPartyPostRes.status, 403);
    assert.strictEqual(thirdPartyPostRes.body.message, 'Forbidden: You do not have permission to send messages for this booking');

    const thirdPartyGetRes = await makeRequest(
      `/api/bookings/${booking1._id}/messages`,
      'GET',
      thirdAuth
    );
    assert.strictEqual(thirdPartyGetRes.status, 403);
    assert.strictEqual(thirdPartyGetRes.body.message, 'Forbidden: You do not have permission to view messages for this booking');
    console.log('✓ Passed: Third party message access forbidden with 403.\n');

    console.log('[9] Testing 400 Bad Request on empty message text...');
    const emptyMsgRes1 = await makeRequest(
      `/api/bookings/${booking1._id}/messages`,
      'POST',
      renterAuth,
      { text: '' }
    );
    assert.strictEqual(emptyMsgRes1.status, 400);
    assert.strictEqual(emptyMsgRes1.body.message, 'Message text is required');

    const emptyMsgRes2 = await makeRequest(
      `/api/bookings/${booking1._id}/messages`,
      'POST',
      renterAuth,
      { text: '   ' }
    );
    assert.strictEqual(emptyMsgRes2.status, 400);
    assert.strictEqual(emptyMsgRes2.body.message, 'Message text is required');
    console.log('✓ Passed: Empty message text rejected with 400.\n');

    console.log('[10] Testing 201 on valid message from renter to owner + notification trigger...');
    const renterMsgRes = await makeRequest(
      `/api/bookings/${booking1._id}/messages`,
      'POST',
      renterAuth,
      { text: 'Hi Alice, what time should I pick up the camera?' }
    );
    assert.strictEqual(renterMsgRes.status, 201);
    assert.strictEqual(renterMsgRes.body.success, true);
    assert.strictEqual(renterMsgRes.body.data.text, 'Hi Alice, what time should I pick up the camera?');
    assert.strictEqual(renterMsgRes.body.data.sender.displayName, 'Bob Renter');

    // Verify chat push notification sent to owner
    assert.strictEqual(capturedNotifications.length, 4);
    const chatNotif1 = capturedNotifications[3];
    assert.strictEqual(chatNotif1.pushToken, owner.pushToken);
    assert.strictEqual(chatNotif1.title, 'New message from Bob Renter');
    assert.strictEqual(
      chatNotif1.body,
      'New message from Bob Renter: Hi Alice, what time should I pick up the camera?'
    );
    assert.strictEqual(chatNotif1.data.type, 'chat_message');
    console.log('✓ Passed: Renter message posted and notification triggered to owner.\n');

    console.log('[11] Testing 201 on reply message from owner to renter + notification trigger...');
    const ownerMsgRes = await makeRequest(
      `/api/bookings/${booking1._id}/messages`,
      'POST',
      ownerAuth,
      { text: 'Pickup is available anytime after 10 AM!' }
    );
    assert.strictEqual(ownerMsgRes.status, 201);
    assert.strictEqual(ownerMsgRes.body.success, true);
    assert.strictEqual(ownerMsgRes.body.data.text, 'Pickup is available anytime after 10 AM!');

    // Verify chat push notification sent to renter
    assert.strictEqual(capturedNotifications.length, 5);
    const chatNotif2 = capturedNotifications[4];
    assert.strictEqual(chatNotif2.pushToken, newRenterToken);
    assert.strictEqual(chatNotif2.title, 'New message from Alice Owner');
    assert.strictEqual(
      chatNotif2.body,
      'New message from Alice Owner: Pickup is available anytime after 10 AM!'
    );
    console.log('✓ Passed: Owner reply message posted and notification triggered to renter.\n');

    console.log('[12] Testing 200 on GET /api/bookings/:id/messages (chronological ordering)...');
    const getMessagesRes = await makeRequest(
      `/api/bookings/${booking1._id}/messages`,
      'GET',
      renterAuth
    );
    assert.strictEqual(getMessagesRes.status, 200);
    assert.strictEqual(getMessagesRes.body.success, true);
    assert.strictEqual(getMessagesRes.body.data.length, 2);
    assert.strictEqual(getMessagesRes.body.data[0].text, 'Hi Alice, what time should I pick up the camera?');
    assert.strictEqual(getMessagesRes.body.data[1].text, 'Pickup is available anytime after 10 AM!');
    assert.strictEqual(getMessagesRes.body.data[0].sender.displayName, 'Bob Renter');
    assert.strictEqual(getMessagesRes.body.data[1].sender.displayName, 'Alice Owner');
    console.log('✓ Passed: GET /messages returns all messages in chronological order with populated senders.\n');

    console.log('===========================================================');
    console.log('ALL NOTIFICATIONS & CHAT INTEGRATION TESTS PASSED (12/12)!');
    console.log('===========================================================\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runNotificationTests().catch((err) => {
  console.error('Notification Test Suite Failed:', err);
  process.exit(1);
});
