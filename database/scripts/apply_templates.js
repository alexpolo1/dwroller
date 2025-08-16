#!/usr/bin/env node
/*
Apply templates and items to players.
Usage:
  node apply_templates.js --mapping path/to/mapping.json [--apply]
If no mapping provided, creates a sample mapping at database/backups/template-mapping.sample.json and exits.

Mapping format (JSON):
{
  "players": [
    {
      "name": "christoffer",
      "setCharacteristics": { "WS": 35, "BS": 40 },
      "addItems": ["Bolt Pistol"],
      "setRenown": "Respected"
    }
  ]
}

This script will only modify player tabInfo.inventory (array) and tabInfo.characteristics and renown. It backs up the DB before applying when --apply is used.
*/

const fs = require('fs');
const path = require('path');
const argv = require('yargs/yargs')(process.argv.slice(2)).argv;
const { playerHelpers } = require('../sqlite-db');

function backupDb(prefix) {
  const ts = new Date().toISOString().replace(/[:.]/g,'');
  const src = path.join(__dirname, '..', 'sqlite', 'deathwatch.db');
  const dst = path.join(__dirname, '..', 'sqlite', `deathwatch.db.${prefix}.${ts}.bak`);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    return dst;
  }
  return null;
}

const armouryPath = path.join(__dirname, '..', '..', 'public', 'deathwatch-armoury.json');
let armoury = null;
try { armoury = JSON.parse(fs.readFileSync(armouryPath, 'utf8')); } catch (e) { armoury = null; }

const rulesPath = path.join(__dirname, '..', 'rules', 'rules-database.json');
let rulesDb = null;
try { rulesDb = JSON.parse(fs.readFileSync(rulesPath, 'utf8')); } catch (e) { rulesDb = null; }

const mappingPath = argv.mapping;
const apply = !!argv.apply;

if (!mappingPath) {
  // create sample mapping file
  const sample = {
    players: playerHelpers.getAll().map(p=>({ name: p.name, setCharacteristics: {}, addItems: [], setRenown: null }))
  };
  const outDir = path.join(__dirname, '..', 'backups'); if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const samplePath = path.join(outDir, `template-mapping.sample.${new Date().toISOString().replace(/[:.]/g,'')}.json`);
  fs.writeFileSync(samplePath, JSON.stringify(sample, null, 2), 'utf8');
  console.log('Sample mapping created at', samplePath);
  console.log('Edit it to add templates/items and re-run with --mapping <path> --apply');
  process.exit(0);
}

if (!fs.existsSync(mappingPath)) {
  console.error('Mapping file not found:', mappingPath);
  process.exit(2);
}

const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
const players = playerHelpers.getAll();

function findItemByName(name) {
  if (!armoury) return null;
  // armoury may be an object with items lists; search recursively
  const candidates = [];
  function search(obj) {
    if (!obj) return;
    if (Array.isArray(obj)) { obj.forEach(search); return; }
    if (typeof obj === 'object') {
      Object.keys(obj).forEach(k => search(obj[k]));
      if (obj.name && typeof obj.name === 'string' && obj.name.toLowerCase().includes(name.toLowerCase())) {
        candidates.push(obj);
      }
    }
  }
  search(armoury);
  return candidates;
}

const report = [];

for (const m of (mapping.players || [])) {
  const pName = m.name;
  const pl = players.find(x=>x.name===pName);
  if (!pl) { report.push({ name: pName, error: 'player not found' }); continue; }

  const before = JSON.parse(JSON.stringify(pl.tabInfo || {}));
  const after = JSON.parse(JSON.stringify(before));
  let changed = false;

  // set characteristics
  if (m.setCharacteristics && typeof m.setCharacteristics === 'object') {
    after.characteristics = after.characteristics || {};
    Object.keys(m.setCharacteristics).forEach(k=>{ after.characteristics[k] = m.setCharacteristics[k]; });
    changed = true;
  }

  // set renown
  if (m.setRenown) { after.renown = m.setRenown; changed = true; }

  // add items
  if (Array.isArray(m.addItems) && m.addItems.length>0) {
    after.inventory = Array.isArray(after.inventory) ? after.inventory.slice() : [];
    for (const itemName of m.addItems) {
      const found = findItemByName(itemName);
      if (found && found.length>0) {
        // push item summary
        after.inventory.push({ name: found[0].name || itemName, source: found[0].source || 'armoury' });
      } else {
        after.inventory.push({ name: itemName, source: 'manual' });
      }
    }
    changed = true;
  }

  report.push({ name: pName, changed, before, after });
}

const summary = { applied: apply, results: report };

if (apply) {
  const backup = backupDb('pre_apply_templates');
  let appliedCount=0;
  for (const r of report) {
    if (r.changed) {
      try {
        const pl = playerHelpers.getByName(r.name);
        const merged = Object.assign({}, pl, { tabInfo: r.after });
        playerHelpers.update(r.name, merged);
        appliedCount++;
      } catch (e) { console.error('Failed to apply for', r.name, e); }
    }
  }
  summary.appliedCount = appliedCount;
  summary.backup = backup;
  const outPath = path.join(__dirname, '..', 'backups', `apply_templates.result.${new Date().toISOString().replace(/[:.]/g,'')}.json`);
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2),'utf8');
  console.log('Applied to', appliedCount, 'players. Backup at', backup, 'Result saved to', outPath);
} else {
  const outPath = path.join(__dirname, '..', 'backups', `apply_templates.dryrun.${new Date().toISOString().replace(/[:.]/g,'')}.json`);
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2),'utf8');
  console.log('Dry-run result written to', outPath);
  console.log(JSON.stringify(summary, null, 2));
}
