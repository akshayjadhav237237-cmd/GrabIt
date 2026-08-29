require('dotenv').config();
process.env.NODE_ENV = 'test';

const http = require('http');
const assert = require('assert');
const { admin, auth, isMockMode } = require('./src/config/firebase');
const { User } = require('./src/models');
const app = require('./server');

async function runTests() {
  console.log('--- STARTING FIREBASE AUTH INTEGRATION TESTS ---');

  // Test 1: Config check
  console.log('\n[1] Testing src/config/firebase.js exports...');
  assert.strictEqual(typeof admin, 'object', 'admin should be exported as an object');
  assert.strictEqual(typeof auth, 'object', 'auth should be exported as an object');
  assert.strictEqual(typeof isMockMode, 'boolean', 'isMockMode should be a boolean');
  console.log(`✓ Firebase config exports correctly (isMockMode: ${isMockMode}).`);

  // Mock User DB model for integration test
  const userStore = new Map();

  User.findOne = async function (filter) {
    if (filter.firebaseUid) {
      return userStore.get(filter.firebaseUid) || null;
    }
    return null;
  };

  User.create = async function (data) {
    const doc = {
      ...data,
      _id: 'mock-mongo-id-' + Math.random().toString(36).slice(2, 8),
      createdAt: new Date(),
      updatedAt: new Date(),
      async save() {
        this.updatedAt = new Date();
        userStore.set(this.firebaseUid, this);
        return this;
      },
    };
    userStore.set(doc.firebaseUid, doc);
    return doc;
  };

  // Start HTTP server on an ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`✓ Test server listening on ${baseUrl}`);

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
    // Test 2: Missing Authorization header on POST /api/auth/sync
    console.log('\n[2] Testing POST /api/auth/sync without token...');
    const resNoToken = await makeRequest('/api/auth/sync', 'POST');
    assert.strictEqual(resNoToken.status, 401);
    assert.strictEqual(resNoToken.body.success, false);
    assert.strictEqual(resNoToken.body.message, 'Authorization token required');
    console.log('✓ 401 Authorization token required returned as expected.');

    // Test 3: Invalid token on POST /api/auth/sync
    console.log('\n[3] Testing POST /api/auth/sync with invalid token...');
    const resInvalidToken = await makeRequest('/api/auth/sync', 'POST', {
      Authorization: 'Bearer invalid-token-xyz',
    });
    assert.strictEqual(resInvalidToken.status, 401);
    assert.strictEqual(resInvalidToken.body.success, false);
    assert.strictEqual(resInvalidToken.body.message, 'Invalid or expired token');
    console.log('✓ 401 Invalid or expired token returned as expected.');

    // Test 4: Missing token on GET /api/auth/me
    console.log('\n[4] Testing GET /api/auth/me without token...');
    const resMeNoToken = await makeRequest('/api/auth/me', 'GET');
    assert.strictEqual(resMeNoToken.status, 401);
    assert.strictEqual(resMeNoToken.body.success, false);
    assert.strictEqual(resMeNoToken.body.message, 'Authorization token required');
    console.log('✓ 401 Authorization token required returned as expected.');

    // Test 5: GET /api/auth/me with test-token when user does not exist
    console.log('\n[5] Testing GET /api/auth/me with test-token (user does not exist yet)...');
    const resNotFound = await makeRequest('/api/auth/me', 'GET', {
      Authorization: 'Bearer test-token',
    });
    assert.strictEqual(resNotFound.status, 404);
    assert.strictEqual(resNotFound.body.success, false);
    assert.strictEqual(resNotFound.body.message, 'User profile not found');
    console.log('✓ 404 User profile not found returned as expected.');

    // Test 6: POST /api/auth/sync with test-token to create a new user
    console.log('\n[6] Testing POST /api/auth/sync with test-token (create new user)...');
    const resCreate = await makeRequest(
      '/api/auth/sync',
      'POST',
      { Authorization: 'Bearer test-token' },
      { displayName: 'Alex Grabit' }
    );
    assert.strictEqual(resCreate.status, 201);
    assert.strictEqual(resCreate.body.success, true);
    assert.strictEqual(resCreate.body.user.firebaseUid, 'test-user-123');
    assert.strictEqual(resCreate.body.user.email, 'test@grabit.com');
    assert.strictEqual(resCreate.body.user.displayName, 'Alex Grabit');
    assert.strictEqual(resCreate.body.user.verification.status, 'unverified');
    console.log('✓ 201 Created successfully with unverified status and profile details.');

    // Test 7: GET /api/auth/me with test-token after creation
    console.log('\n[7] Testing GET /api/auth/me with test-token (existing user)...');
    const resMe = await makeRequest('/api/auth/me', 'GET', {
      Authorization: 'Bearer test-token',
    });
    assert.strictEqual(resMe.status, 200);
    assert.strictEqual(resMe.body.success, true);
    assert.strictEqual(resMe.body.user.firebaseUid, 'test-user-123');
    assert.strictEqual(resMe.body.user.displayName, 'Alex Grabit');
    console.log('✓ 200 OK returned with user profile.');

    // Test 8: POST /api/auth/sync with test-token to update existing user
    console.log('\n[8] Testing POST /api/auth/sync with test-token (update existing user)...');
    const resUpdate = await makeRequest(
      '/api/auth/sync',
      'POST',
      { Authorization: 'Bearer test-token' },
      { displayName: 'Alex Superstar' }
    );
    assert.strictEqual(resUpdate.status, 200);
    assert.strictEqual(resUpdate.body.success, true);
    assert.strictEqual(resUpdate.body.user.displayName, 'Alex Superstar');
    console.log('✓ 200 OK returned with updated displayName.');

    // Test 9: Mock token with custom UID: mock-token-seller-456
    console.log('\n[9] Testing POST /api/auth/sync with mock-token-seller-456...');
    const resCustomToken = await makeRequest(
      '/api/auth/sync',
      'POST',
      { Authorization: 'Bearer mock-token-seller-456' },
      { displayName: 'Custom Seller' }
    );
    assert.strictEqual(resCustomToken.status, 201);
    assert.strictEqual(resCustomToken.body.success, true);
    assert.strictEqual(resCustomToken.body.user.firebaseUid, 'seller-456');
    assert.strictEqual(resCustomToken.body.user.displayName, 'Custom Seller');
    console.log('✓ 201 Created user with extracted UID seller-456.');

    // Test 10: GET /api/auth/me with mock-token-seller-456
    console.log('\n[10] Testing GET /api/auth/me with mock-token-seller-456...');
    const resCustomMe = await makeRequest('/api/auth/me', 'GET', {
      Authorization: 'Bearer mock-token-seller-456',
    });
    assert.strictEqual(resCustomMe.status, 200);
    assert.strictEqual(resCustomMe.body.success, true);
    assert.strictEqual(resCustomMe.body.user.firebaseUid, 'seller-456');
    assert.strictEqual(resCustomMe.body.user.displayName, 'Custom Seller');
    console.log('✓ 200 OK returned for custom UID seller-456.');

    console.log('\n========================================');
    console.log('ALL AUTH INTEGRATION TESTS PASSED (10/10)');
    console.log('========================================');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
