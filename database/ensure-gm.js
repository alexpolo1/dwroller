// Script to ensure GM user exists
const { db } = require('./sqlite-db');

function logToFile(...args) {
  const msg = `[${new Date().toISOString()}] ` + args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ') + '\n';
  require('fs').appendFileSync(require('path').join(__dirname, 'backend.log'), msg, { encoding: 'utf8' });
}

// Check if GM user exists
const existingGm = db.prepare('SELECT * FROM players WHERE name = ?').get('gm');

if (!existingGm) {
  // Create GM user with password 'bongo'
  const stmt = db.prepare(`
    INSERT INTO players (name, pw, pw_hash, tab_info) 
    VALUES (?, ?, ?, ?)
  `);

  stmt.run('gm', 'bongo', 'bongo', JSON.stringify({
    rp: 999999,
    inventory: [],
    renown: 'None'
  }));

  logToFile('Created GM user');
  console.log('Created GM user');
} else {
  // Update GM user password if needed
  const stmt = db.prepare(`
    UPDATE players 
    SET pw = ?, pw_hash = ?
    WHERE name = 'gm'
  `);

  stmt.run('bongo', 'bongo');
  
  logToFile('Updated GM user');
  console.log('Updated GM user');
}

// Make sure GM has admin privileges
const stmt = db.prepare(`
  UPDATE players 
  SET tab_info = ?
  WHERE name = 'gm'
`);

stmt.run(JSON.stringify({
  rp: 999999,
  inventory: [],
  renown: 'None'
}));

logToFile('GM privileges ensured');
console.log('GM privileges ensured');
