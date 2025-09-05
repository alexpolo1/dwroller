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

  // Shop tables for requisition system
  db.exec(`
    CREATE TABLE IF NOT EXISTS shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      requisition_cost INTEGER NOT NULL DEFAULT 0,
      renown_requirement TEXT NOT NULL DEFAULT 'None',
      item_type TEXT NOT NULL,
      stats TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS player_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (item_id) REFERENCES shop_items(id),
      UNIQUE(player_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      requisition_cost INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      previous_rp INTEGER NOT NULL,
      new_rp INTEGER NOT NULL,
      transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players(id),
      FOREIGN KEY (item_id) REFERENCES shop_items(id)
    );
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);
    CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_shop_items_category ON shop_items(category);
    CREATE INDEX IF NOT EXISTS idx_shop_items_renown ON shop_items(renown_requirement);
    CREATE INDEX IF NOT EXISTS idx_player_inventory_player ON player_inventory(player_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_player ON transactions(player_id);
    CREATE TABLE IF NOT EXISTS rules_staging (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT,
      category TEXT,
      page TEXT,
      original_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_rules_staging_category ON rules_staging(category);
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
    // Ensure we don't have nested tabInfo
    const cleanTabInfo = playerData.tabInfo || {};
    if (cleanTabInfo.tabInfo) {
      logToFile('DB: updatePlayer - fixing nested tabInfo structure');
      Object.assign(cleanTabInfo, cleanTabInfo.tabInfo);
      delete cleanTabInfo.tabInfo;
    }
    const result = statements.updatePlayer.run(
      JSON.stringify(playerData.rollerInfo || {}),
      JSON.stringify(playerData.shopInfo || {}),
      JSON.stringify(cleanTabInfo),
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

// Staging helpers for sanitized rules
const stagingStatements = {
  insertStaging: db.prepare('INSERT INTO rules_staging (title, content, category, page, original_json) VALUES (?,?,?,?,?)'),
  listStaging: db.prepare('SELECT id, title, content, category, page, original_json, created_at FROM rules_staging ORDER BY id'),
  deleteStagingAll: db.prepare('DELETE FROM rules_staging'),
  getStaging: db.prepare('SELECT id, title, content, category, page, original_json, created_at FROM rules_staging WHERE id = ?')
};

const stagingHelpers = {
  insert: (obj) => {
    const res = stagingStatements.insertStaging.run(obj.title || '', obj.content || '', obj.category || '', obj.page || '', JSON.stringify(obj.original || {}));
    return res.lastInsertRowid;
  },
  list: () => stagingStatements.listStaging.all().map(r => ({ ...r, original: JSON.parse(r.original_json || '{}') })),
  clear: () => stagingStatements.deleteStagingAll.run(),
  get: (id) => {
    const row = stagingStatements.getStaging.get(id);
    if (!row) return null;
    return { ...row, original: JSON.parse(row.original_json || '{}') };
  }
};

module.exports = {
  db,
  statements,
  playerHelpers,
  sessionHelpers,
  stagingHelpers,
  close: () => db.close(),
  logToFile
};
