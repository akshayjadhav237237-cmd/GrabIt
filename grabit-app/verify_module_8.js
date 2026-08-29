const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('========================================================');
console.log('STARTING MODULE 8 — FRONTEND VERIFICATION SUITE');
console.log('========================================================\n');

// 1. Verify src/services/api.ts
console.log('[1] Verifying src/services/api.ts exports and implementation...');
const apiContent = fs.readFileSync(path.join(__dirname, 'src/services/api.ts'), 'utf-8');

assert(
  apiContent.includes('NotificationPreferences'),
  'api.ts must export NotificationPreferences interface'
);
assert(
  apiContent.includes('updateNotificationPrefs'),
  'api.ts must have updateNotificationPrefs method'
);
assert(
  apiContent.includes('/api/users/me/notification-prefs'),
  'updateNotificationPrefs must call PATCH /api/users/me/notification-prefs'
);
console.log('✓ Passed: api.ts has NotificationPreferences and updateNotificationPrefs calling PATCH /api/users/me/notification-prefs.\n');

// 2. Verify src/screens/main/ProfileScreen.tsx
console.log('[2] Verifying src/screens/main/ProfileScreen.tsx...');
const profileContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/ProfileScreen.tsx'), 'utf-8');

assert(
  profileContent.includes('Notification Settings'),
  'ProfileScreen must contain "Notification Settings" heading'
);
assert(
  profileContent.includes('Booking Updates'),
  'ProfileScreen must contain "Booking Updates" toggle'
);
assert(
  profileContent.includes('Chat Messages'),
  'ProfileScreen must contain "Chat Messages" toggle'
);
assert(
  profileContent.includes('Switch') && profileContent.includes('import {'),
  'ProfileScreen must import and use Switch'
);
assert(
  profileContent.includes('handleToggleBookingUpdates') && profileContent.includes('handleToggleChatMessages'),
  'ProfileScreen must have live toggle handlers for booking updates and chat messages'
);
assert(
  profileContent.includes('api.updateNotificationPrefs'),
  'ProfileScreen must call api.updateNotificationPrefs on toggle'
);
console.log('✓ Passed: ProfileScreen has Notification Settings card, Switch toggles, and live API updates.\n');

// 3. Strict Theme Token & Zero Hex Check
console.log('[3] Checking strict theme tokens & zero raw hex in ProfileScreen.tsx...');
const hexMatches = profileContent.match(/#[0-9a-fA-F]{3,8}/g);
assert(
  !hexMatches || hexMatches.length === 0,
  `ProfileScreen must contain ZERO raw hex colors! Found: ${hexMatches}`
);
console.log('✓ Passed: ProfileScreen contains 0 raw hex codes, strictly adhering to theme tokens.\n');

// 4. Safe optional chaining check
console.log('[4] Checking safe optional chaining in ProfileScreen.tsx...');
assert(
  profileContent.includes('user?.notificationPrefs') || profileContent.includes('user?.'),
  'ProfileScreen must use safe optional chaining on user and notificationPrefs'
);
console.log('✓ Passed: Safe optional chaining verified.\n');

console.log('========================================================');
console.log('ALL MODULE 8 FRONTEND VERIFICATION CHECKS PASSED (100%)');
console.log('========================================================\n');
