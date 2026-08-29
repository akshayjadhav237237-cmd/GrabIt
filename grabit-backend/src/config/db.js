const mongoose = require('mongoose');

// Globally disable command buffering so Mongoose never hangs on disconnected queries
mongoose.set('bufferCommands', false);

let cachedConnection = null;

/**
 * Connect to MongoDB database with serverless connection pooling & auto-seed.
 */
const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState >= 1) {
    return cachedConnection;
  }

  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  );

  const mongoURI = process.env.MONGODB_URI;

  // In serverless cloud environments without a configured remote MongoDB URI,
  // skip trying to connect to localhost:27017 to eliminate connection timeouts.
  if (isServerless && (!mongoURI || mongoURI.includes('localhost') || mongoURI.includes('127.0.0.1'))) {
    console.log('[DB] Serverless standalone mode: serving from high-performance embedded seed store.');
    return null;
  }

  const targetURI = mongoURI || 'mongodb://localhost:27017/grabit';

  try {
    const conn = await mongoose.connect(targetURI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      bufferCommands: false,
    });
    cachedConnection = conn;
    console.log(`[DB] MongoDB Connected: ${conn.connection.host}`);

    // Auto-seed if database is empty
    try {
      const { Product, User } = require('../models');
      const productCount = await Product.countDocuments();
      if (productCount === 0) {
        console.log('[AutoSeed] Empty database detected. Auto-seeding 12 high-quality listings...');
        const { DEMO_OWNER, SEED_PRODUCTS } = require('../data/seedData');
        let owner = await User.findOne({ firebaseUid: DEMO_OWNER.firebaseUid });
        if (!owner) {
          owner = await User.create(DEMO_OWNER);
        }
        const productsToInsert = SEED_PRODUCTS.map((p) => ({
          ...p,
          owner: owner._id,
        }));
        await Product.insertMany(productsToInsert);
        console.log(`[AutoSeed] Successfully populated ${productsToInsert.length} products.`);
      }
    } catch (seedErr) {
      console.warn('[AutoSeed] Notice:', seedErr.message);
    }

    return conn;
  } catch (error) {
    console.error(`[DB] MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'production' && process.env.MONGODB_URI && !process.env.VERCEL) {
      process.exit(1);
    } else {
      console.warn('[DB] Falling back to high-performance embedded in-memory data store.');
    }
    return null;
  }
};

module.exports = connectDB;
