const express = require('express');
const { logToFile } = require('../mariadb');
const router = express.Router();

// Simple session validation endpoint
router.post('/validate', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      logToFile('SESSION: Validate missing sessionId');
      return res.status(400).json({ error: 'sessionId required' });
    }
    
    // Extract player name from session ID (simple format: session_playername_timestamp)
    const match = sessionId.match(/^session_([^_]+)_\d+$/);
    if (!match) {
      logToFile('SESSION: Invalid session format', sessionId);
      return res.status(401).json({ error: 'Invalid session format' });
    }
    
    const playerName = match[1];
    
    logToFile('SESSION: Session validation successful', playerName);
    res.json({ 
      valid: true, 
      playerName
    });
  } catch (error) {
    console.error('Session validation error:', error);
    logToFile('SESSION: Failed to validate session', error);
    res.status(500).json({ error: String(error) });
  }
});

console.log('Session routes registered (simple validation)');
module.exports = router;
