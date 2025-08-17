#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');
const pdf = require('pdf-parse');

const BESTIARY_URL = 'https://www.40krpgtools.com/bestiary/';
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const OUT_PATH = path.resolve(__dirname, '..', 'database', 'deathwatch-bestiary-extracted.json');

function stripTags(s){return s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
function normalize(s){return (s||'').toString().toLowerCase().replace(/[\u2018\u2019\u201c\u201d]/g,'').replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();}
function levenshtein(a,b){a=a||'';b=b||'';const m=a.length,n=b.length; if(!m) return n; if(!n) return m; const dp=Array.from({length:m+1},()=>Array(n+1).fill(0)); for(let i=0;i<=m;i++)dp[i][0]=i; for(let j=0;j<=n;j++)dp[0][j]=j; for(let i=1;i<=m;i++){ for(let j=1;j<=n;j++){ const c=a[i-1]===b[j-1]?0:1; dp[i][j]=Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+c); } } return dp[m][n]; }

function fetch(url, timeout=20000){ return new Promise((resolve,reject)=>{ const req=https.get(url,{timeout},res=>{ if(res.statusCode&&res.statusCode>=400) return reject(new Error('HTTP '+res.statusCode)); let s=''; res.setEncoding('utf8'); res.on('data',d=>s+=d); res.on('end',()=>resolve(s)); }); req.on('error',reject); req.on('timeout',()=>req.destroy(new Error('timeout'))); }); }

function parseBestiary(html){ const rows=[]; const trRe=/<tr[^>]*>([\s\S]*?)<\/tr>/gi; let m; while((m=trRe.exec(html))){ const tr=m[1]; const tdRe=/<td[^>]*>([\s\S]*?)<\/td>/gi; let mm; const cols=[]; while((mm=tdRe.exec(tr))){ cols.push(stripTags(mm[1])); } if(cols.length>=1){ const name=cols[0]||''; const page=cols[cols.length-1]||''; const book=cols[cols.length-2]||''; if(name) rows.push({name,book,page}); } } if(rows.length===0){ const lines=html.split('\n'); for(const line of lines){ if(/\|/.test(line)){ const parts=line.replace(/<[^>]+>/g,'').split('|').map(p=>p.trim()).filter(Boolean); if(parts.length>=3) rows.push({name:parts[0], book:parts[parts.length-2], page:parts[parts.length-1]}); } } } return rows; }

function findLocalPdfForBook(bookName, localFiles){ const n=normalize(bookName); if(!n) return null; let best=null; for(const f of localFiles){ const base=f.replace(/\.pdf$/i,''); const cand=normalize(base); if(cand.includes(n) || n.includes(cand)) return f; const d=levenshtein(n,cand); if(!best||d<best.d) best={d,f}; } return best?best.f:null; }

function extractStatsFromText(text){
  const out={
    profile: null, // {ws,bs,s,t,ag,int,per,wp,fel}
    movement: null,
    wounds: null,
    toughness: null,
    skills: null,
    talents: null,
    traits: null,
    armour: null,
    weapons: null,
    gear: null,
    snippet: null
  };
  if(!text) return out;
  const t = text.replace(/\r/g,'\n');
  // Normalize some line breaks for easier regexes
  const lines = t.split('\n').map(l=>l.trim()).filter(Boolean);
  const joined = lines.join('\n');

  // 1) Profile: look for 'Profile' block containing labeled stats or inline header
  // Try labeled form: "WS BS S T Ag Int Per WP Fel" or similar
  const profileLabelsRe = /(profile[:\s\n]*)([\s\S]{0,200})/i;
  let prof = null;
  const profHeader = joined.match(/ws\W*bs\W*s\W*t\W*ag\W*int\W*per\W*wp\W*fel/i);
  if(profHeader){
    // find numbers following that header on same or next lines
    const after = joined.slice(profHeader.index + profHeader[0].length, profHeader.index + profHeader[0].length + 300);
    const nums = (after.match(/\d{1,3}/g) || []).slice(0,9);
    if(nums.length>=9){
      prof = nums.map(n=>parseInt(n,10));
    }
  } else {
    // fallback: look for 'Profile' block with 9 numbers nearby
    const pMatch = joined.match(/profile[\s\S]{0,200}?(\d{1,3}[\s\S]*?\d{1,3})/i);
    if(pMatch){ const nums = (pMatch[0].match(/\d{1,3}/g)||[]).slice(0,9); if(nums.length>=9) prof = nums.map(n=>parseInt(n,10)); }
  }
  if(prof){ out.profile = { ws:prof[0], bs:prof[1], s:prof[2], t:prof[3], ag:prof[4], int:prof[5], per:prof[6], wp:prof[7], fel:prof[8] }; }

  // Movement: look for typical pattern like 4/8/12/24
  const mv = joined.match(/movement[:\s]*([0-9]+\/[0-9]+\/[0-9]+\/[0-9]+)/i) || joined.match(/\b(\d+\/\d+\/\d+\/\d+)\b/);
  if(mv) out.movement = mv[1] ? mv[1].trim() : mv[0].trim();

  // Wounds: sometimes 'Wounds: 38' or 'Wounds 38' or 'Wounds: 38 (..)'
  const wMatch = joined.match(/wounds?[:\s]*([0-9]{1,3})/i);
  if(wMatch) out.wounds = parseInt(wMatch[1],10);

  // Toughness
  const toughMatch = joined.match(/toughness[:\s]*([0-9]{1,3})/i);
  if(toughMatch) out.toughness = parseInt(toughMatch[1],10);

  // Sections: capture via headers (Skills, Talents, Traits, Armour, Weapons, Gear)
  function captureSectionByHeaders(text, label){
    const re = new RegExp(label+':?\s*([\s\S]*?)(?=\n(?:Skills|Talents|Traits|Armou?r|Weapons|Gear|$):?)','i');
    const m = text.match(re);
    if(!m) return null;
    return m[1].replace(/\n+/g,' ').replace(/\s+/g,' ').trim();
  }

  out.skills = captureSectionByHeaders(joined, 'Skills');
  out.talents = captureSectionByHeaders(joined, 'Talents');
  out.traits = captureSectionByHeaders(joined, 'Traits');
  out.armour = captureSectionByHeaders(joined, 'Armour') || captureSectionByHeaders(joined, 'Armor');
  out.weapons = captureSectionByHeaders(joined, 'Weapons');
  out.gear = captureSectionByHeaders(joined, 'Gear');

  // final snippet: user doesn't want it in UI, but keep short cleaned snippet for logging
  out.snippet = lines.slice(0,6).join(' ').replace(/\s+/g,' ').trim().slice(0,800);
  return out;
}

async function extractPageText(pdfPath, pageNumber){ // pageNumber 1-based
  const data = fs.readFileSync(pdfPath);
  try{
    const parsed = await pdf(data);
    let pages = parsed.text.split('\f');
    if(pages.length && pages.length>=pageNumber){ return pages[pageNumber-1]; }
    // fallback: try approximate splitting by number of pages if info exists
    const np = parsed.numpages || pages.length;
    if(np>0 && pages.length!==np){ // attempt crude split by dividing text into np parts
      const allText = parsed.text.replace(/\s+/g,' ');
      const approxLen = Math.ceil(allText.length/np);
      const parts=[]; for(let i=0;i<np;i++){ parts.push(allText.slice(i*approxLen, (i+1)*approxLen)); }
      return parts[Math.max(0, Math.min(np-1, pageNumber-1))];
    }
    return parsed.text;
  }catch(err){ console.error('pdf parse error',pdfPath,err); return null; }
}

async function main(){
  const html = await fetch(BESTIARY_URL);
  const rows = parseBestiary(html);
  console.log('Total bestiary rows:', rows.length);

  // find local pdf files
  const localFiles = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR).filter(f=>/\.pdf$/i.test(f)) : [];
  console.log('Local PDF count:', localFiles.length);

  // Filter rows to those referencing Deathwatch or matching local PDFs
  const filtered = rows.filter(r=>{
    const book = (r.book||'').toLowerCase();
    if(book.includes('deathwatch')) return true;
    for(const lf of localFiles){ if(book && normalize(book).includes(normalize(lf.replace(/\.pdf$/i,'')))) return true; }
    return false;
  });
  console.log('Filtered rows (likely Deathwatch):', filtered.length);

  // If user expects 372, note difference
  if(filtered.length!==372) console.log('Warning: expected ~372, found',filtered.length);

  const results=[];
  for(const r of filtered){
    const bookName = r.book || '';
    const pageNum = parseInt((r.page||'').replace(/[^0-9]/g,''),10) || null;
    const pdfFile = findLocalPdfForBook(bookName, localFiles);
    let pageText = null; let stats = null;
    if(pdfFile && pageNum){
      const pdfPath = path.join(DATA_DIR, pdfFile);
      // Try a small range of offsets to account for differences between printed page numbers
      // and PDF internal page indices (front matter, cover pages, etc.). We'll pick the
      // page with the best heuristic match to the entry name / stat tokens.
      const offsets = [-2, -1, 0, 1, 2];
      let best = {score:-1, text:null, offset:0};
      for(const off of offsets){
        const tryPage = pageNum + off;
        if(tryPage < 1) continue;
        const txt = await extractPageText(pdfPath, tryPage);
        if(!txt) continue;
        let score = 0;
        const lname = (r.name||'').toLowerCase();
        if(lname && txt.toLowerCase().includes(lname)) score += 10; // strong signal
        // presence of stat keywords
        const tokens = ['ws','bs','wounds','toughness','armour','movement','skills','talents','traits'];
        for(const t of tokens) if(txt.toLowerCase().includes(t)) score += 1;
        // small bonus for numeric tables
        if(/\b\d{1,2}\b/.test(txt)) score += 0.5;
        if(score > best.score){ best = {score, text:txt, offset:off}; }
      }
      if(best.score >= 0){
        pageText = best.text;
        stats = extractStatsFromText(pageText || '');
        if(best.offset !== 0){
          console.log(`Adjusted page for ${r.name} book='${bookName}' requested=${pageNum} -> used=${pageNum+best.offset} (offset=${best.offset})`);
        }
        // record offset used
        if(stats) stats.chosenOffset = best.offset;
      }
    } else if(pdfFile){
      const pdfPath = path.join(DATA_DIR, pdfFile);
      const parsed = await pdf(fs.readFileSync(pdfPath));
      pageText = (parsed.text||'').slice(0,400);
      stats = extractStatsFromText(pageText);
    } else {
      // try searching local PDFs for the name
      let found=null;
      for(const lf of localFiles){ const pdfPath = path.join(DATA_DIR, lf); const parsed = await pdf(fs.readFileSync(pdfPath)); if((parsed.text||'').toLowerCase().includes((r.name||'').toLowerCase())){ found={pdf:lf,text:(parsed.text||'').slice(0,400)}; break; } }
      if(found){ pageText = found.text; stats = extractStatsFromText(pageText); }
    }
    
  results.push({bestiaryName: r.name, book: bookName, page: r.page, pdf: pdfFile, pageText: pageText? (pageText||'').slice(0,1000) : null, stats});
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify({generatedAt: new Date().toISOString(), count:results.length, results}, null, 2));
  console.log('Wrote', OUT_PATH);
}

if(require.main===module) main().catch(err=>{ console.error(err); process.exit(1); });
