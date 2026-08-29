const mongoose = require('mongoose');

let cachedConnection = null;

/**
 * Connect to MongoDB database with serverless connection pooling & auto-seed.
 */
const connectDB = async () => {
  if (cachedConnection && mongoose.connection.readyState >= 1) {
    return cachedConnection;
  }

  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/grabit';
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    cachedConnection = conn;
    console.log(`MongoDB Connected: ${conn.connection.host}`);

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
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'production' && process.env.MONGODB_URI && !process.env.VERCEL) {
      process.exit(1);
    } else {
      console.warn('Running in standalone/serverless mode with embedded fallback data store.');
    }
  }
};

module.exports = connectDB;
