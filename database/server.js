require('dotenv').config();
const express = require('express');
const cors = require('cors');
const playerRoutes = require('./routes/playerRoutes-sqlite');
const sessionRoutes = require('./routes/sessionRoutes-sqlite');

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

// Health endpoint checks DB connectivity and players
app.get('/api/health', (req, res) => {
  try {
    const { playerHelpers } = require('./sqlite-db');
    const players = playerHelpers.getAll();
    res.json({ ok: true, players: players.length, sample: players.slice(0,5).map(p=>p.name) });
  } catch (err) {
    console.error('Healthcheck error', err);
    res.status(500).json({ ok: false, error: err && err.message ? err.message : String(err) });
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

// Keep the process alive reliably under systemd (avoid accidental exit)
if (process.stdin && typeof process.stdin.resume === 'function') {
  process.stdin.resume();
}

module.exports = app;
