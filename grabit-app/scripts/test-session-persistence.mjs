import assert from 'node:assert';
import AsyncStorage from '@react-native-async-storage/async-storage/jest';

// Test 1: Verify AsyncStorage Mock functionality
console.log('--- TEST 1: AsyncStorage Mock Functionality ---');
await AsyncStorage.clear();
await AsyncStorage.setItem('grabit_auth', JSON.stringify({ token: 'test-token', user: { id: 'u1', email: 'test@grabit.com' } }));
const raw = await AsyncStorage.getItem('grabit_auth');
assert(raw !== null, 'Item should exist in storage');
const parsed = JSON.parse(raw);
assert.strictEqual(parsed.token, 'test-token');
assert.strictEqual(parsed.user.id, 'u1');
await AsyncStorage.removeItem('grabit_auth');
const afterRemove = await AsyncStorage.getItem('grabit_auth');
assert.strictEqual(afterRemove, null, 'Item should be removed from storage');
console.log('✓ AsyncStorage Mock works as expected.');

// Test 2: Verify STORAGE_KEY constant and logic contract
console.log('\n--- TEST 2: Auth Session Lifecycle Contract ---');

const STORAGE_KEY = 'grabit_auth';

class MockAuthFlow {
  constructor(apiMock) {
    this.user = null;
    this.token = null;
    this.isAuthenticated = false;
    this.isLoading = false;
    this.isBootstrapping = true;
    this.error = null;
    this.api = apiMock;
  }

  async bootstrapAuth() {
    this.isBootstrapping = true;
    try {
      const savedAuth = await AsyncStorage.getItem(STORAGE_KEY);
      if (!savedAuth) {
        this.isBootstrapping = false;
        return;
      }

      const parsed = JSON.parse(savedAuth);
      if (parsed && parsed.token && parsed.user) {
        this.token = parsed.token;
        this.user = parsed.user;
        this.isAuthenticated = true;
        this.api.setToken(parsed.token);

        const verifyRes = await this.api.getCurrentUser(parsed.token);
        if (!verifyRes.success) {
          await AsyncStorage.removeItem(STORAGE_KEY);
          this.api.setToken(null);
          this.user = null;
          this.token = null;
          this.isAuthenticated = false;
        } else if (verifyRes.data?.user) {
          this.user = { ...parsed.user, ...verifyRes.data.user };
        }
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
        this.api.setToken(null);
        this.user = null;
        this.token = null;
        this.isAuthenticated = false;
      }
    } catch (err) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      this.api.setToken(null);
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
    } finally {
      this.isBootstrapping = false;
    }
  }

  async login(resolvedUser, token) {
    this.user = resolvedUser;
    this.token = token;
    this.isAuthenticated = true;
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token, user: resolvedUser })
    );
  }

  async logout() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } finally {
      this.api.setToken(null);
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      this.isLoading = false;
    }
  }
}

// 2A: Test cold start with no saved session
console.log('\n[Scenario 2A]: Cold start without saved session');
await AsyncStorage.clear();
let mockApi = {
  token: null,
  setToken(t) { this.token = t; },
  async getCurrentUser(t) { return { success: true, data: { user: { id: 'u1' } } }; }
};
let auth = new MockAuthFlow(mockApi);
assert.strictEqual(auth.isBootstrapping, true);
await auth.bootstrapAuth();
assert.strictEqual(auth.isBootstrapping, false, 'isBootstrapping should be false after bootstrap');
assert.strictEqual(auth.isAuthenticated, false, 'User should not be authenticated');
assert.strictEqual(auth.token, null);
assert.strictEqual(auth.user, null);
console.log('✓ Scenario 2A passed: Cold start gracefully handles empty storage');

// 2B: Test login persistence
console.log('\n[Scenario 2B]: Successful login persists session');
await auth.login({ id: 'user_123', email: 'alex@example.com', displayName: 'Alex' }, 'token_abc123');
assert.strictEqual(auth.isAuthenticated, true);
assert.strictEqual(auth.token, 'token_abc123');

const storedAfterLogin = await AsyncStorage.getItem(STORAGE_KEY);
assert(storedAfterLogin !== null, 'Storage key must exist after login');
const parsedStored = JSON.parse(storedAfterLogin);
assert.strictEqual(parsedStored.token, 'token_abc123');
assert.strictEqual(parsedStored.user.email, 'alex@example.com');
console.log('✓ Scenario 2B passed: Session correctly stored in AsyncStorage on login');

// 2C: Test restore on bootstrap with valid token
console.log('\n[Scenario 2C]: Bootstrap restores session and validates with api.getCurrentUser');
let authRestored = new MockAuthFlow(mockApi);
assert.strictEqual(authRestored.isBootstrapping, true);
await authRestored.bootstrapAuth();
assert.strictEqual(authRestored.isBootstrapping, false);
assert.strictEqual(authRestored.isAuthenticated, true);
assert.strictEqual(authRestored.token, 'token_abc123');
assert.strictEqual(authRestored.user.email, 'alex@example.com');
assert.strictEqual(mockApi.token, 'token_abc123');
console.log('✓ Scenario 2C passed: Session restored and validated on app restart');

// 2D: Test bootstrap with invalid/expired token (401 / !res.success)
console.log('\n[Scenario 2D]: Bootstrap clears session when api.getCurrentUser rejects');
let rejectingApi = {
  token: null,
  setToken(t) { this.token = t; },
  async getCurrentUser(t) { return { success: false, error: 'Unauthorized' }; }
};
let authInvalid = new MockAuthFlow(rejectingApi);
await authInvalid.bootstrapAuth();
assert.strictEqual(authInvalid.isBootstrapping, false);
assert.strictEqual(authInvalid.isAuthenticated, false, 'Should not be authenticated after rejected token');
assert.strictEqual(authInvalid.token, null);
assert.strictEqual(authInvalid.user, null);
const storedAfterReject = await AsyncStorage.getItem(STORAGE_KEY);
assert.strictEqual(storedAfterReject, null, 'Storage should be cleared when token validation fails');
console.log('✓ Scenario 2D passed: Rejected token causes storage removal and resets state');

// 2E: Test logout clears storage
console.log('\n[Scenario 2E]: Logout clears AsyncStorage and auth state');
await auth.login({ id: 'user_456', email: 'test@example.com' }, 'token_xyz');
assert((await AsyncStorage.getItem(STORAGE_KEY)) !== null);
await auth.logout();
assert.strictEqual(auth.isAuthenticated, false);
assert.strictEqual(auth.token, null);
assert.strictEqual(auth.user, null);
assert.strictEqual(await AsyncStorage.getItem(STORAGE_KEY), null);
console.log('✓ Scenario 2E passed: Logout clears AsyncStorage and resets state');

console.log('\n========================================');
console.log('ALL AUTH PERSISTENCE TESTS PASSED (5/5)');
console.log('========================================');
