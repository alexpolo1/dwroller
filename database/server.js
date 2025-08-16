require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const playerRoutes = require('./routes/playerRoutes-sqlite');
const sessionRoutes = require('./routes/sessionRoutes-sqlite');
const shopRoutes = require('./routes/shopRoutes');
const rulesRoutes = require('./routes/rulesRoutes');
// const rulesRoutes = require('./routes/rulesRoutes-simple');

console.log('Routes loaded:', {
  playerRoutes: typeof playerRoutes,
  sessionRoutes: typeof sessionRoutes,
  shopRoutes: typeof shopRoutes,
  rulesRoutes: typeof rulesRoutes
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// API Routes (before static files)
console.log('Registering API routes...');
app.use('/api/players', playerRoutes);
console.log('Players routes registered');
app.use('/api/sessions', sessionRoutes);
console.log('Sessions routes registered');
app.use('/api/shop', shopRoutes);
console.log('Shop routes registered');
app.use('/api/rules', rulesRoutes);
console.log('Rules routes registered');

// Serve static files from build directory (React app)
const buildDir = path.join(__dirname, '..', 'build');
app.use(express.static(buildDir));

// Serve uploaded avatars from public/avatars
const avatarsDir = path.join(__dirname, '..', 'public', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}
app.use('/avatars', express.static(avatarsDir));

// Catch-all handler for React Router (must be after API routes)
// app.get('*', (req, res) => {
//   res.sendFile(path.join(buildDir, 'index.html'));
// });

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
app.use('/api/rules', rulesRoutes);

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('Using SQLite database');
});

module.exports = app;
