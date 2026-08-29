const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('PROJECT GRABIT - SUBAGENT B VERIFICATION SUITE');
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

// 1. Check TypeScript Compilation
console.log('TEST SUITE 1: TypeScript Compilation');
try {
  const tscOut = execSync('npm run typecheck', { cwd: __dirname, encoding: 'utf8' });
  assert(true, 'TypeScript typecheck passed with 0 errors');
} catch (err) {
  assert(false, `TypeScript typecheck failed: ${err.message}`);
}

// 2. Check api.ts implementation
console.log('\nTEST SUITE 2: api.ts Verification');
const apiContent = fs.readFileSync(path.join(__dirname, 'src/services/api.ts'), 'utf8');

assert(apiContent.includes('uploadProductImage('), 'api.ts exports uploadProductImage method');
assert(apiContent.includes('deleteProductImage('), 'api.ts exports deleteProductImage method');
assert(apiContent.includes('/api/products/${productId}/images') || apiContent.includes('/products/${productId}/images'), 'uploadProductImage targets /api/products/${productId}/images');
assert(apiContent.includes("type: 'image/jpeg'"), 'uploadProductImage sets type image/jpeg');
assert(apiContent.includes("name: 'photo.jpg'"), 'uploadProductImage sets name photo.jpg');
assert(apiContent.includes("formData.append('image'"), "uploadProductImage appends 'image' field to FormData");
assert(apiContent.includes('JSON.stringify({ imageUrl })'), 'deleteProductImage sends body { imageUrl }');
assert(apiContent.includes("method: 'DELETE'"), 'deleteProductImage uses DELETE method');
assert(apiContent.includes('isFormData'), 'request method correctly handles FormData without overriding Content-Type');

// 3. Check AddProductScreen.tsx
console.log('\nTEST SUITE 3: AddProductScreen.tsx Verification');
const addProductContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/AddProductScreen.tsx'), 'utf8');

assert(addProductContent.includes("import * as ImagePicker from 'expo-image-picker'"), 'Imports expo-image-picker');
assert(addProductContent.includes('requestMediaLibraryPermissionsAsync'), 'Requests media library permissions');
assert(addProductContent.includes('launchImageLibraryAsync'), 'Calls launchImageLibraryAsync');
assert(addProductContent.includes('allowsMultipleSelection: true'), 'Enables allowsMultipleSelection');
assert(addProductContent.includes('selectedImages.length >= 5'), 'Enforces 5 image maximum selection limit');
assert(addProductContent.includes('removeImage'), 'Implements removeImage handler');
assert(addProductContent.includes('Photos ({selectedImages.length}/5)'), 'Displays photo count badge Photos (X/5)');
assert(addProductContent.includes('✕'), 'Displays remove button (✕) on image thumbnails');
assert(addProductContent.includes('api.createProduct(payload)'), 'Calls api.createProduct on submit');
assert(addProductContent.includes('api.uploadProductImage('), 'Calls api.uploadProductImage sequentially');
assert(addProductContent.includes('Uploading images'), 'Shows upload loading status during image uploads');
assert(addProductContent.includes("navigation.navigate('Home')"), 'Navigates to Home upon completion');

// 4. Check ProductDetailScreen.tsx
console.log('\nTEST SUITE 4: ProductDetailScreen.tsx Verification');
const detailContent = fs.readFileSync(path.join(__dirname, 'src/screens/main/ProductDetailScreen.tsx'), 'utf8');

assert(detailContent.includes('FlatList'), 'Renders FlatList for image carousel');
assert(detailContent.includes('horizontal'), 'FlatList is horizontal');
assert(detailContent.includes('pagingEnabled'), 'FlatList has pagingEnabled enabled');
assert(detailContent.includes('resizeMode="cover"'), 'Carousel Image renders with resizeMode="cover"');
assert(detailContent.includes('paginationDotActive'), 'Defines paginationDotActive style');
assert(detailContent.includes('paginationDotInactive'), 'Defines paginationDotInactive style');
assert(detailContent.includes('backgroundColor: theme.colors.primary'), 'Active dot uses theme.colors.primary');
assert(detailContent.includes('backgroundColor: theme.colors.border'), 'Inactive dot uses theme.colors.border');
assert(detailContent.includes('heroBox'), 'Renders fallback heroBox with category icon when images is empty');
assert(detailContent.includes('Request to Rent'), 'Preserves Request to Rent UI action button');

// 5. Check Hex Code Adherence (ZERO raw hex codes in modified screens & services)
console.log('\nTEST SUITE 5: Zero Raw Hex Code Verification');
const hexRegex = /#[0-9a-fA-F]{3,8}/g;

const filesToCheck = [
  'src/services/api.ts',
  'src/screens/main/AddProductScreen.tsx',
  'src/screens/main/ProductDetailScreen.tsx',
];

for (const file of filesToCheck) {
  const content = fs.readFileSync(path.join(__dirname, file), 'utf8');
  const matches = content.match(hexRegex);
  assert(!matches || matches.length === 0, `${file} contains 0 raw hex codes (matches: ${matches ? matches.length : 0})`);
}

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
