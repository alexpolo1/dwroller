const express = require('express');
const { playerHelpers } = require('../sqlite-db');
const fs = require('fs');
const path = require('path');

// Simple file logger
function logToFile(...args) {
  const msg = `[${new Date().toISOString()}] ` + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
  fs.appendFileSync(path.join(__dirname, '../backend.log'), msg, { encoding: 'utf8' });
}

const requireSession = require('../requireSession');
const router = express.Router();

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
    
    // Only send name for dropdown if not authed
    if (!req.headers['x-session-id']) {
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

    // Create password hash if password provided
    let pwHash = '';
    if (pw) {
      const bcrypt = require('bcrypt');
      pwHash = await bcrypt.hash(pw, 10);
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
    logToFile('API: Failed to create player', req.body.name, error);
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

    // Handle password update if provided
    if (updateData.pw) {
      const bcrypt = require('bcrypt');
      updateData.pwHash = await bcrypt.hash(updateData.pw, 10);
    }

    // Merge the data properly
    const mergedData = {
      rollerInfo: { ...existingPlayer.rollerInfo, ...updateData.rollerInfo },
      shopInfo: { ...existingPlayer.shopInfo, ...updateData.shopInfo },
      tabInfo: { ...existingPlayer.tabInfo, ...updateData.tabInfo },
      pw: updateData.pw || existingPlayer.pw,
      pwHash: updateData.pwHash || existingPlayer.pwHash
    };

    // Handle the special case where frontend sends flat data that should go into tabInfo
    if (updateData.playerName || updateData.charName || updateData.characteristics) {
      mergedData.tabInfo = {
        ...mergedData.tabInfo,
        playerName: updateData.playerName || mergedData.tabInfo.playerName,
        charName: updateData.charName || mergedData.tabInfo.charName,
        gear: updateData.gear || mergedData.tabInfo.gear,
        chapter: updateData.chapter || mergedData.tabInfo.chapter,
        demeanour: updateData.demeanour || mergedData.tabInfo.demeanour,
        speciality: updateData.speciality || mergedData.tabInfo.speciality,
        rank: updateData.rank || mergedData.tabInfo.rank,
        powerArmour: updateData.powerArmour || mergedData.tabInfo.powerArmour,
        description: updateData.description || mergedData.tabInfo.description,
        pastEvent: updateData.pastEvent || mergedData.tabInfo.pastEvent,
        personalDemeanour: updateData.personalDemeanour || mergedData.tabInfo.personalDemeanour,
        characteristics: updateData.characteristics || mergedData.tabInfo.characteristics,
        skills: updateData.skills || mergedData.tabInfo.skills,
        weapons: updateData.weapons || mergedData.tabInfo.weapons,
        armour: updateData.armour || mergedData.tabInfo.armour,
        talents: updateData.talents || mergedData.tabInfo.talents,
        psychic: updateData.psychic || mergedData.tabInfo.psychic,
        wounds: updateData.wounds || mergedData.tabInfo.wounds,
        insanity: updateData.insanity || mergedData.tabInfo.insanity,
        movement: updateData.movement || mergedData.tabInfo.movement,
        fate: updateData.fate || mergedData.tabInfo.fate,
        corruption: updateData.corruption || mergedData.tabInfo.corruption,
        renown: updateData.renown || mergedData.tabInfo.renown,
        xp: updateData.xp || mergedData.tabInfo.xp,
        xpSpent: updateData.xpSpent || mergedData.tabInfo.xpSpent,
        notes: updateData.notes || mergedData.tabInfo.notes,
        rp: updateData.rp || mergedData.tabInfo.rp
      };
    }

    const updated = playerHelpers.update(name, mergedData);
    
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update player' });
    }

    const updatedPlayer = playerHelpers.getByName(name);
    logToFile('API: Updated player', name);
    res.json(updatedPlayer);
  } catch (error) {
    logToFile('API: Failed to update player', req.params.name, error);
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

// Login endpoint
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

    // Check password
    const bcrypt = require('bcrypt');
    const isValidPassword = await bcrypt.compare(password, player.pwHash);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create session (you might want to implement proper session management)
    const sessionId = require('crypto').randomBytes(32).toString('hex');
    
    logToFile('API: Player login', name);
    res.json({ 
      message: 'Login successful', 
      sessionId,
      player: {
        name: player.name,
        rollerInfo: player.rollerInfo,
        shopInfo: player.shopInfo,
        tabInfo: player.tabInfo
      }
    });
  } catch (error) {
    logToFile('API: Login failed', req.body.name, error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
