const { sessionHelpers } = require('./sqlite-db');
const fs = require('fs');
const path = require('path');
function logToFile(...args) {
  const msg = `[${new Date().toISOString()}] ` + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
  fs.appendFileSync(path.join(__dirname, 'backend.log'), msg, { encoding: 'utf8' });
}

// Express middleware to require a valid sessionId in req.headers['x-session-id'] or req.body.sessionId
// Accepts a GM bypass header 'x-gm-secret' matching process.env.GM_PASSWORD or 'bongo' for local convenience
module.exports = async function requireSession(req, res, next) {
  try {
    // Ensure req.body is always an object before any access
    if (typeof req.body !== 'object' || req.body === null) req.body = {};
    if (typeof req.query !== 'object' || req.query === null) req.query = {};
    
    // GM bypass
    const gmSecret = req.headers['x-gm-secret'] || (req.query && req.query.gmSecret) || (req.body && req.body.gmSecret);
    const gmPassword = process.env.GM_PASSWORD || 'bongo';
    if (gmSecret && String(gmSecret) === String(gmPassword)) {
      logToFile('SESSION: GM bypass accepted', req.method, req.originalUrl);
      req.session = { data: { playerName: 'GM' }, playerName: 'GM' };
      req.sessionPlayerName = 'GM';
      return next();
    }

    const sessionId = req.headers['x-session-id'] || (req.body && req.body.sessionId) || (req.query && req.query.sessionId);
    if (!sessionId) {
      logToFile('SESSION: Missing sessionId', req.method, req.originalUrl);
      return res.status(401).json({ error: 'Session required' });
    }

    const session = sessionHelpers.get(sessionId);
    if (!session) {
      logToFile('SESSION: Not found', sessionId, req.method, req.originalUrl);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    if (new Date(session.expiresAt) < new Date()) {
      logToFile('SESSION: Expired', sessionId, req.method, req.originalUrl);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    logToFile('SESSION: Valid', sessionId, session.data.playerName, req.method, req.originalUrl);
    req.session = session;
    req.sessionPlayerName = session.data.playerName;
    next();
  } catch (err) {
    logToFile('SESSION: Error', err && err.message ? err.message : String(err));
    return res.status(500).json({ error: 'Session validation failed' });
  }
};
