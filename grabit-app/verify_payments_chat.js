const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('PROJECT GRABIT - SUBAGENT B VERIFICATION SUITE');
console.log('Frontend Payments, Chat & Notifications Verification');
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
// 2. Strict Theme Token & Zero Raw Hex Code Verification
// --------------------------------------------------------------------
console.log('\nTEST SUITE 2: Strict Zero Raw Hex Codes Verification');
const hexRegex = /#[0-9a-fA-F]{3,8}/g;

const filesToCheck = [
  'src/services/api.ts',
  'src/services/chat.ts',
  'src/services/notifications.ts',
  'src/components/RazorpayCheckoutModal.tsx',
  'src/screens/main/BookingsScreen.tsx',
  'src/screens/main/ChatScreen.tsx',
  'src/navigation/types.ts',
  'src/navigation/AppNavigator.tsx',
  'src/navigation/MainTabNavigator.tsx',
  'src/context/AuthContext.tsx',
];

for (const file of filesToCheck) {
  const filePath = path.join(__dirname, file);
  assert(fs.existsSync(filePath), `${file} exists`);
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = content.match(hexRegex);
  assert(!matches || matches.length === 0, `${file} contains 0 raw hex codes (matches: ${matches ? matches.length : 0})`);
}

// --------------------------------------------------------------------
// 3. Check api.ts Payment, Chat & Push Token Methods Contract
// --------------------------------------------------------------------
console.log('\nTEST SUITE 3: api.ts Payment, Chat & Push Token Methods Contract');
const apiContent = fs.readFileSync(path.join(__dirname, 'src/services/api.ts'), 'utf8');

assert(apiContent.includes('createPaymentOrder('), 'api.ts exports createPaymentOrder method');
assert(apiContent.includes('create-order') && apiContent.includes("method: 'POST'"), 'createPaymentOrder posts to /api/bookings/:id/create-order');
assert(apiContent.includes('verifyPayment('), 'api.ts exports verifyPayment method');
assert(apiContent.includes('verify-payment') && apiContent.includes("method: 'POST'"), 'verifyPayment posts to /api/bookings/:id/verify-payment');
assert(apiContent.includes('sendMessage('), 'api.ts exports sendMessage method');
assert(apiContent.includes('messages') && apiContent.includes("method: 'POST'"), 'sendMessage posts to /api/bookings/:id/messages');
assert(apiContent.includes('getMessages('), 'api.ts exports getMessages method');
assert(apiContent.includes('messages') && apiContent.includes("method: 'GET'"), 'getMessages gets /api/bookings/:id/messages');
assert(apiContent.includes('updatePushToken('), 'api.ts exports updatePushToken method');
assert(apiContent.includes('/api/users/push-token') && apiContent.includes("method: 'PATCH'"), 'updatePushToken patches /api/users/push-token');
assert(apiContent.includes('export interface ChatMessage'), 'api.ts exports ChatMessage interface');
assert(apiContent.includes('export interface PaymentOrderData'), 'api.ts exports PaymentOrderData interface');
assert(apiContent.includes('export interface VerifyPaymentData'), 'api.ts exports VerifyPaymentData interface');

// --------------------------------------------------------------------
// 4. Functional Simulation: Mock API Invocation Test
// --------------------------------------------------------------------
console.log('\nTEST SUITE 4: Functional API Methods Contract Simulation');
(async () => {
  let lastFetchUrl = '';
  let lastFetchMethod = '';
  let lastFetchHeaders = {};
  let lastFetchBody = '';

  const mockData = {
    success: true,
    data: {
      orderId: 'order_test_123',
      amount: 5000,
      currency: 'INR',
      keyId: 'rzp_test_mock',
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
  testApi.setToken('mock-jwt-subagent-b');

  // Test createPaymentOrder
  const createOrderRes = await testApi.createPaymentOrder('b_pay_1');
  assert(createOrderRes.success === true, 'api.createPaymentOrder returns success: true');
  assert(lastFetchUrl.includes('/bookings/b_pay_1/create-order'), `createPaymentOrder targeted correct endpoint (${lastFetchUrl})`);
  assert(lastFetchMethod === 'POST', 'createPaymentOrder uses POST');
  assert(lastFetchHeaders.Authorization === 'Bearer mock-jwt-subagent-b', 'createPaymentOrder sends Bearer token');

  // Test verifyPayment
  const verifyRes = await testApi.verifyPayment('b_pay_1', {
    razorpay_order_id: 'order_test_123',
    razorpay_payment_id: 'pay_test_456',
    razorpay_signature: 'sig_test_789',
  });
  assert(verifyRes.success === true, 'api.verifyPayment returns success: true');
  assert(lastFetchUrl.includes('/bookings/b_pay_1/verify-payment'), `verifyPayment targeted correct endpoint (${lastFetchUrl})`);
  assert(lastFetchMethod === 'POST', 'verifyPayment uses POST');
  assert(lastFetchBody.includes('order_test_123'), 'verifyPayment sends razorpay_order_id in body');

  // Test sendMessage
  const sendMsgRes = await testApi.sendMessage('b_pay_1', 'Hello lender!');
  assert(sendMsgRes.success === true, 'api.sendMessage returns success: true');
  assert(lastFetchUrl.includes('/bookings/b_pay_1/messages'), `sendMessage targeted correct endpoint (${lastFetchUrl})`);
  assert(lastFetchMethod === 'POST', 'sendMessage uses POST');
  assert(lastFetchBody.includes('Hello lender!'), 'sendMessage sends message text in body');

  // Test getMessages
  const getMsgsRes = await testApi.getMessages('b_pay_1');
  assert(getMsgsRes.success === true, 'api.getMessages returns success: true');
  assert(lastFetchUrl.includes('/bookings/b_pay_1/messages'), `getMessages targeted correct endpoint (${lastFetchUrl})`);
  assert(lastFetchMethod === 'GET', 'getMessages uses GET');

  // Test updatePushToken
  const pushRes = await testApi.updatePushToken('ExponentPushToken[mock_subagent_b]');
  assert(pushRes.success === true, 'api.updatePushToken returns success: true');
  assert(lastFetchUrl.includes('/users/push-token'), `updatePushToken targeted correct endpoint (${lastFetchUrl})`);
  assert(lastFetchMethod === 'PATCH', 'updatePushToken uses PATCH');
  assert(lastFetchBody.includes('ExponentPushToken[mock_subagent_b]'), 'updatePushToken sends push token');

  // --------------------------------------------------------------------
  // 5. Check chat.ts Service Contract
  // --------------------------------------------------------------------
  console.log('\nTEST SUITE 5: chat.ts Service Contract');
  const chatContent = fs.readFileSync(path.join(__dirname, 'src/services/chat.ts'), 'utf8');

  assert(chatContent.includes('export async function sendMessage('), 'chat.ts exports sendMessage function');
  assert(chatContent.includes('export async function getMessages('), 'chat.ts exports getMessages function');
  assert(chatContent.includes('export function subscribeToMessages('), 'chat.ts exports subscribeToMessages function');
  assert(chatContent.includes('api.sendMessage('), 'chat.ts calls api.sendMessage');
  assert(chatContent.includes('api.getMessages('), 'chat.ts calls api.getMessages');
  assert(chatContent.includes('setInterval(') && chatContent.includes('clearInterval('), 'chat.ts sets up real-time listener / periodic poll fallback with cleanup');

  // --------------------------------------------------------------------
  // 6. Check notifications.ts & AuthContext.tsx Push Flow Contract
  // --------------------------------------------------------------------
  console.log('\nTEST SUITE 6: notifications.ts & AuthContext Push Flow Contract');
  const notifContent = fs.readFileSync(path.join(__dirname, 'src/services/notifications.ts'), 'utf8');
  const authContent = fs.readFileSync(path.join(__dirname, 'src/context/AuthContext.tsx'), 'utf8');

  assert(notifContent.includes('export async function registerForPushNotificationsAsync('), 'notifications.ts exports registerForPushNotificationsAsync');
  assert(notifContent.includes('Notifications.requestPermissionsAsync'), 'notifications.ts calls Notifications.requestPermissionsAsync');
  assert(notifContent.includes('Notifications.getExpoPushTokenAsync'), 'notifications.ts calls Notifications.getExpoPushTokenAsync');
  assert(notifContent.includes('api.updatePushToken('), 'notifications.ts syncs token via api.updatePushToken');
  assert(notifContent.includes("Platform.OS === 'web'"), 'notifications.ts safely handles web platform');

  assert(authContent.includes('registerForPushNotificationsAsync'), 'AuthContext imports registerForPushNotificationsAsync');
  assert(authContent.includes('registerForPushNotificationsAsync().catch'), 'AuthContext safely triggers push notification registration without blocking');

  // --------------------------------------------------------------------
  // 7. Check RazorpayCheckoutModal.tsx Contract
  // --------------------------------------------------------------------
  console.log('\nTEST SUITE 7: RazorpayCheckoutModal.tsx Component Contract');
  const modalContent = fs.readFileSync(path.join(__dirname, 'src/components/RazorpayCheckoutModal.tsx'), 'utf8');

  assert(modalContent.includes('react-native-webview'), 'RazorpayCheckoutModal imports react-native-webview');
  assert(modalContent.includes('Standard Expo Go cannot run react-native-razorpay native modules'), 'Clearly flags Expo Go limitation note');
  assert(modalContent.includes('checkout.razorpay.com/v1/checkout.js'), 'Embeds standard Razorpay checkout HTML script');
  assert(modalContent.includes('postMessage('), 'Handles bidirectional postMessage communication');
  assert(modalContent.includes('simulateSuccess') || modalContent.includes('handleFastTestPay'), 'Provides test mode fallback simulation');
  assert(modalContent.includes('onSuccess'), 'Invokes onSuccess callback with payment details');
  assert(modalContent.includes('onCancel'), 'Provides onCancel handler');

  // --------------------------------------------------------------------
  // 8. Check BookingsScreen.tsx Payments & Chat Contract
  // --------------------------------------------------------------------
  console.log('\nTEST SUITE 8: BookingsScreen.tsx Payments & Chat Contract');
  const bookingsContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/BookingsScreen.tsx'), 'utf8');

  assert(bookingsContent.includes('RazorpayCheckoutModal'), 'BookingsScreen imports RazorpayCheckoutModal');
  assert(bookingsContent.includes('handlePayNow'), 'BookingsScreen implements handlePayNow handler');
  assert(bookingsContent.includes('api.createPaymentOrder('), 'handlePayNow calls api.createPaymentOrder');
  assert(bookingsContent.includes('api.verifyPayment('), 'BookingsScreen calls api.verifyPayment on payment completion');
  assert(bookingsContent.includes("status: 'active', paymentStatus: 'paid'") || bookingsContent.includes("paymentStatus: 'paid'"), 'Updates booking status to active/paid');
  assert(bookingsContent.includes("item.status === 'confirmed' && item.paymentStatus === 'unpaid'"), 'Renders Pay Now button for confirmed and unpaid bookings');
  assert(bookingsContent.includes('payNowButton'), 'Styles Pay Now button with dedicated payNowButton style');
  assert(bookingsContent.includes('navigation.navigate(\'Chat\''), 'Navigates to Chat from booking cards');
  assert(bookingsContent.includes('bookingId:') && bookingsContent.includes('otherPartyName:'), 'Passes bookingId and otherPartyName params to Chat');
  assert(bookingsContent.includes('Message Owner') || bookingsContent.includes('Message Renter'), 'Displays 💬 Message button on booking cards');

  // --------------------------------------------------------------------
  // 9. Check ChatScreen.tsx Contract
  // --------------------------------------------------------------------
  console.log('\nTEST SUITE 9: ChatScreen.tsx Implementation Contract');
  const chatScreenContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/ChatScreen.tsx'), 'utf8');

  assert(chatScreenContent.includes('subscribeToMessages('), 'ChatScreen subscribes to messages via subscribeToMessages');
  assert(chatScreenContent.includes('sendMessage('), 'ChatScreen sends messages via sendMessage');
  assert(chatScreenContent.includes('handleGoBack') || chatScreenContent.includes('navigation.goBack'), 'ChatScreen renders back button');
  assert(chatScreenContent.includes('otherPartyName'), 'ChatScreen displays otherPartyName in header');
  assert(chatScreenContent.includes('productTitle'), 'ChatScreen displays productTitle in header');
  assert(chatScreenContent.includes('userBubbleContainer') && chatScreenContent.includes('otherBubbleContainer'), 'Renders distinct user vs other speech bubbles');
  assert(chatScreenContent.includes('primarySurface'), 'Styles user message bubble with primarySurface');
  assert(chatScreenContent.includes('surfaceSubtle') || chatScreenContent.includes('theme.colors.surface'), 'Styles other party message bubble with surface/surfaceSubtle');
  assert(chatScreenContent.includes('formatTimestamp'), 'Renders message timestamps');
  assert(chatScreenContent.includes('senderDisplayName'), 'Renders sender displayName');
  assert(chatScreenContent.includes('TextInput') && chatScreenContent.includes('sendButton'), 'Renders bottom input bar with TextInput and Send button');
  assert(chatScreenContent.includes('disabled={!canSend}'), 'Disables Send button when input is empty or sending');
  assert(chatScreenContent.includes('scrollToEnd('), 'Auto-scrolls to bottom on new messages');

  // --------------------------------------------------------------------
  // 10. Check Navigation Configuration
  // --------------------------------------------------------------------
  console.log('\nTEST SUITE 10: Navigation Configuration');
  const navTypes = fs.readFileSync(path.join(__dirname, 'src/navigation/types.ts'), 'utf8');
  const appNav = fs.readFileSync(path.join(__dirname, 'src/navigation/AppNavigator.tsx'), 'utf8');
  const mainNav = fs.readFileSync(path.join(__dirname, 'src/navigation/MainTabNavigator.tsx'), 'utf8');

  assert(navTypes.includes('Chat: ChatScreenParams') || navTypes.includes('Chat: { bookingId: string') || navTypes.includes('Chat:'), 'Chat is typed in ParamList');
  assert(appNav.includes('name="Chat"') && appNav.includes('component={ChatScreen}'), 'Chat is registered in AppNavigator stack');

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
})();
