require('dotenv').config();
process.env.NODE_ENV = 'test';

const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');
const { Product, User } = require('./src/models');
const app = require('./server');

async function runTests() {
  console.log('--- STARTING PRODUCT LISTING API INTEGRATION TESTS ---\n');

  // In-memory test store
  const userStore = new Map();
  const productStore = new Map();

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

  function sanitizeOwner(ownerId) {
    const idStr = ownerId ? (ownerId._id ? ownerId._id.toString() : ownerId.toString()) : '';
    const user = userStore.get(idStr);
    if (!user) return ownerId;
    return {
      _id: user._id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      rating: user.rating,
    };
  }

  function matchesFilter(item, filter = {}) {
    for (const key of Object.keys(filter)) {
      const condition = filter[key];
      if (key === 'availability.isAvailable') {
        if (condition && typeof condition === 'object' && '$ne' in condition) {
          if (item.availability?.isAvailable === condition.$ne) return false;
        } else if (item.availability?.isAvailable !== condition) {
          return false;
        }
      } else if (key === 'category') {
        const val = item.category || '';
        if (condition && condition.$regex) {
          const regex =
            condition.$regex instanceof RegExp
              ? condition.$regex
              : new RegExp(condition.$regex, condition.$options || '');
          if (!regex.test(val)) return false;
        } else if (condition instanceof RegExp) {
          if (!condition.test(val)) return false;
        } else if (val.toLowerCase() !== String(condition).toLowerCase()) {
          return false;
        }
      } else if (key === 'location.city') {
        const val = item.location?.city || '';
        if (condition && condition.$regex) {
          const regex =
            condition.$regex instanceof RegExp
              ? condition.$regex
              : new RegExp(condition.$regex, condition.$options || '');
          if (!regex.test(val)) return false;
        } else if (condition instanceof RegExp) {
          if (!condition.test(val)) return false;
        } else if (val.toLowerCase() !== String(condition).toLowerCase()) {
          return false;
        }
      }
    }
    return true;
  }

  function mockProduct(data) {
    const _id = data._id || new mongoose.Types.ObjectId();
    const doc = {
      _id,
      owner: data.owner,
      title: data.title,
      description: data.description || '',
      category: data.category,
      images: data.images || [],
      rentalPrice: {
        perDay: data.rentalPrice?.perDay,
        perWeek: data.rentalPrice?.perWeek,
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
      location: {
        address: data.location?.address || '',
        city: data.location?.city || '',
        coordinates: data.location?.coordinates || [],
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
          this.owner = sanitizeOwner(this.owner);
        }
        return this;
      },
    };
    productStore.set(_id.toString(), doc);
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
  Product.create = async function (data) {
    return mockProduct(data);
  };

  Product.countDocuments = async function (filter) {
    return Array.from(productStore.values()).filter((p) => matchesFilter(p, filter)).length;
  };

  Product.findById = function (id) {
    const idStr = id ? id.toString() : '';
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
        clone.owner = sanitizeOwner(doc.owner);
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

  Product.find = function (filter) {
    let sortField = null;
    let skipNum = 0;
    let limitNum = Infinity;
    let populatePath = null;

    const run = async () => {
      let list = Array.from(productStore.values()).filter((p) => matchesFilter(p, filter));
      if (sortField && sortField.createdAt === -1) {
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
      list = list.slice(skipNum, skipNum + limitNum);
      return list.map((item) => {
        const clone = { ...item };
        if (populatePath === 'owner') {
          clone.owner = sanitizeOwner(item.owner);
        }
        return clone;
      });
    };

    const queryObj = {
      sort(s) {
        sortField = s;
        return queryObj;
      },
      skip(s) {
        skipNum = s;
        return queryObj;
      },
      limit(l) {
        limitNum = l;
        return queryObj;
      },
      populate(p) {
        populatePath = p;
        return queryObj;
      },
      then(resolve, reject) {
        return run().then(resolve, reject);
      },
    };

    return queryObj;
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
    // ----------------------------------------------------
    // Test 1: 400 on missing title, category, or negative/invalid price
    // ----------------------------------------------------
    console.log('[1] Testing validation errors on POST /api/products (400 Bad Request)...');

    // Missing title
    const resNoTitle = await makeRequest(
      '/api/products',
      'POST',
      { Authorization: 'Bearer mock-token-user-1' },
      { category: 'Electronics', rentalPrice: { perDay: 50 } }
    );
    assert.strictEqual(resNoTitle.status, 400, 'Expected 400 for missing title');
    assert.strictEqual(resNoTitle.body.success, false);
    assert.strictEqual(resNoTitle.body.message, 'Product title is required');

    // Missing category
    const resNoCat = await makeRequest(
      '/api/products',
      'POST',
      { Authorization: 'Bearer mock-token-user-1' },
      { title: 'Sony Camera', rentalPrice: { perDay: 50 } }
    );
    assert.strictEqual(resNoCat.status, 400, 'Expected 400 for missing category');
    assert.strictEqual(resNoCat.body.success, false);
    assert.strictEqual(resNoCat.body.message, 'Product category is required');

    // Missing rentalPrice
    const resNoPrice = await makeRequest(
      '/api/products',
      'POST',
      { Authorization: 'Bearer mock-token-user-1' },
      { title: 'Sony Camera', category: 'Electronics' }
    );
    assert.strictEqual(resNoPrice.status, 400, 'Expected 400 for missing rentalPrice');
    assert.strictEqual(resNoPrice.body.message, 'Rental price per day must be a positive number');

    // Negative rentalPrice.perDay
    const resNegPrice = await makeRequest(
      '/api/products',
      'POST',
      { Authorization: 'Bearer mock-token-user-1' },
      { title: 'Sony Camera', category: 'Electronics', rentalPrice: { perDay: -10 } }
    );
    assert.strictEqual(resNegPrice.status, 400, 'Expected 400 for negative rentalPrice.perDay');
    assert.strictEqual(resNegPrice.body.message, 'Rental price per day must be a positive number');

    // Zero rentalPrice.perDay
    const resZeroPrice = await makeRequest(
      '/api/products',
      'POST',
      { Authorization: 'Bearer mock-token-user-1' },
      { title: 'Sony Camera', category: 'Electronics', rentalPrice: { perDay: 0 } }
    );
    assert.strictEqual(resZeroPrice.status, 400, 'Expected 400 for zero rentalPrice.perDay');
    assert.strictEqual(resZeroPrice.body.message, 'Rental price per day must be a positive number');

    // Negative securityDeposit
    const resNegDeposit = await makeRequest(
      '/api/products',
      'POST',
      { Authorization: 'Bearer mock-token-user-1' },
      {
        title: 'Sony Camera',
        category: 'Electronics',
        rentalPrice: { perDay: 50, securityDeposit: -100 },
      }
    );
    assert.strictEqual(resNegDeposit.status, 400, 'Expected 400 for negative securityDeposit');
    assert.strictEqual(resNegDeposit.body.message, 'Security deposit cannot be negative');

    console.log('✓ Validation errors correctly return 400 with expected error messages.');

    // ----------------------------------------------------
    // Test 2: 401 on unauthorized creation
    // ----------------------------------------------------
    console.log('\n[2] Testing unauthorized product creation (401 Unauthorized)...');

    // Missing token
    const resNoAuth = await makeRequest(
      '/api/products',
      'POST',
      {},
      { title: 'Sony Camera', category: 'Electronics', rentalPrice: { perDay: 50 } }
    );
    assert.strictEqual(resNoAuth.status, 401, 'Expected 401 when Authorization header is missing');
    assert.strictEqual(resNoAuth.body.success, false);

    // Invalid token
    const resBadToken = await makeRequest(
      '/api/products',
      'POST',
      { Authorization: 'Bearer invalid-token-xyz' },
      { title: 'Sony Camera', category: 'Electronics', rentalPrice: { perDay: 50 } }
    );
    assert.strictEqual(resBadToken.status, 401, 'Expected 401 for invalid token');
    assert.strictEqual(resBadToken.body.success, false);

    console.log('✓ Unauthorized product creation correctly returns 401.');

    // ----------------------------------------------------
    // Test 3: 201 on valid product creation
    // ----------------------------------------------------
    console.log('\n[3] Testing valid product creation (201 Created)...');

    const validProductPayload = {
      title: 'Sony A7 IV Mirrorless Camera',
      description: 'Professional 33MP full-frame camera with 28-70mm lens',
      category: 'Electronics',
      rentalPrice: {
        perDay: 45,
        perWeek: 250,
        securityDeposit: 200,
      },
      damageProtection: {
        isAvailable: true,
        fee: 15,
      },
      location: {
        address: '100 Market Street',
        city: 'San Francisco',
        coordinates: [-122.4194, 37.7749],
      },
      images: ['https://images.example.com/sony-a7iv-1.jpg'],
    };

    const resCreate = await makeRequest(
      '/api/products',
      'POST',
      { Authorization: 'Bearer mock-token-user-1' },
      validProductPayload
    );
    assert.strictEqual(resCreate.status, 201, 'Expected 201 Created');
    assert.strictEqual(resCreate.body.success, true);
    assert.ok(resCreate.body.data._id, 'Product should have an _id');
    assert.strictEqual(resCreate.body.data.title, 'Sony A7 IV Mirrorless Camera');
    assert.strictEqual(resCreate.body.data.category, 'Electronics');
    assert.strictEqual(resCreate.body.data.rentalPrice.perDay, 45);
    assert.strictEqual(resCreate.body.data.rentalPrice.perWeek, 250);
    assert.strictEqual(resCreate.body.data.rentalPrice.securityDeposit, 200);
    assert.strictEqual(resCreate.body.data.damageProtection.isAvailable, true);
    assert.strictEqual(resCreate.body.data.damageProtection.fee, 15);
    assert.strictEqual(resCreate.body.data.location.city, 'San Francisco');
    assert.strictEqual(resCreate.body.data.availability.isAvailable, true);

    const product1Id = resCreate.body.data._id;
    const user1MongoId = userStore.get('user-1')._id.toString();
    assert.strictEqual(resCreate.body.data.owner.toString(), user1MongoId);

    console.log(`✓ Product created successfully with 201 (ID: ${product1Id}).`);

    // Create product 2 (Sports, Oakland, User 2)
    const resCreate2 = await makeRequest(
      '/api/products',
      'POST',
      { Authorization: 'Bearer mock-token-user-2' },
      {
        title: 'Trek Dual Sport Mountain Bike',
        description: 'Hybrid bike for city and trails',
        category: 'Sports',
        rentalPrice: { perDay: 30, perWeek: 150, securityDeposit: 100 },
        location: { city: 'Oakland', address: 'Broadway' },
      }
    );
    assert.strictEqual(resCreate2.status, 201);
    const product2Id = resCreate2.body.data._id;

    // Create product 3 (Electronics, San Francisco, User 1)
    const resCreate3 = await makeRequest(
      '/api/products',
      'POST',
      { Authorization: 'Bearer mock-token-user-1' },
      {
        title: 'DJI Mini 3 Pro Drone',
        description: 'Lightweight camera drone',
        category: 'Electronics',
        rentalPrice: { perDay: 40, perWeek: 200, securityDeposit: 150 },
        location: { city: 'San Francisco', address: 'Mission St' },
      }
    );
    assert.strictEqual(resCreate3.status, 201);
    const product3Id = resCreate3.body.data._id;

    console.log('✓ Additional test products created for listing & filter testing.');

    // ----------------------------------------------------
    // Test 4: 200 on listing with pagination & category/city filters
    // ----------------------------------------------------
    console.log('\n[4] Testing GET /api/products listing, pagination, and filters...');

    // 4a. Default listing
    const resListAll = await makeRequest('/api/products', 'GET');
    assert.strictEqual(resListAll.status, 200);
    assert.strictEqual(resListAll.body.success, true);
    assert.strictEqual(resListAll.body.total, 3);
    assert.strictEqual(resListAll.body.count, 3);
    assert.strictEqual(resListAll.body.page, 1);
    assert.strictEqual(resListAll.body.totalPages, 1);
    assert.strictEqual(resListAll.body.data.length, 3);
    console.log('✓ Default GET /api/products returns all 3 active products.');

    // 4b. Pagination: limit=2
    const resPage1 = await makeRequest('/api/products?page=1&limit=2', 'GET');
    assert.strictEqual(resPage1.status, 200);
    assert.strictEqual(resPage1.body.count, 2);
    assert.strictEqual(resPage1.body.total, 3);
    assert.strictEqual(resPage1.body.page, 1);
    assert.strictEqual(resPage1.body.totalPages, 2);

    const resPage2 = await makeRequest('/api/products?page=2&limit=2', 'GET');
    assert.strictEqual(resPage2.status, 200);
    assert.strictEqual(resPage2.body.count, 1);
    assert.strictEqual(resPage2.body.page, 2);
    console.log('✓ Pagination works accurately (limit=2 splits 3 products into 2 pages).');

    // 4c. Category filtering (case-insensitive)
    const resFilterCat = await makeRequest('/api/products?category=electronics', 'GET');
    assert.strictEqual(resFilterCat.status, 200);
    assert.strictEqual(resFilterCat.body.count, 2);
    assert.strictEqual(resFilterCat.body.total, 2);
    for (const item of resFilterCat.body.data) {
      assert.strictEqual(item.category.toLowerCase(), 'electronics');
    }
    console.log('✓ Category filter works accurately (case-insensitive "electronics" matched 2 items).');

    // 4d. City filtering (case-insensitive)
    const resFilterCity = await makeRequest('/api/products?city=san%20francisco', 'GET');
    assert.strictEqual(resFilterCity.status, 200);
    assert.strictEqual(resFilterCity.body.count, 2);
    assert.strictEqual(resFilterCity.body.total, 2);
    for (const item of resFilterCity.body.data) {
      assert.strictEqual(item.location.city.toLowerCase(), 'san francisco');
    }

    const resFilterCityOak = await makeRequest('/api/products?city=oakland', 'GET');
    assert.strictEqual(resFilterCityOak.status, 200);
    assert.strictEqual(resFilterCityOak.body.count, 1);
    assert.strictEqual(resFilterCityOak.body.data[0].location.city, 'Oakland');
    console.log('✓ City filter works accurately (matched "san francisco" and "oakland").');

    // ----------------------------------------------------
    // Test 5: 200 on GET /:id with sanitized owner info (no email/phone)
    // ----------------------------------------------------
    console.log('\n[5] Testing GET /api/products/:id with sanitized owner info...');

    const resGetSingle = await makeRequest(`/api/products/${product1Id}`, 'GET');
    assert.strictEqual(resGetSingle.status, 200);
    assert.strictEqual(resGetSingle.body.success, true);
    assert.strictEqual(resGetSingle.body.data._id, product1Id);

    // Verify owner sanitation
    const owner = resGetSingle.body.data.owner;
    assert.ok(owner, 'Product should have populated owner');
    assert.ok(owner.displayName, 'Owner should have displayName');
    assert.ok(owner.rating, 'Owner should have rating');
    assert.strictEqual(owner.email, undefined, 'Owner email MUST NOT be exposed');
    assert.strictEqual(owner.phoneNumber, undefined, 'Owner phone number MUST NOT be exposed');
    console.log('✓ GET /:id returned product with sanitized owner (no email or phoneNumber exposed).');

    // Invalid ObjectId format
    const resInvalidId = await makeRequest('/api/products/not-a-valid-object-id', 'GET');
    assert.strictEqual(resInvalidId.status, 404);
    assert.strictEqual(resInvalidId.body.message, 'Product not found');

    // Valid ObjectId but non-existent
    const fakeId = new mongoose.Types.ObjectId().toString();
    const resNotFound = await makeRequest(`/api/products/${fakeId}`, 'GET');
    assert.strictEqual(resNotFound.status, 404);
    assert.strictEqual(resNotFound.body.message, 'Product not found');
    console.log('✓ Invalid and non-existent IDs return 404.');

    // ----------------------------------------------------
    // Test 6: 403 on editing another user's product
    // ----------------------------------------------------
    console.log('\n[6] Testing 403 Forbidden when non-owner attempts to edit product...');

    const resForbiddenEdit = await makeRequest(
      `/api/products/${product1Id}`,
      'PATCH',
      { Authorization: 'Bearer mock-token-user-2' }, // user 2 trying to edit user 1's product
      { title: 'Hacked Title' }
    );
    assert.strictEqual(resForbiddenEdit.status, 403, 'Expected 403 Forbidden');
    assert.strictEqual(resForbiddenEdit.body.success, false);
    assert.strictEqual(
      resForbiddenEdit.body.message,
      'Forbidden: You do not have permission to edit this product'
    );
    console.log('✓ Server-side ownership enforced: 403 returned when editing another user product.');

    // ----------------------------------------------------
    // Test 7: 200 on owner updating product
    // ----------------------------------------------------
    console.log('\n[7] Testing 200 OK when owner updates product...');

    // First test invalid update (negative price)
    const resInvalidUpdate = await makeRequest(
      `/api/products/${product1Id}`,
      'PATCH',
      { Authorization: 'Bearer mock-token-user-1' },
      { rentalPrice: { perDay: -99 } }
    );
    assert.strictEqual(resInvalidUpdate.status, 400);
    assert.strictEqual(
      resInvalidUpdate.body.message,
      'Rental price per day must be a positive number'
    );

    // Valid update by owner
    const resUpdate = await makeRequest(
      `/api/products/${product1Id}`,
      'PATCH',
      { Authorization: 'Bearer mock-token-user-1' },
      {
        title: 'Sony A7 IV Mirrorless Camera - Cinema Bundle',
        rentalPrice: { perDay: 55 },
        description: 'Updated description with extra battery and cage',
      }
    );
    assert.strictEqual(resUpdate.status, 200, 'Expected 200 OK on update');
    assert.strictEqual(resUpdate.body.success, true);
    assert.strictEqual(
      resUpdate.body.data.title,
      'Sony A7 IV Mirrorless Camera - Cinema Bundle'
    );
    assert.strictEqual(resUpdate.body.data.rentalPrice.perDay, 55);
    assert.strictEqual(
      resUpdate.body.data.description,
      'Updated description with extra battery and cage'
    );
    console.log('✓ Owner successfully updated product fields.');

    // ----------------------------------------------------
    // Test 8: 403 on deleting another user's product
    // ----------------------------------------------------
    console.log('\n[8] Testing 403 Forbidden when non-owner attempts to delete product...');

    const resForbiddenDelete = await makeRequest(
      `/api/products/${product1Id}`,
      'DELETE',
      { Authorization: 'Bearer mock-token-user-2' } // user 2 trying to delete user 1's product
    );
    assert.strictEqual(resForbiddenDelete.status, 403, 'Expected 403 Forbidden');
    assert.strictEqual(resForbiddenDelete.body.success, false);
    assert.strictEqual(
      resForbiddenDelete.body.message,
      'Forbidden: You do not have permission to delete this product'
    );
    console.log('✓ Server-side ownership enforced: 403 returned when deleting another user product.');

    // ----------------------------------------------------
    // Test 9: 200 on owner soft deleting product (availability.isAvailable = false)
    // ----------------------------------------------------
    console.log('\n[9] Testing 200 OK on owner soft delete (availability.isAvailable = false)...');

    const resDelete = await makeRequest(
      `/api/products/${product1Id}`,
      'DELETE',
      { Authorization: 'Bearer mock-token-user-1' } // user 1 deleting own product
    );
    assert.strictEqual(resDelete.status, 200, 'Expected 200 OK on soft delete');
    assert.strictEqual(resDelete.body.success, true);
    assert.ok(
      resDelete.body.message === 'Product archived successfully' ||
      resDelete.body.message === 'Product removed from active listings',
      'Expected soft delete confirmation message'
    );
    assert.strictEqual(resDelete.body.data.availability.isAvailable, false);

    // Verify it is excluded from active listings in GET /api/products
    const resListAfterDelete = await makeRequest('/api/products', 'GET');
    assert.strictEqual(resListAfterDelete.status, 200);
    assert.strictEqual(
      resListAfterDelete.body.count,
      2,
      'Active listings count should decrease from 3 to 2'
    );
    const listedIds = resListAfterDelete.body.data.map((p) => p._id);
    assert.ok(!listedIds.includes(product1Id), 'Soft-deleted product must be excluded from listings');

    console.log('✓ Soft delete sets availability.isAvailable = false and excludes item from listings.');

    console.log('\n======================================================');
    console.log('ALL PRODUCT LISTING API INTEGRATION TESTS PASSED (9/9)');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
