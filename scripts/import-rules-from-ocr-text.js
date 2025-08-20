#!/usr/bin/env node
// Import rules from OCR text files
// Usage: node scripts/import-rules-from-ocr-text.js data/ocr_rules_one.txt data/ocr_rules_two.txt ...

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

if(process.argv.length<3){
  console.error('Usage: node scripts/import-rules-from-ocr-text.js file1.txt [file2.txt ...]');
  process.exit(2);
}

const files = process.argv.slice(2).filter(f=>fs.existsSync(f));
if(files.length===0){ console.error('No input text files found'); process.exit(2); }

const repoRoot = path.resolve(__dirname,'..');
const dbPath = path.join(repoRoot,'database','sqlite','deathwatch.db');
const backupsDir = path.join(repoRoot,'database','backups');
if(!fs.existsSync(dbPath)){ console.error('DB not found at', dbPath); process.exit(1); }
if(!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir,{recursive:true});
const nowTs = ()=> new Date().toISOString().replace(/[:.]/g,'-');

let combined = '';
for(const f of files){ combined += '\n' + fs.readFileSync(f,'utf8'); }

// Normalize whitespace
combined = combined.replace(/\r/g,'').replace(/\t/g,' ').replace(/ +/g,' ').replace(/\n{2,}/g,'\n\n');
const lines = combined.split('\n').map(l=>l.trim());

function isHeading(l){
  if(!l) return false;
  if(l.length>60) return false;
  if(/Table\s+\d+/i.test(l)) return false;
  if(/^[A-Z0-9][A-Z0-9 \-'()]+$/.test(l) && l.split(' ').length<=6) return true;
  if(/\w+\s*\(.+\)/.test(l)) return true;
  if(/^([A-Za-z]{3,}\s?){1,3}$/.test(l)) return true;
  return false;
}

const blocks = [];
let curr = null;
for(const l of lines){
  if(isHeading(l)){
    if(curr) blocks.push(curr);
    curr = {title: l, content: ''};
  }else{
    if(!curr) continue;
    if(curr.content) curr.content += '\n';
    curr.content += l;
  }
}
if(curr) blocks.push(curr);
console.log('Detected', blocks.length, 'blocks');

const skills = blocks.filter(b=> (b.content||'').replace(/\s+/g,'').length>30);
console.log('Filtered to', skills.length, 'skill-like blocks');

const db = new Database(dbPath);
const backupFile = path.join(backupsDir, `rules-ocr-backup-before-import-${nowTs()}.json`);
fs.writeFileSync(backupFile, JSON.stringify(db.prepare('SELECT * FROM rules').all(),null,2));
console.log('Wrote backup to', backupFile);

const del = db.prepare('DELETE FROM rules').run();
console.log('Deleted rows:', del.changes);

const insert = db.prepare(`INSERT INTO rules (rule_id,title,content,page,source,source_abbr,category,created_at) VALUES (?,?,?,?,?,?,?,datetime('now'))`);
const txn = db.transaction((rows)=>{
  let i=1;
  for(const r of rows){
    const id = `ocr_${i}_${r.title.replace(/[^a-z0-9]+/ig,'_').toLowerCase()}`;
    insert.run(id, r.title, r.content, null, 'Core Rulebook', 'CR', 'skills');
    i++;
  }
});

txn(skills);
console.log('Inserted', skills.length, 'rows');

const report = {inserted: skills.length, sample: skills.slice(0,50)};
const reportFile = path.join(backupsDir, `rules-ocr-import-report-${nowTs()}.json`);
fs.writeFileSync(reportFile, JSON.stringify(report,null,2));
console.log('Wrote report to', reportFile);
db.close();
console.log('Done');
