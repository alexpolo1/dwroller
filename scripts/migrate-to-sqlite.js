#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '../database/sqlite/deathwatch.db');
const backupPath = dbPath + '.backup.' + Date.now();

function safeReadJSON(p) {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { console.error('JSON parse error', p, e.message); return null; }
}

console.log('=== MIGRATE JSON DATA INTO SQLITE ===');
if (!fs.existsSync(dbPath)) {
  console.error('DB not found at', dbPath);
  process.exit(1);
}

fs.copyFileSync(dbPath, backupPath);
console.log('Backup created:', backupPath);

const db = new Database(dbPath);

// Create consolidated tables
db.exec(`
CREATE TABLE IF NOT EXISTS armour (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  req INTEGER DEFAULT 0,
  renown TEXT DEFAULT 'None',
  category TEXT,
  stats TEXT,
  source TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS weapons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  req INTEGER DEFAULT 0,
  renown TEXT DEFAULT 'None',
  category TEXT,
  stats TEXT,
  source TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bestiary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  book TEXT,
  page TEXT,
  pdf TEXT,
  stats TEXT,
  profile TEXT,
  snippet TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_id TEXT UNIQUE,
  title TEXT,
  content TEXT,
  page INTEGER,
  source TEXT,
  source_abbr TEXT,
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

const insertArmour = db.prepare(`INSERT OR IGNORE INTO armour (name, req, renown, category, stats, source) VALUES (?, ?, ?, ?, ?, ?)`);
const insertWeapon = db.prepare(`INSERT OR IGNORE INTO weapons (name, req, renown, category, stats, source) VALUES (?, ?, ?, ?, ?, ?)`);
const insertBestiary = db.prepare(`INSERT INTO bestiary (name, book, page, pdf, stats, profile, snippet) VALUES (?, ?, ?, ?, ?, ?, ?)`);
const insertRule = db.prepare(`INSERT OR IGNORE INTO rules (rule_id, title, content, page, source, source_abbr, category) VALUES (?, ?, ?, ?, ?, ?, ?)`);

let totals = { armour:0, weapons:0, bestiary:0, rules:0 };

// Import armour
const armourFile = path.join(__dirname, '../database/public/deathwatch-armor.json');
const armourData = safeReadJSON(armourFile);
if (armourData) {
  const categories = Object.keys(armourData);
  categories.forEach(cat => {
    const arr = armourData[cat];
    if (!Array.isArray(arr)) return;
    const insert = insertArmour;
    db.transaction(() => {
      for (const item of arr) {
        const stats = JSON.stringify(item.stats || {});
        const src = (item.stats && item.stats.source) || '';
        insert.run(item.name || '(unnamed)', item.req || 0, item.renown || 'None', item.category || cat, stats, src);
        totals.armour++;
      }
    })();
  });
}

// Import weapons
const weaponsFile = path.join(__dirname, '../database/public/deathwatch-weapons-comprehensive.json');
const weaponsData = safeReadJSON(weaponsFile);
if (weaponsData) {
  // many weapon files use keys like rangedWeapons, meleeWeapons
  Object.keys(weaponsData).forEach(k => {
    const arr = weaponsData[k];
    if (!Array.isArray(arr)) return;
    db.transaction(() => {
      for (const w of arr) {
        const stats = JSON.stringify(w.stats || {});
        const src = (w.stats && w.stats.source) || '';
        insertWeapon.run(w.name || '(unnamed)', w.req || 0, w.renown || 'Any', w.category || k, stats, src);
        totals.weapons++;
      }
    })();
  });
}

// Import bestiary
const bestiaryFile = path.join(__dirname, '../database/deathwatch-bestiary-extracted.json');
const bestiaryData = safeReadJSON(bestiaryFile);
if (bestiaryData && Array.isArray(bestiaryData.results)) {
  db.transaction(() => {
    for (const e of bestiaryData.results) {
      const stats = JSON.stringify(e.stats || {});
      const profile = JSON.stringify(e.profile || {});
      const name = e.bestiaryName || e.name || '(unnamed)';
      insertBestiary.run(name, e.book || '', e.page || '', e.pdf || '', stats, profile, e.stats && e.stats.snippet ? e.stats.snippet : '');
      totals.bestiary++;
    }
  })();
}

// Import rules
const rulesFile = path.join(__dirname, '../database/rules/rules-database.json');
const rulesData = safeReadJSON(rulesFile);
if (rulesData && Array.isArray(rulesData.rules)) {
  db.transaction(() => {
    for (const r of rulesData.rules) {
      insertRule.run(r.id || null, r.title || '', r.content || '', r.page || null, r.source || '', r.sourceAbbr || '', r.category || 'general');
      totals.rules++;
    }
  })();
}

console.log('Import totals:', totals);

// Show row counts from DB for verification
const counts = {
  armour: db.prepare('SELECT COUNT(*) as c FROM armour').get().c,
  weapons: db.prepare('SELECT COUNT(*) as c FROM weapons').get().c,
  bestiary: db.prepare('SELECT COUNT(*) as c FROM bestiary').get().c,
  rules: db.prepare('SELECT COUNT(*) as c FROM rules').get().c
};

console.log('DB row counts:', counts);

// Print a small sample from each table
console.log('\nSample armour:', db.prepare('SELECT name, category, stats FROM armour LIMIT 3').all());
console.log('\nSample weapons:', db.prepare('SELECT name, category, stats FROM weapons LIMIT 3').all());
console.log('\nSample bestiary:', db.prepare('SELECT name, book, snippet FROM bestiary LIMIT 3').all());
console.log('\nSample rules:', db.prepare('SELECT rule_id, title FROM rules LIMIT 3').all());

db.close();
console.log('\nMigration complete. DB backed up at', backupPath);
