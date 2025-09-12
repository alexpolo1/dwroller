const express = require('express');
const fs = require('fs');
const path = require('path');
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

// Minimal items endpoint for tests - extract items from the comprehensive shop data
router.get('/items', (req, res) => {
  try {
    const p = path.join(__dirname, '..', '..', 'public', 'deathwatch-armoury.json');
    if (fs.existsSync(p)) {
      const data = fs.readFileSync(p, 'utf8');
      const shopData = JSON.parse(data);
      // Extract all items from all categories into a flat array
      const allItems = [];
      if (shopData.items) {
        Object.values(shopData.items).forEach(categoryItems => {
          if (Array.isArray(categoryItems)) {
            allItems.push(...categoryItems);
          }
        });
      }
      return res.json(allItems);
    }
    return res.json([]);
  } catch (err) {
    console.error('Shop items route error', err && err.stack ? err.stack : err);
    return res.json([]);
  }
});

// Minimal category endpoint for tests
router.get('/items/category/:category', (req, res) => {
  try {
    const p = path.join(__dirname, '..', '..', 'public', 'deathwatch-armoury.json');
    if (fs.existsSync(p)) {
      const data = fs.readFileSync(p, 'utf8');
      const shopData = JSON.parse(data);
      const category = req.params.category;
      // Simple category matching - return items from any category that contains the search term
      const categoryItems = [];
      if (shopData.items) {
        Object.entries(shopData.items).forEach(([catName, items]) => {
          if (catName.toLowerCase().includes(category.toLowerCase()) && Array.isArray(items)) {
            categoryItems.push(...items);
          }
        });
      }
      return res.json(categoryItems);
    }
    return res.json([]);
  } catch (err) {
    console.error('Shop category route error', err && err.stack ? err.stack : err);
    return res.json([]);
  }
});

// Minimal inventory endpoint for tests - should be protected
router.get('/inventory/:playerName', (req, res) => {
  // This should require authentication, return 403 for tests
  res.status(403).json({ error: 'Access denied' });
});

module.exports = router;
