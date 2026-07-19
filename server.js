require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const userRoutes = require('./routes/users');
const contactRoutes = require('./routes/contact');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Room photos are stored on Cloudinary now (see utils/upload.js), so no local
// /uploads static route is needed - Cloudinary URLs are used directly.

// Make sure MongoDB is connected before any /api/* route runs. On serverless hosts,
// connectDB() reuses a cached connection on warm invocations and connects fresh (with a
// short timeout) on cold starts, so requests fail fast with a clear message instead of
// hanging until the platform kills the function (504).
app.use('/api', async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ message: `Database unavailable: ${err.message}` });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact', contactRoutes);

// Serve the public website + admin dashboard
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'login.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Basic error handler (e.g. multer file errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong.' });
});

const PORT = process.env.PORT || 5000;

// On Vercel (and other serverless hosts), the platform imports `app` and wraps it as a
// function - it must not also call app.listen(), which is only for a normal long-running
// server (local dev, Render, Railway, a VPS, etc).
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => console.log(`Amihan Cove Resort server running on http://localhost:${PORT}`));
}

module.exports = app;