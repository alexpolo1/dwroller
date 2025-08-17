const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const BESTIARY_PATH = path.join(__dirname, '../../database/deathwatch-bestiary-extracted.json');

let bestiaryData = null;
let lastLoaded = 0;

function loadBestiaryData() {
  const now = Date.now();
  // Cache for 5 minutes
  if (bestiaryData && (now - lastLoaded) < 5 * 60 * 1000) {
    return bestiaryData;
  }

  try {
    console.log('Loading bestiary data from:', BESTIARY_PATH);
    const data = fs.readFileSync(BESTIARY_PATH, 'utf8');
    const parsed = JSON.parse(data);
    bestiaryData = parsed.results || [];
    lastLoaded = now;
    console.log(`Loaded ${bestiaryData.length} bestiary entries`);
    return bestiaryData;
  } catch (error) {
    console.error('Failed to load bestiary data:', error);
    return [];
  }
}

// Transform bestiary entry to dice roller format
function transformBestiaryEntry(entry) {
  const stats = entry.stats || {};
  const profile = stats.profile || {};
  
  // Calculate toughness bonus (TB = T/10 rounded down)
  const toughness = profile.t || profile.toughness || 0;
  const tb = Math.floor(toughness / 10);
  
  // Extract armor from various possible locations
  let armour = 0;
  let armourByLoc = null;
  
  if (stats.armour) {
    if (typeof stats.armour === 'number') {
      armour = stats.armour;
    } else if (stats.armour.body !== undefined) {
      armourByLoc = {
        'Head': stats.armour.head || stats.armour.body || 0,
        'Body': stats.armour.body || 0,
        'Left Arm': stats.armour.leftArm || stats.armour.body || 0,
        'Right Arm': stats.armour.rightArm || stats.armour.body || 0,
        'Left Leg': stats.armour.leftLeg || stats.armour.body || 0,
        'Right Leg': stats.armour.rightLeg || stats.armour.body || 0
      };
    }
  }
  
  // Extract wounds
  const wounds = entry.wounds || stats.wounds || profile.wounds || null;
  
  // Extract characteristics for defense
  const ag = profile.ag || profile.agility || null;
  const ws = profile.ws || profile.weaponSkill || null;
  const bs = profile.bs || profile.ballisticSkill || null;
  
  const transformed = {
    name: entry.bestiaryName || entry.name || 'Unknown',
    tb: tb || 4,
    wounds: wounds,
    book: entry.book || '',
    page: entry.page || '',
    // Include characteristics for enemy selection
    ag: ag,
    ws: ws,
    bs: bs
  };
  
  if (armourByLoc) {
    transformed.armourByLoc = armourByLoc;
  } else {
    transformed.armour = armour;
  }
  
  return transformed;
}

// Get all bestiary entries formatted for dice roller
router.get('/enemies', (req, res) => {
  try {
    const entries = loadBestiaryData();
    
    // Transform entries for dice roller format
    const enemies = entries
      .filter(entry => {
        // Only include entries with valid stats
        const stats = entry.stats || {};
        const profile = stats.profile || {};
        return profile.t && (entry.wounds || stats.wounds || profile.wounds);
      })
      .map(transformBestiaryEntry);
    
    console.log(`Returning ${enemies.length} enemies for dice roller`);
    res.json(enemies);
  } catch (error) {
    console.error('Bestiary enemies error:', error);
    res.status(500).json({ error: 'Failed to get enemies' });
  }
});

// Get full bestiary data (for bestiary tab)
router.get('/full', (req, res) => {
  try {
    const entries = loadBestiaryData();
    res.json(entries);
  } catch (error) {
    console.error('Bestiary full error:', error);
    res.status(500).json({ error: 'Failed to get bestiary data' });
  }
});

// Get bestiary statistics
router.get('/stats', (req, res) => {
  try {
    const entries = loadBestiaryData();
    
    const stats = {
      totalEntries: entries.length,
      withValidStats: entries.filter(e => e.stats?.profile?.t).length,
      withWounds: entries.filter(e => e.wounds || e.stats?.wounds).length,
      books: [...new Set(entries.map(e => e.book).filter(Boolean))],
      lastUpdated: new Date(lastLoaded).toISOString()
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Bestiary stats error:', error);
    res.status(500).json({ error: 'Failed to get bestiary stats' });
  }
});

// Force reload bestiary data (admin only)
router.post('/reload', (req, res) => {
  try {
    // Check for GM secret
    const gmSecret = req.headers['x-gm-secret'];
    if (gmSecret !== 'bongo') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Reset cache
    bestiaryData = null;
    lastLoaded = 0;
    
    const entries = loadBestiaryData();
    res.json({
      success: true,
      totalEntries: entries.length,
      message: 'Bestiary data reloaded successfully'
    });
    
  } catch (error) {
    console.error('Bestiary reload error:', error);
    res.status(500).json({ error: 'Failed to reload bestiary data' });
  }
});

console.log('Bestiary routes registered');
module.exports = router;
