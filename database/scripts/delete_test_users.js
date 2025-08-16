const { playerHelpers } = require('../sqlite-db');
const fs = require('fs');
const path = require('path');

function backupDb() {
  const ts = new Date().toISOString().replace(/[:.]/g,'');
  const src = path.join(__dirname, '..', 'sqlite', 'deathwatch.db');
  const dst = path.join(__dirname, '..', 'sqlite', `deathwatch.db.pre_delete_tests.${ts}.bak`);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log('Backup created:', dst);
    return dst;
  }
  console.log('No sqlite DB found at', src);
  return null;
}

function isTestName(name) {
  if (!name) return false;
  return /test|dummy|sample|example|dev/i.test(name);
}

function run() {
  const backup = backupDb();
  const players = playerHelpers.getAll();
  const toDelete = players.filter(p => isTestName(p.name));
  console.log('Found', toDelete.length, 'test-like players');
  const deleted = [];
  for (const p of toDelete) {
    try {
      const ok = playerHelpers.delete(p.name);
      if (ok) deleted.push(p.name);
    } catch (err) {
      console.error('Failed to delete', p.name, err);
    }
  }
  console.log('Deleted', deleted.length, 'players');
  if (backup) console.log('DB backup at', backup);
  if (deleted.length) console.log('Deleted names:', deleted.join(', '));
}

run();
