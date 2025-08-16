#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { playerHelpers } = require('../sqlite-db');
const { validatePlayer } = require('../validate');

const dbDir = path.join(__dirname, '..', 'sqlite');
const dbPath = path.join(dbDir, 'deathwatch.db');
const backupsDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

function timestamp() { return new Date().toISOString().replace(/[:.]/g,''); }

const args = process.argv.slice(2);
const doApply = args.includes('--apply');

(async function main(){
  console.log('Starting migration: apply defaults to existing players');

  // backup DB first if applying
  if (doApply) {
    const bak = path.join(dbDir, `deathwatch.db.pre_migrate.${timestamp()}.bak`);
    fs.copyFileSync(dbPath, bak);
    console.log('Backup created at', bak);
  }

  const players = playerHelpers.getAll();
  const results = [];

  for (const p of players) {
    const before = JSON.parse(JSON.stringify(p.tabInfo || {}));
    const { valid, errors, normalized } = validatePlayer({ name: p.name, tabInfo: before, rollerInfo: p.rollerInfo, shopInfo: p.shopInfo });
    const after = normalized.tabInfo;
    const changed = JSON.stringify(before) !== JSON.stringify(after);
    results.push({ name: p.name, changed, before, after, errors });

    if (doApply && changed) {
      // apply update via playerHelpers.update
      const updated = playerHelpers.update(p.name, { name: p.name, rollerInfo: p.rollerInfo, shopInfo: p.shopInfo, tabInfo: after, pw: p.pw, pwHash: p.pwHash });
      if (!updated) console.error('Failed to update', p.name);
    }
  }

  const out = { applied: !!doApply, timestamp: new Date().toISOString(), results };
  const outFile = path.join(backupsDir, `migrate_apply_defaults.${doApply ? 'applied' : 'dryrun'}.${timestamp()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
  console.log((doApply ? 'Applied' : 'Dry-run complete') + ' - report written to', outFile);
})();
