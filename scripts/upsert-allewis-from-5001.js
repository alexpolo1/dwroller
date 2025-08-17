#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

async function main(){
  const apiUrl = 'http://192.168.1.144:5001/api/search?q=Allewis';
  console.log('Fetching:', apiUrl);
  let res;
  try{
    res = await fetch(apiUrl);
  }catch(e){
    console.error('Fetch failed:', e.message);
    process.exitCode = 2;
    return;
  }
  if(!res.ok){
    console.error('API returned', res.status, res.statusText);
    process.exitCode = 3;
    return;
  }
  const body = await res.json();
  const stat = (body && body.statblocks && body.statblocks[0]) || null;
  if(!stat){
    console.error('No statblock found in API response');
    process.exitCode = 4;
    return;
  }

  const movement = stat.secondary_stats && stat.secondary_stats.movement;
  const wounds = stat.secondary_stats && stat.secondary_stats.wounds;
  console.log('Found statblock:', stat.name, 'page', stat.page, 'movement', movement, 'wounds', wounds);

  const bestiaryPath = path.resolve(__dirname, '..', 'database', 'deathwatch-bestiary-extracted.json');
  if(!fs.existsSync(bestiaryPath)){
    console.error('Bestiary file not found:', bestiaryPath);
    process.exitCode = 5;
    return;
  }
  const raw = fs.readFileSync(bestiaryPath, 'utf8');
  // backup
  const backupsDir = path.resolve(__dirname, '..', 'database', 'backups');
  if(!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const backupPath = path.join(backupsDir, 'deathwatch-bestiary-extracted.json.backup.' + Date.now() + '.json');
  fs.writeFileSync(backupPath, raw, 'utf8');
  console.log('Wrote backup:', backupPath);

  let obj;
  try{ obj = JSON.parse(raw); } catch(e){
    console.error('Failed to parse bestiary JSON:', e.message);
    process.exitCode = 6; return;
  }

  const nameToFind = (stat.name || 'Allewis').toLowerCase();
  const pageToFind = String(stat.page || '89');

  let idx = obj.results.findIndex(r => {
    if(!r) return false;
    const bn = (r.bestiaryName || '').toLowerCase();
    if(bn && bn.includes(nameToFind)) return true;
    if(r.page && String(r.page) === pageToFind) return true;
    // fallback check snippet
    if(r.stats && r.stats.snippet && String(r.stats.snippet).toLowerCase().includes(nameToFind)) return true;
    return false;
  });

  if(idx === -1){
    console.log('No matching entry found — will append a minimal entry.');
    const newEntry = {
      bestiaryName: stat.name || 'Prince-Prefect Allewis',
      book: stat.source || 'Unknown',
      page: String(stat.page || '89'),
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
    obj.results.push(newEntry);
    console.log('Appended new entry for', newEntry.bestiaryName);
  }else{
    console.log('Found existing entry at index', idx, 'name=', obj.results[idx].bestiaryName);
    const target = obj.results[idx];
    if(!target.stats) target.stats = {};
    target.stats.movement = movement || target.stats.movement || null;
    target.stats.wounds = (typeof wounds === 'number') ? wounds : (wounds ? Number(wounds) : target.stats.wounds || null);
    console.log('Updated movement/wounds on existing entry.');
  }

  fs.writeFileSync(bestiaryPath, JSON.stringify(obj, null, 2), 'utf8');
  console.log('Wrote updated bestiary to', bestiaryPath);
}

main().catch(e => {
  console.error('Unhandled error', e);
  process.exitCode = 99;
});
