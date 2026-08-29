require('dotenv').config();
process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAILS = 'admin@grabit.com,test@grabit.com';

const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');
const { Product, User, Booking, Review } = require('./src/models');
const app = require('./server');

async function runTests() {
  console.log('========================================================');
  console.log('STARTING INTEGRATION TESTS FOR MODULES 1, 2, 3, 4, AND 5');
  console.log('========================================================\n');

  // In-memory test stores
  const userStore = new Map();
  const productStore = new Map();
  const bookingStore = new Map();
  const reviewStore = new Map();

  function mockUser(data) {
    const _id = data._id || new mongoose.Types.ObjectId();
    const doc = {
      _id,
      firebaseUid: data.firebaseUid,
      email: data.email || `${data.firebaseUid}@grabit.com`,
      displayName: data.displayName || 'Test User',
      phoneNumber: data.phoneNumber || '+1234567890',
      avatarUrl: data.avatarUrl || 'https://example.com/avatar.jpg',
      verification: data.verification || { status: 'unverified' },
      rating: data.rating || { average: 0, count: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
      async save() {
        this.updatedAt = new Date();
        userStore.set(this.firebaseUid, this);
        userStore.set(this._id.toString(), this);
        return this;
      },
    };
    userStore.set(doc.firebaseUid, doc);
    userStore.set(doc._id.toString(), doc);
    return doc;
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
      title: data.title || 'Product Title',
      description: data.description || '',
      category: data.category || 'General',
      images: Array.isArray(data.images) ? [...data.images] : [],
      rentalPrice: {
        perDay: data.rentalPrice?.perDay ?? 25,
        perWeek: data.rentalPrice?.perWeek,
        securityDeposit: data.rentalPrice?.securityDeposit || 0,
      },
      damageProtection: data.damageProtection || { isAvailable: false, fee: 0 },
      availability: data.availability || { isAvailable: true, blackoutDates: [] },
      location: data.location || { city: 'San Francisco', address: 'Market St' },
      createdAt: data.createdAt || new Date(),
      updatedAt: new Date(),
      async save() {
        this.updatedAt = new Date();
        productStore.set(this._id.toString(), this);
        return this;
      },
    };
    productStore.set(doc._id.toString(), doc);
    return doc;
  }

  function mockBooking(data) {
    const _id = data._id || new mongoose.Types.ObjectId();
    const doc = {
      _id,
      product: data.product,
      renter: data.renter,
      owner: data.owner,
      startDate: data.startDate || new Date(),
      endDate: data.endDate || new Date(Date.now() + 86400000),
      totalDays: data.totalDays || 1,
      pricing: data.pricing || {
        rentalFee: 50,
        damageProtectionFee: 0,
        securityDeposit: 0,
        platformFee: 0,
        totalAmount: 50,
      },
      status: data.status || 'pending',
      paymentStatus: data.paymentStatus || 'unpaid',
      cancellationReason: data.cancellationReason,
      createdAt: new Date(),
      updatedAt: new Date(),
      async save() {
        this.updatedAt = new Date();
        bookingStore.set(this._id.toString(), this);
        return this;
      },
    };
    bookingStore.set(doc._id.toString(), doc);
    return doc;
  }

  function mockReview(data) {
    const _id = data._id || new mongoose.Types.ObjectId();
    const doc = {
      _id,
      booking: data.booking,
      reviewer: data.reviewer,
      reviewee: data.reviewee,
      product: data.product,
      rating: data.rating,
      comment: data.comment || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      async save() {
        this.updatedAt = new Date();
        reviewStore.set(this._id.toString(), this);
        return this;
      },
    };
    reviewStore.set(doc._id.toString(), doc);
    return doc;
  }

  // Intercept User model
  User.findOne = async function (filter) {
    if (filter.firebaseUid) return userStore.get(filter.firebaseUid) || null;
    if (filter._id) return userStore.get(filter._id.toString()) || null;
    return null;
  };
  User.findById = async function (id) {
    const idStr = id ? (id._id ? id._id.toString() : id.toString()) : '';
    return userStore.get(idStr) || null;
  };
  User.create = async function (data) {
    return mockUser(data);
  };
  User.findOneAndUpdate = async function (filter, update) {
    const user = await User.findOne(filter);
    if (!user) return null;
    if (update.pushToken !== undefined) user.pushToken = update.pushToken;
    await user.save();
    return user;
  };

  // Intercept Product model
  Product.findById = function (id) {
    const idStr = id ? (id._id ? id._id.toString() : id.toString()) : '';
    let populateField = null;
    const run = async () => {
      const doc = productStore.get(idStr);
      if (!doc) return null;
      const clone = { ...doc };
      clone.save = async function () {
        doc.updatedAt = new Date();
        Object.assign(doc, this);
        return doc;
      };
      if (populateField === 'owner') {
        clone.owner = sanitizeUser(doc.owner);
      }
      return clone;
    };
    const queryObj = {
      populate(path) {
        populateField = path;
        return queryObj;
      },
      then(resolve, reject) {
        return run().then(resolve, reject);
      },
      catch(reject) {
        return run().catch(reject);
      },
    };
    return queryObj;
  };

  Product.countDocuments = async function (filter = {}) {
    let items = Array.from(productStore.values());
    items = filterProductList(items, filter);
    return items.length;
  };

  function filterProductList(items, filter) {
    return items.filter((p) => {
      if (filter['availability.isAvailable'] && filter['availability.isAvailable'].$ne === false) {
        if (p.availability && p.availability.isAvailable === false) return false;
      }
      if (filter.category) {
        const regex = filter.category.$regex;
        if (!regex.test(p.category)) return false;
      }
      if (filter['location.city']) {
        const regex = filter['location.city'].$regex;
        if (!p.location || !regex.test(p.location.city)) return false;
      }
      if (filter['rentalPrice.perDay']) {
        const price = p.rentalPrice ? p.rentalPrice.perDay : 0;
        const cond = filter['rentalPrice.perDay'];
        if (cond.$gte !== undefined && price < cond.$gte) return false;
        if (cond.$lte !== undefined && price > cond.$lte) return false;
      }
      if (filter.$or && Array.isArray(filter.$or)) {
        const matchesOr = filter.$or.some((clause) => {
          if (clause.title && clause.title.$regex) return clause.title.$regex.test(p.title);
          if (clause.description && clause.description.$regex) return clause.description.$regex.test(p.description);
          if (clause.category && clause.category.$regex) return clause.category.$regex.test(p.category);
          return false;
        });
        if (!matchesOr) return false;
      }
      return true;
    });
  }

  Product.find = function (filter = {}) {
    let sortOpt = { createdAt: -1 };
    let skipCount = 0;
    let limitCount = 10;
    let populatePath = null;

    const queryObj = {
      sort(opt) {
        sortOpt = opt;
        return queryObj;
      },
      skip(n) {
        skipCount = n;
        return queryObj;
      },
      limit(n) {
        limitCount = n;
        return queryObj;
      },
      populate(path) {
        populatePath = path;
        return queryObj;
      },
      async exec() {
        let items = Array.from(productStore.values());
        items = filterProductList(items, filter);

        if (sortOpt) {
          if (sortOpt['rentalPrice.perDay'] === 1) {
            items.sort((a, b) => (a.rentalPrice?.perDay || 0) - (b.rentalPrice?.perDay || 0));
          } else if (sortOpt['rentalPrice.perDay'] === -1) {
            items.sort((a, b) => (b.rentalPrice?.perDay || 0) - (a.rentalPrice?.perDay || 0));
          } else if (sortOpt.createdAt === -1) {
            items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          }
        }

        const sliced = items.slice(skipCount, skipCount + limitCount);
        return sliced.map((p) => {
          const clone = { ...p };
          if (populatePath === 'owner') {
            clone.owner = sanitizeUser(p.owner);
          }
          return clone;
        });
      },
      then(resolve, reject) {
        return queryObj.exec().then(resolve, reject);
      },
    };
    return queryObj;
  };

  // Intercept Booking model
  Booking.findById = async function (id) {
    const idStr = id ? (id._id ? id._id.toString() : id.toString()) : '';
    const b = bookingStore.get(idStr);
    if (!b) return null;
    return b;
  };

  // Intercept Review model
  Review.create = async function (data) {
    return mockReview(data);
  };
  Review.findOne = async function (filter) {
    const reviews = Array.from(reviewStore.values());
    for (const r of reviews) {
      if (filter.booking && r.booking.toString() !== filter.booking.toString()) continue;
      if (filter.reviewer && r.reviewer.toString() !== filter.reviewer.toString()) continue;
      if (filter.reviewee && r.reviewee.toString() !== filter.reviewee.toString()) continue;
      return r;
    }
    return null;
  };
  Review.find = function (filter = {}) {
    let sortOpt = { createdAt: -1 };
    let skipCount = 0;
    let limitCount = 10;
    const populatePaths = [];

    const queryObj = {
      sort(opt) {
        sortOpt = opt;
        return queryObj;
      },
      skip(n) {
        skipCount = n;
        return queryObj;
      },
      limit(n) {
        limitCount = n;
        return queryObj;
      },
      populate(path, select) {
        populatePaths.push({ path, select });
        return queryObj;
      },
      async exec() {
        let reviews = Array.from(reviewStore.values());
        if (filter.reviewee) {
          reviews = reviews.filter((r) => r.reviewee.toString() === filter.reviewee.toString());
        }
        reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const sliced = reviews.slice(skipCount, skipCount + limitCount);

        return sliced.map((r) => {
          const clone = { ...r };
          for (const pop of populatePaths) {
            if (pop.path === 'reviewer') {
              clone.reviewer = sanitizeUser(r.reviewer);
            }
            if (pop.path === 'product') {
              const prod = productStore.get(r.product.toString());
              clone.product = prod ? { _id: prod._id, title: prod.title, images: prod.images } : r.product;
            }
          }
          return clone;
        });
      },
      then(resolve, reject) {
        return queryObj.exec().then(resolve, reject);
      },
    };
    return queryObj;
  };
  Review.countDocuments = async function (filter = {}) {
    let reviews = Array.from(reviewStore.values());
    if (filter.reviewee) {
      reviews = reviews.filter((r) => r.reviewee.toString() === filter.reviewee.toString());
    }
    return reviews.length;
  };

  // Start HTTP server on ephemeral port
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

      if (Buffer.isBuffer(body)) {
        payload = body;
        reqHeaders['Content-Length'] = body.length;
      } else if (body !== null && typeof body === 'object') {
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

  function buildMultipartFormData(fields = {}, fileField = null) {
    const boundary = '---------------------------' + Date.now().toString(16);
    const chunks = [];
    for (const [key, val] of Object.entries(fields)) {
      chunks.push(
        Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${key}"\r\n\r\n` +
          `${val}\r\n`
        )
      );
    }
    if (fileField) {
      const { fieldName, fileName, mimeType, fileBuffer } = fileField;
      chunks.push(
        Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\n` +
          `Content-Type: ${mimeType}\r\n\r\n`
        )
      );
      chunks.push(fileBuffer);
      chunks.push(Buffer.from('\r\n'));
    }
    chunks.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(chunks);
    return {
      contentType: `multipart/form-data; boundary=${boundary}`,
      body,
    };
  }

  try {
    // Seed Users
    const aliceUser = mockUser({
      firebaseUid: 'user-alice',
      email: 'alice@grabit.com',
      displayName: 'Alice Owner',
      phoneNumber: '+1111111111',
    });

    const bobUser = mockUser({
      firebaseUid: 'user-bob',
      email: 'bob@grabit.com',
      displayName: 'Bob Renter',
      phoneNumber: '+2222222222',
    });

    const charlieUser = mockUser({
      firebaseUid: 'user-charlie',
      email: 'charlie@grabit.com',
      displayName: 'Charlie ThirdParty',
    });

    const adminUser = mockUser({
      firebaseUid: 'user-admin',
      email: 'admin@grabit.com',
      displayName: 'System Admin',
    });

    const aliceAuth = { Authorization: 'Bearer mock-token-user-alice' };
    const bobAuth = { Authorization: 'Bearer mock-token-user-bob' };
    const charlieAuth = { Authorization: 'Bearer mock-token-user-charlie' };
    const adminAuth = { Authorization: 'Bearer mock-token-user-admin' };

    // Seed Products for Alice
    const cameraProduct = mockProduct({
      owner: aliceUser._id,
      title: 'Sony Alpha A7 Camera',
      description: 'Professional full-frame mirrorless digital camera',
      category: 'Electronics',
      rentalPrice: { perDay: 50, securityDeposit: 100 },
      location: { city: 'San Francisco' },
      createdAt: new Date(Date.now() - 300000),
    });

    const droneProduct = mockProduct({
      owner: aliceUser._id,
      title: 'DJI Mavic Drone',
      description: '4K video camera drone for aerial photography',
      category: 'Electronics',
      rentalPrice: { perDay: 100, securityDeposit: 200 },
      location: { city: 'San Francisco' },
      createdAt: new Date(Date.now() - 200000),
    });

    const tentProduct = mockProduct({
      owner: aliceUser._id,
      title: 'Camping Tent 4-Person',
      description: 'Waterproof hiking and camping tent',
      category: 'Outdoors',
      rentalPrice: { perDay: 20, securityDeposit: 30 },
      location: { city: 'Oakland' },
      createdAt: new Date(Date.now() - 100000),
    });

    const bikeProduct = mockProduct({
      owner: aliceUser._id,
      title: 'Mountain Bike',
      description: 'Trail ready 21-speed bicycle for outdoor adventures',
      category: 'Sports',
      rentalPrice: { perDay: 15, securityDeposit: 50 },
      location: { city: 'Berkeley' },
      createdAt: new Date(),
    });

    console.log('✓ Seed data initialized: Users and Products ready.\n');

    // ========================================================
    // MODULE 1: REVIEWS & RATINGS + BOOKING COMPLETION
    // ========================================================
    console.log('--- TESTING MODULE 1: REVIEWS & RATINGS ---');

    // Booking 1: Pending booking
    const pendingBooking = mockBooking({
      product: cameraProduct._id,
      renter: bobUser._id,
      owner: aliceUser._id,
      status: 'pending',
    });

    // Booking 2: Active booking
    const activeBooking = mockBooking({
      product: cameraProduct._id,
      renter: bobUser._id,
      owner: aliceUser._id,
      status: 'active',
    });

    // Test 1.1: Pending booking cannot be completed
    console.log('[1.1] Testing 400 when attempting to complete a pending booking...');
    const pendingCompleteRes = await makeRequest(
      `/api/bookings/${pendingBooking._id}/status`,
      'PATCH',
      bobAuth,
      { status: 'completed' }
    );
    assert.strictEqual(pendingCompleteRes.status, 400);
    assert.strictEqual(pendingCompleteRes.body.success, false);
    console.log('✓ 400 returned when completing non-active booking.');

    // Test 1.2: Non-participant cannot mark active booking as completed
    console.log('[1.2] Testing 403 when non-participant attempts to complete active booking...');
    const nonPartCompleteRes = await makeRequest(
      `/api/bookings/${activeBooking._id}/status`,
      'PATCH',
      charlieAuth,
      { status: 'completed' }
    );
    assert.strictEqual(nonPartCompleteRes.status, 403);
    assert.strictEqual(nonPartCompleteRes.body.success, false);
    console.log('✓ 403 Forbidden returned for non-participant.');

    // Test 1.3: Either renter or owner can mark active booking as completed
    console.log('[1.3] Testing 200 when renter marks active booking as completed...');
    const completeRes = await makeRequest(
      `/api/bookings/${activeBooking._id}/status`,
      'PATCH',
      bobAuth,
      { status: 'completed' }
    );
    assert.strictEqual(completeRes.status, 200);
    assert.strictEqual(completeRes.body.success, true);
    assert.strictEqual(completeRes.body.data.status, 'completed');
    assert.strictEqual(activeBooking.status, 'completed');
    console.log('✓ 200 OK: Booking status transitioned to completed.');

    // Test 1.4: Review rating validation (1 to 5 integer)
    console.log('[1.4] Testing 400 on invalid rating values (<1, >5, float, non-number)...');
    const invalidRating1 = await makeRequest('/api/reviews', 'POST', bobAuth, {
      bookingId: activeBooking._id.toString(),
      rating: 0,
      comment: 'Bad',
    });
    assert.strictEqual(invalidRating1.status, 400);

    const invalidRating2 = await makeRequest('/api/reviews', 'POST', bobAuth, {
      bookingId: activeBooking._id.toString(),
      rating: 6,
      comment: 'Too high',
    });
    assert.strictEqual(invalidRating2.status, 400);

    const invalidRating3 = await makeRequest('/api/reviews', 'POST', bobAuth, {
      bookingId: activeBooking._id.toString(),
      rating: 4.5,
      comment: 'Not integer',
    });
    assert.strictEqual(invalidRating3.status, 400);
    console.log('✓ 400 returned for invalid ratings.');

    // Test 1.5: Booking existence and status checks for reviews
    console.log('[1.5] Testing 404 on missing booking and 400 on non-completed booking...');
    const fakeBookingId = new mongoose.Types.ObjectId().toString();
    const missingBookingRes = await makeRequest('/api/reviews', 'POST', bobAuth, {
      bookingId: fakeBookingId,
      rating: 5,
    });
    assert.strictEqual(missingBookingRes.status, 404);

    const nonCompletedReviewRes = await makeRequest('/api/reviews', 'POST', bobAuth, {
      bookingId: pendingBooking._id.toString(),
      rating: 5,
    });
    assert.strictEqual(nonCompletedReviewRes.status, 400);
    assert.strictEqual(nonCompletedReviewRes.body.message, 'Can only review completed bookings');
    console.log('✓ 404 and 400 returned correctly for booking existence and completion status.');

    // Test 1.6: Non-participant forbidden from reviewing
    console.log('[1.6] Testing 403 when non-participant tries to review completed booking...');
    const charlieReviewRes = await makeRequest('/api/reviews', 'POST', charlieAuth, {
      bookingId: activeBooking._id.toString(),
      rating: 5,
      comment: 'I was not part of this booking',
    });
    assert.strictEqual(charlieReviewRes.status, 403);
    console.log('✓ 403 Forbidden returned for non-participant reviewer.');

    // Test 1.7: Valid review from renter (Bob) to owner (Alice) & rating recalculation
    console.log('[1.7] Testing 201 on valid review creation and rating recalculation...');
    const validReviewRes = await makeRequest('/api/reviews', 'POST', bobAuth, {
      bookingId: activeBooking._id.toString(),
      rating: 5,
      comment: 'Camera was in pristine condition, highly recommended!',
    });
    assert.strictEqual(validReviewRes.status, 201);
    assert.strictEqual(validReviewRes.body.success, true);
    assert.strictEqual(validReviewRes.body.data.rating, 5);
    assert.strictEqual(validReviewRes.body.data.reviewer.toString(), bobUser._id.toString());
    assert.strictEqual(validReviewRes.body.data.reviewee.toString(), aliceUser._id.toString());
    assert.strictEqual(aliceUser.rating.count, 1);
    assert.strictEqual(aliceUser.rating.average, 5);
    console.log('✓ 201 Created: Review saved and Alice rating recalculated to 5 (count: 1).');

    // Test 1.8: Duplicate review prevention
    console.log('[1.8] Testing 400 on duplicate review attempt by same user for same booking...');
    const duplicateRes = await makeRequest('/api/reviews', 'POST', bobAuth, {
      bookingId: activeBooking._id.toString(),
      rating: 4,
      comment: 'Reviewing again',
    });
    assert.strictEqual(duplicateRes.status, 400);
    assert.strictEqual(duplicateRes.body.message, 'You have already reviewed this booking');
    console.log('✓ 400 Duplicate review rejected as expected.');

    // Test 1.9: Owner reviews renter on same booking + second review for rating average calculation
    console.log('[1.9] Testing review by owner to renter & second review average calculation...');
    const ownerReviewRes = await makeRequest('/api/reviews', 'POST', aliceAuth, {
      bookingId: activeBooking._id.toString(),
      rating: 4,
      comment: 'Bob returned the item on time and in great condition.',
    });
    assert.strictEqual(ownerReviewRes.status, 201);
    assert.strictEqual(bobUser.rating.count, 1);
    assert.strictEqual(bobUser.rating.average, 4);

    // Create a 2nd completed booking for Alice and another review with rating 3
    const booking2 = mockBooking({
      product: droneProduct._id,
      renter: charlieUser._id,
      owner: aliceUser._id,
      status: 'completed',
    });
    const review2Res = await makeRequest('/api/reviews', 'POST', charlieAuth, {
      bookingId: booking2._id.toString(),
      rating: 3,
      comment: 'Drone battery was a bit low.',
    });
    assert.strictEqual(review2Res.status, 201);
    // Alice's ratings: (5 + 3) / 2 = 4.0
    assert.strictEqual(aliceUser.rating.count, 2);
    assert.strictEqual(aliceUser.rating.average, 4);
    console.log('✓ Alice average rating recalculated correctly to 4.0 across 2 reviews.');

    // Test 1.10: GET /api/reviews/user/:userId
    console.log('[1.10] Testing GET /api/reviews/user/:userId listing and pagination...');
    const userReviewsRes = await makeRequest(`/api/reviews/user/${aliceUser._id}`, 'GET');
    assert.strictEqual(userReviewsRes.status, 200);
    assert.strictEqual(userReviewsRes.body.success, true);
    assert.strictEqual(userReviewsRes.body.total, 2);
    assert.strictEqual(userReviewsRes.body.data.length, 2);
    assert.strictEqual(typeof userReviewsRes.body.data[0].reviewer, 'object');
    console.log('✓ GET /api/reviews/user/:userId returned populated reviews with correct pagination metadata.\n');

    // ========================================================
    // MODULE 2: USER VERIFICATION
    // ========================================================
    console.log('--- TESTING MODULE 2: USER VERIFICATION ---');

    // Test 2.1: Unauthorized POST /api/users/verify
    console.log('[2.1] Testing 401 on unauthorized POST /api/users/verify...');
    const unauthVerifyRes = await makeRequest('/api/users/verify', 'POST');
    assert.strictEqual(unauthVerifyRes.status, 401);
    console.log('✓ 401 returned for unauthorized verification request.');

    // Test 2.2: Missing file on POST /api/users/verify
    console.log('[2.2] Testing 400 when no idDocument file uploaded...');
    const noFileVerifyRes = await makeRequest('/api/users/verify', 'POST', aliceAuth);
    assert.strictEqual(noFileVerifyRes.status, 400);
    console.log('✓ 400 returned when no file is provided.');

    // Test 2.3: Valid upload of idDocument
    console.log('[2.3] Testing 200 on valid ID document upload...');
    const fakeIdFile = Buffer.from('FAKE_PNG_ID_DOCUMENT_BYTES');
    const multipartData = buildMultipartFormData({}, {
      fieldName: 'idDocument',
      fileName: 'passport.png',
      mimeType: 'image/png',
      fileBuffer: fakeIdFile,
    });
    const validVerifyRes = await makeRequest(
      '/api/users/verify',
      'POST',
      { ...aliceAuth, 'Content-Type': multipartData.contentType },
      multipartData.body
    );
    assert.strictEqual(validVerifyRes.status, 200);
    assert.strictEqual(validVerifyRes.body.success, true);
    assert.strictEqual(validVerifyRes.body.data.verification.status, 'pending');
    assert.ok(validVerifyRes.body.data.verification.idDocumentUrl.includes(`users/${aliceUser._id}/verification/`));
    assert.strictEqual(aliceUser.verification.status, 'pending');
    console.log('✓ 200 OK: ID document uploaded to S3 and user verification status set to pending.');

    // Test 2.4: Non-admin updating verify status (403 Forbidden)
    console.log('[2.4] Testing 403 Forbidden when non-admin attempts PATCH /api/users/:id/verify-status...');
    const nonAdminPatchRes = await makeRequest(
      `/api/users/${aliceUser._id}/verify-status`,
      'PATCH',
      bobAuth, // Bob is not an admin
      { status: 'verified' }
    );
    assert.strictEqual(nonAdminPatchRes.status, 403);
    assert.strictEqual(nonAdminPatchRes.body.message, 'Forbidden: Admin access required');
    console.log('✓ 403 Forbidden returned for non-admin user.');

    // Test 2.5: Admin invalid status rejection (400)
    console.log('[2.5] Testing 400 on invalid status value by admin...');
    const adminInvalidStatusRes = await makeRequest(
      `/api/users/${aliceUser._id}/verify-status`,
      'PATCH',
      adminAuth,
      { status: 'invalid_status' }
    );
    assert.strictEqual(adminInvalidStatusRes.status, 400);
    console.log('✓ 400 returned for invalid status value.');

    // Test 2.6: Admin approves verification ('verified')
    console.log('[2.6] Testing 200 on admin approving verification (verified)...');
    const adminVerifyRes = await makeRequest(
      `/api/users/${aliceUser._id}/verify-status`,
      'PATCH',
      adminAuth,
      { status: 'verified' }
    );
    assert.strictEqual(adminVerifyRes.status, 200);
    assert.strictEqual(adminVerifyRes.body.success, true);
    assert.strictEqual(adminVerifyRes.body.data.verification.status, 'verified');
    assert.ok(adminVerifyRes.body.data.verification.verifiedAt);
    assert.strictEqual(aliceUser.verification.status, 'verified');
    console.log('✓ 200 OK: Admin updated status to verified and verifiedAt timestamp was populated.');

    // Test 2.7: Admin rejects verification ('rejected')
    console.log('[2.7] Testing 200 on admin setting status to rejected...');
    const adminRejectRes = await makeRequest(
      `/api/users/${bobUser._id}/verify-status`,
      'PATCH',
      adminAuth,
      { status: 'rejected' }
    );
    assert.strictEqual(adminRejectRes.status, 200);
    assert.strictEqual(adminRejectRes.body.data.verification.status, 'rejected');
    console.log('✓ 200 OK: Admin updated status to rejected.\n');

    // ========================================================
    // MODULE 3: SEARCH & FILTERS
    // ========================================================
    console.log('--- TESTING MODULE 3: SEARCH & FILTERS ---');

    // Test 3.1: Search by text matching title, description, or category
    console.log('[3.1] Testing search query param matches title, description, and category...');
    const searchDroneRes = await makeRequest('/api/products?search=drone', 'GET');
    assert.strictEqual(searchDroneRes.status, 200);
    assert.strictEqual(searchDroneRes.body.total, 1);
    assert.strictEqual(searchDroneRes.body.data[0].title, 'DJI Mavic Drone');

    const searchDescRes = await makeRequest('/api/products?search=waterproof', 'GET');
    assert.strictEqual(searchDescRes.status, 200);
    assert.strictEqual(searchDescRes.body.total, 1);
    assert.strictEqual(searchDescRes.body.data[0].title, 'Camping Tent 4-Person');

    const searchCatRes = await makeRequest('/api/products?search=electronics', 'GET');
    assert.strictEqual(searchCatRes.status, 200);
    assert.strictEqual(searchCatRes.body.total, 2);
    console.log('✓ Search query param correctly matched title, description, and category.');

    // Test 3.2: Filter by minPrice and maxPrice on rentalPrice.perDay
    console.log('[3.2] Testing minPrice and maxPrice query params...');
    // Price range ₹30 - ₹80 should match Camera (₹50)
    const midPriceRes = await makeRequest('/api/products?minPrice=30&maxPrice=80', 'GET');
    assert.strictEqual(midPriceRes.status, 200);
    assert.strictEqual(midPriceRes.body.total, 1);
    assert.strictEqual(midPriceRes.body.data[0].title, 'Sony Alpha A7 Camera');

    // maxPrice <= 25 should match Bike (₹15) and Tent (₹20)
    const lowPriceRes = await makeRequest('/api/products?maxPrice=25', 'GET');
    assert.strictEqual(lowPriceRes.status, 200);
    assert.strictEqual(lowPriceRes.body.total, 2);

    // minPrice >= 50 should match Camera (₹50) and Drone (₹100)
    const highPriceRes = await makeRequest('/api/products?minPrice=50', 'GET');
    assert.strictEqual(highPriceRes.status, 200);
    assert.strictEqual(highPriceRes.body.total, 2);
    console.log('✓ minPrice and maxPrice correctly filtered products by daily rental price.');

    // Test 3.3: Sort parameter
    console.log('[3.3] Testing sort parameter (price_asc, price_desc, newest)...');
    const sortAscRes = await makeRequest('/api/products?sort=price_asc', 'GET');
    assert.strictEqual(sortAscRes.status, 200);
    const ascPrices = sortAscRes.body.data.map((p) => p.rentalPrice.perDay);
    assert.deepStrictEqual(ascPrices, [15, 20, 50, 100]);

    const sortDescRes = await makeRequest('/api/products?sort=price_desc', 'GET');
    assert.strictEqual(sortDescRes.status, 200);
    const descPrices = sortDescRes.body.data.map((p) => p.rentalPrice.perDay);
    assert.deepStrictEqual(descPrices, [100, 50, 20, 15]);

    const sortNewestRes = await makeRequest('/api/products?sort=newest', 'GET');
    assert.strictEqual(sortNewestRes.status, 200);
    assert.strictEqual(sortNewestRes.body.data[0].title, 'Mountain Bike');
    console.log('✓ Sorting by price_asc, price_desc, and newest operates accurately.\n');

    // ========================================================
    // MODULE 4: PROFILE EDITING
    // ========================================================
    console.log('--- TESTING MODULE 4: PROFILE EDITING ---');

    // Test 4.1: Unauthorized profile edit
    console.log('[4.1] Testing 401 on unauthorized PATCH /api/users/me...');
    const unauthProfileRes = await makeRequest('/api/users/me', 'PATCH', {}, { displayName: 'Hacker' });
    assert.strictEqual(unauthProfileRes.status, 401);
    console.log('✓ 401 returned for unauthorized profile update.');

    // Test 4.2: Whitelist enforcement - modify allowed fields and attempt forbidden fields
    console.log('[4.2] Testing profile update with whitelist enforcement (preventing email/firebaseUid modification)...');
    const originalEmail = aliceUser.email;
    const originalUid = aliceUser.firebaseUid;

    const profileUpdateRes = await makeRequest(
      '/api/users/me',
      'PATCH',
      aliceAuth,
      {
        displayName: 'Alice Cooper',
        phoneNumber: '+19998887777',
        email: 'malicious@evil.com', // Should be strictly ignored
        firebaseUid: 'tampered-uid', // Should be strictly ignored
      }
    );
    assert.strictEqual(profileUpdateRes.status, 200);
    assert.strictEqual(profileUpdateRes.body.success, true);
    assert.strictEqual(profileUpdateRes.body.data.displayName, 'Alice Cooper');
    assert.strictEqual(profileUpdateRes.body.data.phoneNumber, '+19998887777');
    assert.strictEqual(profileUpdateRes.body.data.email, originalEmail, 'Email MUST NOT be altered');
    assert.strictEqual(profileUpdateRes.body.data.firebaseUid, originalUid, 'firebaseUid MUST NOT be altered');
    assert.strictEqual(aliceUser.displayName, 'Alice Cooper');
    assert.strictEqual(aliceUser.phoneNumber, '+19998887777');
    assert.strictEqual(aliceUser.email, originalEmail);
    assert.strictEqual(aliceUser.firebaseUid, originalUid);
    console.log('✓ Whitelist enforced: displayName & phoneNumber updated, email & firebaseUid protected.');

    // Test 4.3: Avatar upload via multipart/form-data
    console.log('[4.3] Testing avatar image upload via multipart/form-data on PATCH /api/users/me...');
    const fakeAvatar = Buffer.from('FAKE_AVATAR_IMAGE_BYTES');
    const avatarFormData = buildMultipartFormData(
      { displayName: 'Alice Super' },
      {
        fieldName: 'avatar',
        fileName: 'avatar.jpg',
        mimeType: 'image/jpeg',
        fileBuffer: fakeAvatar,
      }
    );
    const avatarUploadRes = await makeRequest(
      '/api/users/me',
      'PATCH',
      { ...aliceAuth, 'Content-Type': avatarFormData.contentType },
      avatarFormData.body
    );
    assert.strictEqual(avatarUploadRes.status, 200);
    assert.strictEqual(avatarUploadRes.body.success, true);
    assert.strictEqual(avatarUploadRes.body.data.displayName, 'Alice Super');
    assert.ok(avatarUploadRes.body.data.avatarUrl.includes(`users/${aliceUser._id}/avatar/`));
    assert.strictEqual(aliceUser.avatarUrl, avatarUploadRes.body.data.avatarUrl);
    console.log('✓ 200 OK: Avatar image uploaded to S3 and avatarUrl updated on profile.\n');

    // ========================================================
    // MODULE 5: AVAILABILITY CALENDAR
    // ========================================================
    console.log('--- TESTING MODULE 5: AVAILABILITY CALENDAR ---');

    // Test 5.1: Non-owner cannot update product availability (403)
    console.log('[5.1] Testing 403 Forbidden when non-owner updates availability...');
    const nonOwnerAvailRes = await makeRequest(
      `/api/products/${cameraProduct._id}/availability`,
      'PATCH',
      bobAuth, // Bob does not own cameraProduct
      { blackoutDates: [] }
    );
    assert.strictEqual(nonOwnerAvailRes.status, 403);
    assert.strictEqual(nonOwnerAvailRes.body.message, 'Forbidden: Only the product owner can update availability');
    console.log('✓ 403 Forbidden returned for non-owner.');

    // Test 5.2: Invalid date range (startDate >= endDate)
    console.log('[5.2] Testing 400 when startDate >= endDate in blackout dates...');
    const invalidRangeRes = await makeRequest(
      `/api/products/${cameraProduct._id}/availability`,
      'PATCH',
      aliceAuth,
      {
        blackoutDates: [
          {
            startDate: '2026-11-15T00:00:00Z',
            endDate: '2026-11-10T00:00:00Z',
            reason: 'Inverted dates',
          },
        ],
      }
    );
    assert.strictEqual(invalidRangeRes.status, 400);
    assert.strictEqual(invalidRangeRes.body.message, 'startDate must be before endDate for each blackout range');
    console.log('✓ 400 returned when startDate >= endDate.');

    // Test 5.3: Overlapping blackout ranges rejected (400)
    console.log('[5.3] Testing 400 when blackout dates overlap with each other...');
    const overlappingRes = await makeRequest(
      `/api/products/${cameraProduct._id}/availability`,
      'PATCH',
      aliceAuth,
      {
        blackoutDates: [
          {
            startDate: '2026-12-01T00:00:00Z',
            endDate: '2026-12-10T00:00:00Z',
            reason: 'Vacation',
          },
          {
            startDate: '2026-12-08T00:00:00Z', // Overlaps with 01-10
            endDate: '2026-12-15T00:00:00Z',
            reason: 'Maintenance',
          },
        ],
      }
    );
    assert.strictEqual(overlappingRes.status, 400);
    assert.strictEqual(overlappingRes.body.message, 'Blackout date ranges cannot overlap with each other');
    console.log('✓ 400 returned on overlapping blackout dates with exact required error message.');

    // Test 5.4: Valid non-overlapping blackout ranges updated successfully
    console.log('[5.4] Testing 200 on valid non-overlapping blackout dates...');
    const validBlackoutDates = [
      {
        startDate: '2026-12-01T00:00:00.000Z',
        endDate: '2026-12-05T00:00:00.000Z',
        reason: 'Maintenance',
      },
      {
        startDate: '2026-12-10T00:00:00.000Z',
        endDate: '2026-12-20T00:00:00.000Z',
        reason: 'Holiday',
      },
    ];
    const validAvailRes = await makeRequest(
      `/api/products/${cameraProduct._id}/availability`,
      'PATCH',
      aliceAuth,
      { blackoutDates: validBlackoutDates }
    );
    assert.strictEqual(validAvailRes.status, 200);
    assert.strictEqual(validAvailRes.body.success, true);
    assert.strictEqual(validAvailRes.body.message, 'Product availability updated successfully');
    assert.strictEqual(validAvailRes.body.data.availability.blackoutDates.length, 2);
    assert.strictEqual(cameraProduct.availability.blackoutDates.length, 2);
    console.log('✓ 200 OK: Blackout dates successfully saved to product availability.');

    console.log('\n========================================================');
    console.log('ALL MODULES 1 TO 5 INTEGRATION TESTS PASSED (100% GREEN)');
    console.log('========================================================\n');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
