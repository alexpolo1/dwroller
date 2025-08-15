const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Simple DB logger to backend.log
const backendLogPath = path.join(__dirname, 'backend.log');
function logToFile(...args) {
  try {
    const msg = `[${new Date().toISOString()}] ` + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
    fs.appendFileSync(backendLogPath, msg, { encoding: 'utf8' });
  } catch (err) {
    console.error('Failed to write backend log', err);
  }
}

// Create database directory if it doesn't exist
const dbDir = path.join(__dirname, 'sqlite');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'deathwatch.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Create tables
const createTables = () => {
  // Players table
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      roller_info TEXT DEFAULT '{}',
      shop_info TEXT DEFAULT '{}',
      tab_info TEXT DEFAULT '{}',
      pw TEXT DEFAULT '',
      pw_hash TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Sessions table (if you need it)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      data TEXT DEFAULT '{}',
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
    CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  `);

  console.log('SQLite tables created successfully');
};

// Initialize database
createTables();

// Prepared statements for common operations
const statements = {
  // Player operations
  getAllPlayers: db.prepare('SELECT * FROM players ORDER BY name'),
  getPlayerByName: db.prepare('SELECT * FROM players WHERE name = ?'),
  insertPlayer: db.prepare(`
    INSERT INTO players (name, roller_info, shop_info, tab_info, pw, pw_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  updatePlayer: db.prepare(`
    UPDATE players 
    SET roller_info = ?, shop_info = ?, tab_info = ?, pw = ?, pw_hash = ?, updated_at = CURRENT_TIMESTAMP
    WHERE name = ?
  `),
  deletePlayer: db.prepare('DELETE FROM players WHERE name = ?'),
  
  // Session operations
  getSession: db.prepare('SELECT * FROM sessions WHERE session_id = ? AND expires_at > datetime(\'now\')'),
  insertSession: db.prepare(`
    INSERT INTO sessions (session_id, data, expires_at)
    VALUES (?, ?, ?)
  `),
  updateSession: db.prepare(`
    UPDATE sessions 
    SET data = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE session_id = ?
  `),
  deleteSession: db.prepare('DELETE FROM sessions WHERE session_id = ?'),
  cleanExpiredSessions: db.prepare('DELETE FROM sessions WHERE expires_at <= datetime(\'now\')')
};

// Helper functions
const playerHelpers = {
  getAll: () => {
    logToFile('DB: getAllPlayers - start');
    const rows = statements.getAllPlayers.all();
    const result = rows.map(row => ({
      name: row.name,
      rollerInfo: JSON.parse(row.roller_info || '{}'),
      shopInfo: JSON.parse(row.shop_info || '{}'),
      tabInfo: JSON.parse(row.tab_info || '{}'),
      pw: row.pw,
      pwHash: row.pw_hash,
      _id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    logToFile('DB: getAllPlayers - resultCount', result.length);
    return result;
  },

  getByName: (name) => {
    logToFile('DB: getPlayerByName - start', name);
    const row = statements.getPlayerByName.get(name);
    if (!row) {
      logToFile('DB: getPlayerByName - not found', name);
      return null;
    }
    const result = {
      name: row.name,
      rollerInfo: JSON.parse(row.roller_info || '{}'),
      shopInfo: JSON.parse(row.shop_info || '{}'),
      tabInfo: JSON.parse(row.tab_info || '{}'),
      pw: row.pw,
      pwHash: row.pw_hash,
      _id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    logToFile('DB: getPlayerByName - found', name);
    return result;
  },

  create: (playerData) => {
    logToFile('DB: createPlayer - start', playerData.name);
    const result = statements.insertPlayer.run(
      playerData.name,
      JSON.stringify(playerData.rollerInfo || {}),
      JSON.stringify(playerData.shopInfo || {}),
      JSON.stringify(playerData.tabInfo || {}),
      playerData.pw || '',
      playerData.pwHash || ''
    );
    const out = { ...playerData, _id: result.lastInsertRowid };
    logToFile('DB: createPlayer - done', playerData.name, 'rowid', result.lastInsertRowid);
    return out;
  },

  update: (name, playerData) => {
    logToFile('DB: updatePlayer - start', name);
    const result = statements.updatePlayer.run(
      JSON.stringify(playerData.rollerInfo || {}),
      JSON.stringify(playerData.shopInfo || {}),
      JSON.stringify(playerData.tabInfo || {}),
      playerData.pw || '',
      playerData.pwHash || '',
      name
    );
    logToFile('DB: updatePlayer - changes', result.changes, name);
    return result.changes > 0;
  },

  delete: (name) => {
    logToFile('DB: deletePlayer - start', name);
    const result = statements.deletePlayer.run(name);
    logToFile('DB: deletePlayer - changes', result.changes, name);
    return result.changes > 0;
  }
};

const sessionHelpers = {
  get: (sessionId) => {
    logToFile('DB: getSession - start', sessionId);
    const row = statements.getSession.get(sessionId);
    if (!row) {
      logToFile('DB: getSession - not found', sessionId);
      return null;
    }
    const out = {
      sessionId: row.session_id,
      data: JSON.parse(row.data || '{}'),
      expiresAt: row.expires_at
    };
    logToFile('DB: getSession - ok', sessionId);
    return out;
  },

  create: (sessionId, data, expiresAt) => {
    logToFile('DB: createSession - start', sessionId, 'expiresAt', expiresAt);
    const res = statements.insertSession.run(sessionId, JSON.stringify(data), expiresAt);
    logToFile('DB: createSession - done', sessionId);
  },

  update: (sessionId, data, expiresAt) => {
    logToFile('DB: updateSession - start', sessionId);
    const result = statements.updateSession.run(JSON.stringify(data), expiresAt, sessionId);
    logToFile('DB: updateSession - changes', result.changes, sessionId);
    return result.changes > 0;
  },

  delete: (sessionId) => {
    logToFile('DB: deleteSession - start', sessionId);
    const result = statements.deleteSession.run(sessionId);
    logToFile('DB: deleteSession - changes', result.changes, sessionId);
    return result.changes > 0;
  },

  cleanExpired: () => {
    logToFile('DB: cleanExpiredSessions - start');
    const result = statements.cleanExpiredSessions.run();
    logToFile('DB: cleanExpiredSessions - removed', result.changes);
    return result.changes;
  }
};

module.exports = {
  db,
  statements,
  playerHelpers,
  sessionHelpers,
  close: () => db.close(),
  logToFile
};
