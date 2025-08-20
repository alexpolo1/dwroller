#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const csvPath = process.argv[2] || 'database/deathwatch_skills_p94_107.csv';
if (!fs.existsSync(csvPath)) {
  console.error('CSV not found at', csvPath);
  process.exit(1);
}

function splitCsvLine(line){
  // split on commas not inside quotes
  const parts = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/g).map(s=>s.trim());
  return parts.map(p => {
    if (p.startsWith('"') && p.endsWith('"')){
      p = p.slice(1,-1).replace(/""/g,'"');
    }
    return p;
  });
}

const raw = fs.readFileSync(csvPath, 'utf8');
const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '');
if (lines.length < 2){ console.error('CSV has no data'); process.exit(1); }
const header = splitCsvLine(lines.shift()).map(h=>h.trim());
const rows = lines.map(l => {
  const cols = splitCsvLine(l);
  const obj = {};
  for(let i=0;i<header.length;i++) obj[header[i]] = cols[i] || '';
  return obj;
});

const db = new Database('database/sqlite/deathwatch.db');
console.log('Loaded', rows.length, 'rows from CSV');

function slug(s){
  return (s||'skill').toString().toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

const deleteStmt = db.prepare("DELETE FROM rules WHERE category = ?");
const insertStmt = db.prepare('INSERT OR IGNORE INTO rules (rule_id, title, content, page, source, source_abbr, category) VALUES (?, ?, ?, ?, ?, ?, ?)');

const tx = db.transaction(()=>{
  const delRes = deleteStmt.run('skills');
  console.log('Deleted rows where category=skills, changes:', delRes.changes);

  let inserted = 0;
  for(const r of rows){
    const name = r.name || r.title || '';
    const ruleId = slug(name) || ('skill-' + Math.random().toString(36).slice(2,9));
    const contentParts = [];
    if (r.skill_text && r.skill_text.trim()) contentParts.push(r.skill_text.trim());
    if (r.skill_description && r.skill_description.trim()) contentParts.push(r.skill_description.trim());
    if (r.skill_use && r.skill_use.trim()) contentParts.push('Use: ' + r.skill_use.trim());
    const content = contentParts.join('\n\n');
    const page = null;
    const res = insertStmt.run(ruleId, name, content, page, 'csv-import', 'CSV', 'skills');
    if (res.changes) inserted++;
  }
  console.log('Inserted', inserted, 'new skill rows');
});

try{
  tx();
}catch(err){
  console.error('DB error during import', err && err.message);
  process.exit(1);
}finally{
  const counts = db.prepare('SELECT COUNT(*) as c FROM rules WHERE category = ?').get('skills').c;
  console.log('Final skills count in rules table:', counts);
  db.close();
}
