#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../database/deathwatch-bestiary-extracted.json');
const BACKUPS_DIR = path.resolve(__dirname, '../database/backups');
const PDFJS_PATH = path.resolve(__dirname, '../database/alexei-pdfjs.json');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function extractMovement(m) {
  if (!m || typeof m !== 'string') return null;
  const movementMatch = m.match(/(\d+\/\d+\/\d+\/\d+)/);
  if (movementMatch) return movementMatch[1];
  // fallback: look for patterns like 3/6/9/18 without capture groups
  const alt = m.match(/(\d+\s*\/\s*\d+\s*\/\s*\d+\s*\/\s*\d+)/);
  if (alt) return alt[1].replace(/\s+/g, '');
  return null;
}

function extractWounds(s) {
  if (s == null) return null;
  if (typeof s === 'number') return s;
  const str = String(s);
  const m = str.match(/Wounds:\s*(\d+)/i) || str.match(/(\d{1,3})\s*$/);
  if (m) return parseInt(m[1], 10);
  return null;
}

function normalizeEntry(entry, pdfjsResults) {
  let changed = false;
  if (!entry.stats) entry.stats = {};

  // Normalize movement
  const movementRaw = entry.stats.movement;
  const mov = extractMovement(movementRaw);
  if (mov && mov !== movementRaw) {
    entry.stats.movement = mov;
    changed = true;
  }

  // Normalize wounds
  const woundsRaw = entry.stats.wounds;
  const wounds = extractWounds(woundsRaw || movementRaw);
  if (wounds != null && entry.stats.wounds !== wounds) {
    entry.stats.wounds = wounds;
    changed = true;
  }

  // If profile missing or incomplete, try to fill from pdfjs artifacts
  const needProfile = !entry.stats.profile || Object.keys(entry.stats.profile).length < 5;
  const needWeapons = !entry.stats.weapons && !entry.stats.gear;

  if ((needProfile || needWeapons) && pdfjsResults && entry.pdf) {
    const pageNum = parseInt(entry.page, 10);
    const match = pdfjsResults.find(r => {
      if (!r || !r.pdf) return false;
      if (String(r.pdf).trim() !== String(entry.pdf).trim()) return false;
      if (r.foundPage && pageNum && r.foundPage === pageNum) return true;
      if (Array.isArray(r.range) && pageNum && pageNum >= r.range[0] && pageNum <= r.range[1]) return true;
      if (r.chosenPage && pageNum && r.chosenPage === pageNum) return true;
      return false;
    });

    if (match && match.stats) {
      // copy profile if missing
      if (needProfile && match.stats.profile) {
        entry.stats.profile = entry.stats.profile || {};
        Object.assign(entry.stats.profile, match.stats.profile);
        changed = true;
      }
      // copy movement/wounds/weapons/gear if missing
      if (!entry.stats.movement && match.stats.movement) {
        entry.stats.movement = match.stats.movement;
        changed = true;
      }
      if ((!entry.stats.wounds || entry.stats.wounds === null) && match.stats.wounds) {
        entry.stats.wounds = match.stats.wounds;
        changed = true;
      }
      if (needWeapons && (match.stats.weapons || match.stats.gear)) {
        entry.stats.weapons = entry.stats.weapons || match.stats.weapons || null;
        entry.stats.gear = entry.stats.gear || match.stats.gear || null;
        changed = true;
      }
    }
  }

  return changed;
}

function main() {
  console.log('Loading bestiary:', DB_PATH);
  const db = readJson(DB_PATH);
  let pdfjs = null;
  try {
    pdfjs = readJson(PDFJS_PATH);
  } catch (e) {
    console.warn('Could not read pdfjs artifacts:', PDFJS_PATH);
  }

  ensureDir(BACKUPS_DIR);
  const backupPath = path.join(BACKUPS_DIR, `deathwatch-bestiary-extracted.json.backup.${Date.now()}.json`);
  fs.copyFileSync(DB_PATH, backupPath);
  console.log('Backed up DB to', backupPath);

  const results = db.results || [];
  let modified = 0;

  for (let i = 0; i < results.length; i++) {
    const entry = results[i];
    const changed = normalizeEntry(entry, pdfjs && pdfjs.results ? pdfjs.results : (pdfjs && pdfjs.matches ? pdfjs.matches : null));
    if (changed) modified++;
  }

  if (modified > 0) {
    db.generatedAt = new Date().toISOString();
    db.count = results.length;
    writeJson(DB_PATH, db);
    console.log(`Updated ${modified} entries and wrote DB (count=${db.count})`);
  } else {
    console.log('No changes necessary');
  }
}

main();
