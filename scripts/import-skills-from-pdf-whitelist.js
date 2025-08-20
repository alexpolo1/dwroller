#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const Database = require('better-sqlite3');

const repoRoot = path.resolve(__dirname, '..');
const dbPath = path.join(repoRoot, 'database', 'sqlite', 'deathwatch.db');
const backupsDir = path.join(repoRoot, 'database', 'backups');
const defaultPdf = path.join(repoRoot, 'data', 'Deathwatch_Core_Rulebook_copy.pdf');
const rulesJson = path.join(repoRoot, 'database', 'rules', 'rules-database.json');

function ensureDir(dir){ if(!fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true}); }
ensureDir(backupsDir);
function nowTs(){ return new Date().toISOString().replace(/[:.]/g,'-'); }

const pdfPath = process.argv[2] || defaultPdf;
if(!fs.existsSync(dbPath)){ console.error('Cannot find DB at', dbPath); process.exit(1); }
if(!fs.existsSync(pdfPath)){ console.error('Cannot find PDF at', pdfPath); process.exit(1); }
if(!fs.existsSync(rulesJson)){ console.error('Cannot find rules JSON at', rulesJson); process.exit(1); }

const db = new Database(dbPath);

// Backup current rules table (safe guard)
const backupFile = path.join(backupsDir, `rules-backup-before-pdf-import-whitelist-${nowTs()}.json`);
try{
  const rows = db.prepare('SELECT * FROM rules').all();
  fs.writeFileSync(backupFile, JSON.stringify(rows,null,2));
  console.log('Wrote rules backup to', backupFile);
}catch(e){ console.error('Failed to backup rules table:', e); process.exit(1); }

function cleanLine(s){ return (s||'').replace(/\r/g,'').replace(/[\u00A0]/g,' ').trim(); }
function collapseText(s){ return (s||'').replace(/\n{2,}/g,'\n\n').replace(/[ \t]+/g,' ').trim(); }
function joinHyphenation(text){ return String(text).replace(/-\n\s*/g,''); }

function normalizeForMatch(s){
  if(!s) return '';
  // lower, remove punctuation, collapse spaces
  const t = String(s).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
  return t.replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
}

function levenshtein(a,b){
  // simple DP
  if(a===b) return 0;
  const m = a.length, n = b.length;
  if(m===0) return n;
  if(n===0) return m;
  const dp = Array(n+1).fill(0).map((_,i)=>i);
  for(let i=1;i<=m;i++){
    let prev = dp[0]; dp[0]=i;
    for(let j=1;j<=n;j++){
      const temp = dp[j];
      const cost = a[i-1]===b[j-1] ? 0 : 1;
      dp[j] = Math.min(dp[j]+1, dp[j-1]+1, prev + cost);
      prev = temp;
    }
  }
  return dp[n];
}

function isLikelyHeading(line){
  if(!line) return false;
  const t = line.trim();
  if(t.length===0 || t.length>80) return false;
  if(/\|/.test(t)) return false;
  if(/^[A-Z0-9 \-()']+$/.test(t) && t.split(' ').length<=6) return true;
  if(/\w+\s*\(.+\)/.test(t)) return true;
  if(/^([A-Za-z]{3,}\s?){1,4}$/.test(t)) return true;
  return false;
}

async function parsePdfToPages(pdfPath){
  const data = fs.readFileSync(pdfPath);
  const parsed = await pdf(data);
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
      let line = lines[li];
      if(!line) continue;
      let nextLine = lines[li+1] || '';
      if(line.endsWith('-') && nextLine){
        lines[li] = line.slice(0,-1) + nextLine;
        lines.splice(li+1,1);
        line = lines[li];
      }
      if(isLikelyHeading(line)){
        if(current) blocks.push(current);
        current = { title: line, content: '', page: pi+1, source: 'Core Rulebook' };
        continue;
      }
      if(current){
        current.content += (current.content ? '\n' : '') + line;
      } else {
        const first = line.split('.').shift();
        if(isLikelyHeading(first)){
          current = { title: first, content: line, page: pi+1, source: 'Core Rulebook' };
        }
      }
    }
  }
  if(current) blocks.push(current);
  return blocks.map(b=>({ title: collapseText(b.title), content: collapseText(joinHyphenation(b.content)), page: b.page, source: b.source }));
}

function filterShort(blocks){
  return blocks.filter(b=>{
    const t = (b.title||'');
    const c = (b.content||'');
    if(t.length<2 || t.length>80) return false;
    if(c.replace(/\s+/g,'').length < 80) return false; // require longer content for safety
    return true;
  });
}

function loadCanonicalTitles(){
  const raw = JSON.parse(fs.readFileSync(rulesJson,'utf8'));
  const rules = raw.rules || [];
  const titles = new Set();
  for(const r of rules){
    if(!r.title) continue;
    const cat = (r.category||'').toLowerCase();
    if(cat && cat.indexOf('skill')===-1 && cat!=='skills' && cat!=='general') continue;
    const n = normalizeForMatch(r.title);
    if(n) titles.add(n);
  }
  return Array.from(titles);
}

function matchToWhitelist(titleNorm, whitelist){
  // Only allow exact or prefix matches to tighten imports (no fuzzy/substr)
  if(!titleNorm) return false;
  for(const canon of whitelist){
    if(canon === titleNorm) return { type: 'exact', canon };
    if(canon.startsWith(titleNorm) || titleNorm.startsWith(canon)) return { type: 'prefix', canon };
  }
  return false;
}

async function run(){
  console.log('Parsing PDF:', pdfPath);
  const pages = await parsePdfToPages(pdfPath);
  console.log('PDF parsed into', pages.length, 'pages');

  const startRe = /chapter\s*iii[:\s]|chapter\s*3[:\s]|chapter\s*iii\b|chapter\s*iii\b.*skills/i;
  const endRe = /chapter\s*(?:iv|4)[:\s]|chapter\s*4\b|chapter\s*iv\b|chapter\s*iv\b.*talent/i;
  let startPage=-1, endPage=-1;
  for(let i=0;i<pages.length;i++){
    if(startPage===-1 && startRe.test(pages[i])) startPage = i;
    if(startPage!==-1 && endRe.test(pages[i])){ endPage = i; break; }
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
  const candidates = filterShort(blocks);
  console.log('After short-filter', candidates.length, 'candidates');

  const whitelist = loadCanonicalTitles();
  console.log('Loaded', whitelist.length, 'canonical titles from rules JSON');

  const matched = [];
  for(const b of candidates){
    const n = normalizeForMatch(b.title);
    const m = matchToWhitelist(n, whitelist);
    if(m){
      matched.push(Object.assign({}, b, { matched: m }));
    }
  }

  console.log('Matched', matched.length, 'blocks against whitelist');
  if(matched.length===0){ console.error('No matches found, aborting'); db.close(); process.exit(1); }

  const deleteInfo = db.prepare("DELETE FROM rules WHERE category = 'skills'").run();
  console.log('Deleted skill rows:', deleteInfo.changes);

  const insertStmt = db.prepare(`INSERT INTO rules (rule_id,title,content,page,source,source_abbr,category,created_at) VALUES (?,?,?,?,?,?,?,datetime('now'))`);
  const slug = s => String(s||'').replace(/[^a-z0-9]+/ig,'_').replace(/^_+|_+$/g,'').toLowerCase();

  const insertTx = db.transaction((rows)=>{
    let i=1;
    for(const r of rows){
      const id = `pdf_skill_whitelist_${i}_${slug(r.title.slice(0,30))}`;
      insertStmt.run(id, r.title, r.content, r.page||null, r.source||'Core Rulebook', 'CR', 'skills');
      i++;
    }
  });

  insertTx(matched);
  console.log('Inserted', matched.length, 'skill rows');

  const report = { inserted: matched.length, sample: matched.slice(0,100) };
  const reportFile = path.join(backupsDir, `rules-pdf-import-whitelist-report-${nowTs()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log('Wrote report to', reportFile);

  db.close();
  console.log('Done');
}

run().catch(err=>{ console.error('Import failed:', err && err.stack ? err.stack : err); process.exit(1); });
