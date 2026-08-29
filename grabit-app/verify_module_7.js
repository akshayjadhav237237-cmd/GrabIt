const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('PROJECT GRABIT - MODULE 7 VERIFICATION SUITE');
console.log('Cancellation with Reason + Policy Verification');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failCount++;
  }
}

// --------------------------------------------------------------------
// 1. Backend Syntax & Implementation Checks
// --------------------------------------------------------------------
console.log('TEST SUITE 1: Backend Implementation & Syntax');

const backendBookingCtrlPath = path.join(__dirname, '../grabit-backend/src/controllers/booking.controller.js');
assert(fs.existsSync(backendBookingCtrlPath), 'grabit-backend booking.controller.js exists');

try {
  execSync(`node --check "${backendBookingCtrlPath}"`, { encoding: 'utf8' });
  assert(true, 'node --check on booking.controller.js passed with 0 errors');
} catch (err) {
  assert(false, `node --check on booking.controller.js failed: ${err.message}`);
}

const backendCtrlContent = fs.readFileSync(backendBookingCtrlPath, 'utf8');

assert(backendCtrlContent.includes("status === 'cancelled'"), 'booking.controller.js handles status === "cancelled"');
assert(
  backendCtrlContent.includes('req.body.reason') && backendCtrlContent.includes('req.body.cancellationReason'),
  'booking.controller.js checks req.body.reason and req.body.cancellationReason'
);
assert(
  backendCtrlContent.includes("'Cancellation reason is required'"),
  'booking.controller.js returns 400 with "Cancellation reason is required" when missing'
);
assert(
  backendCtrlContent.includes('24 * 60 * 60 * 1000'),
  'booking.controller.js checks 24h cancellation policy window (24 * 60 * 60 * 1000)'
);
assert(
  backendCtrlContent.includes('[Late Cancellation (<24h)]'),
  'booking.controller.js prefixes "[Late Cancellation (<24h)]" for late cancellations'
);
assert(
  backendCtrlContent.includes("booking.status === 'confirmed'") && backendCtrlContent.includes("booking.status === 'active'"),
  'booking.controller.js applies late cancellation policy to confirmed and active bookings'
);

// --------------------------------------------------------------------
// 2. Frontend api.ts Implementation Checks
// --------------------------------------------------------------------
console.log('\nTEST SUITE 2: Frontend api.ts updateBookingStatus & Interfaces');

const apiPath = path.join(__dirname, 'src/services/api.ts');
assert(fs.existsSync(apiPath), 'src/services/api.ts exists');
const apiContent = fs.readFileSync(apiPath, 'utf8');

assert(apiContent.includes('cancellationReason?: string'), 'BookingItem interface includes cancellationReason?: string');
assert(apiContent.includes('updateBookingStatus('), 'api.ts defines updateBookingStatus');
assert(
  apiContent.includes('reason?: string'),
  'updateBookingStatus accepts optional reason: string parameter'
);
assert(
  apiContent.includes('payload.reason = reason') && apiContent.includes('payload.cancellationReason = reason'),
  'updateBookingStatus sends reason in request body payload'
);

// --------------------------------------------------------------------
// 3. Frontend BookingsScreen.tsx Implementation Checks
// --------------------------------------------------------------------
console.log('\nTEST SUITE 3: Frontend BookingsScreen.tsx UI & Policy Flow');

const bookingsScreenPath = path.join(__dirname, 'src/screens/main/BookingsScreen.tsx');
assert(fs.existsSync(bookingsScreenPath), 'src/screens/main/BookingsScreen.tsx exists');
const bookingsScreenContent = fs.readFileSync(bookingsScreenPath, 'utf8');

// Reason chips
const expectedChips = [
  'Change of plans',
  'Item not as described',
  'Owner unresponsive',
  'Renter unresponsive',
  'Other',
];
expectedChips.forEach((chip) => {
  assert(bookingsScreenContent.includes(chip), `BookingsScreen.tsx includes reason chip: "${chip}"`);
});

// Modal state and handlers
assert(bookingsScreenContent.includes('isCancelModalVisible'), 'BookingsScreen.tsx manages isCancelModalVisible state');
assert(bookingsScreenContent.includes('selectedCancelReason'), 'BookingsScreen.tsx manages selectedCancelReason state');
assert(bookingsScreenContent.includes('cancelExplanation'), 'BookingsScreen.tsx manages cancelExplanation state');
assert(bookingsScreenContent.includes('handleOpenCancelModal'), 'BookingsScreen.tsx implements handleOpenCancelModal handler');
assert(bookingsScreenContent.includes('handleConfirmCancellation'), 'BookingsScreen.tsx implements handleConfirmCancellation handler');

// Cancel reason badge
assert(
  bookingsScreenContent.includes('cancellationReasonContainer') &&
  bookingsScreenContent.includes('Cancelled: "'),
  'BookingsScreen.tsx displays cancellation reason badge: Cancelled: "${...}"'
);

// Cancel buttons
assert(bookingsScreenContent.includes('cancelBookingButton'), 'BookingsScreen.tsx defines cancelBookingButton');
assert(bookingsScreenContent.includes('Cancel Booking') || bookingsScreenContent.includes('Cancel Request'), 'BookingsScreen.tsx provides Cancel Booking / Request action');
assert(bookingsScreenContent.includes('Decline'), 'BookingsScreen.tsx provides Decline action');

// --------------------------------------------------------------------
// 4. Strict Zero Raw Hex Codes Verification
// --------------------------------------------------------------------
console.log('\nTEST SUITE 4: Strict Zero Raw Hex Codes & Theme Tokens');

const hexRegex = /#[0-9a-fA-F]{3,8}/g;
const filesToCheck = [
  'src/services/api.ts',
  'src/screens/main/BookingsScreen.tsx',
];

for (const relFile of filesToCheck) {
  const fullPath = path.join(__dirname, relFile);
  const content = fs.readFileSync(fullPath, 'utf8');
  const matches = content.match(hexRegex);
  assert(!matches || matches.length === 0, `${relFile} contains 0 raw hex codes (found: ${matches ? matches.length : 0})`);
}

// Summary
console.log('\n====================================================');
console.log(`VERIFICATION COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================\n');

if (failCount > 0) {
  process.exit(1);
}
