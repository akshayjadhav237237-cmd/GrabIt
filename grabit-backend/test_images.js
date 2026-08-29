require('dotenv').config();
process.env.NODE_ENV = 'test';

const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');
const { Product, User } = require('./src/models');
const { s3Client, uploadToS3, deleteFromS3, isS3Configured } = require('./src/config/s3');
const app = require('./server');

async function runTests() {
  console.log('--- STARTING S3 PRODUCT IMAGE UPLOAD & MANAGEMENT TESTS ---\n');

  // In-memory test stores
  const userStore = new Map();
  const productStore = new Map();

  function mockUser(data) {
    const _id = data._id || new mongoose.Types.ObjectId();
    const user = {
      _id,
      firebaseUid: data.firebaseUid,
      email: data.email || `${data.firebaseUid}@grabit.com`,
      displayName: data.displayName || 'Test User',
      verification: data.verification || { status: 'unverified' },
      createdAt: new Date(),
      updatedAt: new Date(),
      async save() {
        this.updatedAt = new Date();
        userStore.set(this.firebaseUid, this);
        userStore.set(this._id.toString(), this);
        return this;
      },
    };
    userStore.set(user.firebaseUid, user);
    userStore.set(user._id.toString(), user);
    return user;
  }

  function mockProduct(data) {
    const _id = data._id || new mongoose.Types.ObjectId();
    const doc = {
      _id,
      owner: data.owner,
      title: data.title || 'Test Product',
      description: data.description || '',
      category: data.category || 'Electronics',
      images: Array.isArray(data.images) ? [...data.images] : [],
      rentalPrice: {
        perDay: data.rentalPrice?.perDay || 25,
        securityDeposit: data.rentalPrice?.securityDeposit || 0,
      },
      availability: {
        isAvailable: true,
        blackoutDates: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      async save() {
        this.updatedAt = new Date();
        productStore.set(this._id.toString(), this);
        return this;
      },
    };
    productStore.set(_id.toString(), doc);
    return doc;
  }

  // Intercept User model
  User.findOne = async function (filter) {
    if (filter.firebaseUid) {
      return userStore.get(filter.firebaseUid) || null;
    }
    if (filter._id) {
      return userStore.get(filter._id.toString()) || null;
    }
    return null;
  };

  User.create = async function (data) {
    return mockUser(data);
  };

  // Intercept Product model
  Product.findById = function (id) {
    const idStr = id ? id.toString() : '';
    let populatePath = null;

    const run = async () => {
      const doc = productStore.get(idStr);
      if (!doc) return null;
      return doc;
    };

    const queryObj = {
      populate(path) {
        populatePath = path;
        return queryObj;
      },
      then(resolve, reject) {
        return run().then(resolve, reject);
      },
      catch(reject) {
        return run().catch(reject);
      },
    };

    return queryObj;
  };

  // Pre-seed users
  const user1 = mockUser({ firebaseUid: 'user-owner-1', displayName: 'Product Owner' });
  const user2 = mockUser({ firebaseUid: 'user-non-owner-2', displayName: 'Other User' });

  // Pre-seed product owned by user1
  const product1 = mockProduct({
    owner: user1._id,
    title: 'Sony Alpha Camera',
    images: [],
  });

  // Start HTTP server on ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`✓ Test server listening on ${baseUrl}\n`);

  // Helper to build multipart/form-data body
  function buildMultipartFormData(fieldName, fileName, mimeType, fileBuffer) {
    const boundary = '---------------------------' + Date.now().toString(16);
    const head = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n`
    );
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([head, fileBuffer, tail]);
    return {
      contentType: `multipart/form-data; boundary=${boundary}`,
      body,
    };
  }

  // Helper for requests
  const makeRequest = (path, method = 'GET', headers = {}, bodyBuffer = null) => {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const reqHeaders = { ...headers };
      if (bodyBuffer) {
        reqHeaders['Content-Length'] = bodyBuffer.length;
      }

      const req = http.request(
        url,
        {
          method,
          headers: reqHeaders,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            let parsed = null;
            try {
              parsed = JSON.parse(data);
            } catch (e) {
              parsed = data;
            }
            resolve({ status: res.statusCode, body: parsed });
          });
        }
      );
      req.on('error', reject);
      if (bodyBuffer) req.write(bodyBuffer);
      req.end();
    });
  };

  try {
    // ----------------------------------------------------
    // Test 0: Test S3 config exports & mock fallback
    // ----------------------------------------------------
    console.log('[0] Testing src/config/s3.js exports and mock fallback...');
    assert.ok(typeof uploadToS3 === 'function', 'uploadToS3 should be a function');
    assert.ok(typeof deleteFromS3 === 'function', 'deleteFromS3 should be a function');
    assert.strictEqual(typeof isS3Configured, 'boolean', 'isS3Configured should be a boolean');

    const testMockUrl = await uploadToS3(Buffer.from('test'), 'test/sample.jpg', 'image/jpeg');
    assert.ok(testMockUrl.includes('test/sample.jpg'), 'uploadToS3 should return public URL containing key');
    const deleteResult = await deleteFromS3('test/sample.jpg');
    assert.strictEqual(deleteResult, true, 'deleteFromS3 should return true');
    console.log('✓ S3 config exports and mock upload/delete functions verified.\n');

    // ----------------------------------------------------
    // Test 1: 401 on unauthorized image upload
    // ----------------------------------------------------
    console.log('[1] Testing unauthorized image upload (401 Unauthorized)...');
    const dummyImage = Buffer.from('fake-jpeg-data');
    const multipartValid = buildMultipartFormData('image', 'camera.jpg', 'image/jpeg', dummyImage);

    const resNoAuth = await makeRequest(
      `/api/products/${product1._id}/images`,
      'POST',
      { 'Content-Type': multipartValid.contentType },
      multipartValid.body
    );
    assert.strictEqual(resNoAuth.status, 401, 'Expected 401 when Authorization header is missing');
    assert.strictEqual(resNoAuth.body.success, false);
    console.log('✓ Unauthorized image upload correctly returns 401.\n');

    // ----------------------------------------------------
    // Test 2: 403 when non-owner tries to upload image
    // ----------------------------------------------------
    console.log('[2] Testing 403 Forbidden when non-owner tries to upload image...');
    const resNonOwnerUpload = await makeRequest(
      `/api/products/${product1._id}/images`,
      'POST',
      {
        Authorization: 'Bearer mock-token-user-non-owner-2',
        'Content-Type': multipartValid.contentType,
      },
      multipartValid.body
    );
    assert.strictEqual(resNonOwnerUpload.status, 403, 'Expected 403 when non-owner uploads image');
    assert.strictEqual(resNonOwnerUpload.body.success, false);
    console.log('✓ Non-owner image upload correctly returns 403 Forbidden.\n');

    // ----------------------------------------------------
    // Test 3: 400 when invalid file format is uploaded
    // ----------------------------------------------------
    console.log('[3] Testing 400 Bad Request when invalid file format is uploaded...');
    const textFile = Buffer.from('Hello world this is not an image');
    const multipartInvalid = buildMultipartFormData('image', 'notes.txt', 'text/plain', textFile);

    const resInvalidMime = await makeRequest(
      `/api/products/${product1._id}/images`,
      'POST',
      {
        Authorization: 'Bearer mock-token-user-owner-1',
        'Content-Type': multipartInvalid.contentType,
      },
      multipartInvalid.body
    );
    assert.strictEqual(resInvalidMime.status, 400, 'Expected 400 for invalid file format');
    assert.strictEqual(resInvalidMime.body.success, false);
    assert.strictEqual(
      resInvalidMime.body.message,
      'Only JPG, PNG, and WebP images are allowed'
    );
    console.log('✓ Invalid file format upload correctly returns 400 with expected error message.\n');

    // ----------------------------------------------------
    // Test 4: 200 on valid image upload (adds to product.images)
    // ----------------------------------------------------
    console.log('[4] Testing 200 OK on valid image upload (adds to product.images)...');
    const validPngBuffer = Buffer.from('fake-png-binary-data');
    const multipartPng = buildMultipartFormData('image', 'camera.png', 'image/png', validPngBuffer);

    const resValidUpload = await makeRequest(
      `/api/products/${product1._id}/images`,
      'POST',
      {
        Authorization: 'Bearer mock-token-user-owner-1',
        'Content-Type': multipartPng.contentType,
      },
      multipartPng.body
    );
    assert.strictEqual(resValidUpload.status, 200, 'Expected 200 OK on valid upload');
    assert.strictEqual(resValidUpload.body.success, true);
    assert.strictEqual(resValidUpload.body.message, 'Image uploaded successfully');
    assert.ok(resValidUpload.body.imageUrl, 'Should return imageUrl');
    assert.strictEqual(resValidUpload.body.data.images.length, 1);
    assert.strictEqual(resValidUpload.body.data.images[0], resValidUpload.body.imageUrl);

    const uploadedImageUrl1 = resValidUpload.body.imageUrl;
    assert.ok(
      uploadedImageUrl1.startsWith('/uploads/products/'),
      'Image URL should start with /uploads/products/ in mock mode'
    );
    console.log(`✓ Image uploaded successfully: ${uploadedImageUrl1}`);
    console.log('✓ product.images array updated correctly to contain 1 image.');

    // Verify static serving via GET /uploads/...
    const fs = require('fs');
    const path = require('path');
    const diskPath = path.join(__dirname, uploadedImageUrl1);
    assert.ok(fs.existsSync(diskPath), `Uploaded file should exist on disk at ${diskPath}`);
    const resStaticServe = await makeRequest(uploadedImageUrl1, 'GET');
    assert.strictEqual(resStaticServe.status, 200, 'Static file serving should return 200 OK');
    console.log('✓ Static file serving verified on backend: HTTP GET returns 200.\n');

    // ----------------------------------------------------
    // Test 5: 400 when exceeding 5 images
    // ----------------------------------------------------
    console.log('[5] Testing 400 Bad Request when exceeding 5 images...');
    // Add images 2, 3, 4, 5 to reach 5 images
    for (let i = 2; i <= 5; i++) {
      const part = buildMultipartFormData(
        'image',
        `camera_${i}.webp`,
        'image/webp',
        Buffer.from(`image-data-${i}`)
      );
      const res = await makeRequest(
        `/api/products/${product1._id}/images`,
        'POST',
        {
          Authorization: 'Bearer mock-token-user-owner-1',
          'Content-Type': part.contentType,
        },
        part.body
      );
      assert.strictEqual(res.status, 200, `Expected 200 on uploading image ${i}`);
    }

    assert.strictEqual(product1.images.length, 5, 'Product should now have exactly 5 images');
    console.log('✓ Successfully uploaded images up to the 5 image limit.');

    // Now attempt uploading a 6th image
    const sixthImagePart = buildMultipartFormData(
      'image',
      'camera_6.jpg',
      'image/jpeg',
      Buffer.from('image-data-6')
    );
    const resSixth = await makeRequest(
      `/api/products/${product1._id}/images`,
      'POST',
      {
        Authorization: 'Bearer mock-token-user-owner-1',
        'Content-Type': sixthImagePart.contentType,
      },
      sixthImagePart.body
    );
    assert.strictEqual(resSixth.status, 400, 'Expected 400 when exceeding 5 images');
    assert.strictEqual(resSixth.body.success, false);
    assert.strictEqual(resSixth.body.message, 'Maximum 5 images allowed per product');
    console.log('✓ Uploading a 6th image correctly returns 400: "Maximum 5 images allowed per product".\n');

    // ----------------------------------------------------
    // Test 6: 403 when non-owner tries to delete image
    // ----------------------------------------------------
    console.log('[6] Testing 403 Forbidden when non-owner tries to delete image...');
    const deletePayload = Buffer.from(JSON.stringify({ imageUrl: uploadedImageUrl1 }));

    const resNonOwnerDelete = await makeRequest(
      `/api/products/${product1._id}/images`,
      'DELETE',
      {
        Authorization: 'Bearer mock-token-user-non-owner-2',
        'Content-Type': 'application/json',
      },
      deletePayload
    );
    assert.strictEqual(resNonOwnerDelete.status, 403, 'Expected 403 when non-owner deletes image');
    assert.strictEqual(resNonOwnerDelete.body.success, false);
    console.log('✓ Non-owner deleting image correctly returns 403 Forbidden.\n');

    // ----------------------------------------------------
    // Test 7: 200 on owner deleting image (removes from product.images)
    // ----------------------------------------------------
    console.log('[7] Testing 200 OK on owner deleting image (removes from product.images)...');
    const resOwnerDelete = await makeRequest(
      `/api/products/${product1._id}/images`,
      'DELETE',
      {
        Authorization: 'Bearer mock-token-user-owner-1',
        'Content-Type': 'application/json',
      },
      deletePayload
    );
    assert.strictEqual(resOwnerDelete.status, 200, 'Expected 200 OK on owner image delete');
    assert.strictEqual(resOwnerDelete.body.success, true);
    assert.strictEqual(resOwnerDelete.body.message, 'Image deleted successfully');
    assert.strictEqual(resOwnerDelete.body.data.images.length, 4, 'Images count should decrease to 4');
    assert.ok(
      !resOwnerDelete.body.data.images.includes(uploadedImageUrl1),
      'Deleted image URL must no longer be in product.images'
    );
    assert.ok(!fs.existsSync(diskPath), 'Deleted file should be removed from disk');
    console.log('✓ Owner image deletion correctly returns 200 and removes image from product.images & local disk.\n');

    // ----------------------------------------------------
    // Test 8: Additional edge cases (400 missing imageUrl, 404 image not found)
    // ----------------------------------------------------
    console.log('[8] Testing edge cases (missing imageUrl, non-existent image, missing file)...');

    // Delete with missing imageUrl body
    const resEmptyDelete = await makeRequest(
      `/api/products/${product1._id}/images`,
      'DELETE',
      {
        Authorization: 'Bearer mock-token-user-owner-1',
        'Content-Type': 'application/json',
      },
      Buffer.from(JSON.stringify({}))
    );
    assert.strictEqual(resEmptyDelete.status, 400, 'Expected 400 for missing imageUrl');

    // Delete with imageUrl not on product
    const resNotFoundImage = await makeRequest(
      `/api/products/${product1._id}/images`,
      'DELETE',
      {
        Authorization: 'Bearer mock-token-user-owner-1',
        'Content-Type': 'application/json',
      },
      Buffer.from(JSON.stringify({ imageUrl: 'https://example.com/not-present.jpg' }))
    );
    assert.strictEqual(resNotFoundImage.status, 404, 'Expected 404 when image is not on product');

    // Upload with no file attached
    const emptyMultipart = buildMultipartFormData('other_field', '', 'text/plain', Buffer.from(''));
    const resNoFile = await makeRequest(
      `/api/products/${product1._id}/images`,
      'POST',
      {
        Authorization: 'Bearer mock-token-user-owner-1',
        'Content-Type': emptyMultipart.contentType,
      },
      emptyMultipart.body
    );
    assert.strictEqual(resNoFile.status, 400, 'Expected 400 when no file uploaded');
    console.log('✓ Edge cases (missing imageUrl, non-existent image, missing file) verified.\n');

    console.log('================================================================');
    console.log('ALL S3 PRODUCT IMAGE INTEGRATION TESTS PASSED SUCCESSFULLY (8/8)');
    console.log('================================================================\n');
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
