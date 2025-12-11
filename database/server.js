require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
// MariaDB routes
const playerRoutes = require('./routes/playerRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const shopRoutes = require('./routes/shopRoutes');
const rulesRoutes = require('./routes/rulesRoutes');
const bestiaryRoutes = require('./routes/bestiaryRoutes');
const weaponsRoutes = require('./routes/weaponsRoutes');
const rulesStagingRoutes = require('./routes/rulesStagingRoutes');
// const rulesRoutes = require('./routes/rulesRoutes-simple');

const gmkitDir = path.join(__dirname, '..', 'data', 'gamemasters_kit');

// Initialize MariaDB
require('./mariadb');

console.log('Routes loaded:', {
  shopRoutes: typeof shopRoutes,
  rulesRoutes: typeof rulesRoutes,
  bestiaryRoutes: typeof bestiaryRoutes,
  weaponsRoutes: typeof weaponsRoutes
});

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// API Routes (before static files)
console.log('Registering API routes...');
// Player routes now working with MariaDB
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

  try {
    console.log('Registering /api/weapons');
    app.use('/api/weapons', weaponsRoutes);
    console.log('Weapons routes registered');
  } catch (e) {
    console.error('Error mounting /api/weapons:', e && e.stack ? e.stack : e);
    throw e;
  }

  try {
    console.log('Registering /api/bestiary');
    app.use('/api/bestiary', bestiaryRoutes);
    console.log('Bestiary routes registered');
  } catch (e) {
    console.error('Error mounting /api/bestiary:', e && e.stack ? e.stack : e);
    throw e;
  }

  try {
    console.log('Registering /api/rules/staging');
    app.use('/api/rules/staging', rulesStagingRoutes);
    console.log('Rules staging routes registered');
  } catch (e) {
    console.error('Error mounting /api/rules/staging:', e && e.stack ? e.stack : e);
  }  // Expose gamemaster kit files and a simple listing API for GM-only resources
  try {
    console.log('Registering /api/gmkit and /gmkit static');
    app.get('/api/gmkit/list', (req, res) => {
      try {
        if (!fs.existsSync(gmkitDir)) return res.json([]);
        const files = fs.readdirSync(gmkitDir).filter(f => !f.startsWith('.'));
        const list = files.map(f => {
          const filePath = path.join(gmkitDir, f);
          let stat = null;
          try { stat = fs.statSync(filePath); } catch (e) { stat = null; }
          const ext = path.extname(f).toLowerCase().replace('.', '');
          // minimal mime mapping
          const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', pdf: 'application/pdf' };
          const mime = mimeMap[ext] || 'application/octet-stream';
          return { name: f, url: `/gmkit/${encodeURIComponent(f)}`, size: stat ? stat.size : null, mime, ext };
        });
        res.json(list);
      } catch (err) {
        console.error('Failed to list gmkit files', err);
        res.status(500).json({ error: 'Failed to list gmkit files' });
      }
    });

    app.use('/gmkit', express.static(gmkitDir));
    console.log('GMKit routes registered');
  } catch (e) {
    console.error('Error mounting /api/gmkit or /gmkit:', e && e.stack ? e.stack : e);
  }

  // Simple JSON base64 upload endpoint for GM Kit files (GM-only via header)
  app.post('/api/gmkit/upload', express.json({ limit: '20mb' }), (req, res) => {
    try {
      const gmSecret = req.headers['x-gm-secret'];
      if (gmSecret !== 'bongo') return res.status(403).json({ error: 'Unauthorized' });
      const { name, b64 } = req.body || {};
      if (!name || !b64) return res.status(400).json({ error: 'Missing name or b64 body' });
      if (!fs.existsSync(gmkitDir)) fs.mkdirSync(gmkitDir, { recursive: true });
      // Basic sanitize name
      const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const filePath = path.join(gmkitDir, safeName);
      // Decode base64 (allow data: prefix)
      const m = b64.match(/^data:([\w/+-\.]+);base64,(.*)$/);
      const data = m ? m[2] : b64;
      const buf = Buffer.from(data, 'base64');
      fs.writeFileSync(filePath, buf);
      return res.json({ success: true, name: safeName, url: `/gmkit/${encodeURIComponent(safeName)}` });
    } catch (err) {
      console.error('GMKit upload failed', err);
      return res.status(500).json({ error: 'Upload failed' });
    }
  });

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

// Graceful shutdown - MariaDB connections are handled by the pool
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
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
    res.send('Deathwatch Roller API is running with MariaDB. Use /api/shop for shop data.');
  });
}

// Routes have already been registered above - no need to duplicate

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('Using MariaDB database');
});

module.exports = app;
