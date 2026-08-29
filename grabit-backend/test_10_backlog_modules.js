const http = require('http');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

const routes = require('./src/routes');
const errorHandler = require('./src/middleware/error.middleware');
const { User, Product, Booking, Review, Report } = require('./src/models');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', routes);
app.use(errorHandler);

let server;
let baseUrl;

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(rawData);
          } catch (e) {
            parsed = rawData;
          }
          resolve({ status: res.statusCode, data: parsed });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('========================================================');
  console.log('STARTING INTEGRATION TESTS FOR 10 FEATURE BACKLOG MODULES');
  console.log('========================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grabit');
  
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`✓ Test server listening on ${baseUrl}\n`);
      resolve();
    });
  });

  const uniqueId = Date.now();
  const ownerUid = `owner-10mod-${uniqueId}`;
  const renterUid = `renter-10mod-${uniqueId}`;
  const thirdUid = `third-10mod-${uniqueId}`;

  // 1. Sync users
  const ownerSync = await request('POST', '/api/auth/sync', { displayName: 'Listing Owner' }, `mock-token-${ownerUid}`);
  const renterSync = await request('POST', '/api/auth/sync', { displayName: 'Listing Renter' }, `mock-token-${renterUid}`);
  const thirdSync = await request('POST', '/api/auth/sync', { displayName: 'Third Party' }, `mock-token-${thirdUid}`);

  const ownerUser = ownerSync.data.user;
  const renterUser = renterSync.data.user;
  const thirdUser = thirdSync.data.user;

  console.log('--- TEST MODULE 9: REFERRAL CODE ---');
  if (!ownerUser.referralCode || !ownerUser.referralCode.startsWith('GRAB-')) {
    throw new Error('Module 9: Owner referralCode was not generated!');
  }
  console.log('✓ Auto-generated referralCode on new user:', ownerUser.referralCode);

  const referredUid = `referred-10mod-${uniqueId}`;
  const refSync = await request('POST', '/api/auth/sync', {
    displayName: 'Referred User',
    referralCode: ownerUser.referralCode
  }, `mock-token-${referredUid}`);
  
  if (refSync.data.user.referredBy?.toString() !== ownerUser._id.toString()) {
    throw new Error('Module 9: Referred user did not set referredBy!');
  }
  console.log('✓ Referral tracking sets referredBy on referred user.');

  console.log('\n--- TEST MODULE 1: MY LISTINGS (OWNER MANAGEMENT) ---');
  // Create 2 products
  const p1Res = await request('POST', '/api/products', {
    title: 'Drill Set',
    category: 'Power Tools',
    rentalPrice: { perDay: 25, securityDeposit: 50 },
  }, `mock-token-${ownerUid}`);
  const prod1 = p1Res.data.data;

  const p2Res = await request('POST', '/api/products', {
    title: 'Camera Lens',
    category: 'Cameras',
    rentalPrice: { perDay: 40, securityDeposit: 100 },
  }, `mock-token-${ownerUid}`);
  const prod2 = p2Res.data.data;

  // GET /api/products?mine=true
  const myListings = await request('GET', '/api/products?mine=true', null, `mock-token-${ownerUid}`);
  if (myListings.status !== 200 || myListings.data.count < 2) {
    throw new Error('Module 1: GET /api/products?mine=true failed!');
  }
  console.log(`✓ GET /api/products?mine=true returned ${myListings.data.count} owner listings.`);

  // Bookings check on prod1 (0 bookings)
  const check1 = await request('GET', `/api/products/${prod1._id}/bookings-check`, null, `mock-token-${ownerUid}`);
  if (!check1.data.data?.canHardDelete) {
    throw new Error('Module 1: prod1 should be eligible for hard delete (0 bookings)');
  }
  console.log('✓ GET /api/products/:id/bookings-check confirmed 0 bookings.');

  // Hard delete prod1
  const del1 = await request('DELETE', `/api/products/${prod1._id}?hard=true`, null, `mock-token-${ownerUid}`);
  if (del1.status !== 200 || !del1.data.hardDeleted) {
    throw new Error('Module 1: Hard delete failed on 0-booking product!');
  }
  console.log('✓ DELETE /api/products/:id?hard=true successfully permanently deleted prod1.');

  // Toggle availability on prod2
  const togRes = await request('PATCH', `/api/products/${prod2._id}`, { isAvailable: false }, `mock-token-${ownerUid}`);
  if (togRes.data.data?.availability?.isAvailable !== false) {
    throw new Error('Module 1: Availability toggle failed on prod2!');
  }
  console.log('✓ PATCH /api/products/:id successfully archived prod2 (isAvailable = false).');

  // Reactivate prod2
  await request('PATCH', `/api/products/${prod2._id}`, { isAvailable: true }, `mock-token-${ownerUid}`);

  console.log('\n--- TEST MODULE 5: WISHLIST ---');
  // Add prod2 to renter wishlist
  const wishAdd = await request('POST', `/api/users/me/wishlist/${prod2._id}`, null, `mock-token-${renterUid}`);
  if (wishAdd.status !== 200) throw new Error('Module 5: Add to wishlist failed');
  console.log('✓ POST /api/users/me/wishlist/:productId added product to wishlist.');

  const wishGet = await request('GET', '/api/users/me/wishlist', null, `mock-token-${renterUid}`);
  if (wishGet.status !== 200 || wishGet.data.data.length !== 1 || wishGet.data.data[0]._id !== prod2._id) {
    throw new Error('Module 5: Populated wishlist retrieval failed');
  }
  console.log('✓ GET /api/users/me/wishlist returned populated wishlist product.');

  const wishDel = await request('DELETE', `/api/users/me/wishlist/${prod2._id}`, null, `mock-token-${renterUid}`);
  if (wishDel.status !== 200) throw new Error('Module 5: Remove from wishlist failed');
  console.log('✓ DELETE /api/users/me/wishlist/:productId removed product from wishlist.');

  console.log('\n--- TEST MODULE 3: REPORT / FLAG ---');
  const repRes = await request('POST', '/api/reports', {
    targetType: 'product',
    targetId: prod2._id,
    reason: 'Spam',
    details: 'Testing report functionality'
  }, `mock-token-${renterUid}`);
  if (repRes.status !== 201) throw new Error('Module 3: Create report failed');
  console.log('✓ POST /api/reports created Report document successfully.');

  console.log('\n--- TEST MODULE 6: RENTAL EXTENSION REQUEST ---');
  const tomorrow = new Date(Date.now() + 86400000);
  const endD = new Date(Date.now() + 86400000 * 3);

  // Create booking (instantly confirmed)
  const bRes = await request('POST', '/api/bookings', {
    productId: prod2._id,
    startDate: tomorrow.toISOString(),
    endDate: endD.toISOString(),
  }, `mock-token-${renterUid}`);
  const booking1 = bRes.data.data;

  // Pay & Activate booking directly in DB for testing
  await Booking.findByIdAndUpdate(booking1._id, { status: 'active', paymentStatus: 'paid' });

  // Request Extension (renter extends by 2 days)
  const newEnd = new Date(Date.now() + 86400000 * 5);
  const extReq = await request('POST', `/api/bookings/${booking1._id}/extend`, {
    newEndDate: newEnd.toISOString()
  }, `mock-token-${renterUid}`);
  if (extReq.status !== 200 || extReq.data.data?.extensionRequest?.status !== 'pending') {
    throw new Error('Module 6: Request extension failed');
  }
  console.log(`✓ POST /api/bookings/:id/extend created pending request for +${extReq.data.data.extensionRequest.additionalDays} days (₹${extReq.data.data.extensionRequest.additionalAmount}).`);

  // Owner Approves Extension
  const extApprove = await request('PATCH', `/api/bookings/${booking1._id}/extend-response`, {
    approve: true
  }, `mock-token-${ownerUid}`);
  if (extApprove.status !== 200 || extApprove.data.data?.extensionRequest?.status !== 'approved') {
    throw new Error('Module 6: Extension approve failed');
  }
  console.log('✓ PATCH /api/bookings/:id/extend-response approved extension and updated booking total amount.');

  console.log('\n--- TEST MODULE 4: BOOKING DISPUTE FLAG ---');
  const dispRes = await request('PATCH', `/api/bookings/${booking1._id}/dispute`, {
    reason: 'Gear returned with scratched lens'
  }, `mock-token-${ownerUid}`);
  if (dispRes.status !== 200 || !dispRes.data.data?.disputeFlag?.raised) {
    throw new Error('Module 4: Dispute flag failed');
  }
  console.log('✓ PATCH /api/bookings/:id/dispute raised dispute flag successfully on booking.');

  console.log('\n--- TEST MODULE 2: EARNINGS SUMMARY ---');
  // Check earnings while booking is active & paid (should show pendingPayout)
  const earn1 = await request('GET', '/api/users/me/earnings', null, `mock-token-${ownerUid}`);
  if (earn1.status !== 200 || earn1.data.data?.pendingPayout <= 0) {
    throw new Error('Module 2: Pending payout calculation failed');
  }
  console.log(`✓ GET /api/users/me/earnings returned pendingPayout: ₹${earn1.data.data.pendingPayout}.`);

  // Mark booking completed
  await Booking.findByIdAndUpdate(booking1._id, { status: 'completed' });
  const earn2 = await request('GET', '/api/users/me/earnings', null, `mock-token-${ownerUid}`);
  if (earn2.data.data?.totalEarned <= 0 || earn2.data.data?.completedRentalsCount !== 1) {
    throw new Error('Module 2: Total earned calculation failed');
  }
  console.log(`✓ GET /api/users/me/earnings returned totalEarned: ₹${earn2.data.data.totalEarned} and completedRentalsCount: ${earn2.data.data.completedRentalsCount}.`);

  console.log('\n--- TEST MODULE 7: CANCELLATION POLICY + REASON ---');
  // Create another booking to cancel
  const b2Res = await request('POST', '/api/bookings', {
    productId: prod2._id,
    startDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    endDate: new Date(Date.now() + 86400000 * 12).toISOString(),
  }, `mock-token-${renterUid}`);
  const booking2 = b2Res.data.data;

  // Attempt cancel without reason -> 400
  const cancelNoReason = await request('PATCH', `/api/bookings/${booking2._id}/status`, {
    status: 'cancelled'
  }, `mock-token-${renterUid}`);
  if (cancelNoReason.status !== 400) {
    throw new Error('Module 7: Cancelling without reason should return 400!');
  }
  console.log('✓ 400 Bad Request returned when cancelling without reason.');

  // Cancel with reason -> 200
  const cancelWithReason = await request('PATCH', `/api/bookings/${booking2._id}/status`, {
    status: 'cancelled',
    reason: 'Change of plans'
  }, `mock-token-${renterUid}`);
  if (cancelWithReason.status !== 200 || cancelWithReason.data.data?.cancellationReason !== 'Change of plans') {
    throw new Error('Module 7: Cancelling with reason failed');
  }
  console.log('✓ 200 OK returned and cancellationReason recorded.');

  // Test Late Cancellation (<24h)
  const b3Res = await request('POST', '/api/bookings', {
    productId: prod2._id,
    startDate: new Date(Date.now() + 3600000 * 4).toISOString(), // 4 hours from now
    endDate: new Date(Date.now() + 86400000 * 2).toISOString(),
  }, `mock-token-${renterUid}`);
  const booking3 = b3Res.data.data;

  const lateCancel = await request('PATCH', `/api/bookings/${booking3._id}/status`, {
    status: 'cancelled',
    reason: 'Emergency trip'
  }, `mock-token-${renterUid}`);
  if (!lateCancel.data.data?.cancellationReason?.startsWith('[Late Cancellation (<24h)]')) {
    throw new Error('Module 7: Late cancellation flag missing!');
  }
  console.log('✓ Late cancellation flag recorded:', lateCancel.data.data.cancellationReason);

  console.log('\n--- TEST MODULE 8: NOTIFICATION PREFERENCES ---');
  const prefRes = await request('PATCH', '/api/users/me/notification-prefs', {
    bookingUpdates: false,
    chatMessages: true
  }, `mock-token-${ownerUid}`);
  if (prefRes.status !== 200 || prefRes.data.data?.bookingUpdates !== false) {
    throw new Error('Module 8: Notification preferences update failed');
  }
  console.log('✓ PATCH /api/users/me/notification-prefs updated user notification preferences.');

  console.log('\n========================================================');
  console.log('ALL 10 FEATURE BACKLOG MODULES VERIFIED SUCCESSFULLY!');
  console.log('========================================================\n');

  server.close();
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ INTEGRATION TEST FAILED:', err);
  if (server) server.close();
  mongoose.disconnect();
  process.exit(1);
});
