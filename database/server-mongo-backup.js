require('dotenv').config();
const express = require('express');
const cors = require('cors');
const playerRoutes = require('./routes/playerRoutes-sqlite');
// const sessionRoutes = require('./routes/sessionRoutes'); // You can update this later if needed

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

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

// Use player routes
app.use('/api/players', playerRoutes);
// app.use('/api/sessions', sessionRoutes); // Uncomment when you update session routes

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('Using SQLite database');
});

module.exports = app;
