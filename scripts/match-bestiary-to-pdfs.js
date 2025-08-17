#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
// lightweight HTML parsing (avoid loading cheerio to prevent extraneous deps)


const BESTIARY_URL = 'https://www.40krpgtools.com/bestiary/';
const DB_PATH = path.resolve(__dirname, '..', 'database', 'deathwatch-enemies-highconfidence.json');
const OUT_PATH = path.resolve(__dirname, '..', 'database', 'bestiary-matches.json');

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

async function fetchBestiary() {
  return new Promise((resolve, reject) => {
    const req = https.get(BESTIARY_URL, { timeout: 20000 }, (res) => {
      if (res.statusCode && res.statusCode >= 400) return reject(new Error('HTTP '+res.statusCode));
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', d => buf += d);
      res.on('end', () => resolve(buf));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
  });
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseBestiary(html) {
  const rows = [];
  // extract all table row contents
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html)) !== null) {
    const tr = m[1];
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cols = [];
    let mm;
    while ((mm = tdRe.exec(tr)) !== null) {
      cols.push(stripTags(mm[1]));
    }
    if (cols.length >= 1) {
      const name = cols[0] || '';
      const page = cols[cols.length-1] || '';
      const book = cols[cols.length-2] || '';
      if (name) rows.push({name, book, page});
    }
  }
  // fallback: look for pipe table lines
  if (rows.length === 0) {
    const lines = html.split('\n');
    for (const line of lines) {
      if (/\|/.test(line)) {
        const parts = line.replace(/<[^>]+>/g,'').split('|').map(p=>p.trim()).filter(Boolean);
        if (parts.length >= 3) {
          const name = parts[0];
          const page = parts[parts.length-1];
          const book = parts[parts.length-2];
          rows.push({name, book, page});
        }
      }
    }
  }
  return rows;
}

function bestMatchFor(name, db) {
  const n = normalizeName(name);
  // exact normalized match
  for (const e of db) {
    if (normalizeName(e.name) === n) return {score:0, entry:e, method:'exact'};
  }
  // substring match
  for (const e of db) {
    if (normalizeName(e.name).includes(n) || n.includes(normalizeName(e.name))) return {score:1, entry:e, method:'substr'};
  }
  // levenshtein best candidate
  let best = null;
  for (const e of db) {
    const cand = normalizeName(e.name);
    const d = levenshtein(n, cand);
    if (!best || d < best.d) best = {d, entry:e};
  }
  if (best) {
    return {score: best.d, entry: best.entry, method:'lev'};
  }
  return null;
}

async function main(){
  console.log('Reading DB:', DB_PATH);
  if (!fs.existsSync(DB_PATH)) {
    console.error('DB file not found:', DB_PATH);
    process.exit(2);
  }
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  console.log('Fetching bestiary page...');
  const html = await fetchBestiary();
  const entries = parseBestiary(html);
  console.log('Parsed bestiary entries:', entries.length);
  const out = [];
  let matched = 0;
  for (const be of entries) {
    const m = bestMatchFor(be.name, db);
    const rec = {bestiaryName: be.name, book: be.book, page: be.page, matched: !!m, method: m?m.method:null};
    if (m && m.entry) {
      rec.matchName = m.entry.name;
      rec.matchSources = m.entry.sources || m.entry.sources || [];
      rec.matchPages = m.entry.pages || m.entry.pages || [];
      matched++;
    }
    out.push(rec);
  }
  const summary = {total: entries.length, matched, unmatched: entries.length-matched};
  fs.writeFileSync(OUT_PATH, JSON.stringify({summary, matches: out}, null, 2));
  console.log('Wrote matches to', OUT_PATH, 'summary:', summary);
}

if (require.main === module) {
  main().catch(err=>{ console.error(err); process.exit(1); });
}
