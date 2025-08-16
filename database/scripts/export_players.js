const { playerHelpers } = require('../sqlite-db');
const fs = require('fs');
const path = require('path');

const players = playerHelpers.getAll();
const outPath = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(outPath)) fs.mkdirSync(outPath, { recursive: true });
const file = path.join(outPath, `players-after-clean.${new Date().toISOString().replace(/[:.]/g,'')}.json`);
fs.writeFileSync(file, JSON.stringify(players, null, 2), 'utf8');
console.log('Exported players to', file);
