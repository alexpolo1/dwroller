const express = require('express');
const { sessionHelpers, playerHelpers } = require('../sqlite-db');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Simple file logger
function logToFile(...args) {
  const msg = `[${new Date().toISOString()}] ` + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
  fs.appendFileSync(path.join(__dirname, '../backend.log'), msg, { encoding: 'utf8' });
}

const router = express.Router();

// Create a new session (login)
router.post('/login', async (req, res) => {
  try {
    const { playerName, username, password } = req.body;
    const name = playerName || username; // Accept either field name
    
    if (!name) {
      logToFile('SESSION: Login missing playerName/username');
      return res.status(400).json({ error: 'playerName or username required' });
    }

    // Check if player exists
    const player = playerHelpers.getByName(name);
    if (!player) {
      logToFile('SESSION: Login player not found', name);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password if provided
    if (password) {
      // For now, compare with plain text (you can add bcrypt later)
      const playerPw = player.pw || '';
      if (playerPw !== password) {
        logToFile('SESSION: Login invalid password', name);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 24h
    
    sessionHelpers.create(sessionId, { playerName: name }, expiresAt);
    
    logToFile('SESSION: Login success', name, sessionId);
    res.json({ sessionId, expiresAt, playerName: name, success: true });
  } catch (error) {
    logToFile('SESSION: Login error', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Validate session
router.post('/validate', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      logToFile('SESSION: Validate missing sessionId');
      return res.status(400).json({ error: 'sessionId required' });
    }

    const session = sessionHelpers.get(sessionId);
    
    if (!session) {
      logToFile('SESSION: Validate not found', sessionId);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    logToFile('SESSION: Validate success', sessionId, session.data.playerName);
    res.json({ valid: true, playerName: session.data.playerName });
  } catch (error) {
    logToFile('SESSION: Validate error', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// Logout (delete session)
router.post('/logout', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (sessionId) {
      sessionHelpers.delete(sessionId);
      logToFile('SESSION: Logout success', sessionId);
    }
    
    res.json({ success: true });
  } catch (error) {
    logToFile('SESSION: Logout error', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Clean expired sessions (can be called periodically)
router.post('/cleanup', async (req, res) => {
  try {
    const deletedCount = sessionHelpers.cleanExpired();
    logToFile('SESSION: Cleanup completed', `${deletedCount} sessions removed`);
    res.json({ deletedCount });
  } catch (error) {
    logToFile('SESSION: Cleanup error', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

module.exports = router;
