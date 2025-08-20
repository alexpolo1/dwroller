#!/usr/bin/env node
// Refined OCR import: join hyphenations, stronger heading heuristics, collapse soft wraps
// Usage: node scripts/import-rules-from-ocr-text-refined.js data/ocr_prep_rules_one_rule.txt ...

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

if(process.argv.length<3){
  console.error('Usage: node scripts/import-rules-from-ocr-text-refined.js file1.txt [file2.txt ...]');
  process.exit(2);
}
const files = process.argv.slice(2).filter(f=>fs.existsSync(f));
if(files.length===0){ console.error('No files'); process.exit(2); }

const repoRoot = path.resolve(__dirname,'..');
const dbPath = path.join(repoRoot,'database','sqlite','deathwatch.db');
const backupsDir = path.join(repoRoot,'database','backups');
if(!fs.existsSync(dbPath)) { console.error('DB not found'); process.exit(1); }
if(!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir,{recursive:true});
const nowTs = ()=> new Date().toISOString().replace(/[:.]/g,'-');

let combined = '';
for(const f of files) combined += '\n' + fs.readFileSync(f,'utf8');

// Normalize: remove repeated spaces, normalize newlines
combined = combined.replace(/\r/g,'');
// Fix hyphenation at line breaks: word-\nword -> wordword
combined = combined.replace(/-\n\s*/g,'');
// Join soft-wrapped lines: if a line ends without sentence punctuation, join with next
combined = combined.split('\n').map(l=>l.trim()).reduce((acc,line,idx,arr)=>{
  if(idx===0) return [line];
  const prev = acc[acc.length-1];
  if(!prev) { acc.push(line); return acc; }
  // if previous ends with punctuation or is short heading-like, keep newline
  if(/[\.!?\:\;]$/.test(prev) || prev.length<10) { acc.push(line); return acc; }
  // if line looks like a heading, push new
  if(/^([A-Z][a-z]+\s?){1,3}(\(.+\))?$/.test(line) && line.length<60) { acc.push(line); return acc; }
  // otherwise join
  acc[acc.length-1] = prev + ' ' + line;
  return acc;
},[]).join('\n');

// Remove multiple blank lines
combined = combined.replace(/\n{2,}/g,'\n\n');

// Split into lines and detect headings
const lines = combined.split('\n');
function isHeading(l){
  if(!l) return false;
  if(l.length>60) return false;
  if(/Table\s+\d+/i.test(l)) return false;
  // all-caps or contains parentheses descriptors
  if(/^[A-Z0-9 \-'()]+$/.test(l) && l.split(' ').length<=6) return true;
  if(/\w+\s*\(.+\)/.test(l)) return true;
  // shorter title-case 1-3 words
  if(/^([A-Z][a-z]{2,}\s?){1,3}$/.test(l)) return true;
  return false;
}

const blocks = [];
let curr = null;
for(const l of lines){
  if(isHeading(l)){
    if(curr) blocks.push(curr);
    curr = {title:l, content:''};
  }else{
    if(!curr) continue;
    if(curr.content) curr.content += '\n';
    curr.content += l;
  }
}
if(curr) blocks.push(curr);
console.log('Detected', blocks.length, 'blocks');
const skills = blocks.filter(b=> (b.content||'').replace(/\s+/g,'').length>40);
console.log('Filtered to', skills.length, 'skill-like blocks');

const db = new Database(dbPath);
const backupFile = path.join(backupsDir, `rules-ocr-refined-backup-${nowTs()}.json`);
fs.writeFileSync(backupFile, JSON.stringify(db.prepare('SELECT * FROM rules').all(),null,2));
console.log('Wrote backup to', backupFile);

const del = db.prepare('DELETE FROM rules').run();
console.log('Deleted rows:', del.changes);

const insert = db.prepare(`INSERT INTO rules (rule_id,title,content,page,source,source_abbr,category,created_at) VALUES (?,?,?,?,?,?,?,datetime('now'))`);
const txn = db.transaction((rows)=>{
  let i=1;
  for(const r of rows){
    const id = `ocr_refined_${i}_${r.title.replace(/[^a-z0-9]+/ig,'_').toLowerCase()}`;
    insert.run(id, r.title, r.content, null, 'Core Rulebook', 'CR', 'skills');
    i++;
  }
});

txn(skills);
console.log('Inserted', skills.length, 'rows');
const reportFile = path.join(backupsDir, `rules-ocr-refined-report-${nowTs()}.json`);
fs.writeFileSync(reportFile, JSON.stringify({inserted: skills.length, sample: skills.slice(0,50)},null,2));
console.log('Wrote report to', reportFile);

db.close();
console.log('Done');
