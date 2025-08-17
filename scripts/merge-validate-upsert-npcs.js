// merge-validate-upsert-npcs.js
// Fetch NPCs from local API, normalize to bestiary schema, validate and upsert into database/deathwatch-bestiary-extracted.json

const fs = require('fs');
const path = require('path');
const http = require('http');

const API_URL = 'http://192.168.1.144:5000/api/npcs';
const BESTIARY_PATH = path.join(__dirname, '../database/deathwatch-bestiary-extracted.json');
const BACKUP_PATH = path.join(__dirname, `../database/deathwatch-bestiary-extracted.backup.${Date.now()}.json`);

function fetchAPI(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse API response: ' + e.message + '\n' + data.slice(0,2000)));
        }
      });
    }).on('error', reject);
  });
}

function asIntOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function normalizeApiNpc(apiNpc) {
  const s = apiNpc.stats || {};
  const profile = {
    ws: asIntOrNull(s.ws),
    bs: asIntOrNull(s.bs),
    s: asIntOrNull(s.s),
    t: asIntOrNull(s.t),
    ag: asIntOrNull(s.ag),
    int: asIntOrNull(s.int),
    per: asIntOrNull(s.per),
    wp: asIntOrNull(s.wp),
    fel: asIntOrNull(s.fel),
    modifiers: null
  };

  // compact movement if present
  const movement = s.movement || null;
  const wounds = asIntOrNull(s.wounds);
  const armour = (s.armor || s.armour) ? String(s.armor || s.armour) : null;

  // equipment array -> gear string
  const gearArr = Array.isArray(apiNpc.equipment) ? apiNpc.equipment : [];
  const gear = gearArr.length ? gearArr.join('; ') : null;

  // try to pick out obvious weapons from equipment by keywords
  const weaponsCandidates = gearArr.filter(it => /bolt|las|plasma|sword|knife|axe|grenade|blade|pistol|rifle|power|monoblade|stikk|autogun/i.test(it));
  const weapons = weaponsCandidates.length ? weaponsCandidates.join('; ') : null;

  const normalized = {
    bestiaryName: apiNpc.name || apiNpc.bestiaryName || null,
    book: apiNpc.source || null,
    page: apiNpc.page || null,
    pdf: apiNpc.source ? apiNpc.source.replace(/[:\s]/g, '_') + '.pdf' : null,
    pageText: null,
    // preserve some meta
    source: apiNpc.source || null,
    apiId: apiNpc.id || null,
    description: apiNpc.description || null,
    type: apiNpc.type || null,
    faction: apiNpc.faction || null,
    abilities: Array.isArray(apiNpc.abilities) ? apiNpc.abilities : null,
    stats: {
      profile,
      movement,
      wounds,
      toughness: null,
      skills: null,
      talents: null,
      traits: null,
      armour,
      weapons,
      gear,
      snippet: null,
      chosenOffset: null
    }
  };

  return normalized;
}

function mergeRecords(existing, incoming) {
  // shallow merge: prefer existing non-null values, otherwise take incoming
  const out = { ...existing };

  // top-level fields
  ['bestiaryName','book','page','pdf','pageText','source','apiId','description','type','faction','abilities'].forEach(k=>{
    if ((!out[k] || out[k] === null) && incoming[k] !== undefined) out[k] = incoming[k];
  });

  // merge stats
  out.stats = out.stats || {};
  const ex = existing.stats || {};
  const inS = incoming.stats || {};

  // profile
  out.stats.profile = out.stats.profile || {};
  const exP = ex.profile || {};
  const inP = inS.profile || {};
  ['ws','bs','s','t','ag','int','per','wp','fel','modifiers'].forEach(k=>{
    const exV = exP[k];
    const inV = inP[k];
    out.stats.profile[k] = (exV !== null && exV !== undefined) ? exV : (inV !== null && inV !== undefined ? inV : null);
  });

  // other stat fields
  ['movement','wounds','toughness','skills','talents','traits','armour','weapons','gear','snippet','chosenOffset'].forEach(k=>{
    const exV = (ex && ex[k] !== undefined) ? ex[k] : undefined;
    const inV = (inS && inS[k] !== undefined) ? inS[k] : undefined;
    out.stats[k] = (exV !== undefined && exV !== null) ? exV : (inV !== undefined ? inV : null);
  });

  return out;
}

async function main() {
  // backup bestiary
  if (fs.existsSync(BESTIARY_PATH)) {
    fs.copyFileSync(BESTIARY_PATH, BACKUP_PATH);
    console.log('Backed up bestiary to', BACKUP_PATH);
  } else {
    console.log('No existing bestiary found at', BESTIARY_PATH, ' - a new file will be created');
  }

  let bestiaryObj = { results: [] };
  try {
    if (fs.existsSync(BESTIARY_PATH)) {
      bestiaryObj = JSON.parse(fs.readFileSync(BESTIARY_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to read existing bestiary:', e.message);
    bestiaryObj = { results: [] };
  }
  if (!Array.isArray(bestiaryObj.results)) bestiaryObj.results = [];

  // fetch API NPCs
  let apiNpcs = [];
  try {
    const j = await fetchAPI(API_URL);
    apiNpcs = j.npcs || [];
  } catch (e) {
    console.error('Failed to fetch API NPCs:', e.message);
    return;
  }

  const added = [];
  const updated = [];

  for (const apiNpc of apiNpcs) {
    const norm = normalizeApiNpc(apiNpc);

    // find existing by bestiaryName or apiId or name
    const idx = bestiaryObj.results.findIndex(r => {
      if (!r) return false;
      if (r.apiId && norm.apiId && r.apiId === norm.apiId) return true;
      const rn = (r.bestiaryName || r.name || '').toString().trim().toLowerCase();
      const nn = (norm.bestiaryName || '').toString().trim().toLowerCase();
      return rn && nn && rn === nn;
    });

    if (idx === -1) {
      // new entry
      // ensure top-level required keys exist
      const toInsert = {
        bestiaryName: norm.bestiaryName,
        book: norm.book,
        page: norm.page,
        pdf: norm.pdf,
        pageText: norm.pageText,
        stats: norm.stats,
        description: norm.description,
        source: norm.source,
        apiId: norm.apiId,
        type: norm.type,
        faction: norm.faction,
        abilities: norm.abilities || null,
        insertedAt: new Date().toISOString()
      };
      bestiaryObj.results.push(toInsert);
      added.push(norm.bestiaryName || norm.apiId || 'unknown');
    } else {
      const existing = bestiaryObj.results[idx];
      const merged = mergeRecords(existing, norm);
      merged.updatedAt = new Date().toISOString();
      bestiaryObj.results[idx] = merged;
      updated.push(merged.bestiaryName || merged.apiId || 'unknown');
    }
  }

  bestiaryObj.generatedAt = new Date().toISOString();
  bestiaryObj.count = bestiaryObj.results.length;

  fs.writeFileSync(BESTIARY_PATH, JSON.stringify(bestiaryObj, null, 2));
  console.log(`Merge complete. Added: ${added.length}, Updated: ${updated.length}`);
  if (added.length) console.log('Added:', added.join(', '));
  if (updated.length) console.log('Updated:', updated.join(', '));
}

main();
