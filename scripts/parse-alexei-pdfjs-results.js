const fs = require('fs');
const path = require('path');
const dataPath = path.resolve(__dirname, '../database/alexei-pdfjs.json');
if (!fs.existsSync(dataPath)) {
  console.error('missing file:', dataPath);
  process.exit(2);
}
const j = JSON.parse(fs.readFileSync(dataPath,'utf8'));
const findings = j.findings || [];
let hit = null;
for (const f of findings) {
  if (/(alexei|drahj)/i.test(f.text)) { hit = f; break; }
}
if (!hit) {
  console.error('No finding with alexei/drahj found');
  process.exit(1);
}
const txt = hit.text;
// narrow to area around the name
const idx = txt.toLowerCase().indexOf('alexei');
const windowText = txt.substr(Math.max(0, idx-200), 800);
function findMovement(s){
  const m = s.match(/Movement:\s*([0-9\/]+(?:\/[0-9]+)*)/i);
  return m ? m[1].trim() : null;
}
function findWounds(s){
  const m = s.match(/Wounds:\s*(\d{1,3})/i);
  return m ? parseInt(m[1],10) : null;
}
function findProfile(s){
  // look for 9 small integers in a row (allow parentheses)
  const m = s.match(/(\(?\d{1,2}\)?(?:\s+\(?\d{1,2}\)?){8})/);
  if (!m) return null;
  const nums = m[1].replace(/[()]/g,'').trim().split(/\s+/).map(n=>parseInt(n,10));
  if (nums.length!==9) return null;
  const keys = ['ws','bs','s','t','ag','int','per','wp','fel'];
  const obj = {};
  keys.forEach((k,i)=>obj[k]=nums[i]);
  return obj;
}
const movement = findMovement(windowText);
const wounds = findWounds(windowText);
const profile = findProfile(windowText);
console.log(JSON.stringify({ page: hit.page, range: hit.page? [Math.max(1, hit.page-2), hit.page+2] : null, movement, wounds, profile, snippet: windowText.replace(/\n+/g,' ').slice(0,800) }, null, 2));
