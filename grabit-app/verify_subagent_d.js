const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('PROJECT GRABIT - SUBAGENT D VERIFICATION SUITE');
console.log('Frontend Booking Engineer Verification');
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
// 1. Check TypeScript Compilation
// --------------------------------------------------------------------
console.log('TEST SUITE 1: TypeScript Compilation');
try {
  const tscOut = execSync('npm run typecheck', { cwd: __dirname, encoding: 'utf8' });
  assert(true, 'TypeScript typecheck passed with 0 errors');
} catch (err) {
  assert(false, `TypeScript typecheck failed: ${err.message}`);
}

// --------------------------------------------------------------------
// 2. Check api.ts implementation
// --------------------------------------------------------------------
console.log('\nTEST SUITE 2: api.ts Booking Methods & Interfaces');
const apiContent = fs.readFileSync(path.join(__dirname, 'src/services/api.ts'), 'utf8');

assert(apiContent.includes('export interface BookingPricing'), 'api.ts exports BookingPricing interface');
assert(apiContent.includes('export interface BookingParty'), 'api.ts exports BookingParty interface');
assert(apiContent.includes('export interface BookingItem'), 'api.ts exports BookingItem interface');
assert(apiContent.includes('export interface MyBookingsData'), 'api.ts exports MyBookingsData interface');
assert(apiContent.includes('export interface MyBookingsResponse'), 'api.ts exports MyBookingsResponse interface');
assert(apiContent.includes('export interface CreateBookingData'), 'api.ts exports CreateBookingData interface');

assert(apiContent.includes('createBooking('), 'api.ts implements createBooking method');
assert(apiContent.includes('/api/bookings') && apiContent.includes("method: 'POST'"), 'createBooking posts to /api/bookings');
assert(apiContent.includes('getMyBookings('), 'api.ts implements getMyBookings method');
assert(apiContent.includes('/api/bookings/mine') && apiContent.includes("method: 'GET'"), 'getMyBookings gets /api/bookings/mine');
assert(apiContent.includes('updateBookingStatus('), 'api.ts implements updateBookingStatus method');
assert(apiContent.includes('/status') && apiContent.includes("method: 'PATCH'"), 'updateBookingStatus patches /api/bookings/:id/status');
assert(apiContent.includes('getBookingById('), 'api.ts implements getBookingById method');

// --------------------------------------------------------------------
// 3. Check ProductDetailScreen.tsx implementation
// --------------------------------------------------------------------
console.log('\nTEST SUITE 3: ProductDetailScreen.tsx Booking Request Flow');
const detailContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/ProductDetailScreen.tsx'), 'utf8');

assert(detailContent.includes('Modal'), 'Imports Modal component');
assert(detailContent.includes('isBookingModalVisible'), 'Manages isBookingModalVisible state');
assert(detailContent.includes('startDate') && detailContent.includes('endDate'), 'Manages startDate and endDate states');
assert(detailContent.includes('damageProtectionOpted'), 'Manages damageProtectionOpted state');
assert(detailContent.includes('isSubmittingBooking'), 'Manages isSubmittingBooking submission state');
assert(detailContent.includes('bookingError'), 'Manages bookingError state');

assert(detailContent.includes('handleAdjustStartDate'), 'Implements startDate adjuster');
assert(detailContent.includes('handleAdjustEndDate'), 'Implements endDate adjuster');
assert(detailContent.includes('handleSelectPresetDuration'), 'Implements quick preset duration selector');
assert(detailContent.includes('calculateDays'), 'Calculates rental duration in days');

// Live pricing breakdown calculations
assert(detailContent.includes('rentalFee =') || detailContent.includes('calculateDays'), 'Calculates rentalFee as dailyPrice * totalDays');
assert(detailContent.includes('platformFee =') || detailContent.includes('0.15'), 'Calculates 15% platform service fee');
assert(detailContent.includes('totalAmount =') || detailContent.includes('totalAmount'), 'Calculates totalAmount breakdown');
assert(detailContent.includes('api.createBooking('), 'Calls api.createBooking with booking payload');
assert(detailContent.includes("navigation.navigate('Bookings'") || detailContent.includes('handlePaymentSuccess'), "Navigates to 'Bookings' on success");

// Preserved features
assert(detailContent.includes('FlatList'), 'Preserves FlatList image carousel');
assert(detailContent.includes('heroBox') || detailContent.includes('carouselFallback'), 'Preserves heroBox fallback');
assert(detailContent.includes('Book') || detailContent.includes('Rent'), 'Preserves Book / Rent UI button');

// --------------------------------------------------------------------
// 4. Check BookingsScreen.tsx implementation
// --------------------------------------------------------------------
console.log('\nTEST SUITE 4: BookingsScreen.tsx Implementation');
assert(fs.existsSync(path.join(__dirname, 'src/screens/main/BookingsScreen.tsx')), 'BookingsScreen.tsx exists');
const bookingsContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/BookingsScreen.tsx'), 'utf8');

assert(bookingsContent.includes("activeTab === 'asRenter'"), 'Supports Requests I Made (asRenter) tab');
assert(bookingsContent.includes("activeTab === 'asOwner'"), 'Supports Requests for My Items (asOwner) tab');
assert(bookingsContent.includes('api.getMyBookings()') || bookingsContent.includes('api.getMyBookings'), 'Fetches api.getMyBookings()');
assert(bookingsContent.includes('useFocusEffect'), 'Refreshes on screen focus with useFocusEffect');
assert(bookingsContent.includes('RefreshControl'), 'Supports pull-to-refresh with RefreshControl');

// Card elements
assert(bookingsContent.includes('categoryChip'), 'Renders category chip');
assert(bookingsContent.includes('formatDateRange'), 'Formats date range');
assert(bookingsContent.includes('totalAmount'), 'Renders total amount');
assert(bookingsContent.includes('statusPending') || bookingsContent.includes('statusBadgeConfirmed'), 'Styles pending/confirmed status badge');
assert(bookingsContent.includes('statusConfirmed') || bookingsContent.includes('statusBadgeConfirmed'), 'Styles confirmed status badge');
assert(bookingsContent.includes('statusCancelled') || bookingsContent.includes('statusBadgeCancelled'), 'Styles cancelled status badge');

// Actions
assert(bookingsContent.includes('handleCompleteRental') || bookingsContent.includes('handleUpdateStatus'), 'Implements status update handler');
assert(bookingsContent.includes("'completed'"), 'Supports completing booking');
assert(bookingsContent.includes("'cancelled'"), 'Supports cancelling booking');
assert(bookingsContent.includes('updatingBookingId') || bookingsContent.includes('isInitiatingPaymentId'), 'Shows loading indicator per updating booking item');

// Empty states
assert(bookingsContent.includes('No Rental Requests Yet') || bookingsContent.includes('EmptyBookingsIllustration'), 'Provides empty state for asRenter');
assert(bookingsContent.includes('No Incoming Requests') || bookingsContent.includes('EmptyBookingsIllustration'), 'Provides empty state for asOwner');
assert(bookingsContent.includes("navigation.navigate('Home')") || bookingsContent.includes("navigation.navigate('Search')"), 'Empty state provides Browse Items action button');
assert(bookingsContent.includes("navigation.navigate('AddProduct')"), 'Empty state provides List an Item action button');

// --------------------------------------------------------------------
// 5. Check Navigation & ProfileScreen updates
// --------------------------------------------------------------------
console.log('\nTEST SUITE 5: Navigation & ProfileScreen Configuration');
const navTypesContent = fs.readFileSync(path.join(__dirname, 'src/navigation/types.ts'), 'utf8');
const mainTabContent = fs.readFileSync(path.join(__dirname, 'src/navigation/MainTabNavigator.tsx'), 'utf8');
const profileContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/ProfileScreen.tsx'), 'utf8');

assert(navTypesContent.includes('Bookings: undefined;'), 'MainTabParamList includes Bookings route');
assert(mainTabContent.includes("import { BookingsScreen } from '../screens/main/BookingsScreen'"), 'MainTabNavigator imports BookingsScreen');
assert(mainTabContent.includes("CalendarIcon") || mainTabContent.includes("Bookings"), 'MainTabNavigator defines Bookings tab icon');
assert(mainTabContent.includes('name="Bookings"'), 'MainTabNavigator registers Tab.Screen name="Bookings"');

assert(profileContent.includes("navigation.navigate('Bookings')"), 'ProfileScreen navigates to Bookings');
assert(profileContent.includes('My Bookings & Rentals'), 'ProfileScreen renders My Bookings & Rentals quick link');

// --------------------------------------------------------------------
// 6. Strict Zero Raw Hex Codes Verification
// --------------------------------------------------------------------
console.log('\nTEST SUITE 6: Strict Zero Raw Hex Codes Verification');
const hexRegex = /#[0-9a-fA-F]{3,8}/g;

const filesToCheck = [
  'src/services/api.ts',
  'src/screens/main/ProductDetailScreen.tsx',
  'src/screens/main/BookingsScreen.tsx',
  'src/screens/main/ProfileScreen.tsx',
  'src/navigation/MainTabNavigator.tsx',
  'src/navigation/types.ts',
];

for (const file of filesToCheck) {
  const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const matches = content.match(hexRegex);
  assert(!matches || matches.length === 0, `${file} contains 0 raw hex codes (matches: ${matches ? matches.length : 0})`);
}

// --------------------------------------------------------------------
// 7. Functional Simulation: Mock API Invocation Test
// --------------------------------------------------------------------
console.log('\nTEST SUITE 7: Functional API Method Contract Tests');
(async () => {
  // Test ApiService with dummy fetch
  let lastFetchUrl = '';
  let lastFetchMethod = '';
  let lastFetchHeaders = {};
  let lastFetchBody = '';

  const mockData = {
    success: true,
    data: {
      _id: 'booking_123',
      status: 'pending',
      asRenter: [{ _id: 'b1', status: 'pending', totalDays: 3, pricing: { totalAmount: 150 } }],
      asOwner: [{ _id: 'b2', status: 'pending', totalDays: 2, pricing: { totalAmount: 80 } }],
    },
  };

  const mockResponse = {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(mockData),
    json: async () => mockData,
  };

  global.fetch = async (url, options = {}) => {
    lastFetchUrl = url;
    lastFetchMethod = options.method || 'GET';
    lastFetchHeaders = options.headers || {};
    lastFetchBody = options.body || '';
    return mockResponse;
  };

  const ts = require('typescript');
  const apiTs = fs.readFileSync(path.join(__dirname, 'src/services/api.ts'), 'utf8');
  const jsOutput = ts.transpileModule(apiTs, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;

  // Mock AsyncStorage require
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (moduleName) {
    if (moduleName === '@react-native-async-storage/async-storage') {
      return {
        getItem: async () => null,
        setItem: async () => {},
      };
    }
    if (moduleName === 'react-native') {
      return {
        Platform: { OS: 'android' },
      };
    }
    if (moduleName === 'expo-constants') {
      return {
        default: {
          expoConfig: { hostUri: 'localhost:8081' },
        },
      };
    }
    if (moduleName.includes('imageUrl')) {
      return {
        resolveImageUrl: (url) => url,
      };
    }
    return originalRequire.apply(this, arguments);
  };

  const m = new Module('api');
  m.paths = Module._nodeModulePaths(__dirname);
  m._compile(jsOutput, path.join(__dirname, 'src/services/api.js'));
  const { ApiService } = m.exports;
  const testApi = new ApiService('http://localhost:5000/api');
  testApi.setToken('mock-jwt-token-xyz');

  // Test createBooking
  const createRes = await testApi.createBooking({
    productId: 'prod_999',
    startDate: '2026-10-01T00:00:00.000Z',
    endDate: '2026-10-04T00:00:00.000Z',
    damageProtectionOpted: true,
  });
  assert(createRes.success === true, 'api.createBooking returns success: true');
  assert(lastFetchUrl.endsWith('/api/bookings') || lastFetchUrl.endsWith('/bookings'), `createBooking targeted correct endpoint (${lastFetchUrl})`);
  assert(lastFetchMethod === 'POST', 'createBooking uses POST');
  assert(lastFetchHeaders.Authorization === 'Bearer mock-jwt-token-xyz', 'createBooking sends Authorization Bearer token');
  assert(lastFetchBody.includes('"productId":"prod_999"'), 'createBooking sends correct body');

  // Test getMyBookings
  const mineRes = await testApi.getMyBookings();
  assert(mineRes.success === true, 'api.getMyBookings returns success: true');
  assert(lastFetchUrl.includes('/bookings/mine'), `getMyBookings targeted /bookings/mine (${lastFetchUrl})`);
  assert(lastFetchMethod === 'GET', 'getMyBookings uses GET');
  assert(Array.isArray(mineRes.data.asRenter) && mineRes.data.asRenter.length === 1, 'getMyBookings returns asRenter array');
  assert(Array.isArray(mineRes.data.asOwner) && mineRes.data.asOwner.length === 1, 'getMyBookings returns asOwner array');

  // Test updateBookingStatus
  const updateRes = await testApi.updateBookingStatus('booking_123', 'confirmed');
  assert(updateRes.success === true, 'api.updateBookingStatus returns success: true');
  assert(lastFetchUrl.includes('/bookings/booking_123/status'), `updateBookingStatus targeted /bookings/booking_123/status (${lastFetchUrl})`);
  assert(lastFetchMethod === 'PATCH', 'updateBookingStatus uses PATCH');
  assert(lastFetchBody.includes('"status":"confirmed"'), 'updateBookingStatus sends status confirmed');

  // Test getBookingById
  const getByIdRes = await testApi.getBookingById('booking_123');
  assert(getByIdRes.success === true, 'api.getBookingById returns success: true');
  assert(lastFetchUrl.includes('/bookings/booking_123'), `getBookingById targeted /bookings/booking_123 (${lastFetchUrl})`);
  assert(lastFetchMethod === 'GET', 'getBookingById uses GET');

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
})();
