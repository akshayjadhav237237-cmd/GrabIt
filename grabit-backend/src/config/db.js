const mongoose = require('mongoose');

/**
 * Connect to MongoDB database.
 * Handles errors gracefully without crashing process in development mode.
 */
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/grabit';
    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.warn('Running in development mode without an active MongoDB connection.');
    }
  }
};

module.exports = connectDB;
