#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const util = require('util');

async function fetchJson(url){
  try{
    const res = await fetch(url);
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  }catch(e){
    console.error('Fetch error for', url, e.message);
    return null;
  }
}

function makeBackup(bestiaryPath){
  const raw = fs.readFileSync(bestiaryPath, 'utf8');
  const backupsDir = path.resolve(__dirname, '..', 'database', 'backups');
  if(!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const backupPath = path.join(backupsDir, 'deathwatch-bestiary-extracted.json.backup.' + Date.now() + '.json');
  fs.writeFileSync(backupPath, raw, 'utf8');
  return backupPath;
}

function normalizeName(s){
  if(!s) return '';
  return String(s).replace(/[^a-z0-9\s]/gi,' ').replace(/\s+/g,' ').trim();
}

async function main(){
  const bestiaryPath = path.resolve(__dirname, '..', 'database', 'deathwatch-bestiary-extracted.json');
  if(!fs.existsSync(bestiaryPath)){ console.error('Bestiary not found at', bestiaryPath); process.exit(1); }
  let obj;
  try{ obj = JSON.parse(fs.readFileSync(bestiaryPath, 'utf8')); }catch(e){ console.error('Failed to parse bestiary:', e.message); process.exit(2); }

  const entries = obj.results || [];
  const need = [];
  for(const e of entries){
    if(!e || !e.stats) continue;
    const mv = e.stats.movement;
    const wd = e.stats.wounds;
    if(!mv || mv === null || mv === '\\n' || String(mv).trim() === '') need.push(e);
    // also consider if wounds missing
    else if(wd === null || wd === undefined) need.push(e);
  }

  console.log('Total entries:', entries.length, 'Missing movement/wounds count:', need.length);
  if(need.length === 0){ console.log('Nothing to do.'); return; }

  const backupPath = makeBackup(bestiaryPath);
  console.log('Backup created:', backupPath);

  const updated = [];
  const appended = [];

  for(const e of need){
    const name = e.bestiaryName || (e.stats && e.stats.snippet && e.stats.snippet.split('\n')[0]) || e.apiName || '';
    const q = encodeURIComponent((name || '').trim() || '');
    if(!q){ console.log('Skipping entry with no name'); continue; }
    const url = `http://192.168.1.144:5001/api/search?q=${q}`;
    console.log('\nQuerying API for', name, '->', url);
    const body = await fetchJson(url);
    if(!body || !body.statblocks || body.statblocks.length === 0){
      console.log('No statblocks returned for', name);
      continue;
    }
    // try to pick best statblock: prefer matching page or exact name
    const candidates = body.statblocks;
    let pick = candidates[0];
    // attempt better match
    for(const s of candidates){
      if(e.page && s.page && String(e.page) === String(s.page)){ pick = s; break; }
      const bn = normalizeName(e.bestiaryName || '');
      const sn = normalizeName(s.name || '');
      if(bn && sn && sn.includes(bn)) { pick = s; break; }
    }

    const movement = pick.secondary_stats && pick.secondary_stats.movement;
    const wounds = pick.secondary_stats && pick.secondary_stats.wounds;
    if(!movement && (wounds === null || wounds === undefined)){
      console.log('API candidate has no movement/wounds for', name);
      continue;
    }

    // find index in entries again (safe)
    const idx = entries.findIndex(r => r === e);
    if(idx === -1){
      // append
      const newEntry = {
        bestiaryName: pick.name || name,
        book: pick.source || 'Unknown',
        page: String(pick.page || ''),
        pdf: '',
        pageText: '',
        stats: {
          profile: null,
          movement: movement || null,
          wounds: (typeof wounds === 'number') ? wounds : (wounds ? Number(wounds) : null),
          toughness: null,
          skills: null,
          talents: null,
          traits: null,
          armour: null,
          weapons: null,
          gear: null,
          snippet: ''
        }
      };
      entries.push(newEntry);
      appended.push(newEntry.bestiaryName);
      console.log('Appended new entry for', newEntry.bestiaryName);
    }else{
      const target = entries[idx];
      const before = { movement: target.stats.movement, wounds: target.stats.wounds };
      if(movement) target.stats.movement = movement;
      if(wounds !== null && wounds !== undefined) target.stats.wounds = (typeof wounds === 'number') ? wounds : (wounds ? Number(wounds) : target.stats.wounds);
      updated.push({ name: target.bestiaryName || name, before, after: { movement: target.stats.movement, wounds: target.stats.wounds } });
      console.log('Updated:', target.bestiaryName, '-> movement:', target.stats.movement, 'wounds:', target.stats.wounds);
    }
  }

  // write back
  obj.results = entries;
  fs.writeFileSync(bestiaryPath, JSON.stringify(obj, null, 2), 'utf8');
  console.log('\nFinished. Updated:', updated.length, 'Appended:', appended.length);
  if(updated.length) console.log('Updated details:', util.inspect(updated, { depth: 3 }));
  if(appended.length) console.log('Appended names:', appended.join(', '));
}

main().catch(e => { console.error('Unhandled', e); process.exit(99); });
