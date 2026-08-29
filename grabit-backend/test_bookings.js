require('dotenv').config();
process.env.NODE_ENV = 'test';

const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');
const { Booking, Product, User } = require('./src/models');
const app = require('./server');

async function runTests() {
  console.log('--- STARTING BOOKING FLOW INTEGRATION TESTS ---\n');

  // In-memory test stores
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
      damageProtection: {
        isAvailable: data.damageProtection?.isAvailable || false,
        fee: data.damageProtection?.fee || 0,
      },
      availability: {
        isAvailable:
          data.availability?.isAvailable !== undefined ? data.availability.isAvailable : true,
        blackoutDates: data.availability?.blackoutDates || [],
      },
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
      async save() {
        this.updatedAt = new Date();
        productStore.set(this._id.toString(), this);
        return this;
      },
      async populate(path, select) {
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
      totalDays: data.totalDays,
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

  User.create = async function (data) {
    return mockUser(data);
  };

  // Intercept Product model methods
  Product.findById = function (id) {
    const idStr = id ? (id._id ? id._id.toString() : id.toString()) : '';
    let populatePath = null;

    const run = async () => {
      const doc = productStore.get(idStr);
      if (!doc) return null;
      const clone = { ...doc };
      clone.save = async function () {
        doc.updatedAt = new Date();
        Object.assign(doc, this);
        return doc;
      };
      if (populatePath === 'owner') {
        clone.owner = sanitizeUser(doc.owner);
      }
      return clone;
    };

    const queryObj = {
      populate(path) {
        populatePath = path;
        return queryObj;
      },
      then(resolve, reject) {
        return run().then(resolve, reject);
      },
    };

    return queryObj;
  };

  // Intercept Booking model methods
  Booking.create = async function (data) {
    return mockBooking(data);
  };

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

      for (const pop of populates) {
        if (pop.path === 'product') {
          const prodId = clone.product ? (clone.product._id ? clone.product._id.toString() : clone.product.toString()) : '';
          const prod = productStore.get(prodId);
          clone.product = prod ? { ...prod } : clone.product;
        } else if (pop.path === 'renter') {
          clone.renter = sanitizeUser(clone.renter);
        } else if (pop.path === 'owner') {
          clone.owner = sanitizeUser(clone.owner);
        }
      }
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

  Booking.exists = async function (filter) {
    const list = Array.from(bookingStore.values());
    const match = list.some((b) => {
      const bProdId = b.product ? (b.product._id ? b.product._id.toString() : b.product.toString()) : '';
      const fProdId = filter.product ? (filter.product._id ? filter.product._id.toString() : filter.product.toString()) : '';
      const prodMatch = (!fProdId || !bProdId || fProdId === bProdId);
      const statusMatch = (!filter.status || !filter.status.$in || filter.status.$in.includes(b.status));
      const startMatch = (!filter.startDate || !filter.startDate.$lt || new Date(b.startDate).getTime() < new Date(filter.startDate.$lt).getTime());
      const endMatch = (!filter.endDate || !filter.endDate.$gt || new Date(b.endDate).getTime() > new Date(filter.endDate.$gt).getTime());
      return prodMatch && statusMatch && startMatch && endMatch;
    });
    return match ? { _id: 'match' } : null;
  };

  Booking.find = function (filter) {
    const populates = [];
    let sortField = null;

    const run = async () => {
      let list = Array.from(bookingStore.values()).filter((b) => {
        if (filter.renter) {
          const rId = b.renter ? (b.renter._id ? b.renter._id.toString() : b.renter.toString()) : '';
          if (rId !== filter.renter.toString()) return false;
        }
        if (filter.owner) {
          const oId = b.owner ? (b.owner._id ? b.owner._id.toString() : b.owner.toString()) : '';
          if (oId !== filter.owner.toString()) return false;
        }
        return true;
      });

      if (sortField && sortField.createdAt === -1) {
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }

      return list.map((item) => {
        const clone = { ...item };
        for (const pop of populates) {
          if (pop.path === 'product') {
            const prodId = clone.product ? (clone.product._id ? clone.product._id.toString() : clone.product.toString()) : '';
            const prod = productStore.get(prodId);
            clone.product = prod ? { ...prod } : clone.product;
          } else if (pop.path === 'renter') {
            clone.renter = sanitizeUser(clone.renter);
          } else if (pop.path === 'owner') {
            clone.owner = sanitizeUser(clone.owner);
          }
        }
        return clone;
      });
    };

    const queryObj = {
      sort(s) {
        sortField = s;
        return queryObj;
      },
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

  // Start HTTP server
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
        {
          method,
          headers: reqHeaders,
        },
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
    // Setup Test Users
    const ownerUser = mockUser({
      firebaseUid: 'owner-uid-100',
      email: 'owner@grabit.com',
      displayName: 'Alice Owner',
    });

    const renterUser = mockUser({
      firebaseUid: 'renter-uid-200',
      email: 'renter@grabit.com',
      displayName: 'Bob Renter',
    });

    const thirdUser = mockUser({
      firebaseUid: 'third-uid-300',
      email: 'third@grabit.com',
      displayName: 'Charlie Thirdparty',
    });

    const ownerAuth = { Authorization: 'Bearer mock-token-owner-uid-100' };
    const renterAuth = { Authorization: 'Bearer mock-token-renter-uid-200' };
    const thirdAuth = { Authorization: 'Bearer mock-token-third-uid-300' };

    // Setup Test Product
    const testProduct = mockProduct({
      owner: ownerUser._id,
      title: 'Sony Alpha A7 IV Mirrorless Camera',
      category: 'Electronics',
      rentalPrice: {
        perDay: 150,
        perWeek: 900,
        securityDeposit: 300,
      },
      damageProtection: {
        isAvailable: true,
        fee: 35,
      },
      availability: {
        isAvailable: true,
        blackoutDates: [
          {
            startDate: new Date('2026-09-15T00:00:00.000Z'),
            endDate: new Date('2026-09-20T23:59:59.999Z'),
            reason: 'Owner vacation',
          },
        ],
      },
    });

    // Setup Unavailable Product
    const unavailableProduct = mockProduct({
      owner: ownerUser._id,
      title: 'Unavailable Drone',
      rentalPrice: { perDay: 50, securityDeposit: 100 },
      availability: { isAvailable: false },
    });

    console.log('Test Setup Complete: Users and Products seeded.\n');

    // ----------------------------------------------------
    // Test 1: 400 on self-booking
    // ----------------------------------------------------
    console.log('[1] Testing 400 on self-booking...');
    const selfBookingRes = await makeRequest(
      '/api/bookings',
      'POST',
      ownerAuth,
      {
        productId: testProduct._id.toString(),
        startDate: '2026-10-01T10:00:00.000Z',
        endDate: '2026-10-05T10:00:00.000Z',
      }
    );
    assert.strictEqual(selfBookingRes.status, 400, 'Expected 400 for self-booking');
    assert.strictEqual(selfBookingRes.body.success, false);
    assert.strictEqual(selfBookingRes.body.message, 'You cannot book your own product');
    console.log('✓ Passed: Self-booking prevented with 400.\n');

    // ----------------------------------------------------
    // Test 2: 400 on invalid date range (endDate <= startDate)
    // ----------------------------------------------------
    console.log('[2] Testing 400 on invalid date range (endDate <= startDate)...');
    const invalidDateRes1 = await makeRequest(
      '/api/bookings',
      'POST',
      renterAuth,
      {
        productId: testProduct._id.toString(),
        startDate: '2026-10-05T10:00:00.000Z',
        endDate: '2026-10-02T10:00:00.000Z', // End before start
      }
    );
    assert.strictEqual(invalidDateRes1.status, 400, 'Expected 400 for end before start');
    assert.strictEqual(invalidDateRes1.body.success, false);
    assert.strictEqual(invalidDateRes1.body.message, 'End date must be strictly after start date');

    const invalidDateRes2 = await makeRequest(
      '/api/bookings',
      'POST',
      renterAuth,
      {
        productId: testProduct._id.toString(),
        startDate: '2026-10-05T10:00:00.000Z',
        endDate: '2026-10-05T10:00:00.000Z', // End equal to start
      }
    );
    assert.strictEqual(invalidDateRes2.status, 400, 'Expected 400 for end equal to start');
    assert.strictEqual(invalidDateRes2.body.message, 'End date must be strictly after start date');
    console.log('✓ Passed: Invalid date ranges rejected with 400.\n');

    // ----------------------------------------------------
    // Test 3: 400 on blackout date overlap
    // ----------------------------------------------------
    console.log('[3] Testing 400 on blackout date overlap...');
    // Blackout is 2026-09-15 to 2026-09-20
    const blackoutRes = await makeRequest(
      '/api/bookings',
      'POST',
      renterAuth,
      {
        productId: testProduct._id.toString(),
        startDate: '2026-09-18T00:00:00.000Z',
        endDate: '2026-09-25T00:00:00.000Z',
      }
    );
    assert.strictEqual(blackoutRes.status, 400, 'Expected 400 for blackout date overlap');
    assert.strictEqual(blackoutRes.body.success, false);
    assert.strictEqual(blackoutRes.body.message, 'Selected dates overlap with product blackout dates');
    console.log('✓ Passed: Blackout date overlap rejected with 400.\n');

    // ----------------------------------------------------
    // Additional Test: 400 on unavailable product & 404 on missing product
    // ----------------------------------------------------
    console.log('[Edge Cases] Testing unavailable and missing product...');
    const unavailRes = await makeRequest(
      '/api/bookings',
      'POST',
      renterAuth,
      {
        productId: unavailableProduct._id.toString(),
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-03T00:00:00.000Z',
      }
    );
    assert.strictEqual(unavailRes.status, 400);
    assert.strictEqual(unavailRes.body.message, 'Product is currently not available for rent');

    const missingRes = await makeRequest(
      '/api/bookings',
      'POST',
      renterAuth,
      {
        productId: new mongoose.Types.ObjectId().toString(),
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-03T00:00:00.000Z',
      }
    );
    assert.strictEqual(missingRes.status, 404);
    assert.strictEqual(missingRes.body.message, 'Product not found');
    console.log('✓ Passed: Product availability & existence validated properly.\n');

    // ----------------------------------------------------
    // Test 4: 201 on valid booking request with verified pricing calculations
    // ----------------------------------------------------
    console.log('[4] Testing 201 on valid booking request with verified pricing calculations...');
    // Dates: 4 days (Oct 1 to Oct 5)
    // perDay = 150 -> rentalFee = 150 * 4 = 600
    // platformFee = Math.round(600 * 0.15 * 100) / 100 = 90
    // securityDeposit = 300
    // damageProtectionFee = 35 (damageProtectionOpted: true)
    // totalAmount = 600 + 90 + 300 + 35 = 1025
    const createRes = await makeRequest(
      '/api/bookings',
      'POST',
      renterAuth,
      {
        productId: testProduct._id.toString(),
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-05T00:00:00.000Z',
        damageProtectionOpted: true,
      }
    );
    assert.strictEqual(createRes.status, 201, 'Expected 201 Created');
    assert.strictEqual(createRes.body.success, true);
    const createdBooking = createRes.body.data;
    assert.ok(createdBooking._id, 'Booking should have an _id');
    assert.strictEqual(createdBooking.totalDays, 4);
    assert.strictEqual(createdBooking.pricing.rentalFee, 600);
    assert.strictEqual(createdBooking.pricing.platformFee, 90);
    assert.strictEqual(createdBooking.pricing.securityDeposit, 300);
    assert.strictEqual(createdBooking.pricing.damageProtectionFee, 35);
    assert.strictEqual(createdBooking.pricing.totalAmount, 1025);
    assert.strictEqual(createdBooking.damageProtectionOpted, true);
    assert.strictEqual(createdBooking.status, 'confirmed');
    assert.strictEqual(createdBooking.paymentStatus, 'unpaid');
    // Verify populated fields
    assert.strictEqual(createdBooking.product.title, testProduct.title);
    assert.strictEqual(createdBooking.renter.displayName, renterUser.displayName);
    assert.strictEqual(createdBooking.owner.displayName, ownerUser.displayName);
    console.log('✓ Passed: Instant booking created with status "confirmed", verified pricing & populated parties.\n');

    // ----------------------------------------------------
    // Test 4b: Double-booking protection (400 on overlapping dates)
    // ----------------------------------------------------
    console.log('[4b] Testing double-booking protection on overlapping date range...');
    const doubleBookRes = await makeRequest(
      '/api/bookings',
      'POST',
      thirdAuth,
      {
        productId: testProduct._id.toString(),
        startDate: '2026-10-02T00:00:00.000Z',
        endDate: '2026-10-06T00:00:00.000Z',
      }
    );
    assert.strictEqual(doubleBookRes.status, 400);
    assert.strictEqual(doubleBookRes.body.success, false);
    assert.strictEqual(
      doubleBookRes.body.message,
      'Selected dates overlap with an existing booking for this product'
    );
    console.log('✓ Passed: Double-booking correctly rejected with 400 Bad Request.\n');

    // ----------------------------------------------------
    // Test 4c: Flat Damage Protection Fee Verification (5-day booking with ₹25 fee -> ₹25, not ₹125)
    // ----------------------------------------------------
    console.log('[4c] Testing 5-day booking with ₹25 damage protection fee -> flat ₹25 (not ₹125)...');
    const flatFeeProduct = mockProduct({
      owner: ownerUser._id,
      title: 'Drone 4K Pro Professional',
      rentalPrice: { perDay: 100, securityDeposit: 200 },
      damageProtection: { isAvailable: true, fee: 25 },
    });

    const flatFeeBookingRes = await makeRequest(
      '/api/bookings',
      'POST',
      thirdAuth,
      {
        productId: flatFeeProduct._id.toString(),
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2026-11-06T00:00:00.000Z', // 5 days
        damageProtectionOpted: true,
      }
    );
    assert.strictEqual(flatFeeBookingRes.status, 201, 'Expected 201 Created');
    const flatBooking = flatFeeBookingRes.body.data;
    assert.strictEqual(flatBooking.totalDays, 5, 'Expected totalDays to be 5');
    assert.strictEqual(flatBooking.pricing.rentalFee, 500, 'Expected rentalFee to be 100 * 5 = 500');
    assert.strictEqual(flatBooking.pricing.platformFee, 75, 'Expected platformFee to be 500 * 0.15 = 75');
    assert.strictEqual(flatBooking.pricing.securityDeposit, 200, 'Expected securityDeposit to be 200');
    assert.strictEqual(flatBooking.pricing.damageProtectionFee, 25, 'Damage protection fee MUST be flat ₹25, NOT ₹125 (per-day)');
    assert.notStrictEqual(flatBooking.pricing.damageProtectionFee, 125, 'Damage protection fee MUST NOT be multiplied by days');
    assert.strictEqual(flatBooking.pricing.totalAmount, 800, 'Expected totalAmount = 500 + 75 + 200 + 25 = 800');
    console.log('✓ Passed: 5-day booking with ₹25 damage protection fee strictly charged flat ₹25 (totalAmount: ₹800, not multiplied by 5 days).\n');

    // Create a second booking where Bob is the owner and Alice is the renter
    const bobProduct = mockProduct({
      owner: renterUser._id,
      title: 'Bose Noise Cancelling Headphones',
      rentalPrice: { perDay: 50, securityDeposit: 100 },
    });

    const createRes2 = await makeRequest(
      '/api/bookings',
      'POST',
      ownerAuth, // Alice rents Bob's headphones
      {
        productId: bobProduct._id.toString(),
        startDate: '2026-10-10T00:00:00.000Z',
        endDate: '2026-10-12T00:00:00.000Z',
        damageProtectionOpted: false,
      }
    );
    assert.strictEqual(createRes2.status, 201);
    const secondBooking = createRes2.body.data;

    // ----------------------------------------------------
    // Test 5: 200 on GET /api/bookings/mine with split asRenter and asOwner
    // ----------------------------------------------------
    console.log('[5] Testing 200 on GET /api/bookings/mine with split asRenter and asOwner...');
    const mineRes = await makeRequest('/api/bookings/mine', 'GET', renterAuth);
    assert.strictEqual(mineRes.status, 200);
    assert.strictEqual(mineRes.body.success, true);
    assert.ok(mineRes.body.data.asRenter, 'Expected asRenter array');
    assert.ok(mineRes.body.data.asOwner, 'Expected asOwner array');

    // Bob is renter for createdBooking (camera)
    assert.strictEqual(mineRes.body.data.asRenter.length, 1);
    assert.strictEqual(mineRes.body.data.asRenter[0]._id.toString(), createdBooking._id.toString());
    assert.strictEqual(mineRes.body.data.asRenter[0].owner.displayName, ownerUser.displayName);

    // Bob is owner for secondBooking (headphones)
    assert.strictEqual(mineRes.body.data.asOwner.length, 1);
    assert.strictEqual(mineRes.body.data.asOwner[0]._id.toString(), secondBooking._id.toString());
    assert.strictEqual(mineRes.body.data.asOwner[0].renter.displayName, ownerUser.displayName);
    console.log('✓ Passed: GET /api/bookings/mine returns split asRenter and asOwner.\n');

    // ----------------------------------------------------
    // Test 6: 403 on third party updating booking status
    // ----------------------------------------------------
    console.log('[6] Testing 403 on third party updating booking status...');
    const thirdPartyUpdateRes = await makeRequest(
      `/api/bookings/${createdBooking._id}/status`,
      'PATCH',
      thirdAuth, // Charlie is third party
      { status: 'cancelled', reason: 'Attempt unauthorized cancel' }
    );
    assert.strictEqual(thirdPartyUpdateRes.status, 403, 'Expected 403 for third party status update');
    assert.strictEqual(thirdPartyUpdateRes.body.success, false);
    console.log('✓ Passed: Third party status update forbidden with 403.\n');

    // ----------------------------------------------------
    // Test 7: 400 on cancelling without reason
    // ----------------------------------------------------
    console.log('[7] Testing 400 on cancelling without reason...');
    const cancelNoReasonRes = await makeRequest(
      `/api/bookings/${createdBooking._id}/status`,
      'PATCH',
      ownerAuth,
      { status: 'cancelled' }
    );
    assert.strictEqual(cancelNoReasonRes.status, 400);
    assert.strictEqual(cancelNoReasonRes.body.success, false);
    console.log('✓ Passed: Cancelling without reason rejected with 400.\n');

    // ----------------------------------------------------
    // Test 8: 200 on owner cancelling with reason
    // ----------------------------------------------------
    console.log('[8] Testing 200 on owner cancelling with reason...');
    const cancelWithReasonRes = await makeRequest(
      `/api/bookings/${secondBooking._id}/status`,
      'PATCH',
      renterAuth, // Bob is owner of secondBooking
      { status: 'cancelled', reason: 'Equipment maintenance required' }
    );
    assert.strictEqual(cancelWithReasonRes.status, 200);
    assert.strictEqual(cancelWithReasonRes.body.success, true);
    assert.strictEqual(cancelWithReasonRes.body.data.status, 'cancelled');
    assert.strictEqual(cancelWithReasonRes.body.data.cancellationReason, 'Equipment maintenance required');
    console.log('✓ Passed: Cancellation with reason succeeded with 200.\n');

    // ----------------------------------------------------
    // Test 9: Access control on GET /api/bookings/:id
    // ----------------------------------------------------
    console.log('[9] Testing access control on GET /api/bookings/:id...');
    // Charlie (third party) attempts to view createdBooking
    const thirdPartyGetRes = await makeRequest(
      `/api/bookings/${createdBooking._id}`,
      'GET',
      thirdAuth
    );
    assert.strictEqual(thirdPartyGetRes.status, 403);
    assert.strictEqual(thirdPartyGetRes.body.success, false);
    assert.strictEqual(
      thirdPartyGetRes.body.message,
      'Forbidden: You do not have permission to view this booking'
    );

    // Renter views createdBooking
    const renterGetRes = await makeRequest(
      `/api/bookings/${createdBooking._id}`,
      'GET',
      renterAuth
    );
    assert.strictEqual(renterGetRes.status, 200);
    assert.strictEqual(renterGetRes.body.success, true);
    assert.strictEqual(renterGetRes.body.data._id.toString(), createdBooking._id.toString());
    assert.strictEqual(renterGetRes.body.data.product.title, testProduct.title);

    // Owner views createdBooking
    const ownerGetRes = await makeRequest(
      `/api/bookings/${createdBooking._id}`,
      'GET',
      ownerAuth
    );
    assert.strictEqual(ownerGetRes.status, 200);
    assert.strictEqual(ownerGetRes.body.success, true);
    assert.strictEqual(ownerGetRes.body.data._id.toString(), createdBooking._id.toString());
    console.log('✓ Passed: Access control on GET /api/bookings/:id enforced (403 for third party, 200 for renter & owner).\n');

    console.log('====================================================');
    console.log('ALL BOOKING FLOW INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
