const fs = require('fs');
const path = require('path');
const dataPath = path.resolve(__dirname, '../database/alexei-pdfjs.json');
if (!fs.existsSync(dataPath)) { console.error('missing file:', dataPath); process.exit(2); }
const j = JSON.parse(fs.readFileSync(dataPath,'utf8'));
const findings = j.findings || [];
// find any snippet containing 'alexei' or 'drahj'
const hits = findings.filter(f => /alexei|drahj/i.test(f.text));
if (hits.length===0) { console.error('no hits'); process.exit(1); }
// Prefer hits where 'Profile' or 'Movement' occurs nearby
function score(f){
  let s=0; const t = f.text.toLowerCase();
  if (t.includes('movement:')) s+=4;
  if (t.includes('wounds:')) s+=4;
  if (t.includes('profile')) s+=2;
  if (t.includes('talents')) s+=1;
  if (t.includes('weapons')) s+=1;
  if (/alexei\s+drahj/.test(t)) s+=5;
  return s;
}
let best = hits[0];
for (const h of hits){ if (score(h) > score(best)) best = h; }
const txt = best.text;
// locate alexei token index
let idx = txt.search(/alexei\s+drahj/i);
if (idx<0) idx = txt.search(/alexei/i);
const windowText = txt.substr(Math.max(0, idx-300), 1200);
function extractProfile(s){
  // Handle optional leading parenthetical modifiers like "(10) (12) (8)" followed by the main 9-value profile row.
  const modifiersMatch = s.match(/^(?:[^\n]{0,80})?\(?\s*(\d{1,2})\s*\)?(?:\s*\(?\s*(\d{1,2})\s*\)\s*)?(?:\(?\s*(\d{1,2})\s*\)\s*)?/m);
  let modifiers = null;
  if (modifiersMatch && (modifiersMatch[1] || modifiersMatch[2] || modifiersMatch[3])) {
    modifiers = [modifiersMatch[1], modifiersMatch[2], modifiersMatch[3]].filter(Boolean).map(n=>parseInt(n,10));
  }
  // Find the first 9-number sequence that looks like the canonical profile (allow some separators)
  const seqAll = Array.from(s.matchAll(/(?:\b\d{1,2}\b(?:[^\d\n]{1,6}\d{1,2}\b){8})/gm));
  if (!seqAll || seqAll.length===0) return null;
  // Prefer a sequence that occurs after the modifiers (if modifiers present), otherwise take the last sequence
  let chosenSeq = null;
  if (modifiers) {
    for (const m of seqAll) {
      if (m.index > (modifiersMatch.index || 0)) { chosenSeq = m[0]; break; }
    }
  }
  if (!chosenSeq) chosenSeq = seqAll[seqAll.length-1][0];
  const nums = chosenSeq.replace(/[^0-9\s]/g,' ').trim().split(/\s+/).map(n=>parseInt(n,10));
  if (nums.length<9) return null;
  const keys = ['ws','bs','s','t','ag','int','per','wp','fel'];
  const obj = {};
  keys.forEach((k,i)=>obj[k]=nums[i]);
  // if modifiers were found, attach them separately
  if (modifiers) obj.modifiers = modifiers;
  return obj;
}
function extractMovement(s){ const m = s.match(/Movement:\s*([0-9\/]+(?:\/[0-9]+)*)/i); return m?m[1].trim():null; }
function extractWounds(s){ const m = s.match(/Wounds:\s*(\d{1,3})/i); return m?parseInt(m[1],10):null; }
function extractWeapons(s){ // capture a weapons line block following 'Weapons:' up to two lines
  const m = s.match(/Weapons:\s*([\s\S]{0,400})/i);
  if (!m) return null;
  // stop at 'Gear' or double newline
  let blk = m[1].split(/\n\s*\n/)[0];
  blk = blk.split(/Gear:|Armour:|Talents:|Traits:/i)[0];
  return blk.replace(/\n+/g,' ').trim();
}
const profile = extractProfile(windowText);
const movement = extractMovement(windowText);
const wounds = extractWounds(windowText);
const weapons = extractWeapons(windowText);
const out = {
  source: { pdf: best.pdf || null, page: best.page, range: best.range || null },
  profile, movement, wounds, weapons, snippet: windowText.replace(/\n+/g,' ').trim().slice(0,2000)
};
console.log(JSON.stringify(out, null, 2));
