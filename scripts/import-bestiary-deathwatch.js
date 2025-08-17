#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const BESTIARY_URL = 'https://www.40krpgtools.com/bestiary/';
const DB_PATH = path.resolve(__dirname, '..', 'database', 'deathwatch-enemies-highconfidence.json');
const OUT_PATH = path.resolve(__dirname, '..', 'database', 'deathwatch-enemies-bestiary-derived.json');
const DATA_DIR = path.resolve(__dirname, '..', 'data');

function normalizeName(s) {
  return (s||'').toString().toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g,'')
    .replace(/[^a-z0-9 ]+/g,' ')
    .replace(/\s+/g,' ').trim();
}
function levenshtein(a, b) {
  a = a || '';
  b = b || '';
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({length: m+1}, () => Array(n+1).fill(0));
  for (let i=0;i<=m;i++) dp[i][0]=i;
  for (let j=0;j<=n;j++) dp[0][j]=j;
  for (let i=1;i<=m;i++){
    for (let j=1;j<=n;j++){
      const cost = a[i-1]===b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}

function fetch(url, timeout=20000){
  return new Promise((resolve,reject)=>{
    const req = https.get(url, { timeout }, res => {
      if (res.statusCode && res.statusCode>=400) return reject(new Error('HTTP '+res.statusCode));
      let s=''; res.setEncoding('utf8'); res.on('data',d=>s+=d); res.on('end',()=>resolve(s));
    });
    req.on('error', reject);
    req.on('timeout', ()=>req.destroy(new Error('timeout')));
  });
}

function stripTags(s){ return s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); }
function parseBestiary(html){
  const rows=[];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi; let m; while((m=trRe.exec(html))){
    const tr=m[1]; const tdRe=/<td[^>]*>([\s\S]*?)<\/td>/gi; let mm; const cols=[]; while((mm=tdRe.exec(tr))){ cols.push(stripTags(mm[1])); }
    if(cols.length>=1){ const name=cols[0]||''; const page=cols[cols.length-1]||''; const book=cols[cols.length-2]||''; if(name) rows.push({name,book,page}); }
  }
  if(rows.length===0){ // fallback
    const lines = html.split('\n');
    for(const line of lines){ if(/\|/.test(line)){ const parts=line.replace(/<[^>]+>/g,'').split('|').map(p=>p.trim()).filter(Boolean); if(parts.length>=3){ rows.push({name:parts[0], book:parts[parts.length-2], page:parts[parts.length-1]}); } } }
  }
  return rows;
}

function bestMatchFor(name, db){
  const n = normalizeName(name);
  for(const e of db){ if(normalizeName(e.name)===n) return {score:0, entry:e, method:'exact'}; }
  for(const e of db){ const cand=normalizeName(e.name); if(cand.includes(n) || n.includes(cand)) return {score:1, entry:e, method:'substr'}; }
  let best=null; for(const e of db){ const cand=normalizeName(e.name); const d=levenshtein(n,cand); if(!best||d<best.d) best={d,entry:e}; }
  if(best) return {score:best.d, entry:best.entry, method:'lev'}; return null;
}

async function main(){
  if(!fs.existsSync(DB_PATH)){ console.error('highconfidence DB not found at',DB_PATH); process.exit(2); }
  const db = JSON.parse(fs.readFileSync(DB_PATH,'utf8'));
  console.log('Loaded highconfidence DB entries:', db.length);
  const localPdfFiles = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR).filter(f=>/\.pdf$/i.test(f)) : [];
  const localNames = localPdfFiles.map(f=>f.replace(/\.pdf$/i,''));
  console.log('Local PDFs found:', localPdfFiles.length);

  console.log('Fetching bestiary...');
  const html = await fetch(BESTIARY_URL);
  const rows = parseBestiary(html);
  console.log('Total bestiary rows parsed:', rows.length);

  // filter bestiary to those referencing Deathwatch books or matching local filenames
  const filtered = rows.filter(r=>{
    const book = (r.book||'').toLowerCase();
    if(book.includes('deathwatch')) return true;
    // if book matches any local pdf base name
    for(const ln of localNames){ if(book.includes(ln.toLowerCase()) || (r.name||'').toLowerCase().includes(ln.toLowerCase())) return true; }
    return false;
  });
  console.log('Filtered bestiary rows (deathwatch/local):', filtered.length);

  // If the user expected 372, and filtered length differs, we'll still proceed but print note
  if(filtered.length!==372) console.log('Note: filtered count != 372 (found',filtered.length,')');

  const matches=[]; const unmatched=[];
  for(const be of filtered){ const m = bestMatchFor(be.name, db); if(m && m.entry){ // prepare structured output
      const e = m.entry; // pick fields
      const localSources = (e.sources||[]).filter(s=> localPdfFiles.some(lp=> s.toLowerCase().includes(lp.toLowerCase()) || lp.toLowerCase().includes(s.toLowerCase())) );
      matches.push({bestiaryName: be.name, bestiaryBook: be.book, bestiaryPage: be.page, matchedName: e.name, score:m.score, method:m.method, wounds: e.wounds||null, toughness: e.toughness||null, armour: e.armour||null, armourByLoc: e.armourByLoc||null, sources: e.sources||[], pages: e.pages||[], localSources});
    } else {
      unmatched.push(be);
    }
  }

  const summary = {filtered: filtered.length, matched: matches.length, unmatched: unmatched.length};
  const out = {summary, matches, unmatched};
  fs.writeFileSync(OUT_PATH, JSON.stringify(out,null,2));
  console.log('Wrote', OUT_PATH, 'summary:', summary);
}

if(require.main===module) main().catch(err=>{ console.error(err); process.exit(1); });
