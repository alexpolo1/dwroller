#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function makeBackup(bestiaryPath){
  const raw = fs.readFileSync(bestiaryPath, 'utf8');
  const backupsDir = path.resolve(__dirname, '..', 'database', 'backups');
  if(!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const backupPath = path.join(backupsDir, 'deathwatch-bestiary-extracted.json.backup.pdffallback.' + Date.now() + '.json');
  fs.writeFileSync(backupPath, raw, 'utf8');
  return backupPath;
}

function extractFromText(text){
  if(!text) return {};
  const mvMatch = text.match(/Movement:\s*([0-9\s\/\-]+)\b/i);
  const wdMatch = text.match(/Wounds:\s*([0-9]+)/i);
  return {
    movement: mvMatch ? mvMatch[1].trim().replace(/\s+/g,' ') : null,
    wounds: wdMatch ? Number(wdMatch[1]) : null
  };
}

function scanDatabaseFilesForName(name){
  const dbDir = path.resolve(__dirname, '..', 'database');
  const files = fs.readdirSync(dbDir).filter(f => f.endsWith('.json'));
  const results = [];
  const lower = (name || '').toLowerCase();
  for(const f of files){
    const p = path.join(dbDir, f);
    let raw;
    try{ raw = fs.readFileSync(p, 'utf8'); }catch(e){ continue; }
    if(raw.toLowerCase().includes(lower)){
      // try to extract
      const ex = extractFromText(raw);
      if(ex.movement || ex.wounds) results.push({ file: f, movement: ex.movement, wounds: ex.wounds, snippet: raw.substr(Math.max(0, raw.toLowerCase().indexOf(lower)-200), 600) });
    }
  }
  return results;
}

function normalizeName(s){ return (s||'').replace(/[^a-z0-9\s]/gi,' ').replace(/\s+/g,' ').trim(); }

async function main(){
  const bestiaryPath = path.resolve(__dirname, '..', 'database', 'deathwatch-bestiary-extracted.json');
  if(!fs.existsSync(bestiaryPath)){ console.error('Bestiary not found:', bestiaryPath); process.exit(1); }
  const obj = JSON.parse(fs.readFileSync(bestiaryPath, 'utf8'));
  const entries = obj.results || [];
  const need = entries.filter(e => !(e && e.stats && e.stats.movement && String(e.stats.movement).trim() !== ''));
  console.log('Entries needing movement/wounds:', need.length);
  if(need.length === 0){ console.log('Nothing to do'); return; }

  const backup = makeBackup(bestiaryPath);
  console.log('Backup created:', backup);

  const updated = [];

  for(const e of need){
    const name = e.bestiaryName || (e.stats && e.stats.snippet) || '';
    if(!name){ console.log('Skipping nameless entry'); continue; }
    console.log('\nScanning database JSONs for', name);
    // try relaxed searches: exact name, normalized name token, first two words
    const candidates = [];
    const direct = scanDatabaseFilesForName(name);
    candidates.push(...direct);
    if(candidates.length === 0){
      const nrm = normalizeName(name);
      if(nrm){
        const tokens = nrm.split(' ').slice(0,3).join(' ');
        const alt = scanDatabaseFilesForName(tokens);
        candidates.push(...alt);
      }
    }
    if(candidates.length === 0){ console.log('No PDF-derived candidates for', name); continue; }
    console.log('Found candidates from files:', candidates.map(c=>c.file).join(', '));
    // pick first with movement or wounds
    let picked = null;
    for(const c of candidates){ if(c.movement || c.wounds){ picked = c; break; } }
    if(!picked) picked = candidates[0];
    const before = { movement: e.stats && e.stats.movement, wounds: e.stats && e.stats.wounds };
    if(!e.stats) e.stats = {};
    if(picked.movement) e.stats.movement = picked.movement;
    if(picked.wounds !== null && picked.wounds !== undefined) e.stats.wounds = picked.wounds;
    updated.push({ name: e.bestiaryName, file: picked.file, before, after: { movement: e.stats.movement, wounds: e.stats.wounds } });
    console.log('Updated', e.bestiaryName, '->', e.stats.movement, e.stats.wounds);
  }

  fs.writeFileSync(bestiaryPath, JSON.stringify(obj, null, 2), 'utf8');
  console.log('\nDone. Updated', updated.length, 'entries.');
  if(updated.length) console.log('Details:', updated);
}

main().catch(e => { console.error('Fatal', e); process.exit(99); });
