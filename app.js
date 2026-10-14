require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import all routes
const authRoutes = require('./src/routes/auth');
const profileRoutes = require('./src/routes/profile');
const listingsRoutes = require('./src/routes/listings');
const ordersRoutes = require('./src/routes/orders');
const chatRoutes = require('./src/routes/chat');
const wishlistRoutes = require('./src/routes/wishlist');

const app = express();

// ─── Middleware ───────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Routes ───────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/wishlist', wishlistRoutes);

// ─── Health check ─────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    message: '🎓 IIITL Market API is running!',
    version: '1.0.0',
    college: 'IIIT Lucknow',
    domain: 'iiitl.ac.in'
  });
});

// ─── 404 Handler ──────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found.` });
});

// ─── Global Error Handler ─────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;
