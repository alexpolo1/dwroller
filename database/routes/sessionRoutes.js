const express = require('express');
const Session = require('../sessionModel');
const router = express.Router();
const crypto = require('crypto');

// Create a new session (login)
router.post('/login', async (req, res) => {
  const { playerName } = req.body;
  if (!playerName) return res.status(400).json({ error: 'playerName required' });
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
  const session = new Session({ sessionId, playerName, expiresAt });
  await session.save();
  res.json({ sessionId, expiresAt });
});

// Validate session
const fs = require('fs');
const path = require('path');
function logToFile(...args) {
  const msg = `[${new Date().toISOString()}] ` + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
  fs.appendFileSync(path.join(__dirname, '../backend.log'), msg, { encoding: 'utf8' });
}
router.post('/validate', async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) {
    logToFile('SESSION: Validate missing sessionId');
    return res.status(400).json({ error: 'sessionId required' });
  }
  const session = await Session.findOne({ sessionId });
  if (!session) {
    logToFile('SESSION: Validate not found', sessionId);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  if (session.expiresAt < new Date()) {
    logToFile('SESSION: Validate expired', sessionId);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  logToFile('SESSION: Validate success', sessionId, session.playerName);
  res.json({ valid: true, playerName: session.playerName });
});

// Logout (delete session)
router.post('/logout', async (req, res) => {
  const { sessionId } = req.body;
  await Session.deleteOne({ sessionId });
  res.json({ success: true });
});

module.exports = router;
