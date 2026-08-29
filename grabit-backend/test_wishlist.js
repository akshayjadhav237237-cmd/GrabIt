process.env.NODE_ENV = 'test';
const mongoose = require('mongoose');
const { User, Product } = require('./src/models');
const app = require('./server');
const http = require('http');
const assert = require('assert');

async function testBackendWishlist() {
  console.log('Testing Wishlist Backend APIs...');

  const userStore = new Map();
  const productStore = new Map();

  function mockUser(data) {
    const _id = data._id || new mongoose.Types.ObjectId();
    const doc = {
      _id,
      firebaseUid: data.firebaseUid,
      email: data.email || 'test@grabit.com',
      displayName: data.displayName || 'Test User',
      wishlist: data.wishlist || [],
      async save() {
        userStore.set(this.firebaseUid, this);
        userStore.set(this._id.toString(), this);
        return this;
      }
    };
    userStore.set(doc.firebaseUid, doc);
    userStore.set(doc._id.toString(), doc);
    return doc;
  }

  function mockProduct(data) {
    const _id = data._id || new mongoose.Types.ObjectId();
    const doc = {
      _id,
      title: data.title || 'Camera',
      category: data.category || 'Cameras',
      rentalPrice: { perDay: 50 },
    };
    productStore.set(doc._id.toString(), doc);
    return doc;
  }

  User.findOne = function(filter) {
    let doc = null;
    if (filter.firebaseUid) doc = userStore.get(filter.firebaseUid);
    if (filter._id) doc = userStore.get(filter._id.toString());
    let populateField = null;
    const queryObj = {
      populate(field) {
        populateField = field;
        return queryObj;
      },
      then(resolve, reject) {
        if (!doc) return resolve(null);
        const clone = { ...doc };
        if (populateField === 'wishlist') {
          clone.wishlist = (doc.wishlist || []).map(id => productStore.get(id.toString()) || id);
        }
        return resolve(clone);
      },
      catch(reject) {
        return Promise.reject(reject);
      }
    };
    return queryObj;
  };

  User.findOneAndUpdate = async function(filter, update, opts) {
    const user = userStore.get(filter.firebaseUid);
    if (!user) return null;
    if (update['$addToSet'] && update['$addToSet'].wishlist) {
      const pId = update['$addToSet'].wishlist.toString();
      if (!user.wishlist.some(x => x.toString() === pId)) {
        user.wishlist.push(update['$addToSet'].wishlist);
      }
    }
    if (update['$pull'] && update['$pull'].wishlist) {
      const pId = update['$pull'].wishlist.toString();
      user.wishlist = user.wishlist.filter(x => x.toString() !== pId);
    }
    await user.save();
    return user;
  };

  const user1 = mockUser({ firebaseUid: 'user-1' });
  const prod1 = mockProduct({ title: 'Sony A7 IV' });
  const prod2 = mockProduct({ title: 'DJI Mini 3' });

  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = 'http://localhost:' + port;

  const req = (path, method, token, body) => new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const r = http.request(url, { method, headers }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d || '{}') }));
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });

  // 1. Get empty wishlist
  const res1 = await req('/api/users/me/wishlist', 'GET', 'mock-token-user-1');
  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res1.body.success, true);
  assert.deepStrictEqual(res1.body.data, []);
  console.log('✓ GET /api/users/me/wishlist returns empty array');

  // 2. Add prod1 to wishlist
  const res2 = await req('/api/users/me/wishlist/' + prod1._id, 'POST', 'mock-token-user-1');
  assert.strictEqual(res2.status, 200);
  assert.strictEqual(res2.body.success, true);
  assert.strictEqual(res2.body.message, 'Added to wishlist');
  console.log('✓ POST /api/users/me/wishlist/:productId adds item');

  // 3. Add prod2 to wishlist
  const res3 = await req('/api/users/me/wishlist/' + prod2._id, 'POST', 'mock-token-user-1');
  assert.strictEqual(res3.status, 200);
  assert.strictEqual(res3.body.wishlist.length, 2);
  console.log('✓ POST /api/users/me/wishlist/:productId adds second item');

  // 4. Get populated wishlist
  const res4 = await req('/api/users/me/wishlist', 'GET', 'mock-token-user-1');
  assert.strictEqual(res4.status, 200);
  assert.strictEqual(res4.body.data.length, 2);
  assert.strictEqual(res4.body.data[0].title, 'Sony A7 IV');
  assert.strictEqual(res4.body.data[1].title, 'DJI Mini 3');
  console.log('✓ GET /api/users/me/wishlist returns populated products');

  // 5. Remove prod1 from wishlist
  const res5 = await req('/api/users/me/wishlist/' + prod1._id, 'DELETE', 'mock-token-user-1');
  assert.strictEqual(res5.status, 200);
  assert.strictEqual(res5.body.success, true);
  assert.strictEqual(res5.body.message, 'Removed from wishlist');
  assert.strictEqual(res5.body.wishlist.length, 1);
  console.log('✓ DELETE /api/users/me/wishlist/:productId removes item');

  // 6. 401 when no token
  const res6 = await req('/api/users/me/wishlist', 'GET');
  assert.strictEqual(res6.status, 401);
  console.log('✓ 401 on unauthenticated wishlist request');

  // 7. 400 on invalid product ID
  const res7 = await req('/api/users/me/wishlist/invalid-id-123', 'POST', 'mock-token-user-1');
  assert.strictEqual(res7.status, 400);
  console.log('✓ 400 on invalid productId format');

  // 8. Test top-level fallback route: GET /users/me/wishlist without /api prefix
  const res8 = await req('/users/me/wishlist', 'GET', 'mock-token-user-1');
  assert.strictEqual(res8.status, 200);
  assert.strictEqual(res8.body.success, true);
  assert.strictEqual(res8.body.data.length, 1);
  console.log('✓ GET /users/me/wishlist (fallback without /api) returns 200 JSON with auth');

  // 9. Test fallback 404 handler returns structured JSON
  const res9 = await req('/api/unknown-endpoint-xyz', 'GET');
  assert.strictEqual(res9.status, 404);
  assert.strictEqual(res9.body.success, false);
  assert.ok(res9.body.message.includes('Route not found'));
  console.log('✓ Fallback 404 handler returns structured JSON error');

  server.close();
  console.log('\nALL BACKEND WISHLIST TESTS PASSED SUCCESSFULLY!\n');
}

testBackendWishlist().catch(err => { console.error(err); process.exit(1); });
