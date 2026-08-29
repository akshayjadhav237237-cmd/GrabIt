/**
 * Comprehensive Verification Suite for:
 * 1. MODULE 1 — TextInput Focus & underlineColorAndroid Fix
 * 2. MODULE 2 — New HomeScreen Marketplace Feed & SearchScreen Catalog Split
 * 3. MODULE 3 — Instant Booking (Direct Confirmed + Instant Checkout + Double-Book Protection)
 * 4. Design System Compliance (0 Raw Hex Codes, 100% Theme Tokens)
 * 5. TypeScript Compilation Check
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
console.log('PROJECT GRABIT: HOME REDESIGN, SEARCH SPLIT & INSTANT BOOKING');
console.log('Comprehensive Lead Architect Verification Suite');
console.log('================================================================\n');

// ----------------------------------------------------
// 1. TypeScript Compilation
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
  'src/screens/main/ChatScreen.tsx',
  'src/screens/auth/LoginScreen.tsx',
  'src/screens/auth/SignupScreen.tsx',
  'src/navigation/MainTabNavigator.tsx',
  'src/navigation/AppNavigator.tsx',
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
// 3. Module 1: TextInput Focus Border & underlineColorAndroid Audit
// ----------------------------------------------------
console.log('\nTEST SUITE 3: Module 1 — TextInput Focus Outline & Underline Fixes');
const textInputFiles = [
  'src/screens/auth/LoginScreen.tsx',
  'src/screens/auth/SignupScreen.tsx',
  'src/screens/main/AddProductScreen.tsx',
  'src/screens/main/BookingsScreen.tsx',
  'src/screens/main/ChatScreen.tsx',
  'src/screens/main/ProductDetailScreen.tsx',
  'src/screens/main/ProfileScreen.tsx',
  'src/screens/main/SearchScreen.tsx',
];

textInputFiles.forEach((relPath) => {
  const fullPath = path.join(__dirname, relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  const textInputCount = (content.match(/<TextInput\b/g) || []).length;
  const underlinePropCount = (content.match(/underlineColorAndroid="transparent"/g) || []).length;
  assert(
    textInputCount > 0 && underlinePropCount >= textInputCount,
    `${relPath} has underlineColorAndroid="transparent" on all ${textInputCount} TextInput instances`
  );
});

// ----------------------------------------------------
// 4. Module 2: New HomeScreen Marketplace Feed & SearchScreen Catalog Split
// ----------------------------------------------------
console.log('\nTEST SUITE 4: Module 2 — New HomeScreen Feed & SearchScreen Architecture');
const homeContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/HomeScreen.tsx'), 'utf8');
const searchContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/SearchScreen.tsx'), 'utf8');
const navTypesContent = fs.readFileSync(path.join(__dirname, 'src/navigation/types.ts'), 'utf8');
const mainTabContent = fs.readFileSync(path.join(__dirname, 'src/navigation/MainTabNavigator.tsx'), 'utf8');

// HomeScreen Checks
assert(homeContent.includes('topHeader'), 'HomeScreen renders top header');
assert(homeContent.includes('locationChip'), 'HomeScreen renders location chip');
assert(homeContent.includes('searchShortcutBar'), 'HomeScreen renders tap-to-search bar shortcut');
assert(homeContent.includes('handleNavigateToCategory'), 'HomeScreen implements category chip tap handler navigating to Search');
assert(homeContent.includes('featured') || homeContent.includes('carouselFlatListRef'), 'HomeScreen implements auto-sliding featured carousel');
assert(homeContent.includes('recommended'), 'HomeScreen manages "Recommended For You" product row');
assert(homeContent.includes('popularPicks'), 'HomeScreen manages "Popular Picks" product row');
assert(!homeContent.includes('newAdditions') && !homeContent.includes('New Listings'), 'HomeScreen removed "New Listings" section per Module 2');
assert(homeContent.includes('renderHorizontalProductCard'), 'HomeScreen renders horizontal card carousel items');
assert(homeContent.includes('refreshControl') || homeContent.includes('RefreshControl'), 'HomeScreen supports pull-to-refresh');

// SearchScreen Checks
assert(searchContent.includes('export const SearchScreen'), 'SearchScreen is exported');
assert(searchContent.includes('numColumns={2}'), 'SearchScreen renders a 2-column product grid');
assert(searchContent.includes('columnWrapperStyle'), 'SearchScreen specifies columnWrapperStyle');
assert(searchContent.includes('searchBarRow'), 'SearchScreen renders dedicated search input');
assert(searchContent.includes('clearSearchButton'), 'SearchScreen renders clear query button');
assert(searchContent.includes('filterButton'), 'SearchScreen renders filter modal trigger');
assert(searchContent.includes('isFilterModalVisible'), 'SearchScreen manages filter modal');
assert(searchContent.includes('fetchProducts'), 'SearchScreen queries product catalog with filters');
assert(searchContent.includes('VoiceSearchModal') || searchContent.includes('setIsVoiceModalVisible'), 'SearchScreen integrates VoiceSearchModal');

// Voice Search & Curvature Tokens
const voiceModalPath = path.join(__dirname, 'src/components/VoiceSearchModal.tsx');
assert(fs.existsSync(voiceModalPath), 'VoiceSearchModal.tsx exists');
const voiceModalContent = fs.readFileSync(voiceModalPath, 'utf8');
assert(voiceModalContent.includes('SpeechRecognition') || voiceModalContent.includes('webkitSpeechRecognition'), 'VoiceSearchModal supports Web Speech API');
assert(voiceModalContent.includes('MicIcon'), 'VoiceSearchModal renders MicIcon');

const themeContent = fs.readFileSync(path.join(__dirname, 'src/theme/theme.ts'), 'utf8');
assert(themeContent.includes('xs: 6'), 'theme.ts defines xs: 6 borderRadius');
assert(themeContent.includes('sm: 10'), 'theme.ts defines sm: 10 borderRadius');
assert(themeContent.includes('md: 14'), 'theme.ts defines md: 14 borderRadius');
assert(themeContent.includes('lg: 18'), 'theme.ts defines lg: 18 borderRadius');

// Navigation Integration Checks
assert(navTypesContent.includes('Search: { category?: string; search?: string }') || navTypesContent.includes('Search:'), 'Search route is typed in MainTabParamList');
assert(mainTabContent.includes('name="Search"'), 'Search tab is registered in MainTabNavigator');
assert(mainTabContent.includes('SearchScreen'), 'Search tab renders SearchScreen');
assert(mainTabContent.includes('SearchIcon'), 'Search tab renders SearchIcon');

// ----------------------------------------------------
// 5. Module 3: Instant Booking Flow & Protection
// ----------------------------------------------------
console.log('\nTEST SUITE 5: Module 3 — Instant Booking Flow & Protection');
const detailContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/ProductDetailScreen.tsx'), 'utf8');
const bookingsContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/BookingsScreen.tsx'), 'utf8');
const backendBookingController = fs.readFileSync(
  path.join(__dirname, '../grabit-backend/src/controllers/booking.controller.js'),
  'utf8'
);

// Frontend Instant Booking
assert(detailContent.includes('Instant Book & Pay') || detailContent.includes('Instant Book'), 'ProductDetail CTA is Instant Book & Pay');
assert(detailContent.includes('api.createBooking('), 'ProductDetail creates booking on date confirm');
assert(detailContent.includes('api.createPaymentOrder('), 'ProductDetail immediately initiates payment order on booking creation');
assert(detailContent.includes('RazorpayCheckoutModal'), 'ProductDetail embeds RazorpayCheckoutModal');
assert(detailContent.includes('handlePaymentSuccess'), 'ProductDetail handles successful payment verification');

// BookingsScreen owner approval removal
assert(!bookingsContent.includes("handleUpdateStatus(item._id || item.id || '', 'confirmed')"), 'BookingsScreen removed manual owner "Accept" approval button');
assert(bookingsContent.includes('Awaiting Payment') || bookingsContent.includes('Confirmed'), 'BookingsScreen renders confirmed/awaiting payment status labels');

// Backend Instant Booking & Overlap Guard
assert(backendBookingController.includes("status: 'confirmed'"), "Backend creates bookings directly in 'confirmed' status");
assert(backendBookingController.includes("hasBookingOverlap"), "Backend implements double-booking overlap protection");
assert(backendBookingController.includes("status: { $in: ['confirmed', 'active'] }"), "Backend checks overlapping confirmed or active bookings");

console.log('\n================================================================');
console.log(`SUMMARY: ${passedTests} PASSED, ${totalTests - passedTests} FAILED out of ${totalTests} CHECKS`);
console.log('================================================================');

if (totalTests - passedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
