#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const repoRoot = path.resolve(__dirname, '..');
const dbPath = path.join(repoRoot, 'database', 'sqlite', 'deathwatch.db');
const rulesJsonPath = path.join(repoRoot, 'database', 'rules', 'rules-database.json');
const backupsDir = path.join(repoRoot, 'database', 'backups');

function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); }
ensureDir(backupsDir);

function nowTs(){ return new Date().toISOString().replace(/[:.]/g,'-'); }

if(!fs.existsSync(dbPath)){
  console.error('Cannot find DB at', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);

// Backup current rules table
const backupFile = path.join(backupsDir, `rules-backup-before-rebuild-${nowTs()}.json`);
try{
  const rows = db.prepare('SELECT * FROM rules').all();
  fs.writeFileSync(backupFile, JSON.stringify(rows,null,2));
  console.log('Wrote rules backup to', backupFile);
}catch(e){ console.error('Failed to backup rules table:', e); process.exit(1); }

// Load source JSON to extract skills
if(!fs.existsSync(rulesJsonPath)){
  console.error('Cannot find rules source JSON at', rulesJsonPath);
  process.exit(1);
}
const src = JSON.parse(fs.readFileSync(rulesJsonPath,'utf8'));
if(!Array.isArray(src.rules)){
  console.error('Unexpected rules JSON shape'); process.exit(1);
}

// Heuristics: consider entries that look like skill headings or part of skills pages.
// We'll build a text stream by concatenating titles and contents in order, then split into blocks
// where a large heading appears: heuristics for heading -> title lines that are short (<=40 chars),
// contain a Skill name pattern (one or two words, may include parentheses like "(Basic)") or are ALL CAPS.

function isLikelyHeading(title){
  if(!title) return false;
  const t = title.trim();
  if(t.length===0) return false;
  if(t.length>60) return false; // too long to be heading
  // if contains newline or table markers, not heading
  if(/[\n\t]|\|/.test(t)) return false;
  // If it's short and contains words with initial capital letter or parentheses, or all-caps
  if(/^[A-Z0-9 \-'()]+$/.test(t) && t.split(' ').length<=6) return true; // all-caps headings
  if(/\w+\s*\(.+\)/.test(t)) return true; // has parentheses
  if(/^([A-Za-z]{3,}\s?){1,3}$/.test(t)) return true; // 1-3 word simple title
  return false;
}

// Create a linear sequence of blocks from src.rules in their existing order.
const items = src.rules.map(r=>({title:r.title||'', content:r.content||'', page:r.page||null, source:r.source||'Core Rulebook'}));

// We'll iterate items and when we see a heading-like title, start a new skill block. Otherwise append to current block.
const skills = [];
let current = null;
for(const it of items){
  const title = (it.title||'').trim();
  if(isLikelyHeading(title)){
    // start a new block
    if(current) skills.push(current);
    current = {title: title, content: it.content||'', page: it.page || null, source: it.source || 'Core Rulebook'};
  }else{
    // append: if no current, try to see if content begins with a skill-like name line
    if(!current){
      // create a pseudo-heading from first line if it looks short
      const firstLine = (title || (it.content||'')).split('\n')[0].trim();
      if(isLikelyHeading(firstLine)){
        current = {title:firstLine, content: (it.content||''), page: it.page, source: it.source};
      }else{
        // ignore leading material until we find first heading
        continue;
      }
    }else{
      // append content and title if title looks like a continuation (table rows etc.)
      if(title && title.length<80 && !/\d+\s?–|Table|Table\s|\d{1,3}\s?—/.test(title)){
        current.content += '\n' + (title||'');
      }
      current.content += '\n' + (it.content||'');
    }
  }
}
if(current) skills.push(current);

console.log('Detected', skills.length, 'candidate skill blocks');

// Filter and normalize: require that title contains a skill-like keyword or parentheses descriptors
const filtered = skills.filter(s=>{
  const t = s.title||'';
  // require reasonable length and letters
  if(t.length<2 || t.length>60) return false;
  // avoid entries that look like tables (contain multiple columns lines with multiple double spaces)
  const content = (s.content||'');
  // require content > 20 chars
  if(content.replace(/\s+/g,'').length < 20) return false;
  return true;
});

console.log('After filtering,', filtered.length, 'skill blocks remain');

// Prepare DB insertion
const insertStmt = db.prepare(`INSERT INTO rules (rule_id,title,content,page,source,source_abbr,category,created_at) VALUES (?,?,?,?,?,?,?,datetime('now'))`);
const genRuleId = (i, t) => `skill_${i}_${t.replace(/[^a-z0-9]+/ig,'_').toLowerCase()}`;

// Truncate rules table (but keep a backup file already made). We'll do DELETE FROM rules; then insert.
const deleteInfo = db.prepare('DELETE FROM rules').run();
console.log('Purged rules table, deleted rows:', deleteInfo.changes);

let inserted = 0;
const insertTx = db.transaction((rows)=>{
  let i=1;
  for(const r of rows){
    const id = genRuleId(i, r.title.slice(0,30));
    insertStmt.run(id, r.title, r.content, r.page||null, r.source||'Core Rulebook', (r.source||'CR').slice(0,3).toUpperCase(), 'skills');
    i++; inserted++;
  }
});

insertTx(filtered);

console.log('Inserted', inserted, 'skill rows into rules table');

// Write a JSON report of inserted rows
const reportFile = path.join(backupsDir, `rules-rebuild-report-${nowTs()}.json`);
fs.writeFileSync(reportFile, JSON.stringify({inserted, sample: filtered.slice(0,50)}, null, 2));
console.log('Wrote report to', reportFile);

db.close();
console.log('Done');
