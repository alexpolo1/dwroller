const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

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

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'deathwatch',
  password: 'dwroller2025',
  database: 'deathwatch',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Create tables
const createTables = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Players table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        roller_info JSON DEFAULT ('{}'),
        shop_info JSON DEFAULT ('{}'),
        tab_info JSON DEFAULT ('{}'),
        pw VARCHAR(255) DEFAULT '',
        pw_hash VARCHAR(255) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Sessions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        data JSON DEFAULT ('{}'),
        expires_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Rules staging table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS rules_staging (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title TEXT,
        content TEXT,
        category VARCHAR(255),
        page VARCHAR(255),
        original_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await connection.execute(`CREATE INDEX IF NOT EXISTS idx_players_name ON players(name)`);
    await connection.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id)`);
    await connection.execute(`CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)`);
    await connection.execute(`CREATE INDEX IF NOT EXISTS idx_rules_staging_category ON rules_staging(category)`);

    connection.release();
    console.log('MariaDB tables created successfully');
    logToFile('MariaDB: Tables created successfully');
  } catch (error) {
    console.error('Error creating MariaDB tables:', error);
    logToFile('MariaDB: Error creating tables', error);
    throw error;
  }
};

// Player helpers
const playerHelpers = {
  getAll: async () => {
    try {
      const [rows] = await pool.execute('SELECT * FROM players ORDER BY name');
      return rows.map(row => ({
        id: row.id,
        name: row.name,
        rollerInfo: typeof row.roller_info === 'string' ? JSON.parse(row.roller_info) : row.roller_info,
        shopInfo: typeof row.shop_info === 'string' ? JSON.parse(row.shop_info) : row.shop_info,
        tabInfo: typeof row.tab_info === 'string' ? JSON.parse(row.tab_info) : row.tab_info,
        pw: row.pw || '',
        pwHash: row.pw_hash || '',
        requisitionPoints: row.requisition_points || 0,
        renownLevel: row.renown_level || 'None',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        _id: row.id
      }));
    } catch (error) {
      logToFile('MariaDB: Error getting all players', error);
      return [];
    }
  },

  getByName: async (name) => {
    try {
      const [rows] = await pool.execute('SELECT * FROM players WHERE name = ?', [name]);
      if (rows.length === 0) return null;
      
      const row = rows[0];
      return {
        id: row.id,
        name: row.name,
        rollerInfo: typeof row.roller_info === 'string' ? JSON.parse(row.roller_info) : row.roller_info,
        shopInfo: typeof row.shop_info === 'string' ? JSON.parse(row.shop_info) : row.shop_info,
        tabInfo: typeof row.tab_info === 'string' ? JSON.parse(row.tab_info) : row.tab_info,
        pw: row.pw || '',
        pwHash: row.pw_hash || '',
        requisitionPoints: row.requisition_points || 0,
        renownLevel: row.renown_level || 'None',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        _id: row.id
      };
    } catch (error) {
      logToFile('MariaDB: Error getting player by name', name, error);
      return null;
    }
  },

  create: async (playerData) => {
    try {
      const { name, rollerInfo = {}, shopInfo = {}, tabInfo = {}, pw = '', pwHash = '' } = playerData;
      
      const [result] = await pool.execute(
        'INSERT INTO players (name, roller_info, shop_info, tab_info, pw, pw_hash) VALUES (?, ?, ?, ?, ?, ?)',
        [name, JSON.stringify(rollerInfo), JSON.stringify(shopInfo), JSON.stringify(tabInfo), pw, pwHash]
      );
      
      logToFile('MariaDB: Created player', name);
      return result.insertId;
    } catch (error) {
      logToFile('MariaDB: Error creating player', playerData.name, error);
      return null;
    }
  },

  update: async (name, playerData) => {
    try {
      const { rollerInfo, shopInfo, tabInfo, pw, pwHash } = playerData;
      
      const [result] = await pool.execute(
        'UPDATE players SET roller_info = ?, shop_info = ?, tab_info = ?, pw = ?, pw_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE name = ?',
        [
          JSON.stringify(rollerInfo || {}),
          JSON.stringify(shopInfo || {}), 
          JSON.stringify(tabInfo || {}),
          pw || '',
          pwHash || '',
          name
        ]
      );
      
      logToFile('MariaDB: Updated player', name);
      return result.affectedRows > 0;
    } catch (error) {
      logToFile('MariaDB: Error updating player', name, error);
      return false;
    }
  },

  delete: async (name) => {
    try {
      const [result] = await pool.execute('DELETE FROM players WHERE name = ?', [name]);
      logToFile('MariaDB: Deleted player', name);
      return result.affectedRows > 0;
    } catch (error) {
      logToFile('MariaDB: Error deleting player', name, error);
      return false;
    }
  }
};

// Session helpers
const sessionHelpers = {
  create: async (sessionId, data = {}, expiresAt = null) => {
    try {
      const [result] = await pool.execute(
        'INSERT INTO sessions (session_id, data, expires_at) VALUES (?, ?, ?)',
        [sessionId, JSON.stringify(data), expiresAt]
      );
      return result.insertId;
    } catch (error) {
      logToFile('MariaDB: Error creating session', sessionId, error);
      return null;
    }
  },

  get: async (sessionId) => {
    try {
      const [rows] = await pool.execute('SELECT * FROM sessions WHERE session_id = ?', [sessionId]);
      if (rows.length === 0) return null;
      
      const row = rows[0];
      return {
        ...row,
        data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
      };
    } catch (error) {
      logToFile('MariaDB: Error getting session', sessionId, error);
      return null;
    }
  },

  update: async (sessionId, data) => {
    try {
      const [result] = await pool.execute(
        'UPDATE sessions SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE session_id = ?',
        [JSON.stringify(data), sessionId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      logToFile('MariaDB: Error updating session', sessionId, error);
      return false;
    }
  },

  delete: async (sessionId) => {
    try {
      const [result] = await pool.execute('DELETE FROM sessions WHERE session_id = ?', [sessionId]);
      return result.affectedRows > 0;
    } catch (error) {
      logToFile('MariaDB: Error deleting session', sessionId, error);
      return false;
    }
  },

  cleanup: async () => {
    try {
      const [result] = await pool.execute('DELETE FROM sessions WHERE expires_at < NOW()');
      logToFile('MariaDB: Cleaned up expired sessions', result.affectedRows);
      return result.affectedRows;
    } catch (error) {
      logToFile('MariaDB: Error cleaning up sessions', error);
      return 0;
    }
  }
};

// Rules helpers
const rulesHelpers = {
  getAll: async () => {
    try {
      const [rows] = await pool.execute('SELECT * FROM rules ORDER BY id');
      return rows;
    } catch (error) {
      logToFile('MariaDB: Error getting all rules', error);
      return [];
    }
  },

  create: async (rule) => {
    try {
      const [result] = await pool.execute(
        'INSERT INTO rules (title, content, source, page_num, rulebook, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [rule.title, rule.content, rule.source, rule.page_num, rule.rulebook]
      );
      return result.insertId;
    } catch (error) {
      logToFile('MariaDB: Error creating rule', error);
      return null;
    }
  },

  delete: async (id) => {
    try {
      const [result] = await pool.execute('DELETE FROM rules WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      logToFile('MariaDB: Error deleting rule', id, error);
      return false;
    }
  }
};

// Rules staging helpers
const stagingHelpers = {
  getAll: async () => {
    try {
      const [rows] = await pool.execute('SELECT * FROM rules_staging ORDER BY id');
      return rows;
    } catch (error) {
      logToFile('MariaDB: Error getting all staging rules', error);
      return [];
    }
  },

  create: async (rule) => {
    try {
      const [result] = await pool.execute(
        'INSERT INTO rules_staging (title, content, source, page_num, rulebook, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [rule.title, rule.content, rule.source, rule.page_num, rule.rulebook]
      );
      return result.insertId;
    } catch (error) {
      logToFile('MariaDB: Error creating staging rule', error);
      return null;
    }
  },

  delete: async (id) => {
    try {
      const [result] = await pool.execute('DELETE FROM rules_staging WHERE id = ?', [id]);
      return result.affectedRows > 0;
    } catch (error) {
      logToFile('MariaDB: Error deleting staging rule', id, error);
      return false;
    }
  },

  moveToRules: async (id) => {
    try {
      const connection = await pool.getConnection();
      await connection.beginTransaction();

      // Get the staging rule
      const [stagingRows] = await connection.execute('SELECT * FROM rules_staging WHERE id = ?', [id]);
      if (stagingRows.length === 0) {
        await connection.rollback();
        connection.release();
        return false;
      }

      const rule = stagingRows[0];
      
      // Insert into rules
      await connection.execute(
        'INSERT INTO rules (title, content, source, page_num, rulebook, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [rule.title, rule.content, rule.source, rule.page_num, rule.rulebook]
      );

      // Delete from staging
      await connection.execute('DELETE FROM rules_staging WHERE id = ?', [id]);

      await connection.commit();
      connection.release();
      return true;
    } catch (error) {
      logToFile('MariaDB: Error moving staging rule to rules', id, error);
      return false;
    }
  }
};

// Weapons helpers
const weaponsHelpers = {
  getAll: async () => {
    try {
      const [rows] = await pool.execute('SELECT * FROM weapons ORDER BY id');
      return rows;
    } catch (error) {
      logToFile('MariaDB: Error getting all weapons', error);
      return [];
    }
  }
};

// Bestiary helpers
const bestiaryHelpers = {
  getAll: async () => {
    try {
      const [rows] = await pool.execute('SELECT * FROM bestiary ORDER BY id');
      return rows;
    } catch (error) {
      logToFile('MariaDB: Error getting all bestiary', error);
      return [];
    }
  }
};

// Initialize database
createTables().catch(error => {
  console.error('Failed to initialize MariaDB:', error);
  process.exit(1);
});

// Export the connection pool and helpers
module.exports = {
  pool,
  playerHelpers,
  sessionHelpers,
  rulesHelpers,
  stagingHelpers,
  weaponsHelpers,
  bestiaryHelpers,
  logToFile
};
