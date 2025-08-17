const fs = require('fs');
const path = require('path');

const BESTIARY = path.resolve(__dirname, '..', 'database', 'deathwatch-bestiary-extracted.json');
const DB_DIR = path.resolve(__dirname, '..', 'database');
const BACKUPS = path.resolve(__dirname, '..', 'database', 'backups');

function backup(srcPath, tag) {
  if (!fs.existsSync(BACKUPS)) fs.mkdirSync(BACKUPS, { recursive: true });
  const ts = Date.now();
  const dest = path.join(BACKUPS, path.basename(srcPath) + `.backup.${tag}.${ts}.json`);
  fs.copyFileSync(srcPath, dest);
  return dest;
}

function loadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p,'utf8')); } catch(e){ return null; }
}

function findWoundsFor(nameLower) {
  const files = fs.readdirSync(DB_DIR).filter(f => f.endsWith('.json'));
  for (const f of files) {
    const p = path.join(DB_DIR, f);
    let j;
    try { j = JSON.parse(fs.readFileSync(p,'utf8')); } catch(e){ continue; }
    if (!j.results || !Array.isArray(j.results)) continue;
    for (const r of j.results) {
      if (!r.stats) continue;
      if (r.stats.wounds) {
        const hay = (r.stats.snippet || r.pageText || r.snippet || '').toLowerCase();
        if (hay.includes(nameLower)) return {file: p, result: r};
      }
    }
  }
  return null;
}

function main() {
  const bestiary = loadJSON(BESTIARY);
  if (!bestiary) { console.error('Failed loading bestiary'); process.exit(2); }
  const results = bestiary.results || [];
  const toUpdate = [];

  for (const entry of results) {
    const stats = entry.stats || {};
    const woundsMissing = stats.wounds === null || stats.wounds === undefined;
    if (!woundsMissing) continue;
    const nameLower = (entry.bestiaryName || '').toLowerCase();
    const found = findWoundsFor(nameLower);
    if (found) toUpdate.push({entry, found});
  }

  if (!toUpdate.length) { console.log('No wounds candidates found in local PDF JSONs.'); process.exit(0); }

  console.log(`Found ${toUpdate.length} wounds candidate(s) to upsert.`);
  backup(BESTIARY, 'pdffill-wounds');

  let updated = 0;
  for (const u of toUpdate) {
    const e = u.entry;
    const r = u.found.result;
    e.pdf = path.basename(u.found.file);
    e.page = r.foundPage || e.page || null;
    e.pageText = e.pageText || null;
    e.stats = e.stats || {};
    if (r.stats.wounds) {
      e.stats.wounds = r.stats.wounds;
      updated++;
      console.log(`Set wounds for ${e.bestiaryName} -> ${r.stats.wounds} (from ${u.found.file})`);
    }
  }

  fs.writeFileSync(BESTIARY, JSON.stringify(bestiary, null, 2), 'utf8');
  console.log(`Wrote ${updated} wounds updates to ${BESTIARY}`);
}

main();
