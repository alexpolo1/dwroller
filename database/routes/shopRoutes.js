const express = require('express');
const fs = require('fs');
const path = require('path');
const shopHelpers = require('../shop-helpers');
const router = express.Router();

// Minimal shop index - attempt to serve a generated armoury/shop JSON if present
router.get('/', (req, res) => {
  try {
    const p = path.join(__dirname, '..', '..', 'public', 'deathwatch-armoury.json');
    if (fs.existsSync(p)) {
      const data = fs.readFileSync(p, 'utf8');
      return res.json(JSON.parse(data));
    }
    return res.json({ message: 'Shop index not available' });
  } catch (err) {
    console.error('Shop route error', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Failed to read shop index' });
  }
});

// GET /api/shop/items - list all shop items
router.get('/items', async (req, res) => {
  try {
    const items = await shopHelpers.getAllItems();
    return res.json(items || []);
  } catch (err) {
    console.error('GET /api/shop/items failed', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Failed to load shop items' });
  }
});

// GET /api/shop/items/category/:category - list items by category
router.get('/items/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const items = await shopHelpers.getItemsByCategory(category);
    return res.json(items || []);
  } catch (err) {
    console.error('GET /api/shop/items/category failed', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Failed to load shop items by category' });
  }
});

// GET /api/shop/inventory/:playerId - get player's inventory
router.get('/inventory/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const inv = await shopHelpers.getPlayerInventory(playerId);
    return res.json(inv || []);
  } catch (err) {
    console.error('GET /api/shop/inventory failed', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Failed to load player inventory' });
  }
});

// POST /api/shop/purchase - perform purchase for a player
router.post('/purchase', async (req, res) => {
  try {
    const sessionId = req.header('x-session-id') || '';
    // Basic session presence check - sessions are validated elsewhere
    if (!sessionId) return res.status(401).json({ error: 'Missing session id' });

    const { playerId, itemId, quantity } = req.body || {};
    if (!playerId || !itemId) return res.status(400).json({ error: 'playerId and itemId required' });

    const q = Number(quantity || 1) || 1;
    const result = await shopHelpers.purchaseItem(playerId, itemId, q);
    return res.json(result || { success: true });
  } catch (err) {
    console.error('POST /api/shop/purchase failed', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: err.message || 'Purchase failed' });
  }
});

module.exports = router;
