#!/usr/bin/env node
// Simple DB cleaner/validator for SQLite players table
// Usage: node clean-database.js [--apply] [--delete-tests]

const { playerHelpers } = require('./sqlite-db');

function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function normalizeName(name) {
  if (!name) return '';
  // trim and collapse spaces
  return String(name).trim().replace(/\s+/g, ' ');
}

function looksLikeTestName(name) {
  if (!name) return true;
  return /test|dummy|sample|example/i.test(name);
}

function cleanPlayer(player) {
  const issues = [];
  const updates = {};

  // name
  const cleanName = normalizeName(player.name);
  if (!cleanName) issues.push('empty name');
  if (cleanName !== player.name) updates.name = cleanName;
  if (cleanName.length > 100) issues.push('name too long');

  // pw/pwHash
  if (player.pw && player.pw.length > 0) issues.push('plain password present');
  if (player.pwHash && typeof player.pwHash !== 'string') updates.pwHash = String(player.pwHash);

  // rollerInfo / shopInfo / tabInfo should be objects
  if (!isObject(player.rollerInfo)) {
    issues.push('rollerInfo not object');
    updates.rollerInfo = {};
  }
  if (!isObject(player.shopInfo)) {
    issues.push('shopInfo not object');
    updates.shopInfo = {};
  }
  if (!isObject(player.tabInfo)) {
    issues.push('tabInfo not object');
    updates.tabInfo = {};
  }

  // Flatten nested tabInfo.tabInfo
  if (isObject(player.tabInfo) && isObject(player.tabInfo.tabInfo)) {
    issues.push('nested tabInfo.tabInfo found; will be flattened');
    updates.tabInfo = Object.assign({}, player.tabInfo.tabInfo, player.tabInfo);
    delete updates.tabInfo.tabInfo;
  }

  // Remove mongo-specific fields inside tabInfo or rollerInfo
  ['mongoId', 'mongo_id', '_id', 'mongoIdString'].forEach(k => {
    if (isObject(player.tabInfo) && player.tabInfo[k]) {
      issues.push(`tabInfo contains ${k}; will be removed`);
      const t = Object.assign({}, player.tabInfo);
      delete t[k];
      updates.tabInfo = Object.assign({}, updates.tabInfo || player.tabInfo || {}, t);
    }
    if (isObject(player.rollerInfo) && player.rollerInfo[k]) {
      issues.push(`rollerInfo contains ${k}; will be removed`);
      const r = Object.assign({}, player.rollerInfo);
      delete r[k];
      updates.rollerInfo = Object.assign({}, updates.rollerInfo || player.rollerInfo || {}, r);
    }
  });

  // Normalize common known fields types in tabInfo
  const expectedTabFields = ['renown','rp','xp','xpSpent','wounds','movement','notes','playerName','charName','rank'];
  if (isObject(player.tabInfo)) {
    expectedTabFields.forEach(f => {
      if (Object.prototype.hasOwnProperty.call(player.tabInfo, f)) {
        const val = player.tabInfo[f];
        if (f === 'rp' || f === 'xp' || f === 'xpSpent' || f === 'wounds' || f === 'movement') {
          // ensure numeric
          const n = Number(val);
          if (!Number.isFinite(n)) {
            issues.push(`${f} not numeric; setting to 0`);
            updates.tabInfo = Object.assign({}, updates.tabInfo || player.tabInfo || {}, { [f]: 0 });
          } else if (n !== val) {
            updates.tabInfo = Object.assign({}, updates.tabInfo || player.tabInfo || {}, { [f]: n });
          }
        }
        if (f === 'renown' && val && typeof val === 'string' && val.trim() === '') {
          issues.push('renown blank string; normalizing to "None"');
          updates.tabInfo = Object.assign({}, updates.tabInfo || player.tabInfo || {}, { renown: 'None' });
        }
      }
    });
  }

  // Detect junk keys: very long strings or binary-like values
  ['rollerInfo','shopInfo','tabInfo'].forEach(k => {
    const v = player[k];
    if (isObject(v)) {
      Object.keys(v).forEach(key => {
        const val = v[key];
        if (typeof val === 'string' && val.length > 2000) {
          issues.push(`${k}.${key} unusually long (>${2000})`);
          // truncate
          updates[k] = Object.assign({}, updates[k] || v, { [key]: val.substring(0, 2000) });
        }
      });
    }
  });

  // Identify obvious test users
  if (looksLikeTestName(player.name)) {
    issues.push('test/dummy/example user');
  }

  return { issues, updates };
}

async function run() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const deleteTests = args.includes('--delete-tests');

  const players = playerHelpers.getAll();
  const report = {
    total: players.length,
    toDelete: [],
    toUpdate: []
  };

  const seenNames = new Map();

  for (const pl of players) {
    const { issues, updates } = cleanPlayer(pl);

    // Duplicate name detection
    const nameKey = normalizeName(pl.name).toLowerCase();
    if (seenNames.has(nameKey)) {
      issues.push('duplicate name');
      report.toDelete.push({ name: pl.name, reason: 'duplicate' });
      continue;
    }
    seenNames.set(nameKey, true);

    if (issues.length > 0) {
      report.toUpdate.push({ name: pl.name, issues, updates });
    }

    if (looksLikeTestName(pl.name) && deleteTests) {
      report.toDelete.push({ name: pl.name, reason: 'test user' });
    }
  }

  // Print report
  console.log('=== Clean DB Report (dry-run unless --apply) ===');
  console.log('Total players:', report.total);
  console.log('Candidates for update:', report.toUpdate.length);
  console.log('Candidates for delete:', report.toDelete.length);

  if (report.toUpdate.length > 0) {
    console.log('\n--- Updates ---');
    report.toUpdate.forEach(u => {
      console.log('Player:', u.name);
      console.log(' Issues:', u.issues.join('; '));
      console.log(' Planned updates:', JSON.stringify(u.updates));
    });
  }

  if (report.toDelete.length > 0) {
    console.log('\n--- Deletes ---');
    report.toDelete.forEach(d => console.log('Player:', d.name, 'Reason:', d.reason));
  }

  if (apply) {
    console.log('\nApplying fixes...');
    let updated=0, deleted=0;
    for (const u of report.toUpdate) {
      try {
        if (Object.keys(u.updates).length > 0) {
          // If name is changing, perform delete/create to maintain unique constraint
          if (u.updates.name) {
            const orig = u.name;
            const newName = u.updates.name;
            const pl = playerHelpers.getByName(orig);
            if (pl) {
              // delete then recreate
              playerHelpers.delete(orig);
              playerHelpers.create(Object.assign({}, pl, { name: newName, rollerInfo: u.updates.rollerInfo || pl.rollerInfo, shopInfo: u.updates.shopInfo || pl.shopInfo, tabInfo: u.updates.tabInfo || pl.tabInfo, pw: pl.pw, pwHash: pl.pwHash }));
              updated++;
            }
          } else {
            // normal update
            const pl = playerHelpers.getByName(u.name);
            if (pl) {
              const merged = {
                rollerInfo: u.updates.rollerInfo || pl.rollerInfo,
                shopInfo: u.updates.shopInfo || pl.shopInfo,
                tabInfo: u.updates.tabInfo || pl.tabInfo,
                pw: pl.pw,
                pwHash: pl.pwHash
              };
              playerHelpers.update(u.name, merged);
              updated++;
            }
          }
        }
      } catch (err) {
        console.error('Failed to apply update for', u.name, err);
      }
    }

    for (const d of report.toDelete) {
      try {
        if (playerHelpers.delete(d.name)) deleted++;
      } catch (err) {
        console.error('Failed to delete', d.name, err);
      }
    }

    console.log(`Applied: ${updated} updates, ${deleted} deletes`);
  }

  console.log('\nDone.');
}

run().catch(err => { console.error('Clean script error', err); process.exit(1); });
