// merge-npcs-from-api.js
// Fetches NPCs from local API and upserts them into the bestiary DB
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
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function normalizeNPC(apiNpc) {
  // Map API NPC to bestiary format
  return {
    name: apiNpc.name,
    type: apiNpc.type,
    chapter: apiNpc.chapter,
    faction: apiNpc.faction,
    threat: apiNpc.threat_level,
    description: apiNpc.description,
    source: apiNpc.source,
    stats: {
      ...apiNpc.stats
    },
    equipment: apiNpc.equipment,
    abilities: apiNpc.abilities,
    apiId: apiNpc.id
  };
}

async function main() {
  // Backup bestiary
  fs.copyFileSync(BESTIARY_PATH, BACKUP_PATH);
  console.log('Backed up bestiary to', BACKUP_PATH);

  // Read bestiary object
  let bestiaryObj = {};
  try {
    bestiaryObj = JSON.parse(fs.readFileSync(BESTIARY_PATH, 'utf8'));
  } catch (e) {
    console.error('Could not read bestiary, starting with empty results array.');
    bestiaryObj = { results: [] };
  }
  if (!Array.isArray(bestiaryObj.results)) bestiaryObj.results = [];
  const bestiary = bestiaryObj.results;

  // Fetch API NPCs
  let apiNpcs;
  try {
    const apiData = await fetchAPI(API_URL);
    apiNpcs = apiData.npcs || [];
  } catch (e) {
    console.error('Failed to fetch from API:', e);
    return;
  }

  let added = 0, updated = 0;
  for (const apiNpc of apiNpcs) {
    const norm = normalizeNPC(apiNpc);
    // Try to match by name or bestiaryName
    const idx = bestiary.findIndex(e => (e.name && e.name === norm.name) || (e.bestiaryName && e.bestiaryName === norm.name));
    if (idx === -1) {
      bestiary.push(norm);
      added++;
    } else {
      bestiary[idx] = { ...bestiary[idx], ...norm };
      updated++;
    }
  }

  bestiaryObj.count = bestiary.length;
  fs.writeFileSync(BESTIARY_PATH, JSON.stringify(bestiaryObj, null, 2));
  console.log(`NPCs merged. Added: ${added}, Updated: ${updated}`);
}

main();
