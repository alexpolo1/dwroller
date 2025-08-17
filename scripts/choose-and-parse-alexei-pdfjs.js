const fs = require('fs');
const path = require('path');
const dataPath = path.resolve(__dirname, '../database/alexei-pdfjs.json');
if (!fs.existsSync(dataPath)) { console.error('missing file:', dataPath); process.exit(2); }
const j = JSON.parse(fs.readFileSync(dataPath,'utf8'));
const findings = j.findings || [];
function scoreFinding(f){
  const s = f.text.toLowerCase();
  let score = 0;
  if (s.includes('alexei')) score += 5;
  if (s.includes('drahj')) score += 5;
  if (/movement:\s*\d/.test(s)) score += 4;
  if (/wounds:\s*\d/.test(s)) score += 4;
  if (/profile\s*wS/i.test(s)) score += 3;
  if (/wS\s+BS\s+S\s+T\s+Ag\s+Int/i.test(s)) score += 2;
  if (/\bskills:\b/.test(s)) score += 1;
  if (/\bweapons:\b/.test(s)) score += 1;
  return score;
}
function findBest(){
  let best = null;
  for (const f of findings){
    const sc = scoreFinding(f);
    f._score = sc;
    if (!best || sc > best._score) best = f;
  }
  return best;
}
function extractFromText(text){
  const out = {};
  const m = text.match(/Movement:\s*([0-9\/]+(?:\/[0-9]+)*)/i);
  out.movement = m ? m[1].trim() : null;
  const w = text.match(/Wounds:\s*(\d{1,3})/i);
  out.wounds = w ? parseInt(w[1],10) : null;
  // profile: try label 'Profile' line, or a row of numbers after 'Profile' or after name
  const profLabel = text.match(/Profile[^\n]*\n?([\s\S]{0,200})/i);
  if (profLabel && profLabel[1]){
    const nums = profLabel[1].replace(/[()]/g,'').match(/(\d{1,2})(?:[^\d]+(\d{1,2})){8}/);
    if (nums){
      // fallback, simpler: find first 9 numbers in nearby text
    }
  }
  // simpler: find first sequence of 9 numbers in the snippet
  const seq = text.match(/(\d{1,2})(?:\s+\(?\d{1,2}\)?){8}/);
  if (seq){
    const nums = seq[0].replace(/[()]/g,'').trim().split(/\s+/).map(n=>parseInt(n,10));
    if (nums.length===9){
      const keys = ['ws','bs','s','t','ag','int','per','wp','fel'];
      out.profile = {};
      keys.forEach((k,i)=>out.profile[k]=nums[i]);
    }
  } else out.profile = null;
  return out;
}
const best = findBest();
if (!best){ console.error('no candidate'); process.exit(1); }
const extracted = extractFromText(best.text);
const result = { pdf: best.pdf || 'unknown', page: best.page, score: best._score, extracted, snippet: best.text.slice(0,1000).replace(/\n+/g,' ') };
console.log(JSON.stringify(result, null, 2));
