const express = require('express');
const { playerHelpers, logToFile } = require('../mariadb');
const router = express.Router();

// Login endpoint for players
router.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;
    console.log('Login attempt for player:', name);
    
    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password required' });
    }
    
    // Special handling for GM user
    if (name.toLowerCase() === 'gm') {
      if (password !== 'bongo') {
        return res.status(401).json({ error: 'Invalid password' });
      }
    } else {
      // For regular players, use password '1234'
      if (password !== '1234') {
        return res.status(401).json({ error: 'Invalid password' });
      }
    }
    
    const player = await playerHelpers.getByName(name);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Generate a simple session ID (in production, use proper session management)
    const sessionId = `session_${name}_${Date.now()}`;
    
    logToFile('API: Player login', name, 'success');
    res.json({ 
      success: true, 
      sessionId,
      player: { name: player.name }
    });
  } catch (error) {
    console.error('Login error:', error);
    logToFile('API: Failed to login player', req.body?.name, error);
    res.status(500).json({ error: String(error) });
  }
});

// Get player names for login dropdown (public - no session required)
router.get('/names', async (req, res) => {
  try {
    console.log('Player names endpoint hit');
    const players = await playerHelpers.getAll();
    // Only return names for the login dropdown, not full player data
    const playerNames = players.map(p => ({ name: p.name }));
    res.json(playerNames);
  } catch (error) {
    console.error('Player names error:', error);
    logToFile('API: Failed to get player names', error);
    res.status(500).json({ error: String(error) });
  }
});

// Get all players (public for dropdown)
router.get('/', async (req, res) => {
  try {
    const players = await playerHelpers.getAll();
    logToFile('API: Fetch all players (public)', players.length);
    
    // If authenticated (has session header or x-gm-secret), return full player data
    const hasSession = req.headers['x-session-id'] || req.headers['x-gm-secret'];
    
    if (hasSession) {
      // Return full player data for authenticated requests
      res.json(players);
    } else {
      // Only send name for dropdown if not authenticated
      res.json(players.map(p => ({ name: p.name })));
    }
  } catch (error) {
    logToFile('API: Failed to fetch players', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Get player by name
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    console.log('Getting player:', name);
    
    const player = await playerHelpers.getByName(name);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    logToFile('API: Fetch player', name, 'success');
    res.json(player);
  } catch (error) {
    console.error('Get player error:', error);
    logToFile('API: Failed to get player', req.params.name, error);
    res.status(500).json({ error: String(error) });
  }
});

// Update player data
router.put('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const playerData = req.body;
    
    console.log('Updating player:', name);
    
    const success = await playerHelpers.update(name, playerData);
    if (!success) {
      return res.status(500).json({ error: 'Failed to update player' });
    }
    
    logToFile('API: Updated player', name, 'success');
    res.json({ success: true, message: 'Player updated successfully' });
  } catch (error) {
    console.error('Update player error:', error);
    logToFile('API: Failed to update player', req.params.name, error);
    res.status(500).json({ error: String(error) });
  }
});

// Create new player
router.post('/', async (req, res) => {
  try {
    const playerData = req.body;
    
    console.log('Creating player:', playerData.name);
    
    // Check if player already exists
    const existing = await playerHelpers.getByName(playerData.name);
    if (existing) {
      return res.status(409).json({ error: 'Player already exists' });
    }
    
    const playerId = await playerHelpers.create(playerData);
    if (!playerId) {
      return res.status(500).json({ error: 'Failed to create player' });
    }
    
    logToFile('API: Created player', playerData.name, 'success');
    res.json({ success: true, id: playerId, message: 'Player created successfully' });
  } catch (error) {
    console.error('Create player error:', error);
    logToFile('API: Failed to create player', req.body.name, error);
    res.status(500).json({ error: String(error) });
  }
});

// Delete player
router.delete('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    console.log('Deleting player:', name);
    
    const success = await playerHelpers.delete(name);
    if (!success) {
      return res.status(404).json({ error: 'Player not found or could not be deleted' });
    }
    
    logToFile('API: Deleted player', name, 'success');
    res.json({ success: true, message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Delete player error:', error);
    logToFile('API: Failed to delete player', req.params.name, error);
    res.status(500).json({ error: String(error) });
  }
});

console.log('Player routes registered (MariaDB)');
module.exports = router;
