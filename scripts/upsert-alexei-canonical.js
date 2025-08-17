const fs = require('fs');
const path = require('path');

const dataPath = path.resolve(__dirname, '../database/alexei-pdfjs.json');
if (!fs.existsSync(dataPath)) {
  console.error('missing pdfjs findings at', dataPath);
  process.exit(2);
}
const j = JSON.parse(fs.readFileSync(dataPath,'utf8'));
const findings = j.findings || [];

// score findings and pick best candidate (prefer exact 'Alexei Drahj' and presence of Movement/Wounds/Profile)
function scoreFinding(f){
  const s = f.text.toLowerCase();
  let score = 0;
  if (/alexei\s+drahj/.test(s)) score += 10;
  if (s.includes('alexei')) score += 4;
  if (s.includes('movement:')) score += 6;
  if (s.includes('wounds:')) score += 6;
  if (s.includes('profile')) score += 4;
  if (s.includes('weapons:')) score += 2;
  return score;
}

let best = null;
for (const f of findings){
  if (!best || scoreFinding(f) > scoreFinding(best)) best = f;
}
if (!best){ console.error('no alexei finding'); process.exit(1); }

const txt = best.text;
// narrow to the Alexei subsection
let pos = txt.search(/alexei\s+drahj/i);
if (pos < 0) pos = txt.search(/alexei/i);
const windowText = txt.substr(Math.max(0, pos-500), 2500);

function extractProfile(s){
  // Handle optional leading parenthetical modifiers like "(10) (12) (8)" followed by the main 9-value profile row.
  const modifiersMatch = s.match(/^(?:[^\n]{0,120})?\(?\s*(\d{1,2})\s*\)?(?:\s*\(?\s*(\d{1,2})\s*\)\s*)?(?:\(?\s*(\d{1,2})\s*\)\s*)?/m);
  let modifiers = null;
  if (modifiersMatch && (modifiersMatch[1] || modifiersMatch[2] || modifiersMatch[3])) {
    modifiers = [modifiersMatch[1], modifiersMatch[2], modifiersMatch[3]].filter(Boolean).map(n=>parseInt(n,10));
  }
  // Find all runs of 9 numbers and pick the last (or the one after modifiers)
  const seqAll = Array.from(s.matchAll(/(?:\b\d{1,2}\b(?:[^\d\n]{1,6}\d{1,2}\b){8})/gm));
  if (!seqAll || seqAll.length===0) return null;
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
  if (modifiers) obj.modifiers = modifiers;
  return obj;
}

function extractMovement(s){ const m = s.match(/Movement:\s*([0-9\/]+(?:\/[0-9]+)*)/i); return m?m[1].trim():null; }
function extractWounds(s){ const m = s.match(/Wounds:\s*(\d{1,3})/i); return m?parseInt(m[1],10):null; }

function extractBlock(s, startLabel, endLabels){
  const reStart = new RegExp(startLabel+'\s*','i');
  const si = s.search(reStart);
  if (si<0) return null;
  const rest = s.substr(si+startLabel.length);
  // find earliest occurrence of any endLabel
  let endPos = rest.length;
  for (const el of endLabels){
    const r = new RegExp('\\b'+el+'\\b','i');
    const m = rest.search(r);
    if (m>=0 && m<endPos) endPos = m;
  }
  const blk = rest.substr(0,endPos).trim();
  return blk.replace(/\s+/g,' ').replace(/^[,:\s]+/,'').trim();
}

const profile = extractProfile(windowText);
const movement = extractMovement(windowText);
const wounds = extractWounds(windowText);
const skills = extractBlock(windowText,'Skills:', ['Talents:','Traits:','Armour:','Weapons:','Gear:']) || null;
const talents = extractBlock(windowText,'Talents:', ['Traits:','Armour:','Weapons:','Gear:']) || null;
const traits = extractBlock(windowText,'Traits:', ['Armour:','Weapons:','Gear:','Transpired','†']) || extractBlock(windowText,'Traits:', ['Armour:','Weapons:','Gear:']) || null;
const armour = extractBlock(windowText,'Armour:', ['Weapons:','Gear:']) || null;
const weapons = extractBlock(windowText,'Weapons:', ['Gear:','†']) || null;
const gear = extractBlock(windowText,'Gear:', ['†']) || null;

const canonical = {
  name: 'Alexei Drahj',
  source: best.pdf || 'Deathwatch - The Emperor Protects.pdf',
  pdfPage: best.page || null,
  printedPage: (best.page && Number.isInteger(best.page)) ? best.page - 1 : null,
  stats: {
    profile,
    movement,
    wounds,
    skills,
    talents,
    traits,
    armour,
    weapons,
    gear,
    snippet: windowText.replace(/\n+/g,' ').trim().slice(0,2000)
  },
  insertedAt: new Date().toISOString()
};

// write alexei-canonical.json
const outPath = path.resolve(__dirname, '../database/alexei-canonical.json');
fs.writeFileSync(outPath, JSON.stringify(canonical, null, 2), 'utf8');
console.log('Wrote', outPath);

// upsert into deathwatch-bestiary-extracted.json
const bestiaryPath = path.resolve(__dirname, '../database/deathwatch-bestiary-extracted.json');
let bestiary = { results: [], count: 0 };
if (fs.existsSync(bestiaryPath)){
  try{ bestiary = JSON.parse(fs.readFileSync(bestiaryPath,'utf8')); }catch(e){ console.error('failed parse bestiary', e.message); }
}
// ensure structure
if (!Array.isArray(bestiary.results)) bestiary.results = [];

// find existing Alexei entry by name
const idx = bestiary.results.findIndex(r => r.name && /alexei\s+drahj/i.test(r.name));
const entry = { name: canonical.name, source: canonical.source, page: canonical.printedPage, pdfPage: canonical.pdfPage, stats: canonical.stats };
if (idx>=0){ bestiary.results[idx] = entry; } else { bestiary.results.push(entry); }
bestiary.count = bestiary.results.length;
fs.writeFileSync(bestiaryPath, JSON.stringify(bestiary, null, 2), 'utf8');
console.log('Upserted Alexei into', bestiaryPath);

console.log('Canonical record:');
console.log(JSON.stringify(canonical.stats, null, 2));

process.exit(0);
