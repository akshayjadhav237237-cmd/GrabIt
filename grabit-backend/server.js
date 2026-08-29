require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./src/config/db');
const path = require('path');
const routes = require('./src/routes');
const errorMiddleware = require('./src/middleware/error.middleware');

const app = express();

// Connection check middleware (ensures DB is initialized/connected across Serverless & Persistent requests)
app.use(async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await connectDB();
    }
  } catch (err) {
    console.warn('[DB] Request connection check notice:', err.message);
  }
  next();
});

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API routes
app.use('/api', routes);

// Top-level route fallback (e.g. /health, /users, /products) to prevent 404s if caller strips '/api'
app.use('/', routes);

// Fallback JSON 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Error handling middleware
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

/**
 * Async server startup sequence (Option A):
 * Awaits MongoDB connection BEFORE calling app.listen() to prevent early request buffering errors.
 */
async function startServer() {
  try {
    if (process.env.NODE_ENV !== 'test') {
      await connectDB();
      console.log('MongoDB connected');
    }
    app.listen(PORT, () => {
      console.log(`Grabit backend server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
