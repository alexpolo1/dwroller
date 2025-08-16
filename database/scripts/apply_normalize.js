const { playerHelpers } = require('../sqlite-db');
const { validatePlayer } = require('../validate');

function backupDb() {
  const fs = require('fs');
  const path = require('path');
  const ts = new Date().toISOString().replace(/[:.]/g,'');
  const src = path.join(__dirname, '..', 'sqlite', 'deathwatch.db');
  const dst = path.join(__dirname, '..', 'sqlite', `deathwatch.db.pre_normalize.${ts}.bak`);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log('Backup created:', dst);
  } else {
    console.log('No sqlite DB found at', src);
  }
}

function apply() {
  backupDb();
  const players = playerHelpers.getAll();
  let applied = 0;
  const details = [];
  for (const p of players) {
    const { valid, errors, normalized } = validatePlayer(p);
    // Compare normalized to existing for keys we change (rollerInfo, shopInfo, tabInfo)
    const changed = JSON.stringify({rollerInfo: p.rollerInfo, shopInfo: p.shopInfo, tabInfo: p.tabInfo}) !== JSON.stringify({rollerInfo: normalized.rollerInfo, shopInfo: normalized.shopInfo, tabInfo: normalized.tabInfo});
    if (changed) {
      try {
        playerHelpers.update(p.name, normalized);
        applied++;
        details.push({ name: p.name, errors, appliedChanges: true });
      } catch (err) {
        details.push({ name: p.name, error: String(err) });
      }
    }
  }
  console.log(`Applied normalization to ${applied} players`);
  if (details.length) console.log('Details:', JSON.stringify(details, null, 2));
}

apply();
