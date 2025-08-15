const Session = require('./sessionModel');
const fs = require('fs');
const path = require('path');
function logToFile(...args) {
  const msg = `[${new Date().toISOString()}] ` + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
  fs.appendFileSync(path.join(__dirname, 'backend.log'), msg, { encoding: 'utf8' });
}

// Express middleware to require a valid sessionId in req.headers['x-session-id'] or req.body.sessionId
// Attaches req.session and req.sessionPlayerName if valid, else sends 401
module.exports = async function requireSession(req, res, next) {
  // Ensure req.body is always an object
  if (typeof req.body !== 'object' || req.body === null) req.body = {};
  const sessionId = req.headers['x-session-id'] || req.body.sessionId || req.query.sessionId;
  if (!sessionId) {
    logToFile('SESSION: Missing sessionId', req.method, req.originalUrl);
    return res.status(401).json({ error: 'Session required' });
  }
  const session = await Session.findOne({ sessionId });
  if (!session) {
    logToFile('SESSION: Not found', sessionId, req.method, req.originalUrl);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  if (session.expiresAt < new Date()) {
    logToFile('SESSION: Expired', sessionId, req.method, req.originalUrl);
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
  logToFile('SESSION: Valid', sessionId, session.playerName, req.method, req.originalUrl);
  req.session = session;
  req.sessionPlayerName = session.playerName;
  next();
};
