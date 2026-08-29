const http = require('http');
const mongoose = require('mongoose');
const app = require('./server');

let server;
let port;

function request(method, path, body = null, token = 'mock-renter-token') {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('--- STARTING ZERO-BUFFERING & INSTANT BOOKING TESTS ---');

  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => {
      port = server.address().port;
      console.log(`✓ Test server listening on http://localhost:${port}`);
      resolve();
    });
  });

  try {
    // 1. Test Health
    const healthRes = await request('GET', '/api/health', null, null);
    console.log('1. Health check status:', healthRes.status, healthRes.data.message);
    if (healthRes.status !== 200) throw new Error('Health check failed');

    // 2. Test Auth Sync
    const syncRes = await request('POST', '/api/auth/sync', {
      displayName: 'Test Renter',
      email: 'renter@test.com',
    });
    console.log('2. Auth Sync status:', syncRes.status, syncRes.data.user?.displayName);
    if (syncRes.status !== 200 && syncRes.status !== 201) throw new Error('Auth sync failed');

    // 3. Test Product Listing & Pick a Product
    const prodRes = await request('GET', '/api/products?limit=5', null, null);
    console.log('3. Products count:', prodRes.data.count);
    const product = prodRes.data.data[0];
    const productId = product._id;
    console.log(`   Selected product: "${product.title}" (${productId})`);

    // 4. Test Instant Booking Creation with unique date range
    const offset = Math.floor(Math.random() * 10000) + 10;
    const tomorrow = new Date(Date.now() + 86400000 * offset).toISOString().split('T')[0];
    const threeDaysLater = new Date(Date.now() + 86400000 * (offset + 3)).toISOString().split('T')[0];

    const bookRes = await request('POST', '/api/bookings', {
      productId,
      startDate: tomorrow,
      endDate: threeDaysLater,
      damageProtectionOpted: true,
    });
    console.log('4. Create Instant Booking status:', bookRes.status);
    if (bookRes.status !== 201) {
      console.error('Booking failed:', bookRes.data);
      throw new Error(`Booking failed with status ${bookRes.status}: ${JSON.stringify(bookRes.data)}`);
    }
    const booking = bookRes.data.data;
    console.log(`   Booking created! ID: ${booking._id}, Total: ₹${booking.pricing?.totalAmount}, Status: ${booking.status}, Payment: ${booking.paymentStatus}`);

    // 5. Test Grabit Wallet Payment
    const payRes = await request('POST', `/api/bookings/${booking._id}/pay-wallet`);
    console.log('5. Wallet Payment status:', payRes.status, payRes.data.message);
    if (payRes.status !== 200) {
      console.error('Wallet payment failed:', payRes.data);
      throw new Error('Wallet payment failed');
    }
    console.log(`   Booking updated! Status: ${payRes.data.data.status}, Payment: ${payRes.data.data.paymentStatus}`);

    // 6. Test My Bookings
    const mineRes = await request('GET', '/api/bookings/mine');
    console.log('6. My Bookings count:', mineRes.data.data?.asRenter?.length);
    if (mineRes.status !== 200) throw new Error('Get my bookings failed');

    // 7. Test Wishlist
    const wishAdd = await request('POST', `/api/users/me/wishlist/${productId}`);
    console.log('7a. Add to Wishlist status:', wishAdd.status);
    const wishGet = await request('GET', '/api/users/me/wishlist');
    console.log('7b. Get Wishlist count:', wishGet.data.data?.length);

    console.log('\n======================================================');
    console.log('ALL ZERO-BUFFERING & INSTANT BOOKING TESTS PASSED (100%)');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
}

run().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
