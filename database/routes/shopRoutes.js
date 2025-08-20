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

module.exports = router;
