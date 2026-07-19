const mongoose = require('mongoose');

// Serverless functions can reuse the same warm container across requests, but each
// cold start re-runs this module. Caching the connection on `global` means a warm
// invocation reuses the existing connection instead of reconnecting, and concurrent
// requests during a cold start share a single in-flight connection attempt instead of
// each opening their own (which is what caused slow/hanging requests before).
let cached = global._mongooseConnCache;
if (!cached) {
  cached = global._mongooseConnCache = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Add it to your .env file (or your host\'s environment variables).');
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        // fail fast instead of hanging past the serverless function's time limit
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 5,
      })
      .then((m) => {
        console.log(`MongoDB connected: ${m.connection.host}/${m.connection.name}`);
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // let the next request try again instead of reusing a failed attempt
    console.error('MongoDB connection failed:', err.message);
    throw err;
  }

  return cached.conn;
}

module.exports = connectDB;
