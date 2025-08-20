#!/usr/bin/env node
const fs = require('fs');
const Database = require('better-sqlite3');

const input = process.argv[2] || 'database/backups/sanitized-rules-verified-full.json';
const minConfidence = Number(process.argv[3] || 0.6);

if (!fs.existsSync(input)) {
  console.error('Input file not found:', input);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(input, 'utf8'));
if (!data || !Array.isArray(data.sanitized)) {
  console.error('Expected file with { sanitized: [...] }');
  process.exit(1);
}

const db = new Database('database/sqlite/deathwatch.db');

function slug(s){
  return (s||'rule').toString().toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)/g,'');
}

const insert = db.prepare('INSERT OR IGNORE INTO rules (rule_id, title, content, page, source, source_abbr, category) VALUES (?, ?, ?, ?, ?, ?, ?)');
const exists = db.prepare('SELECT COUNT(*) as c FROM rules WHERE rule_id = ?');

const rows = data.sanitized.filter(x => (typeof x.confidence === 'number' ? x.confidence : 0) >= minConfidence);
console.log('Found', data.sanitized.length, 'sanitized items;', rows.length, `>= ${minConfidence} confidence`);

const inserted = [];

const tx = db.transaction((items) => {
  for (const it of items) {
    const title = (it.title || (it.original && it.original.title) || '').toString();
    let base = slug(title) || 'rule';
    let candidate = base;
    let i = 0;
    while (exists.get(candidate).c > 0) { i++; candidate = base + '-' + i; }
    const pageVal = (it.page && !isNaN(Number(it.page))) ? Number(it.page) : null;
    const res = insert.run(candidate, title || candidate, it.content || '', pageVal, 'sanitized', 'SAN', it.category || 'skills');
    if (res.changes && res.lastInsertRowid) {
      inserted.push({ rule_id: candidate, title: title, page: it.page, confidence: it.confidence });
    }
  }
});

tx(rows);

const counts = {
  rules_sanitized: db.prepare('SELECT COUNT(*) as c FROM rules WHERE source = ?').get('sanitized').c,
  rules_total: db.prepare('SELECT COUNT(*) as c FROM rules').get().c
};

console.log(JSON.stringify({ insertedCount: inserted.length, counts }, null, 2));

db.close();

if (inserted.length > 0) {
  console.log('Inserted sample:', inserted.slice(0,5));
}
