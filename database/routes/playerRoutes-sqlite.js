const express = require('express');
const { playerHelpers, sessionHelpers, db } = require('../sqlite-db');
const fs = require('fs');
const path = require('path');

// shop data will be read from sqlite `shop_items` table when needed

// Simple file logger
function logToFile(...args) {
  const msg = `[${new Date().toISOString()}] ` + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
  fs.appendFileSync(path.join(__dirname, '../backend.log'), msg, { encoding: 'utf8' });
}

const requireSession = require('../requireSession');
const { validatePlayer } = require('../validate');
const router = express.Router();

// PUBLIC ROUTES - before session middleware
// Get shop inventory
router.get('/shop', (req, res) => {
  try {
    console.log('Shop endpoint hit');
    // Query sqlite shop_items and return grouped by category
    const items = db.prepare('SELECT id, name, category, requisition_cost as req, renown_requirement as renown, item_type, stats, source FROM shop_items ORDER BY category, name').all();
    const grouped = items.reduce((acc, it) => {
      acc[it.category] = acc[it.category] || [];
      let stats = {};
      try { stats = JSON.parse(it.stats || '{}'); } catch(e){}
      acc[it.category].push({ id: it.id, name: it.name, req: it.req, renown: it.renown, itemType: it.item_type, stats, source: it.source });
      return acc;
    }, {});
    res.json(grouped);
  } catch (error) {
    console.error('Shop error:', error);
    logToFile('API: Failed to get shop data', error);
    res.status(500).json({ error: String(error) });
  }
});

// Get player names for login dropdown (public - no session required)
router.get('/names', (req, res) => {
  try {
    console.log('Player names endpoint hit');
    const players = playerHelpers.getAll();
    // Only return names for the login dropdown, not full player data
    const playerNames = players.map(p => ({ name: p.name }));
    res.json(playerNames);
  } catch (error) {
    console.error('Player names error:', error);
    logToFile('API: Failed to get player names', error);
    res.status(500).json({ error: String(error) });
  }
});

// Login endpoint - create a server session so x-session-id can be used (public - no session required)
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

// Apply session middleware to all routes EXCEPT those above this line
router.use(requireSession);

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

// Expose pre-generated Space Marine names for GM use
router.get('/admin/pregens', async (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'pregen_names.json');
    if (!fs.existsSync(filePath)) return res.json([]);
    const names = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(names);
  } catch (error) {
    logToFile('API: Failed to get pregens', error);
    res.status(500).json({ error: 'Failed to get pregens' });
  }
});

// Shop endpoint already defined above

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

    // If a plain password was provided, hash it first so validation won't reject plaintext
    let pwHash = '';
    if (pw) {
      pwHash = await safeHash(pw);
    }

    // Validate and normalize incoming player object. Pass pwHash instead of plaintext pw.
    const { valid, errors, normalized } = validatePlayer({ name, pwHash, ...otherData });
    if (!valid) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const newPlayer = playerHelpers.create({
      name: normalized.name,
      // Do NOT store plaintext pw to avoid validation rejecting records later
      pw: '',
      pwHash,
      rollerInfo: normalized.rollerInfo || {},
      shopInfo: normalized.shopInfo || {},
      tabInfo: normalized.tabInfo || {}
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
    // Ensure updateData is an object to avoid runtime TypeErrors when fields are missing
    const updateData = req.body || {};

    // Check if player exists
    const existingPlayer = playerHelpers.getByName(name);
    if (!existingPlayer) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Handle password update if provided using safeHash
    if (updateData.pw) {
      updateData.pwHash = await safeHash(updateData.pw);
      // Do not pass plaintext pw into validation; validation requires pwHash only
      // We'll store an empty pw field (frontend may still use pw for temporary purposes)
      updateData.pw = '';
    }

    // Merge the data properly
    const mergedData = {
      rollerInfo: { ...existingPlayer.rollerInfo, ...(updateData.rollerInfo || {}) },
      shopInfo: { ...existingPlayer.shopInfo, ...(updateData.shopInfo || {}) },
      tabInfo: { ...existingPlayer.tabInfo, ...(updateData.tabInfo || {}) },
      // Never carry forward plaintext pw into validation; keep pw empty and use pwHash
      pw: '',
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

    // Validate merged data before applying
    const { valid: v2, errors: e2, normalized: normalized2 } = validatePlayer(Object.assign({ name }, mergedData));
    if (!v2) {
      return res.status(400).json({ error: 'Validation failed', details: e2 });
    }

    const updated = playerHelpers.update(name, normalized2);
    
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

// Upload avatar (base64 JSON payload) - saves to public/avatars and updates tabInfo.picture
router.post('/:name/avatar', requireSession, async (req, res) => {
  try {
    const { name } = req.params;
    const { filename, data } = req.body || {};

    if (!filename || !data) return res.status(400).json({ error: 'filename and data required' });

    const existingPlayer = playerHelpers.getByName(name);
    if (!existingPlayer) return res.status(404).json({ error: 'Player not found' });

    // Extract base64 payload if data URL provided
    const match = String(data).match(/^data:(image\/(png|jpeg|jpg|gif));base64,(.*)$/i);
    let mimeType = null;
    let base64 = null;
    if (match) {
      mimeType = match[1];
      base64 = match[3];
    } else {
      // Assume raw base64 and try to infer extension from filename
      base64 = String(data).replace(/^\s+|\s+$/g, '');
    }

    // Validate size (limit to 200KB)
    let buffer;
    try {
      buffer = Buffer.from(base64, 'base64');
    } catch (err) {
      return res.status(400).json({ error: 'Invalid base64 data' });
    }
    const MAX_BYTES = 200 * 1024;
    if (buffer.length > MAX_BYTES) return res.status(413).json({ error: 'File too large' });

    // Sanitize filename and ensure extension
    const ext = path.extname(filename).toLowerCase() || (mimeType ? `.${mimeType.split('/')[1]}` : '.png');
    const safeName = `${existingPlayer.name.replace(/[^a-z0-9_-]/gi, '_')}_${Date.now()}${ext}`;
    const avatarsDir = path.join(__dirname, '..', '..', 'public', 'avatars');
    if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

    const outPath = path.join(avatarsDir, safeName);
    fs.writeFileSync(outPath, buffer);

    // Update player's tabInfo.picture to public URL path
    const avatarUrl = `/avatars/${safeName}`;

    const mergedData = {
      rollerInfo: { ...existingPlayer.rollerInfo },
      shopInfo: { ...existingPlayer.shopInfo },
      tabInfo: { ...(existingPlayer.tabInfo || {}), picture: avatarUrl },
      // Do not include plaintext pw when validating/updating avatar
      pw: '',
      pwHash: existingPlayer.pwHash
    };

    // Validate then update
    const { valid, errors, normalized } = validatePlayer(Object.assign({ name }, mergedData));
    if (!valid) return res.status(400).json({ error: 'Validation failed', details: errors });

    const ok = playerHelpers.update(name, normalized);
    if (!ok) return res.status(500).json({ error: 'Failed to update player with avatar' });

    const updated = playerHelpers.getByName(name);
    logToFile('API: Uploaded avatar for', name, avatarUrl);
    res.json(updated);
  } catch (error) {
    logToFile('API: Avatar upload failed', req.params.name, error && error.stack ? error.stack : error);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

// GM ENDPOINTS - bypassing session validation with GM secret
function gmBypass(req, res, next) {
  const gmSecret = req.headers['x-gm-secret'];
  if (gmSecret === 'bongo') {
    logToFile('SESSION: GM bypass accepted', req.method, req.url);
    return next();
  }
  logToFile('SESSION: GM bypass rejected - invalid secret', req.method, req.url);
  return res.status(401).json({ error: 'GM access denied' });
}

// Add/update player (GM only)
router.post('/gm/add-or-update', gmBypass, (req, res) => {
  try {
    const { name, rp, pw } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Player name is required' });
    }

    // Check if player exists
    const existing = playerHelpers.getByName(name);
    
    if (existing) {
      // Update existing player
      const updates = { ...existing };
      if (rp !== undefined) updates.tabInfo = { ...updates.tabInfo, rp: parseInt(rp) };
      if (pw) updates.pwHash = require('bcrypt').hashSync(pw, 10);
      
      const { valid, errors, normalized } = validatePlayer(updates);
      if (!valid) return res.status(400).json({ error: 'Validation failed', details: errors });

      const ok = playerHelpers.update(name, normalized);
      if (!ok) return res.status(500).json({ error: 'Failed to update player' });
      
      logToFile('GM: Updated player', name);
      return res.json({ success: true, message: `Updated player ${name}` });
    } else {
      // Create new player
      const defaultRP = rp !== undefined ? parseInt(rp) : 50;
      const password = pw || '1234';
      
      const newPlayer = {
        name,
        tabInfo: { 
          rp: defaultRP,
          renown: 'None',
          xp: 0,
          xpSpent: 0,
          charName: `Brother ${name.charAt(0).toUpperCase() + name.slice(1)}`
        },
        rollerInfo: {},
        shopInfo: {},
        pwHash: require('bcrypt').hashSync(password, 10),
        pw: ''
      };

      const { valid, errors, normalized } = validatePlayer(newPlayer);
      if (!valid) return res.status(400).json({ error: 'Validation failed', details: errors });

      const saved = playerHelpers.create(normalized);
      if (!saved) return res.status(500).json({ error: 'Failed to create player' });
      
      logToFile('GM: Created player', name);
      return res.json({ success: true, message: `Created player ${name}` });
    }
  } catch (error) {
    logToFile('GM: Add/update player failed', error);
    res.status(500).json({ error: 'Failed to add/update player' });
  }
});

// Set RP (GM only)
router.post('/gm/set-rp', gmBypass, (req, res) => {
  try {
    const { playerName, requisitionPoints } = req.body;
    
    if (!playerName) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    const player = playerHelpers.getByName(playerName);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const updates = {
      ...player,
      tabInfo: { ...player.tabInfo, rp: parseInt(requisitionPoints) }
    };

    const { valid, errors, normalized } = validatePlayer(updates);
    if (!valid) return res.status(400).json({ error: 'Validation failed', details: errors });

    const ok = playerHelpers.update(playerName, normalized);
    if (!ok) return res.status(500).json({ error: 'Failed to update player RP' });
    
    logToFile('GM: Set RP for', playerName, 'to', requisitionPoints);
    res.json({ success: true, message: `Set RP for ${playerName} to ${requisitionPoints}` });
  } catch (error) {
    logToFile('GM: Set RP failed', error);
    res.status(500).json({ error: 'Failed to set RP' });
  }
});

// Set XP (GM only)
router.post('/gm/set-xp', gmBypass, (req, res) => {
  try {
    const { playerName, xp } = req.body;
    
    if (!playerName) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    const player = playerHelpers.getByName(playerName);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const updates = {
      ...player,
      tabInfo: { ...player.tabInfo, xp: parseInt(xp) }
    };

    const { valid, errors, normalized } = validatePlayer(updates);
    if (!valid) return res.status(400).json({ error: 'Validation failed', details: errors });

    const ok = playerHelpers.update(playerName, normalized);
    if (!ok) return res.status(500).json({ error: 'Failed to update player XP' });
    
    logToFile('GM: Set XP for', playerName, 'to', xp);
    res.json({ success: true, message: `Set XP for ${playerName} to ${xp}` });
  } catch (error) {
    logToFile('GM: Set XP failed', error);
    res.status(500).json({ error: 'Failed to set XP' });
  }
});

// Set XP Spent (GM only)
router.post('/gm/set-xp-spent', gmBypass, (req, res) => {
  try {
    const { playerName, xpSpent } = req.body;
    
    if (!playerName) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    const player = playerHelpers.getByName(playerName);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const updates = {
      ...player,
      tabInfo: { ...player.tabInfo, xpSpent: parseInt(xpSpent) }
    };

    const { valid, errors, normalized } = validatePlayer(updates);
    if (!valid) return res.status(400).json({ error: 'Validation failed', details: errors });

    const ok = playerHelpers.update(playerName, normalized);
    if (!ok) return res.status(500).json({ error: 'Failed to update player XP Spent' });
    
    logToFile('GM: Set XP Spent for', playerName, 'to', xpSpent);
    res.json({ success: true, message: `Set XP Spent for ${playerName} to ${xpSpent}` });
  } catch (error) {
    logToFile('GM: Set XP Spent failed', error);
    res.status(500).json({ error: 'Failed to set XP Spent' });
  }
});

// Set Renown (GM only)
router.post('/gm/set-renown', gmBypass, (req, res) => {
  try {
    const { playerName, renown } = req.body;
    
    if (!playerName) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    const player = playerHelpers.getByName(playerName);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const updates = {
      ...player,
      tabInfo: { ...player.tabInfo, renown }
    };

    const { valid, errors, normalized } = validatePlayer(updates);
    if (!valid) return res.status(400).json({ error: 'Validation failed', details: errors });

    const ok = playerHelpers.update(playerName, normalized);
    if (!ok) return res.status(500).json({ error: 'Failed to update player renown' });
    
    logToFile('GM: Set renown for', playerName, 'to', renown);
    res.json({ success: true, message: `Set renown for ${playerName} to ${renown}` });
  } catch (error) {
    logToFile('GM: Set renown failed', error);
    res.status(500).json({ error: 'Failed to set renown' });
  }
});

// Reset password (GM only)
router.post('/gm/reset-password', gmBypass, (req, res) => {
  try {
    const { playerName, newPassword } = req.body;
    
    if (!playerName) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    const player = playerHelpers.getByName(playerName);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const password = newPassword || '1234';
    const updates = {
      ...player,
      pwHash: require('bcrypt').hashSync(password, 10),
      pw: ''
    };

    const { valid, errors, normalized } = validatePlayer(updates);
    if (!valid) return res.status(400).json({ error: 'Validation failed', details: errors });

    const ok = playerHelpers.update(playerName, normalized);
    if (!ok) return res.status(500).json({ error: 'Failed to reset password' });
    
    logToFile('GM: Reset password for', playerName);
    res.json({ success: true, message: `Reset password for ${playerName}` });
  } catch (error) {
    logToFile('GM: Reset password failed', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Delete player (GM only)
router.delete('/gm/delete/:playerName', gmBypass, (req, res) => {
  try {
    const { playerName } = req.params;
    
    if (!playerName) {
      return res.status(400).json({ error: 'Player name is required' });
    }
    
    const player = playerHelpers.getByName(playerName);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const ok = playerHelpers.delete(playerName);
    if (!ok) return res.status(500).json({ error: 'Failed to delete player' });
    
    logToFile('GM: Deleted player', playerName);
    res.json({ success: true, message: `Deleted player ${playerName}` });
  } catch (error) {
    logToFile('GM: Delete player failed', error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

module.exports = router;
