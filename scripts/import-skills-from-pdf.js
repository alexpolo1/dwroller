#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const Database = require('better-sqlite3');

const repoRoot = path.resolve(__dirname, '..');
const dbPath = path.join(repoRoot, 'database', 'sqlite', 'deathwatch.db');
const backupsDir = path.join(repoRoot, 'database', 'backups');
const defaultPdf = path.join(repoRoot, 'data', 'Deathwatch_Core_Rulebook_copy.pdf');

function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); }
ensureDir(backupsDir);
function nowTs(){ return new Date().toISOString().replace(/[:.]/g,'-'); }

const pdfPath = process.argv[2] || defaultPdf;
if(!fs.existsSync(dbPath)){
  console.error('Cannot find DB at', dbPath); process.exit(1);
}
if(!fs.existsSync(pdfPath)){
  console.error('Cannot find PDF at', pdfPath); process.exit(1);
}

const db = new Database(dbPath);

// Backup current rules table
const backupFile = path.join(backupsDir, `rules-backup-before-pdf-import-${nowTs()}.json`);
try{
  const rows = db.prepare('SELECT * FROM rules').all();
  fs.writeFileSync(backupFile, JSON.stringify(rows,null,2));
  console.log('Wrote rules backup to', backupFile);
}catch(e){ console.error('Failed to backup rules table:', e); process.exit(1); }

// Helpers
function cleanLine(s){ return (s||'').replace(/\r/g,'').replace(/[\u00A0]/g,' ').trim(); }
function collapseText(s){ return (s||'').replace(/\n{2,}/g,'\n\n').replace(/[ \t]+/g,' ').trim(); }
function joinHyphenation(text){ return String(text).replace(/-\n\s*/g,''); }

function isLikelyHeading(line){
  if(!line) return false;
  const t = line.trim();
  if(t.length===0 || t.length>80) return false;
  if(/\|/.test(t)) return false;
  // All-caps or contains parentheses like (Basic) or short 1-3 word titles
  if(/^[A-Z0-9 \-()']+$/.test(t) && t.split(' ').length<=6) return true;
  if(/\w+\s*\(.+\)/.test(t)) return true;
  if(/^([A-Za-z]{3,}\s?){1,4}$/.test(t)) return true;
  return false;
}

async function parsePdfToPages(pdfPath){
  const data = fs.readFileSync(pdfPath);
  const parsed = await pdf(data);
  // pdf-parse separates pages with form feed \f in the text output
  const raw = parsed.text || '';
  const pages = raw.split('\f').map(p=>p.replace(/\r/g,'').trim());
  return pages;
}

function extractSkillBlocksFromPages(pages){
  const blocks = [];
  let current = null;
  for(let pi=0; pi<pages.length; pi++){
    const pageText = pages[pi];
    const lines = pageText.split('\n').map(l=>cleanLine(l));
    for(let li=0; li<lines.length; li++){
      const line = lines[li];
      if(!line) continue;
      // Normalize hyphenation across break in the page's text
      // If line ends with '-' assume hyphenation and join with next
      let nextLine = lines[li+1] || '';
      if(line.endsWith('-') && nextLine){
        lines[li] = line.slice(0,-1) + nextLine;
        lines.splice(li+1,1);
      }

      // If line looks like a heading -> start new block
      if(isLikelyHeading(line)){
        if(current) blocks.push(current);
        current = { title: line, content: '', page: pi+1, source: 'Core Rulebook' };
        continue;
      }

      // If we have a current block, append line
      if(current){
        current.content += (current.content ? '\n' : '') + line;
      } else {
        // no current; attempt to detect inline heading in content (e.g., first line of page)
        const first = line.split('.').shift();
        if(isLikelyHeading(first)){
          current = { title: first, content: line, page: pi+1, source: 'Core Rulebook' };
        }
      }
    }
  }
  if(current) blocks.push(current);
  // Post-process blocks: clean and join soft wraps
  return blocks.map(b=>({ title: collapseText(b.title), content: collapseText(joinHyphenation(b.content)), page: b.page, source: b.source }));
}

function filterBlocks(blocks){
  return blocks.filter(b=>{
    const t = (b.title||'');
    const c = (b.content||'');
    if(t.length<2 || t.length>80) return false;
    if(c.replace(/\s+/g,'').length < 50) return false;
    return true;
  });
}

async function run(){
  console.log('Parsing PDF:', pdfPath);
  const pages = await parsePdfToPages(pdfPath);
  console.log('PDF parsed into', pages.length, 'pages');

  // Try to restrict to Chapter III (Skills) by searching chapter markers in pages
  let startPage = -1, endPage = -1;
  const startRe = /chapter\s*iii[:\s]|chapter\s*3[:\s]|chapter\s*iii\b|chapter\s*iii\b.*skills/i;
  const endRe = /chapter\s*(?:iv|4)[:\s]|chapter\s*4\b|chapter\s*iv\b|chapter\s*iv\b.*talent/i;
  for(let i=0;i<pages.length;i++){
    const p = pages[i];
    if(startPage===-1 && startRe.test(p)) startPage = i;
    if(startPage!==-1 && endRe.test(p)) { endPage = i; break; }
  }

  let pagesForExtraction = pages;
  if(startPage!==-1){
    const from = startPage;
    const to = (endPage!==-1 && endPage>startPage) ? endPage : Math.min(pages.length, startPage+30);
    pagesForExtraction = pages.slice(from,to);
    console.log('Restricted extraction to pages', from+1, '->', to);
  } else {
    console.log('Chapter III marker not found; extracting from entire document');
  }

  const blocks = extractSkillBlocksFromPages(pagesForExtraction);
  console.log('Extracted', blocks.length, 'raw blocks');
  const filtered = filterBlocks(blocks);
  console.log('After filtering', filtered.length, 'skill-like blocks remain');

  if(filtered.length===0){
    console.error('No skill blocks detected, aborting');
    process.exit(1);
  }

  // Delete existing skills from rules table and insert
  const deleteInfo = db.prepare("DELETE FROM rules WHERE category = 'skills'").run();
  console.log('Deleted skill rows:', deleteInfo.changes);

  const insertStmt = db.prepare(`INSERT INTO rules (rule_id,title,content,page,source,source_abbr,category,created_at) VALUES (?,?,?,?,?,?,?,datetime('now'))`);
  const slug = s => String(s||'').replace(/[^a-z0-9]+/ig,'_').replace(/^_+|_+$/g,'').toLowerCase();

  const insertTx = db.transaction((rows)=>{
    let i=1;
    for(const r of rows){
      const id = `pdf_skill_${i}_${slug(r.title.slice(0,30))}`;
      insertStmt.run(id, r.title, r.content, r.page||null, r.source||'Core Rulebook', 'CR', 'skills');
      i++;
    }
  });

  insertTx(filtered);
  console.log('Inserted', filtered.length, 'skill rows');

  const report = { inserted: filtered.length, sample: filtered.slice(0,50) };
  const reportFile = path.join(backupsDir, `rules-pdf-import-report-${nowTs()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log('Wrote report to', reportFile);

  db.close();
  console.log('Done');
}

run().catch(err=>{ console.error('Import failed:', err && err.stack ? err.stack : err); process.exit(1); });
