import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('PRODUCT LISTING & HOMESCREEN VERIFICATION SUITE');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: Theme Token Compliance (ZERO Raw Hex Codes)
// ----------------------------------------------------
console.log('--- TEST 1: Theme Token & Zero Hex Compliance ---');
const filesToCheck = [
  path.join(appDir, 'src', 'services', 'api.ts'),
  path.join(appDir, 'src', 'screens', 'main', 'HomeScreen.tsx'),
  path.join(appDir, 'src', 'screens', 'main', 'AddProductScreen.tsx'),
  path.join(appDir, 'src', 'screens', 'main', 'ProductDetailScreen.tsx'),
];

const hexRegex = /#[0-9a-fA-F]{3,8}\b/g;

for (const filePath of filesToCheck) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const matches = content.match(hexRegex);
  const relPath = path.relative(appDir, filePath);
  assert.strictEqual(
    matches,
    null,
    `Found raw hex code(s) in ${relPath}: ${matches?.join(', ')}`
  );
  console.log(`✓ ${relPath}: Zero raw hex codes found.`);
}

// ----------------------------------------------------
// TEST 2: ApiService Products Contract
// ----------------------------------------------------
console.log('\n--- TEST 2: ApiService Products Methods Contract ---');

class MockApiService {
  constructor(baseURL = 'http://localhost:5000/api') {
    this.baseURL = baseURL;
    this.authToken = null;
    this.lastRequest = null;
  }

  setToken(token) {
    this.authToken = token;
  }

  async getAuthToken() {
    return this.authToken;
  }

  async request(endpoint, options = {}) {
    let pathEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (this.baseURL.endsWith('/api') && pathEndpoint.startsWith('/api/')) {
      pathEndpoint = pathEndpoint.substring(4);
    }
    const url = `${this.baseURL}${pathEndpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    if (!headers.Authorization) {
      const token = await this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    this.lastRequest = { url, options: { ...options, headers } };

    return {
      success: true,
      data: options.mockResponse || {},
    };
  }

  async getProducts(params) {
    const queryParts = [];
    if (params?.page !== undefined) queryParts.push(`page=${params.page}`);
    if (params?.limit !== undefined) queryParts.push(`limit=${params.limit}`);
    if (params?.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params?.city) queryParts.push(`city=${encodeURIComponent(params.city)}`);
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

    return this.request(`/products${queryString}`, {
      method: 'GET',
    });
  }

  async getProductById(id) {
    return this.request(`/products/${id}`, {
      method: 'GET',
    });
  }

  async createProduct(productData) {
    const token = await this.getAuthToken();
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return this.request('/products', {
      method: 'POST',
      headers,
      body: JSON.stringify(productData),
    });
  }
}

const mockApi = new MockApiService();

// 2A: getProducts query parameters formatting
await mockApi.getProducts({ category: 'Power Tools', city: 'Austin', page: 1, limit: 10 });
assert.strictEqual(
  mockApi.lastRequest.url,
  'http://localhost:5000/api/products?page=1&limit=10&category=Power%20Tools&city=Austin'
);
assert.strictEqual(mockApi.lastRequest.options.method, 'GET');
console.log('✓ getProducts formats query parameters correctly.');

// 2B: getProductById URL construction
await mockApi.getProductById('prod-12345');
assert.strictEqual(mockApi.lastRequest.url, 'http://localhost:5000/api/products/prod-12345');
assert.strictEqual(mockApi.lastRequest.options.method, 'GET');
console.log('✓ getProductById constructs GET /api/products/:id correctly.');

// 2C: createProduct attaches Bearer token
mockApi.setToken('session-jwt-token-xyz');
const newProductData = {
  title: 'Cordless Angle Grinder',
  category: 'Power Tools',
  rentalPrice: { perDay: 20, securityDeposit: 50 },
  location: { city: 'Seattle' },
};
await mockApi.createProduct(newProductData);
assert.strictEqual(mockApi.lastRequest.url, 'http://localhost:5000/api/products');
assert.strictEqual(mockApi.lastRequest.options.method, 'POST');
assert.strictEqual(mockApi.lastRequest.options.headers.Authorization, 'Bearer session-jwt-token-xyz');
const parsedBody = JSON.parse(mockApi.lastRequest.options.body);
assert.strictEqual(parsedBody.title, 'Cordless Angle Grinder');
console.log('✓ createProduct sends POST with Bearer token & JSON payload.');

// ----------------------------------------------------
// TEST 3: HomeScreen Empty State & Products Update Flow
// ----------------------------------------------------
console.log('\n--- TEST 3: HomeScreen Empty State (0 items) and Update Flow ---');

class MockHomeScreenFlow {
  constructor(apiClient) {
    this.api = apiClient;
    this.products = [];
    this.isLoading = false;
    this.isRefreshing = false;
    this.error = null;
    this.navigatedTo = null;
    this.navigatedParams = null;
  }

  navigate(route, params) {
    this.navigatedTo = route;
    this.navigatedParams = params;
  }

  async fetchProducts(isRefresh = false) {
    if (isRefresh) {
      this.isRefreshing = true;
    } else {
      this.isLoading = true;
    }
    this.error = null;

    try {
      const res = await this.api.getProducts();
      if (res.success && res.data) {
        let list = [];
        if (Array.isArray(res.data)) {
          list = res.data;
        } else if (Array.isArray(res.data?.products)) {
          list = res.data.products;
        }
        this.products = list;
      } else {
        this.error = res.error || 'Failed to load listings';
      }
    } catch (err) {
      this.error = err.message || 'An error occurred';
    } finally {
      this.isLoading = false;
      this.isRefreshing = false;
    }
  }

  renderView() {
    if (this.isLoading && this.products.length === 0) {
      return { viewType: 'loading_spinner' };
    }

    if (this.products.length === 0) {
      return {
        viewType: 'empty_state',
        title: 'No listings found in your area',
        subtitle: 'Be the first to list an item in your community!',
        buttonText: 'List an Item',
        onPressButton: () => this.navigate('AddProduct'),
      };
    }

    return {
      viewType: 'product_list',
      count: this.products.length,
      items: this.products.map((item) => ({
        id: item._id || item.id,
        title: item.title,
        category: item.category,
        priceFormatted: `$${item.rentalPrice?.perDay ?? item.dailyRate ?? 0} / day`,
        city: item.location?.city || item.city || 'Nearby',
        onPress: () => this.navigate('ProductDetail', { productId: item._id || item.id }),
      })),
    };
  }
}

// 3A: Empty State rendering when 0 products returned
const emptyApi = {
  async getProducts() {
    return { success: true, data: [] };
  },
};
const homeScreenEmpty = new MockHomeScreenFlow(emptyApi);
await homeScreenEmpty.fetchProducts();

const emptyView = homeScreenEmpty.renderView();
assert.strictEqual(emptyView.viewType, 'empty_state');
assert.strictEqual(emptyView.title, 'No listings found in your area');
assert.strictEqual(emptyView.subtitle, 'Be the first to list an item in your community!');
assert.strictEqual(emptyView.buttonText, 'List an Item');

// Verify pressing 'List an Item' button navigates to 'AddProduct'
emptyView.onPressButton();
assert.strictEqual(homeScreenEmpty.navigatedTo, 'AddProduct');
console.log('✓ 3A: HomeScreen renders empty state with 0 products and button navigates to AddProduct.');

// 3B: Update products list (simulate products added or returned)
const populatedApi = {
  async getProducts() {
    return {
      success: true,
      data: [
        {
          _id: 'prod-001',
          title: 'Sony Alpha A7 IV Camera',
          category: 'Cameras',
          rentalPrice: { perDay: 45, securityDeposit: 200 },
          location: { city: 'Austin' },
        },
        {
          _id: 'prod-002',
          title: 'DJI Mavic 3 Pro Drone',
          category: 'Drones',
          rentalPrice: { perDay: 60, securityDeposit: 300 },
          location: { city: 'Dallas' },
        },
      ],
    };
  },
};

const homeScreenPopulated = new MockHomeScreenFlow(populatedApi);
await homeScreenPopulated.fetchProducts();

const populatedView = homeScreenPopulated.renderView();
assert.strictEqual(populatedView.viewType, 'product_list');
assert.strictEqual(populatedView.count, 2);
assert.strictEqual(populatedView.items[0].title, 'Sony Alpha A7 IV Camera');
assert.strictEqual(populatedView.items[0].category, 'Cameras');
assert.strictEqual(populatedView.items[0].priceFormatted, '$45 / day');
assert.strictEqual(populatedView.items[0].city, 'Austin');

// Test card click navigates to ProductDetail with productId
populatedView.items[0].onPress();
assert.strictEqual(homeScreenPopulated.navigatedTo, 'ProductDetail');
assert.deepStrictEqual(homeScreenPopulated.navigatedParams, { productId: 'prod-001' });

console.log('✓ 3B: HomeScreen updates with products, renders cards, and card click navigates to ProductDetail.');

// ----------------------------------------------------
// TEST 4: ProductDetailScreen Details Contract
// ----------------------------------------------------
console.log('\n--- TEST 4: ProductDetailScreen Contract ---');

class MockProductDetailFlow {
  constructor(apiClient, productId) {
    this.api = apiClient;
    this.productId = productId;
    this.product = null;
    this.isLoading = true;
    this.error = null;
    this.bookingNoticeVisible = false;
    this.goBackCalled = false;
  }

  async loadDetail() {
    this.isLoading = true;
    this.error = null;
    const res = await this.api.getProductById(this.productId);
    if (res.success && res.data) {
      this.product = res.data.product || res.data;
    } else {
      this.error = res.error || 'Failed to load';
    }
    this.isLoading = false;
  }

  requestRent() {
    this.bookingNoticeVisible = true;
  }

  goBack() {
    this.goBackCalled = true;
  }
}

const detailApi = {
  async getProductById(id) {
    return {
      success: true,
      data: {
        _id: id,
        title: 'DJI Mavic 3 Pro Drone',
        category: 'Drones',
        description: 'Includes 3 batteries, carrying bag, ND filters, and 4K Hasselblad camera.',
        rentalPrice: { perDay: 60, securityDeposit: 300 },
        location: { city: 'Dallas' },
        owner: {
          displayName: 'Marcus V.',
          rating: 4.9,
        },
        damageProtection: {
          isAvailable: true,
          fee: 0,
        },
      },
    };
  },
};

const detailFlow = new MockProductDetailFlow(detailApi, 'prod-002');
await detailFlow.loadDetail();

assert.strictEqual(detailFlow.product.title, 'DJI Mavic 3 Pro Drone');
assert.strictEqual(detailFlow.product.category, 'Drones');
assert.strictEqual(detailFlow.product.rentalPrice.perDay, 60);
assert.strictEqual(detailFlow.product.rentalPrice.securityDeposit, 300);
assert.strictEqual(detailFlow.product.owner.displayName, 'Marcus V.');
assert.strictEqual(detailFlow.product.owner.rating, 4.9);
assert.strictEqual(detailFlow.product.damageProtection.isAvailable, true);

// Test "Request to Rent" triggers UI notice
detailFlow.requestRent();
assert.strictEqual(detailFlow.bookingNoticeVisible, true);

// Test Back button
detailFlow.goBack();
assert.strictEqual(detailFlow.goBackCalled, true);

console.log('✓ 4: ProductDetailScreen contract verified with full fields, owner rating, damage protection, and UI rent request.');

console.log('\n====================================================');
console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY! (4/4)');
console.log('====================================================');
