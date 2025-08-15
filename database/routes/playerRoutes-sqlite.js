const express = require('express');
const { playerHelpers, sessionHelpers } = require('../sqlite-db');
const fs = require('fs');
const path = require('path');

// Simple file logger
function logToFile(...args) {
  const msg = `[${new Date().toISOString()}] ` + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
  fs.appendFileSync(path.join(__dirname, '../backend.log'), msg, { encoding: 'utf8' });
}

const requireSession = require('../requireSession');
const router = express.Router();

// Add safe bcrypt helpers to avoid MODULE_NOT_FOUND failures at runtime
async function safeHash(pw) {
  if (!pw) return '';
  try {
    const bcrypt = require('bcrypt');
    return await bcrypt.hash(pw, 10);
  } catch (err) {
    // Fallback to storing plaintext (development only) and log the error
    logToFile('WARN: bcrypt.hash failed, falling back to plaintext pw', err && err.stack ? err.stack : String(err));
    return String(pw);
  }
}

async function safeCompare(candidate, hashed) {
  try {
    const bcrypt = require('bcrypt');
    return await bcrypt.compare(candidate, hashed);
  } catch (err) {
    // If bcrypt not available, fall back to plaintext comparison (dev only)
    logToFile('WARN: bcrypt.compare failed, falling back to plaintext compare', err && err.stack ? err.stack : String(err));
    return String(candidate) === String(hashed);
  }
}

// TEMP ADMIN: List all users
router.get('/admin/list', async (req, res) => {
  try {
    const players = playerHelpers.getAll();
    res.json(players);
  } catch (error) {
    logToFile('API: Failed to list players', error);
    res.status(500).json({ error: 'Failed to list players' });
  }
});

// TEMP ADMIN: Delete test users (name contains 'test' or 'Test')
router.delete('/admin/delete-tests', async (req, res) => {
  try {
    const players = playerHelpers.getAll();
    const testPlayers = players.filter(p => /test/i.test(p.name));
    
    let deletedCount = 0;
    for (const player of testPlayers) {
      if (playerHelpers.delete(player.name)) {
        deletedCount++;
      }
    }
    
    res.json({ deletedCount });
  } catch (error) {
    logToFile('API: Failed to delete test users', error);
    res.status(500).json({ error: 'Failed to delete test users' });
  }
});

// Get all players (public for dropdown)
router.get('/', async (req, res) => {
  try {
    const players = playerHelpers.getAll();
    logToFile('API: Fetch all players (public)', `Found ${players.length} players`);

    // Allow full list if client provided a valid session id OR the GM secret header
    const gmSecret = req.headers['x-gm-secret'] || req.query.gmSecret || (req.body && req.body.gmSecret);
    const gmPassword = process.env.GM_PASSWORD || 'bongo';
    const isGm = gmSecret && String(gmSecret) === String(gmPassword);
    const isAuthed = !!req.headers['x-session-id'];

    if (!isAuthed && !isGm) {
      return res.json(players.map(p => ({ name: p.name })));
    }

    res.json(players);
  } catch (error) {
    logToFile('API: Failed to fetch players', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Get single player by name
router.get('/:name', async (req, res) => {
  try {
    const player = playerHelpers.getByName(req.params.name);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    logToFile('API: Fetch player', req.params.name);
    res.json(player);
  } catch (error) {
    logToFile('API: Failed to fetch player', req.params.name, error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// Create new player
router.post('/', async (req, res) => {
  try {
    const { name, pw, ...otherData } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    // Check if player already exists
    const existingPlayer = playerHelpers.getByName(name);
    if (existingPlayer) {
      return res.status(409).json({ error: 'Player already exists' });
    }

    // Create password hash if password provided (use safeHash)
    let pwHash = '';
    if (pw) {
      pwHash = await safeHash(pw);
    }

    const newPlayer = playerHelpers.create({
      name,
      pw: pw || '',
      pwHash,
      rollerInfo: otherData.rollerInfo || {},
      shopInfo: otherData.shopInfo || {},
      tabInfo: otherData.tabInfo || {}
    });

    logToFile('API: Created player', name);
    res.status(201).json(newPlayer);
  } catch (error) {
    // Log stack for easier debugging
    logToFile('API: Failed to create player', req.body && req.body.name, error && error.stack ? error.stack : error);
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// Update player
router.put('/:name', requireSession, async (req, res) => {
  try {
    const { name } = req.params;
    const updateData = req.body;

    // Check if player exists
    const existingPlayer = playerHelpers.getByName(name);
    if (!existingPlayer) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Handle password update if provided using safeHash
    if (updateData.pw) {
      updateData.pwHash = await safeHash(updateData.pw);
    }

    // Merge the data properly
    const mergedData = {
      rollerInfo: { ...existingPlayer.rollerInfo, ...updateData.rollerInfo },
      shopInfo: { ...existingPlayer.shopInfo, ...updateData.shopInfo },
      tabInfo: { ...existingPlayer.tabInfo, ...updateData.tabInfo },
      pw: updateData.pw || existingPlayer.pw,
      pwHash: updateData.pwHash || existingPlayer.pwHash
    };

    // If frontend sends flat fields (not under tabInfo), map them into tabInfo.
    // This accepts updates for any of the known tabInfo keys even when only those
    // fields are sent, not requiring playerName/charName to be present.
    const flatFields = [
      'playerName','charName','gear','chapter','demeanour','speciality','rank','powerArmour',
      'description','pastEvent','personalDemeanour','characteristics','skills','weapons','armour',
      'talents','psychic','wounds','insanity','movement','fate','corruption','renown','xp','xpSpent',
      'notes','rp'
    ];

    for (const key of flatFields) {
      if (Object.prototype.hasOwnProperty.call(updateData, key)) {
        mergedData.tabInfo[key] = updateData[key];
      }
    }

    const updated = playerHelpers.update(name, mergedData);
    
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update player' });
    }

    const updatedPlayer = playerHelpers.getByName(name);
    logToFile('API: Updated player', name);
    res.json(updatedPlayer);
  } catch (error) {
    logToFile('API: Failed to update player', req.params.name, error && error.stack ? error.stack : error);
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// Delete player
router.delete('/:name', requireSession, async (req, res) => {
  try {
    const { name } = req.params;
    
    const deleted = playerHelpers.delete(name);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Player not found' });
    }

    logToFile('API: Deleted player', name);
    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    logToFile('API: Failed to delete player', req.params.name, error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

// Login endpoint - create a server session so x-session-id can be used
router.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }

    const player = playerHelpers.getByName(name);
    if (!player) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password using safeCompare
    const isValidPassword = await safeCompare(password, player.pwHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session and store it in sessions table
    const sessionId = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24h
    sessionHelpers.create(sessionId, { playerName: player.name }, expiresAt);

    logToFile('API: Player login', name, sessionId);
    res.json({ 
      message: 'Login successful', 
      sessionId,
      expiresAt,
      player: {
        name: player.name,
        rollerInfo: player.rollerInfo,
        shopInfo: player.shopInfo,
        tabInfo: player.tabInfo
      }
    });
  } catch (error) {
    logToFile('API: Login failed', req.body.name, error && error.stack ? error.stack : error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
