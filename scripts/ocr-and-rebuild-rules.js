#!/usr/bin/env node
// OCR + rebuild rules from an image using tesseract.js
// Usage: node scripts/ocr-and-rebuild-rules.js /path/to/image.png

const fs = require('fs');
const path = require('path');
const { createWorker } = require('tesseract.js');
const Database = require('better-sqlite3');

async function main(){
  const img = process.argv[2];
  if(!img){
    console.error('Usage: node scripts/ocr-and-rebuild-rules.js /path/to/image.png');
    process.exit(2);
  }
  if(!fs.existsSync(img)){
    console.error('Image not found:', img);
    process.exit(2);
  }

  const repoRoot = path.resolve(__dirname, '..');
  const dbPath = path.join(repoRoot, 'database', 'sqlite', 'deathwatch.db');
  const backupsDir = path.join(repoRoot, 'database', 'backups');
  if(!fs.existsSync(dbPath)){
    console.error('DB not found at', dbPath); process.exit(1);
  }
  if(!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir,{recursive:true});
  const nowTs = ()=> new Date().toISOString().replace(/[:.]/g,'-');

  console.log('Running OCR on', img);
  const worker = createWorker({
    logger: m => { if(m && m.status) process.stdout.write(`\rOCR: ${m.status} ${(m.progress||0).toFixed(2)}`); }
  });
  await worker.load();
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const { data: { text } } = await worker.recognize(img);
  await worker.terminate();
  console.log('\nOCR complete,', text.length, 'chars');

  // Split text into lines and use heading heuristics: a heading is a short line (<=60 chars) that is mostly letters, possibly contains parentheses or ALL CAPS.
  const lines = text.split(/\r?\n/).map(l=>l.replace(/\u00A0/g,' ').trim());
  const isHeading = (l)=>{
    if(!l) return false;
    if(l.length>60) return false;
    if(/\d{1,3}\s?[-–—]/.test(l)) return false; // avoid numbered table rows
    if(/Table\s+\d+/i.test(l)) return false;
    if(/^[A-Z0-9][A-Z0-9 \-'()]+$/.test(l) && l.split(' ').length<=6) return true; // ALL CAPS
    if(/\w+\s*\(.+\)/.test(l)) return true; // has parentheses like (Basic)
    if(/^([A-Za-z]{3,}\s?){1,3}$/.test(l)) return true; // 1-3 word simple title
    return false;
  };

  const blocks = [];
  let curr = null;
  for(const line of lines){
    if(isHeading(line)){
      if(curr) blocks.push(curr);
      curr = {title: line, content: ''};
    }else{
      if(!curr) continue; // skip until first heading
      if(curr.content.length) curr.content += '\n';
      curr.content += line;
    }
  }
  if(curr) blocks.push(curr);
  console.log('Detected', blocks.length, 'blocks from OCR');

  // Simple filter: content length > 30
  const skills = blocks.filter(b=> (b.content||'').replace(/\s+/g,'').length>30);
  console.log('Filtered to', skills.length, 'skill-like blocks');

  const db = new Database(dbPath);
  const backupFile = path.join(backupsDir, `rules-backup-before-ocr-rebuild-${nowTs()}.json`);
  const rows = db.prepare('SELECT * FROM rules').all();
  fs.writeFileSync(backupFile, JSON.stringify(rows,null,2));
  console.log('Wrote DB backup to', backupFile);

  const deleteInfo = db.prepare('DELETE FROM rules').run();
  console.log('Purged rules table, deleted rows:', deleteInfo.changes);

  const insert = db.prepare(`INSERT INTO rules (rule_id,title,content,page,source,source_abbr,category,created_at) VALUES (?,?,?,?,?,?,?,datetime('now'))`);
  let i=1;
  const txn = db.transaction((rows)=>{
    for(const r of rows){
      const ruleId = `ocr_skill_${i}_${r.title.replace(/[^a-z0-9]+/ig,'_').toLowerCase()}`;
      insert.run(ruleId, r.title, r.content, null, 'Core Rulebook', 'CR', 'skills');
      i++;
    }
  });
  txn(skills);
  console.log('Inserted', skills.length, 'skill rows');
  const report = path.join(backupsDir, `rules-ocr-rebuild-report-${nowTs()}.json`);
  fs.writeFileSync(report, JSON.stringify({inserted: skills.length, sample: skills.slice(0,50)}, null, 2));
  console.log('Wrote report to', report);
  db.close();
  console.log('Done');
}

main().catch(e=>{ console.error(e); process.exit(1); });
