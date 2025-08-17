const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const targetPdf = 'Deathwatch - The Emperor Protects.pdf';
const pdfPath = path.join(DATA_DIR, targetPdf);
const outPath = path.resolve(__dirname, '..', 'database', 'alexei-pdfjs.json');
const nameRegex = /alexei\s+drahj/i;

function extractStatsFromText(text){
  const out={profile:null,movement:null,wounds:null,toughness:null,skills:null,talents:null,traits:null,armour:null,weapons:null,gear:null,snippet:null};
  if(!text) return out;
  const t = text.replace(/\r/g,'\n');
  const lines = t.split('\n').map(l=>l.trim()).filter(Boolean);
  const joined = lines.join('\n');

  let prof = null;
  const profHeader = joined.match(/ws\W*bs\W*s\W*t\W*ag\W*int\W*per\W*wp\W*fel/i);
  if(profHeader){
    const after = joined.slice(profHeader.index + profHeader[0].length, profHeader.index + profHeader[0].length + 400);
    const nums = (after.match(/\d{1,3}/g) || []).slice(0,9);
    if(nums.length>=9) prof = nums.map(n=>parseInt(n,10));
  } else {
    const pMatch = joined.match(/profile[\s\S]{0,300}?(\d{1,3}[\s\S]*?\d{1,3})/i);
    if(pMatch){ const nums = (pMatch[0].match(/\d{1,3}/g)||[]).slice(0,9); if(nums.length>=9) prof = nums.map(n=>parseInt(n,10)); }
  }
  if(prof) out.profile = { ws:prof[0], bs:prof[1], s:prof[2], t:prof[3], ag:prof[4], int:prof[5], per:prof[6], wp:prof[7], fel:prof[8] };

  const mv = joined.match(/movement[:\s]*([0-9]+\/[0-9]+\/[0-9]+\/[0-9]+)/i) || joined.match(/\b(\d+\/\d+\/\d+\/\d+)\b/);
  if(mv) out.movement = mv[1] ? mv[1].trim() : mv[0].trim();

  const wMatch = joined.match(/wounds?[:\s]*([0-9]{1,3})/i);
  if(wMatch) out.wounds = parseInt(wMatch[1],10);

  const toughMatch = joined.match(/toughness[:\s]*([0-9]{1,3})/i);
  if(toughMatch) out.toughness = parseInt(toughMatch[1],10);

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

  out.snippet = lines.slice(0,8).join(' ').replace(/\s+/g,' ').trim().slice(0,800);
  return out;
}

(async function main(){
  if(!fs.existsSync(pdfPath)){ console.error('PDF not found:', pdfPath); process.exit(1); }
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjsLib.getDocument({data});
  const doc = await loadingTask.promise;
  const np = doc.numPages;
  const findings = [];

  for(let i=1;i<=np;i++){
    try{
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(it=>it.str).join(' ');
      if(nameRegex.test(pageText)){
        findings.push({page:i,text:pageText});
      }
    }catch(err){ console.error('page err', i, err && err.message); }
  }

  if(findings.length===0){
    // fallback: search whole document text
    const all = [];
    for(let i=1;i<=np;i++){
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(it=>it.str).join(' ');
      all.push(pageText);
    }
    for(let i=0;i<all.length;i++) if(nameRegex.test(all[i])) findings.push({page:i+1,text:all[i]});
  }

  // For each finding, combine -2..+2 pages and extract stats
  const results = [];
  for(const f of findings){
    const idx = f.page;
    const start = Math.max(1, idx-2);
    const end = Math.min(np, idx+2);
    const parts = [];
    for(let p = start; p<=end; p++){
      const page = await doc.getPage(p);
      const c = await page.getTextContent();
      parts.push(c.items.map(it=>it.str).join(' '));
    }
    const combined = parts.join('\n\f\n');
    const stats = extractStatsFromText(combined);
    stats.chosenPage = idx;
    stats.chosenOffset = 0; // pdfjs gives true page numbers; offset left as 0
    results.push({pdf: targetPdf, foundPage: idx, range: [start,end], stats});
  }

  fs.writeFileSync(outPath, JSON.stringify({generatedAt: new Date().toISOString(), findings, results}, null, 2));
  console.log('Wrote', outPath, 'findings:', findings.length);
})();
