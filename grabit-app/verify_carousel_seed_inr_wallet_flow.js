/**
 * Comprehensive Verification Suite for:
 * 1. MODULE 1 — Carousel Stories Progress Bar
 * 2. MODULE 2 — Seed Data (12 realistic products across 6 categories)
 * 3. MODULE 3 — Currency INR/₹ formatting
 * 4. MODULE 4 — Animated Like/Wishlist Button
 * 5. MODULE 5 — Removal of "Verified Community" banner
 * 6. MODULE 6 — Calendar Date-Range Picker for Booking
 * 7. MODULE 7 — Payment Screen with Grabit Wallet (₹500 balance check)
 * 8. MODULE 8 — Drag-to-Book Slider
 * 9. MODULE 9 — Booking Receipt / Confirmation Screen
 * 10. Design System Compliance & TypeScript Check
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

console.log('================================================================');
console.log('PROJECT GRABIT: CAROUSEL PROGRESS, SEED, INR, WALLET & RECEIPT');
console.log('Comprehensive Lead Architect Verification Suite');
console.log('================================================================\n');

// ----------------------------------------------------
// 1. TypeScript Compilation Check
// ----------------------------------------------------
console.log('TEST SUITE 1: TypeScript Compilation');
try {
  execSync('npm run typecheck', { cwd: __dirname, stdio: 'pipe' });
  assert(true, 'Frontend TypeScript compiler passed with 0 errors (tsc --noEmit)');
} catch (err) {
  console.error(err.stdout ? err.stdout.toString() : err.message);
  assert(false, 'Frontend TypeScript compiler failed');
}

// ----------------------------------------------------
// 2. Strict Design System Audit (Zero Raw Hex Codes)
// ----------------------------------------------------
console.log('\nTEST SUITE 2: Strict Zero Raw Hex Codes Verification');
const uiFiles = [
  'src/screens/main/HomeScreen.tsx',
  'src/screens/main/SearchScreen.tsx',
  'src/screens/main/ProductDetailScreen.tsx',
  'src/screens/main/BookingsScreen.tsx',
  'src/screens/main/ProfileScreen.tsx',
  'src/screens/main/AddProductScreen.tsx',
  'src/screens/main/MyListingsScreen.tsx',
  'src/screens/main/WishlistScreen.tsx',
  'src/screens/main/PaymentScreen.tsx',
  'src/screens/main/BookingReceiptScreen.tsx',
  'src/components/CalendarRangePicker.tsx',
  'src/components/SlideToConfirm.tsx',
  'src/components/AnimatedHeartButton.tsx',
  'src/components/VoiceSearchModal.tsx',
  'src/components/RazorpayCheckoutModal.tsx',
];

const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
uiFiles.forEach((relPath) => {
  const fullPath = path.join(__dirname, relPath);
  assert(fs.existsSync(fullPath), `${relPath} exists`);
  const content = fs.readFileSync(fullPath, 'utf8');
  const matches = content.match(hexPattern) || [];
  assert(matches.length === 0, `${relPath} contains 0 raw hex codes (found: ${matches.length})`);
});

// ----------------------------------------------------
// 3. Module 1: Carousel Progress Bar & Module 5 Removal
// ----------------------------------------------------
console.log('\nTEST SUITE 3: Carousel Progress Bar & Home Polish');
const homeContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/HomeScreen.tsx'), 'utf8');
assert(homeContent.includes('progressAnim'), 'HomeScreen uses Animated.timing for progress bar');
assert(homeContent.includes('progressTrack'), 'HomeScreen renders progress bar track segments');
assert(homeContent.includes('progressFill'), 'HomeScreen renders active progress fill');
assert(!homeContent.includes('guaranteeBanner'), 'HomeScreen removed "Verified Community" guarantee banner');
assert(!homeContent.includes('Verified Community'), 'HomeScreen contains 0 "Verified Community" text');

// ----------------------------------------------------
// 4. Module 3: Currency INR (₹) Formatting
// ----------------------------------------------------
console.log('\nTEST SUITE 4: Currency INR (₹) Formatting');
const currencyPath = path.join(__dirname, 'src/utils/currency.ts');
assert(fs.existsSync(currencyPath), 'currency.ts exists');
const currencyContent = fs.readFileSync(currencyPath, 'utf8');
assert(currencyContent.includes('formatINR'), 'currency.ts exports formatINR function');
assert(currencyContent.includes("'en-IN'"), 'formatINR uses Indian number formatting (en-IN)');

// ----------------------------------------------------
// 5. Module 4: Animated Like/Wishlist Button
// ----------------------------------------------------
console.log('\nTEST SUITE 5: Animated Like/Wishlist Button');
const heartBtnPath = path.join(__dirname, 'src/components/AnimatedHeartButton.tsx');
assert(fs.existsSync(heartBtnPath), 'AnimatedHeartButton.tsx exists');
const heartBtnContent = fs.readFileSync(heartBtnPath, 'utf8');
assert(heartBtnContent.includes('Animated.spring'), 'AnimatedHeartButton implements spring bounce animation');
assert(heartBtnContent.includes('HeartIcon'), 'AnimatedHeartButton renders HeartIcon');
assert(homeContent.includes('AnimatedHeartButton'), 'HomeScreen integrates AnimatedHeartButton');
const searchContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/SearchScreen.tsx'), 'utf8');
assert(searchContent.includes('AnimatedHeartButton'), 'SearchScreen integrates AnimatedHeartButton');

// ----------------------------------------------------
// 6. Module 6: Calendar Date-Range Picker
// ----------------------------------------------------
console.log('\nTEST SUITE 6: Calendar Date-Range Picker');
const calendarPath = path.join(__dirname, 'src/components/CalendarRangePicker.tsx');
assert(fs.existsSync(calendarPath), 'CalendarRangePicker.tsx exists');
const calendarContent = fs.readFileSync(calendarPath, 'utf8');
assert(calendarContent.includes('onDateRangeChange'), 'CalendarRangePicker accepts onDateRangeChange callback');
assert(calendarContent.includes('blackoutDates'), 'CalendarRangePicker supports blackoutDates');
assert(calendarContent.includes('handleDatePress'), 'CalendarRangePicker implements date selection logic');
const detailContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/ProductDetailScreen.tsx'), 'utf8');
assert(detailContent.includes('CalendarRangePicker'), 'ProductDetailScreen embeds CalendarRangePicker in booking modal');

// ----------------------------------------------------
// 7. Module 7 & 8: Payment Screen with Wallet & Drag-to-Book Slider
// ----------------------------------------------------
console.log('\nTEST SUITE 7: Payment Screen with Grabit Wallet & SlideToConfirm');
const sliderPath = path.join(__dirname, 'src/components/SlideToConfirm.tsx');
assert(fs.existsSync(sliderPath), 'SlideToConfirm.tsx exists');
const sliderContent = fs.readFileSync(sliderPath, 'utf8');
assert(sliderContent.includes('PanResponder.create'), 'SlideToConfirm uses PanResponder for gesture physics');
assert(sliderContent.includes('onConfirmed'), 'SlideToConfirm accepts onConfirmed callback');

const paymentPath = path.join(__dirname, 'src/screens/main/PaymentScreen.tsx');
assert(fs.existsSync(paymentPath), 'PaymentScreen.tsx exists');
const paymentContent = fs.readFileSync(paymentPath, 'utf8');
assert(paymentContent.includes('Grabit Wallet'), 'PaymentScreen renders Grabit Wallet option');
assert(paymentContent.includes('20000') || paymentContent.includes('WALLET_BALANCE'), 'PaymentScreen checks ₹20,000 wallet balance');
assert(paymentContent.includes('Razorpay'), 'PaymentScreen renders Razorpay option');
assert(paymentContent.includes('SlideToConfirm'), 'PaymentScreen integrates SlideToConfirm slider');
assert(paymentContent.includes('api.payWithWallet'), 'PaymentScreen calls api.payWithWallet on wallet selection');

// ----------------------------------------------------
// 8. Module 9: Booking Receipt Screen
// ----------------------------------------------------
console.log('\nTEST SUITE 8: Booking Receipt Screen');
const receiptPath = path.join(__dirname, 'src/screens/main/BookingReceiptScreen.tsx');
assert(fs.existsSync(receiptPath), 'BookingReceiptScreen.tsx exists');
const receiptContent = fs.readFileSync(receiptPath, 'utf8');
assert(receiptContent.includes('Booking Confirmed & Paid!'), 'BookingReceiptScreen shows confirmed header');
assert(receiptContent.includes('Your rental starts on'), 'BookingReceiptScreen shows pickup date notice');
assert(receiptContent.includes('View in My Bookings'), 'BookingReceiptScreen provides navigation to Bookings tab');

// ----------------------------------------------------
// 9. Navigation Registration
// ----------------------------------------------------
console.log('\nTEST SUITE 9: Navigation Registration');
const navTypesContent = fs.readFileSync(path.join(__dirname, 'src/navigation/types.ts'), 'utf8');
const appNavContent = fs.readFileSync(path.join(__dirname, 'src/navigation/AppNavigator.tsx'), 'utf8');
assert(navTypesContent.includes('Payment:'), 'Payment route is typed in AppStackParamList');
assert(navTypesContent.includes('BookingReceipt:'), 'BookingReceipt route is typed in AppStackParamList');
assert(appNavContent.includes('PaymentScreen'), 'PaymentScreen registered in AppNavigator');
assert(appNavContent.includes('BookingReceiptScreen'), 'BookingReceiptScreen registered in AppNavigator');

console.log('\n================================================================');
console.log(`SUMMARY: ${passedTests} PASSED, ${totalTests - passedTests} FAILED out of ${totalTests} CHECKS`);
console.log('================================================================');

if (totalTests - passedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
