require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const playerRoutes = require('./routes/playerRoutes-sqlite');
const sessionRoutes = require('./routes/sessionRoutes-sqlite');
const shopRoutes = require('./routes/shopRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from public directory
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// API Routes
app.use('/api/players', playerRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/shop', shopRoutes);

// Initialize SQLite database
const { db } = require('./sqlite-db');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Closing SQLite database...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Closing SQLite database...');
  db.close();
  process.exit(0);
});

// Root route for friendly message
app.get('/', (req, res) => {
  res.send('Deathwatch Roller API is running with SQLite. Use /api/players for player data.');
});

// Use routes
app.use('/api/shop', shopRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/sessions', sessionRoutes);

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('Using SQLite database');
});

module.exports = app;
