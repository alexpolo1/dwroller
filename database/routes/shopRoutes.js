const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const { playerHelpers } = require('../mariadb'); // Use MariaDB instead of SQLite

console.log('ShopRoutes: Loading with purchase endpoint (MariaDB)');

// Simple file logger
function logToFile(...args) {
  const msg = `[${new Date().toISOString()}] ` + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
  fs.appendFileSync(path.join(__dirname, '../backend.log'), msg, { encoding: 'utf8' });
}

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

// Test route to verify routes are working
router.get('/test', (req, res) => {
  res.json({ message: 'Shop routes are working' });
});

// Purchase item endpoint
router.post('/purchase', async (req, res) => {
  console.log('ShopRoutes: Purchase endpoint hit!');
  try {
    const { playerId, itemId, quantity = 1 } = req.body;
    const sessionId = req.headers['x-session-id'];
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Session required' });
    }
    
    if (!playerId || !itemId) {
      return res.status(400).json({ error: 'Player ID and Item ID required' });
    }

    // Get the player
    const players = await playerHelpers.getAll();
    const player = players.find(p => p.id === playerId || p.name === playerId);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get shop data to find the item
    const shopPath = path.join(__dirname, '..', '..', 'public', 'deathwatch-armoury.json');
    if (!fs.existsSync(shopPath)) {
      return res.status(500).json({ error: 'Shop data not available' });
    }
    
    const shopData = JSON.parse(fs.readFileSync(shopPath, 'utf8'));
    let foundItem = null;
    
    // Search for the item in all categories
    for (const category in shopData.items) {
      if (shopData.items[category]) {
        foundItem = shopData.items[category].find(item => 
          (item.id === itemId) || (`${category}-${item.name}` === itemId)
        );
        if (foundItem) break;
      }
    }
    
    if (!foundItem) {
      return res.status(404).json({ error: 'Item not found in shop' });
    }
    
    // Check if item has cost > 0 (purchasable)
    const itemCost = foundItem.req || 0;
    if (itemCost <= 0) {
      return res.status(400).json({ error: 'This item is not purchasable' });
    }

    // Check player RP
    const playerRp = player.tabInfo?.rp || 0;
    const totalCost = itemCost * quantity;
    
    if (playerRp < totalCost) {
      return res.status(400).json({ 
        error: `Insufficient Requisition Points. Need ${totalCost} RP but only have ${playerRp} RP.` 
      });
    }

    // Add item to player gear and deduct RP
    const updatedTabInfo = { ...player.tabInfo };
    updatedTabInfo.rp = playerRp - totalCost;
    
    // Initialize gear if it doesn't exist
    if (!updatedTabInfo.gear) {
      updatedTabInfo.gear = [];
    }
    
    // Create gear item in the format expected by character sheet
    const gearItem = {
      name: foundItem.name,
      qty: quantity
    };
    
    // Check if item already exists in gear
    const existingGearIndex = updatedTabInfo.gear.findIndex(gearItem => 
      gearItem.name === foundItem.name
    );
    
    if (existingGearIndex >= 0) {
      // Update existing item quantity
      updatedTabInfo.gear[existingGearIndex].qty += quantity;
    } else {
      // Add new item to gear
      updatedTabInfo.gear.push(gearItem);
    }

    // Update player data
    const success = await playerHelpers.update(player.name, {
      ...player,
      tabInfo: updatedTabInfo
    });
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update player data' });
    }
    
    logToFile(`Purchase: ${player.name} bought ${quantity}x ${foundItem.name} for ${totalCost} RP`);
    
    res.json({ 
      success: true, 
      message: `Successfully purchased ${quantity}x ${foundItem.name} for ${totalCost} RP`,
      newRp: updatedTabInfo.rp,
      item: gearItem
    });
    
  } catch (error) {
    console.error('Purchase error:', error);
    logToFile('API: Purchase failed', error);
    res.status(500).json({ error: 'Purchase failed' });
  }
});

module.exports = router;
