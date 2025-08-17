require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const playerRoutes = require('./routes/playerRoutes-sqlite');
const sessionRoutes = require('./routes/sessionRoutes-sqlite');
const shopRoutes = require('./routes/shopRoutes');
const rulesRoutes = require('./routes/rulesRoutes');
const bestiaryRoutes = require('./routes/bestiaryRoutes');
// const rulesRoutes = require('./routes/rulesRoutes-simple');

console.log('Routes loaded:', {
  playerRoutes: typeof playerRoutes,
  sessionRoutes: typeof sessionRoutes,
  shopRoutes: typeof shopRoutes,
  rulesRoutes: typeof rulesRoutes,
  bestiaryRoutes: typeof bestiaryRoutes
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// API Routes (before static files)
console.log('Registering API routes...');
try {
  console.log('Registering /api/players');
  app.use('/api/players', playerRoutes);
  console.log('Players routes registered');
} catch (e) {
  console.error('Error mounting /api/players:', e && e.stack ? e.stack : e);
  throw e;
}
try {
  console.log('Registering /api/sessions');
  app.use('/api/sessions', sessionRoutes);
  console.log('Sessions routes registered');
} catch (e) {
  console.error('Error mounting /api/sessions:', e && e.stack ? e.stack : e);
  throw e;
}
try {
  console.log('Registering /api/shop');
  app.use('/api/shop', shopRoutes);
  console.log('Shop routes registered');
} catch (e) {
  console.error('Error mounting /api/shop:', e && e.stack ? e.stack : e);
  throw e;
}
try {
  console.log('Registering /api/rules');
  app.use('/api/rules', rulesRoutes);
  console.log('Rules routes registered');
} catch (e) {
  console.error('Error mounting /api/rules:', e && e.stack ? e.stack : e);
  throw e;
}

// Add bestiary copy endpoint
app.post('/api/copy-bestiary', (req, res) => {
  try {
    const { copyBestiaryToPublic } = require('../scripts/copy-bestiary-live');
    const success = copyBestiaryToPublic();
    if (success) {
      res.json({ success: true, message: 'Bestiary files updated successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to update bestiary files' });
    }
  } catch (error) {
    console.error('Error in copy-bestiary endpoint:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

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

// If a React build exists, serve it at root and fallback to index.html for client-side routing
const indexHtml = path.join(buildDir, 'index.html');
if (fs.existsSync(indexHtml)) {
  app.get('/', (req, res) => res.sendFile(indexHtml));

  // Catch-all for client-side routes (must be after API routes)
  // Middleware fallback for client-side routing: serve index.html for non-API and non-avatar paths.
  // Use a plain middleware (no path) to avoid route string parsing by path-to-regexp.
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/avatars/')) return next();
    return res.sendFile(indexHtml);
  });
} else {
  // Root route for friendly message when no build is present
  app.get('/', (req, res) => {
    res.send('Deathwatch Roller API is running with SQLite. Use /api/players for player data.');
  });
}

// Use routes (instrument mounts to debug invalid route patterns)
console.log('Mounting route: /api/shop');
app.use('/api/shop', shopRoutes);
console.log('Mounted /api/shop');
console.log('Mounting route: /api/players');
app.use('/api/players', playerRoutes);
console.log('Mounted /api/players');
console.log('Mounting route: /api/sessions');
app.use('/api/sessions', sessionRoutes);
console.log('Mounted /api/sessions');
console.log('Mounting route: /api/rules');
app.use('/api/rules', rulesRoutes);
console.log('Mounted /api/rules');
console.log('Mounting route: /api/bestiary');
app.use('/api/bestiary', bestiaryRoutes);
console.log('Mounted /api/bestiary');

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('Using SQLite database');
});

module.exports = app;
