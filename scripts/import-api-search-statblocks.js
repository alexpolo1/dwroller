#!/usr/bin/env node
// Import all statblocks from local search API (http://192.168.1.144:5001/api/search?q=)
// - backs up existing bestiary
// - upserts by name/page/source (normalizes names)
// - prefers API movement/wounds/profile when present

const fs = require('fs');
const path = require('path');
const http = require('http');

const API_URL = 'http://192.168.1.144:5001/api/search?q=';
const BESTIARY_PATH = path.resolve(__dirname, '..', 'database', 'deathwatch-bestiary-extracted.json');
const BACKUP_DIR = path.resolve(__dirname, '..', 'database', 'backups');

function fetchJson(url){
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let s = '';
      res.setEncoding('utf8');
      res.on('data', d => s += d);
      res.on('end', () => {
        try { resolve(JSON.parse(s)); }
        catch(e){ reject(e); }
      });
    }).on('error', reject);
  });
}

function normalizeName(s){
  if(!s) return '';
  return s.toString().toLowerCase().replace(/[\u2018\u2019\u201c\u201d]/g,'')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\s+/g,' ').trim();
}

function ensureBackupDir(){
  if(!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, {recursive:true});
}

function backupFile(src){
  ensureBackupDir();
  const name = path.basename(src);
  const dest = path.join(BACKUP_DIR, `${name}.backup.${Date.now()}.json`);
  fs.copyFileSync(src, dest);
  return dest;
}

function mergeObjects(existing, incoming){
  // shallow merge with preference to incoming for movement/wounds/profile when present
  const out = Object.assign({}, existing || {});
  for(const k of Object.keys(incoming || {})){
    const v = incoming[k];
    if(v===null || v===undefined) continue;
    if(typeof v === 'object' && !Array.isArray(v)){
      out[k] = mergeObjects(out[k] || {}, v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function main(){
  console.log('Fetching statblocks from API:', API_URL);
  let data;
  try{ data = await fetchJson(API_URL); } catch(e){ console.error('Failed to fetch API:', e.message); process.exit(2); }
  const statblocks = data && (data.statblocks || data.results || []);
  if(!Array.isArray(statblocks)){
    console.error('API returned unexpected format'); process.exit(2);
  }
  console.log('Statblocks found on API:', statblocks.length);

  // load or init bestiary
  let bestiaryObj = { generatedAt: new Date().toISOString(), count: 0, results: [] };
  if(fs.existsSync(BESTIARY_PATH)){
    try{ bestiaryObj = JSON.parse(fs.readFileSync(BESTIARY_PATH,'utf8')); }
    catch(e){ console.error('Failed to parse existing bestiary, aborting:', e.message); process.exit(2); }
  }
  if(!Array.isArray(bestiaryObj.results)) bestiaryObj.results = [];
  const results = bestiaryObj.results;

  // backup before modifying
  if(fs.existsSync(BESTIARY_PATH)){
    const b = backupFile(BESTIARY_PATH);
    console.log('Backed up bestiary to', b);
  }

  let added = 0, updated = 0;
  for(const sb of statblocks){
    const name = sb.name || sb.bestiaryName || sb.title || '';
    const norm = normalizeName(name);
    // find candidate by normalized name
    let idx = results.findIndex(r => normalizeName(r.bestiaryName || r.name || '') === norm);
    // fallback: match by page + source/book
    if(idx === -1 && sb.page){
      idx = results.findIndex(r => String(r.page) === String(sb.page) && ((r.book||'').toLowerCase().includes((sb.source||'').toLowerCase()) || (r.source||'').toLowerCase().includes((sb.source||'').toLowerCase())) );
    }

    // build incoming entry in local schema
    const incoming = {};
    incoming.bestiaryName = name || undefined;
    if(sb.source) incoming.book = sb.source;
    if(sb.page) incoming.page = sb.page;
    if(sb.pdf) incoming.pdf = sb.pdf;
    // map stats
    incoming.stats = {};
    // profile
    if(sb.stats && sb.stats.profile) incoming.stats.profile = sb.stats.profile;
    else if(sb.profile) incoming.stats.profile = sb.profile;
    // movement/wounds from secondary_stats or stats
    incoming.stats.movement = (sb.stats && sb.stats.movement) || (sb.secondary_stats && sb.secondary_stats.movement) || sb.movement || undefined;
    incoming.stats.wounds = (sb.stats && sb.stats.wounds) || (sb.secondary_stats && sb.secondary_stats.wounds) || sb.wounds || undefined;
    // weapons/armour/skills/snippet
    if(sb.stats && sb.stats.weapons) incoming.stats.weapons = sb.stats.weapons;
    else if(sb.weapons) incoming.stats.weapons = sb.weapons;
    if(sb.stats && sb.stats.armour) incoming.stats.armour = sb.stats.armour;
    else if(sb.armour) incoming.stats.armour = sb.armour;
    if(sb.stats && sb.stats.skills) incoming.stats.skills = sb.stats.skills;
    if(sb.stats && sb.stats.snippet) incoming.stats.snippet = sb.stats.snippet;
    if(sb.snippet) incoming.stats.snippet = sb.snippet;
    // preserve api id
    if(sb.id) incoming.apiId = sb.id;

    if(idx === -1){
      results.push(incoming);
      added++;
    } else {
      const prev = results[idx] || {};
      // merge with preference: prefer incoming.stats.* for movement/wounds/profile if present
      const merged = mergeObjects(prev, incoming);
      // ensure movement/wounds come from incoming when present
      if(incoming.stats){
        merged.stats = merged.stats || {};
        if(incoming.stats.movement) merged.stats.movement = incoming.stats.movement;
        if(incoming.stats.wounds) merged.stats.wounds = incoming.stats.wounds;
        if(incoming.stats.profile) merged.stats.profile = incoming.stats.profile;
      }
      results[idx] = merged;
      updated++;
    }
  }

  bestiaryObj.generatedAt = new Date().toISOString();
  bestiaryObj.count = results.length;

  fs.writeFileSync(BESTIARY_PATH, JSON.stringify(bestiaryObj, null, 2));
  console.log(`Done. Added: ${added}, Updated: ${updated}. Total entries: ${results.length}`);
}

if(require.main === module) main().catch(err => { console.error(err); process.exit(1); });
