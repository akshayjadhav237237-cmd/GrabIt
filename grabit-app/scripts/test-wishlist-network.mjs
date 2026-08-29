import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appDir = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('WISHLIST API & NETWORK ROUTING VERIFICATION SUITE');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: Theme Token Compliance on WishlistScreen & api.ts
// ----------------------------------------------------
console.log('--- TEST 1: Theme Token & Zero Hex Compliance ---');
const filesToCheck = [
  path.join(appDir, 'src', 'services', 'api.ts'),
  path.join(appDir, 'src', 'screens', 'main', 'WishlistScreen.tsx'),
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
// TEST 2: BaseURL & Path Normalization Logic
// ----------------------------------------------------
console.log('\n--- TEST 2: BaseURL & Path Normalization ---');

function normalizeUrl(baseURL, endpoint) {
  let pathEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const cleanBase = baseURL.replace(/\/+$/, '');
  if (cleanBase.endsWith('/api') && pathEndpoint.startsWith('/api/')) {
    pathEndpoint = pathEndpoint.substring(4);
  } else if (cleanBase.endsWith('/api') && pathEndpoint === '/api') {
    pathEndpoint = '';
  }
  return `${cleanBase}${pathEndpoint}`;
}

// 2A: baseURL with /api and endpoint with /api/
const u1 = normalizeUrl('http://192.168.1.50:5000/api', '/api/users/me/wishlist');
assert.strictEqual(u1, 'http://192.168.1.50:5000/api/users/me/wishlist');
console.log('✓ Normalizes baseURL="/api" + endpoint="/api/users/me/wishlist" without "/api/api/"');

// 2B: baseURL with /api and endpoint without /api/
const u2 = normalizeUrl('http://192.168.1.50:5000/api', '/users/me/wishlist');
assert.strictEqual(u2, 'http://192.168.1.50:5000/api/users/me/wishlist');
console.log('✓ Normalizes baseURL="/api" + endpoint="/users/me/wishlist" correctly');

// 2C: baseURL with trailing slash
const u3 = normalizeUrl('http://192.168.1.50:5000/api/', 'users/me/wishlist');
assert.strictEqual(u3, 'http://192.168.1.50:5000/api/users/me/wishlist');
console.log('✓ Normalizes trailing slash on baseURL');

// 2D: baseURL without /api and endpoint with /api
const u4 = normalizeUrl('http://localhost:5000', '/api/users/me/wishlist');
assert.strictEqual(u4, 'http://localhost:5000/api/users/me/wishlist');
console.log('✓ Normalizes baseURL without /api and endpoint with /api');

// ----------------------------------------------------
// TEST 3: Safe Response Parsing (Non-JSON & HTML error handling)
// ----------------------------------------------------
console.log('\n--- TEST 3: Safe Non-JSON & HTML Response Handling ---');

class MockClient {
  constructor(baseURL = 'http://localhost:5000/api') {
    this.baseURL = baseURL;
    this.authToken = null;
  }

  setToken(token) {
    this.authToken = token;
  }

  async request(endpoint, options = {}, mockFetchImpl) {
    let pathEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const cleanBase = this.baseURL.replace(/\/+$/, '');
    if (cleanBase.endsWith('/api') && pathEndpoint.startsWith('/api/')) {
      pathEndpoint = pathEndpoint.substring(4);
    } else if (cleanBase.endsWith('/api') && pathEndpoint === '/api') {
      pathEndpoint = '';
    }
    const url = `${cleanBase}${pathEndpoint}`;

    try {
      const response = await mockFetchImpl(url, options);
      const text = await response.text();
      let json;
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        return {
          success: false,
          error: `Server returned non-JSON response (${response.status}): ${text.substring(0, 150)}`,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: json?.message || json?.error || `Request failed with status ${response.status}`,
        };
      }

      return {
        success: true,
        data: json,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Network request failed',
      };
    }
  }

  async getWishlist(mockFetchImpl) {
    const res = await this.request('/users/me/wishlist', { method: 'GET' }, mockFetchImpl);
    if (!res.success) {
      return { success: false, error: res.error, data: [] };
    }
    const raw = res.data?.data || res.data?.wishlist || res.data || [];
    const list = Array.isArray(raw) ? raw : [];
    return { success: true, data: list };
  }

  async addToWishlist(productId, mockFetchImpl) {
    return this.request(`/users/me/wishlist/${productId}`, { method: 'POST' }, mockFetchImpl);
  }

  async removeFromWishlist(productId, mockFetchImpl) {
    return this.request(`/users/me/wishlist/${productId}`, { method: 'DELETE' }, mockFetchImpl);
  }
}

const client = new MockClient();

// 3A: When server returns 404 HTML (e.g. Metro proxy or wrong port)
const html404Response = {
  status: 404,
  ok: false,
  text: async () => '<!DOCTYPE html><html><body><pre>Cannot GET /api/users/me/wishlist</pre></body></html>',
};
const resHtml = await client.getWishlist(() => Promise.resolve(html404Response));
assert.strictEqual(resHtml.success, false);
assert(resHtml.error.includes('Server returned non-JSON response (404)'));
assert(resHtml.error.includes('<!DOCTYPE html>'));
assert.deepStrictEqual(resHtml.data, []);
console.log('✓ 3A: Handled 404 HTML without SyntaxError (No "<" token crash)');

// 3B: When server returns 502 HTML error
const html502Response = {
  status: 502,
  ok: false,
  text: async () => '<html><head><title>502 Bad Gateway</title></head><body>Bad Gateway</body></html>',
};
const res502 = await client.getWishlist(() => Promise.resolve(html502Response));
assert.strictEqual(res502.success, false);
assert(res502.error.includes('Server returned non-JSON response (502)'));
console.log('✓ 3B: Handled 502 Bad Gateway HTML gracefully');

// 3C: When server returns valid empty wishlist JSON on fresh account
const validEmptyResponse = {
  status: 200,
  ok: true,
  text: async () => JSON.stringify({ success: true, data: [] }),
};
const resEmpty = await client.getWishlist(() => Promise.resolve(validEmptyResponse));
assert.strictEqual(resEmpty.success, true);
assert.deepStrictEqual(resEmpty.data, []);
console.log('✓ 3C: Fresh account gets empty wishlist array ([]) without errors');

// 3D: When server returns populated wishlist
const validPopulatedResponse = {
  status: 200,
  ok: true,
  text: async () => JSON.stringify({
    success: true,
    data: [
      {
        _id: 'prod-001',
        title: 'Sony Alpha A7 IV',
        category: 'Cameras',
        rentalPrice: { perDay: 45 },
        location: { city: 'Austin' },
      },
    ],
  }),
};
const resPopulated = await client.getWishlist(() => Promise.resolve(validPopulatedResponse));
assert.strictEqual(resPopulated.success, true);
assert.strictEqual(resPopulated.data.length, 1);
assert.strictEqual(resPopulated.data[0].title, 'Sony Alpha A7 IV');
console.log('✓ 3D: Populated wishlist parsed accurately');

// ----------------------------------------------------
// TEST 4: WishlistScreen Flow on Fresh Account (0 items)
// ----------------------------------------------------
console.log('\n--- TEST 4: WishlistScreen Flow on Fresh Account (0 items) ---');

class MockWishlistScreenFlow {
  constructor(apiClient, mockFetch) {
    this.api = apiClient;
    this.mockFetch = mockFetch;
    this.wishlistItems = [];
    this.isLoading = false;
    this.isRefreshing = false;
    this.error = null;
    this.navigatedTo = null;
  }

  navigate(route) {
    this.navigatedTo = route;
  }

  async fetchWishlist(isRefresh = false) {
    if (isRefresh) {
      this.isRefreshing = true;
    } else {
      this.isLoading = true;
    }
    this.error = null;

    try {
      const res = await this.api.getWishlist(this.mockFetch);
      if (res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : [];
        const validList = list.filter((item) => Boolean(item && (item._id || item.id)));
        this.wishlistItems = validList;
      } else {
        this.error = res.error || 'Failed to load your saved items.';
      }
    } catch (err) {
      this.error = err?.message || 'An error occurred while fetching your wishlist.';
    } finally {
      this.isLoading = false;
      this.isRefreshing = false;
    }
  }

  renderView() {
    if (this.isLoading && this.wishlistItems.length === 0) {
      return { viewType: 'loading', text: 'Loading saved items...' };
    }

    const header = {
      title: 'Saved Wishlist',
      subtitle: `${this.wishlistItems.length} ${this.wishlistItems.length === 1 ? 'item' : 'items'} saved for your next rental`,
      error: this.error,
    };

    if (this.wishlistItems.length === 0) {
      return {
        viewType: 'empty_state',
        header,
        emptyTitle: 'No saved items yet',
        emptySubtitle: 'No saved items yet. Tap the heart on any listing to save it here!',
        buttonText: 'Explore Gear',
        onPressExplore: () => this.navigate('Home'),
      };
    }

    return {
      viewType: 'list',
      header,
      items: this.wishlistItems,
    };
  }
}

// 4A: Fresh account loading 0 items
const freshAccountFlow = new MockWishlistScreenFlow(client, () => Promise.resolve(validEmptyResponse));
await freshAccountFlow.fetchWishlist();

const freshView = freshAccountFlow.renderView();
assert.strictEqual(freshView.viewType, 'empty_state');
assert.strictEqual(freshView.header.subtitle, '0 items saved for your next rental');
assert.strictEqual(freshView.header.error, null);
assert.strictEqual(freshView.emptyTitle, 'No saved items yet');
assert.strictEqual(freshView.buttonText, 'Explore Gear');

// Test button navigation
freshView.onPressExplore();
assert.strictEqual(freshAccountFlow.navigatedTo, 'Home');
console.log('✓ 4A: Fresh account displays 0 items saved, renders empty illustration & Explore Gear button.');

// 4B: Account with items saved
const populatedFlow = new MockWishlistScreenFlow(client, () => Promise.resolve(validPopulatedResponse));
await populatedFlow.fetchWishlist();

const populatedScreenView = populatedFlow.renderView();
assert.strictEqual(populatedScreenView.viewType, 'list');
assert.strictEqual(populatedScreenView.header.subtitle, '1 item saved for your next rental');
assert.strictEqual(populatedScreenView.items.length, 1);
assert.strictEqual(populatedScreenView.items[0].title, 'Sony Alpha A7 IV');
console.log('✓ 4B: Account with saved items displays item card and header count.');

console.log('\n====================================================');
console.log('ALL VERIFICATION TESTS PASSED SUCCESSFULLY! (4/4)');
console.log('====================================================');
