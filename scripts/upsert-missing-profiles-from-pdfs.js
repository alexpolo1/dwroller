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

function findCandidates(nameLower) {
  const files = fs.readdirSync(DB_DIR).filter(f => f.endsWith('.json'));
  const candidates = [];
  for (const f of files) {
    const p = path.join(DB_DIR, f);
    let j;
    try { j = JSON.parse(fs.readFileSync(p,'utf8')); } catch(e){ continue; }
    if (!j.results || !Array.isArray(j.results)) continue;
    for (const r of j.results) {
      if (!r.stats) continue;
      if (r.stats.profile && Object.keys(r.stats.profile).length > 0) {
        // match by snippet or pageText or pdf filename
        const hay = (r.stats.snippet || r.pageText || r.snippet || '').toLowerCase();
        if (hay.includes(nameLower)) {
          candidates.push({file: p, result: r});
        }
      }
    }
  }
  return candidates;
}

function main() {
  const bestiary = loadJSON(BESTIARY);
  if (!bestiary) { console.error('Failed loading bestiary'); process.exit(2); }
  const results = bestiary.results || [];
  const toUpdate = [];

  for (const entry of results) {
    const name = entry.bestiaryName || '';
    const stats = entry.stats || {};
    const needsProfile = !stats.profile || Object.values(stats.profile || {}).every(v => v === null || v === undefined);
    if (!needsProfile) continue;
    const nameLower = name.toLowerCase();
    const candidates = findCandidates(nameLower);
    if (candidates.length) {
      // pick first candidate
      const c = candidates[0];
      toUpdate.push({entry, candidate: c});
    }
  }

  if (!toUpdate.length) { console.log('No profile candidates found in local PDF JSONs.'); process.exit(0); }

  console.log(`Found ${toUpdate.length} candidate(s) to upsert.`);
  backup(BESTIARY, 'pdffill');

  let updated = 0;
  for (const u of toUpdate) {
    const e = u.entry;
    const r = u.candidate.result;
    e.pdf = path.basename(u.candidate.file);
    e.page = r.foundPage || e.page || null;
    e.pageText = e.pageText || null;
    e.stats = e.stats || {};
    if (r.stats.profile) e.stats.profile = r.stats.profile;
    if (r.stats.movement) e.stats.movement = r.stats.movement;
    if (r.stats.wounds) e.stats.wounds = r.stats.wounds;
    if (r.stats.skills) e.stats.skills = r.stats.skills;
    if (r.stats.talents) e.stats.talents = r.stats.talents;
    if (r.stats.traits) e.stats.traits = r.stats.traits;
    if (r.stats.armour) e.stats.armour = r.stats.armour;
    if (r.stats.weapons) e.stats.weapons = r.stats.weapons;
    if (r.stats.gear) e.stats.gear = r.stats.gear;
    if (r.stats.snippet) e.stats.snippet = (e.stats.snippet || '') + '\n' + r.stats.snippet;
    updated++;
    console.log(`Upserted profile for: ${e.bestiaryName} from ${u.candidate.file}`);
  }

  fs.writeFileSync(BESTIARY, JSON.stringify(bestiary, null, 2), 'utf8');
  console.log(`Wrote ${updated} updates to ${BESTIARY}`);
}

main();
