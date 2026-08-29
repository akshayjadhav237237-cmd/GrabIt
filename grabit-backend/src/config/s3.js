const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const bucket = process.env.AWS_S3_BUCKET_NAME || 'grabit-product-images';
const region = process.env.AWS_REGION || 'us-east-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const isPlaceholder = (val) =>
  !val ||
  val === 'your-aws-access-key' ||
  val === 'your-aws-secret-access-key' ||
  val === 'your-bucket-name' ||
  val.startsWith('your-') ||
  val.includes('placeholder') ||
  val === 'test';

const isS3Configured = Boolean(
  process.env.AWS_S3_BUCKET_NAME &&
  accessKeyId &&
  secretAccessKey &&
  !isPlaceholder(process.env.AWS_S3_BUCKET_NAME) &&
  !isPlaceholder(accessKeyId) &&
  !isPlaceholder(secretAccessKey)
);

let s3Client = null;

if (isS3Configured) {
  try {
    s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  } catch (err) {
    console.warn('[S3 Config] Failed to initialize S3Client, falling back to mock mode:', err.message);
  }
} else {
  console.warn('[S3 Config] Running in mock mode - AWS S3 credentials not configured or placeholder.');
}

const fs = require('fs');
const path = require('path');

const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');

/**
 * Upload a file buffer to S3 or save to local disk in mock mode
 *
 * @param {Buffer} fileBuffer
 * @param {string} key
 * @param {string} mimeType
 * @returns {Promise<string>} Public URL or local static path
 */
const uploadToS3 = async (fileBuffer, key, mimeType) => {
  if (!isS3Configured || !s3Client) {
    const cleanKey = key.replace(/^\/+/, '');
    const filePath = path.join(uploadsDir, cleanKey);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, fileBuffer);
    return `/uploads/${cleanKey}`;
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

/**
 * Delete a file from S3 or local disk in mock mode
 *
 * @param {string} key
 * @returns {Promise<boolean>}
 */
const deleteFromS3 = async (key) => {
  if (!isS3Configured || !s3Client) {
    try {
      if (key) {
        let relativeKey = key;
        if (relativeKey.startsWith('/uploads/')) {
          relativeKey = relativeKey.substring('/uploads/'.length);
        } else if (relativeKey.startsWith('uploads/')) {
          relativeKey = relativeKey.substring('uploads/'.length);
        }
        const filePath = path.join(uploadsDir, relativeKey);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      }
    } catch (err) {
      console.warn('[S3 Mock] Failed to delete local file:', err.message);
    }
    return true;
  }

  let s3Key = key;
  if (key && key.includes('.amazonaws.com/')) {
    s3Key = key.split('.amazonaws.com/')[1];
  }

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: s3Key,
  });

  await s3Client.send(command);
  return true;
};

module.exports = {
  s3Client,
  uploadToS3,
  deleteFromS3,
  isS3Configured,
};
