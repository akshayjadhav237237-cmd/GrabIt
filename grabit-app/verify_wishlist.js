/**
 * Module 5 — Wishlist Verification Suite
 * Grabit App
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

console.log('====================================================');
console.log('PROJECT GRABIT - MODULE 5 (WISHLIST) VERIFICATION');
console.log('====================================================\n');

// 1. TypeScript Compilation Check
console.log('TEST SUITE 1: TypeScript Compilation');
try {
  execSync('npm run typecheck', { stdio: 'pipe' });
  assert(true, 'TypeScript typecheck passed with 0 errors');
} catch (err) {
  console.error(err.stdout ? err.stdout.toString() : err.message);
  assert(false, 'TypeScript typecheck failed');
}

// 2. Strict Zero Raw Hex Codes Check
console.log('\nTEST SUITE 2: Strict Zero Raw Hex Codes Check');
const filesToAudit = [
  'src/services/api.ts',
  'src/screens/main/WishlistScreen.tsx',
  'src/screens/main/HomeScreen.tsx',
  'src/screens/main/ProductDetailScreen.tsx',
  'src/screens/main/ProfileScreen.tsx',
  'src/navigation/types.ts',
  'src/navigation/AppNavigator.tsx',
];

const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;
filesToAudit.forEach((relPath) => {
  const fullPath = path.join(__dirname, relPath);
  assert(fs.existsSync(fullPath), `${relPath} exists`);
  const content = fs.readFileSync(fullPath, 'utf8');
  const matches = content.match(hexRegex) || [];
  assert(matches.length === 0, `${relPath} contains 0 raw hex codes (matches: ${matches.length})`);
});

// 3. API Service Wishlist Methods
console.log('\nTEST SUITE 3: api.ts Wishlist Methods');
const apiContent = fs.readFileSync(path.join(__dirname, 'src/services/api.ts'), 'utf8');
assert(apiContent.includes('getWishlist()'), 'api.ts exports getWishlist()');
assert(apiContent.includes("'/api/users/me/wishlist'"), 'getWishlist calls GET /api/users/me/wishlist');
assert(apiContent.includes('addToWishlist('), 'api.ts exports addToWishlist(productId)');
assert(apiContent.includes('`/api/users/me/wishlist/${productId}`'), 'addToWishlist calls POST /api/users/me/wishlist/:productId');
assert(apiContent.includes('removeFromWishlist('), 'api.ts exports removeFromWishlist(productId)');

// 4. WishlistScreen Component
console.log('\nTEST SUITE 4: WishlistScreen.tsx Component');
const wishlistContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/WishlistScreen.tsx'), 'utf8');
assert(wishlistContent.includes('export const WishlistScreen'), 'WishlistScreen is exported');
assert(wishlistContent.includes('api.getWishlist'), 'WishlistScreen fetches wishlist via api.getWishlist');
assert(wishlistContent.includes('useFocusEffect'), 'WishlistScreen uses useFocusEffect to refresh on focus');
assert(wishlistContent.includes('FlatList'), 'WishlistScreen renders FlatList');
assert(wishlistContent.includes('No saved items yet. Tap the heart on any listing to save it here!'), 'WishlistScreen has required empty state text');
assert(wishlistContent.includes('api.removeFromWishlist'), 'WishlistScreen allows removing items via api.removeFromWishlist');
assert(wishlistContent.includes("navigation.navigate('ProductDetail'"), 'WishlistScreen navigates to ProductDetail on tap');

// 5. HomeScreen Heart/Save Toggle
console.log('\nTEST SUITE 5: HomeScreen.tsx Heart Toggle');
const homeContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/HomeScreen.tsx'), 'utf8');
assert(homeContent.includes('wishlistIds'), 'HomeScreen maintains wishlist state');
assert(homeContent.includes('handleToggleWishlist'), 'HomeScreen implements handleToggleWishlist');
assert(homeContent.includes('cardHeart') || homeContent.includes('cardHeartButton'), 'HomeScreen renders heart button on product cards');
assert(homeContent.includes('api.addToWishlist'), 'HomeScreen adds to wishlist');
assert(homeContent.includes('api.removeFromWishlist'), 'HomeScreen removes from wishlist');

// 6. ProductDetailScreen Heart/Save Toggle
console.log('\nTEST SUITE 6: ProductDetailScreen.tsx Heart Toggle');
const detailContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/ProductDetailScreen.tsx'), 'utf8');
assert(detailContent.includes('isSaved'), 'ProductDetailScreen maintains isSaved state');
assert(detailContent.includes('handleToggleWishlist'), 'ProductDetailScreen implements handleToggleWishlist');
assert(detailContent.includes('headerHeartButton') || detailContent.includes('heroHeartBadge'), 'ProductDetailScreen renders heart toggle in header/hero overlay');
assert(detailContent.includes('api.addToWishlist'), 'ProductDetailScreen adds to wishlist');
assert(detailContent.includes('api.removeFromWishlist'), 'ProductDetailScreen removes from wishlist');

// 7. ProfileScreen Navigation Link
console.log('\nTEST SUITE 7: ProfileScreen.tsx Saved Items Link');
const profileContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/ProfileScreen.tsx'), 'utf8');
assert(profileContent.includes('Saved Items (Wishlist)'), 'ProfileScreen renders "Saved Items (Wishlist)" button');
assert(profileContent.includes("navigate('Wishlist')"), 'ProfileScreen navigates to Wishlist');

// 8. Navigation Registration
console.log('\nTEST SUITE 8: Navigation Registration');
const typesContent = fs.readFileSync(path.join(__dirname, 'src/navigation/types.ts'), 'utf8');
const appNavContent = fs.readFileSync(path.join(__dirname, 'src/navigation/AppNavigator.tsx'), 'utf8');
assert(typesContent.includes('Wishlist?: undefined;') || typesContent.includes('Wishlist: undefined;'), 'Wishlist registered in types.ts');
assert(appNavContent.includes('name="Wishlist"'), 'Wishlist Screen registered in AppNavigator.tsx');
assert(appNavContent.includes('component={WishlistScreen}'), 'WishlistScreen mapped in AppNavigator.tsx');

console.log('\n====================================================');
console.log(`SUMMARY: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
console.log('====================================================\n');

if (totalTests !== passedTests) {
  process.exit(1);
}
