const http = require('http');
const assert = require('assert');
const app = require('./api/index');

async function testServerlessEntry() {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`[Test Vercel API] Server listening on ${baseUrl}`);

  const fetchJson = (urlPath) => {
    return new Promise((resolve, reject) => {
      http.get(`${baseUrl}${urlPath}`, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, text: data });
          }
        });
      }).on('error', reject);
    });
  };

  try {
    // 1. Test GET /api/products
    const resProducts = await fetchJson('/api/products');
    assert.strictEqual(resProducts.status, 200, 'GET /api/products returns 200');
    assert.strictEqual(resProducts.data.success, true);
    assert.strictEqual(resProducts.data.total >= 12, true, `Expected total >= 12 products, got ${resProducts.data.total}`);
    assert.strictEqual(resProducts.data.count, 10, 'Default page limit returns 10 products');
    console.log(`✓ GET /api/products succeeded with total ${resProducts.data.total} items and ${resProducts.data.count} on page 1!`);

    // 1b. Test GET /api/products?limit=20 returns all 12
    const resAll = await fetchJson('/api/products?limit=20');
    assert.strictEqual(resAll.status, 200);
    assert.strictEqual(resAll.data.count >= 12, true);
    console.log(`✓ GET /api/products?limit=20 returned all ${resAll.data.count} items!`);

    // 2. Test GET /api/products with Category filter
    const resCameras = await fetchJson('/api/products?category=Cameras');
    assert.strictEqual(resCameras.status, 200);
    assert.strictEqual(resCameras.data.success, true);
    assert.strictEqual(resCameras.data.count >= 2, true);
    console.log(`✓ GET /api/products?category=Cameras succeeded with ${resCameras.data.count} cameras!`);

    // 3. Test GET /api/health
    const resHealth = await fetchJson('/api/health');
    assert.strictEqual(resHealth.status, 200);
    console.log(`✓ GET /api/health succeeded (${JSON.stringify(resHealth.data)})`);

    console.log('\nALL VERCEL SERVERLESS API TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
  }
}

testServerlessEntry()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
