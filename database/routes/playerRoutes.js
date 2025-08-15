

const express = require('express');
const Player = require('../playerModel');
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
    const players = await Player.find();
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list players' });
  }
});

// TEMP ADMIN: Delete test users (name contains 'test' or 'Test')
router.delete('/admin/delete-tests', async (req, res) => {
  try {
    const result = await Player.deleteMany({ name: /test/i });
    res.json({ deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete test users' });
  }
});

// Get all players (public for dropdown)
router.get('/', async (req, res) => {
  try {
    const players = await Player.find();
    logToFile('API: Fetch all players (public)', players);
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

// Get a single player by name (require session)
router.get('/:name', requireSession, async (req, res) => {
  try {
    const player = await Player.findOne({ name: req.params.name });
    logToFile('API: Fetch player', req.params.name, player);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
  } catch (error) {
    logToFile('API: Failed to fetch player', req.params.name, error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// Helper to flatten tabInfo
function flattenTabInfo(tabInfo) {
  let t = tabInfo;
  while (t && t.tabInfo) t = t.tabInfo;
  return { ...t };
}

// Create a new player
router.post('/', async (req, res) => {
  try {
    logToFile('API: Creating player', req.body);
    const body = { ...req.body };
    if (body.tabInfo) body.tabInfo = flattenTabInfo(body.tabInfo);
    const newPlayer = new Player(body);
    await newPlayer.save();
    logToFile('API: Player created', newPlayer);
    res.status(201).json(newPlayer);
  } catch (error) {
    logToFile('API: Failed to create player', error);
    res.status(400).json({ error: 'Failed to create player' });
  }
});

// Update a player (require session)
router.put('/:name', requireSession, async (req, res) => {
  try {
    logToFile('API: Updating player', req.params.name, req.body);
    // Always extract pw and pwHash from any location in the request
    let pw, pwHash;
    let tabInfo = req.body.tabInfo;
    if (req.body.pw !== undefined) pw = req.body.pw;
    if (req.body.pwHash !== undefined) pwHash = req.body.pwHash;
    if (tabInfo !== undefined) {
      if (tabInfo.pw !== undefined) pw = tabInfo.pw;
      if (tabInfo.pwHash !== undefined) pwHash = tabInfo.pwHash;
      if (tabInfo.tabInfo) {
        if (tabInfo.tabInfo.pw !== undefined) pw = tabInfo.tabInfo.pw;
        if (tabInfo.tabInfo.pwHash !== undefined) pwHash = tabInfo.tabInfo.pwHash;
      }
      tabInfo = flattenTabInfo(tabInfo);
    }
    const update = {};
    if (pw !== undefined) update.pw = pw;
    if (pwHash !== undefined) update.pwHash = pwHash;
    if (tabInfo !== undefined) update.tabInfo = tabInfo;
    if (Object.keys(update).length === 0) {
      logToFile('API: No valid fields to update for player', req.params.name);
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    const updatedPlayer = await Player.findOneAndUpdate(
      { name: req.params.name },
      update,
      { new: true }
    );
    if (!updatedPlayer) {
      logToFile('API: Player not found for update', req.params.name);
      return res.status(404).json({ error: 'Player not found' });
    }
    logToFile('API: Player updated', updatedPlayer);
    res.json(updatedPlayer);
  } catch (error) {
    logToFile('API: Failed to update player', error);
    res.status(400).json({ error: 'Failed to update player' });
  }
});

// Delete a player (require session)
router.delete('/:name', requireSession, async (req, res) => {
  try {
    logToFile('API: Deleting player', req.params.name);
    const deletedPlayer = await Player.findOneAndDelete({ name: req.params.name });
    if (!deletedPlayer) {
      logToFile('API: Player not found for delete', req.params.name);
      return res.status(404).json({ error: 'Player not found' });
    }
    logToFile('API: Player deleted', req.params.name);
    res.status(204).send();
  } catch (error) {
    logToFile('API: Failed to delete player', error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

module.exports = router;
