require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const playerRoutes = require('./routes/playerRoutes-sqlite');
const sessionRoutes = require('./routes/sessionRoutes-sqlite');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serve files from public directory

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

// Shop endpoint
app.get('/api/shop', (req, res) => {
  try {
    console.log('Shop endpoint hit');
    const filepath = path.join(__dirname, '../public/deathwatch-armoury.json');
    console.log('Looking for shop data at:', filepath);
    console.log('File exists:', fs.existsSync(filepath));
    const shopData = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    console.log('Shop data loaded, keys:', Object.keys(shopData));
    res.json(shopData);
  } catch (error) {
    console.error('Shop error:', error);
    res.status(500).json({ error: String(error) });
  }
});

// Use routes
app.use('/api/players', playerRoutes);
app.use('/api/sessions', sessionRoutes);

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('Using SQLite database');
});

module.exports = app;
