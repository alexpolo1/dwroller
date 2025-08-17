const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const targetPdf = 'Deathwatch - The Emperor Protects.pdf';
const name = /alexei\s+drahj/i;

function extractStatsFromText(text){
  const out={profile:null,movement:null,wounds:null,toughness:null,skills:null,talents:null,traits:null,armour:null,weapons:null,gear:null,snippet:null};
  if(!text) return out;
  const t = text.replace(/\r/g,'\n');
  const lines = t.split('\n').map(l=>l.trim()).filter(Boolean);
  const joined = lines.join('\n');

  // Profile
  let prof = null;
  const profHeader = joined.match(/ws\W*bs\W*s\W*t\W*ag\W*int\W*per\W*wp\W*fel/i);
  if(profHeader){
    const after = joined.slice(profHeader.index + profHeader[0].length, profHeader.index + profHeader[0].length + 300);
    const nums = (after.match(/\d{1,3}/g) || []).slice(0,9);
    if(nums.length>=9) prof = nums.map(n=>parseInt(n,10));
  } else {
    const pMatch = joined.match(/profile[\s\S]{0,200}?(\d{1,3}[\s\S]*?\d{1,3})/i);
    if(pMatch){ const nums = (pMatch[0].match(/\d{1,3}/g)||[]).slice(0,9); if(nums.length>=9) prof = nums.map(n=>parseInt(n,10)); }
  }
  if(prof) out.profile = { ws:prof[0], bs:prof[1], s:prof[2], t:prof[3], ag:prof[4], int:prof[5], per:prof[6], wp:prof[7], fel:prof[8] };

  // Movement
  const mv = joined.match(/movement[:\s]*([0-9]+\/[0-9]+\/[0-9]+\/[0-9]+)/i) || joined.match(/\b(\d+\/\d+\/\d+\/\d+)\b/);
  if(mv) out.movement = mv[1] ? mv[1].trim() : mv[0].trim();

  // Wounds
  const wMatch = joined.match(/wounds?[:\s]*([0-9]{1,3})/i);
  if(wMatch) out.wounds = parseInt(wMatch[1],10);

  // Toughness
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

(async function(){
  const pdfPath = path.join(DATA_DIR, targetPdf);
  if(!fs.existsSync(pdfPath)){ console.error('PDF not found:', pdfPath); process.exit(1); }
  const data = fs.readFileSync(pdfPath);
  const parsed = await pdf(data);
  const pages = (parsed.text||'').split('\f');
  const matches = [];
  for(let i=0;i<pages.length;i++){
    if(name.test(pages[i])){
      // search surrounding pages for best stat block
      const candidates = [];
      for(let off = -5; off<=5; off++){
        const idx = i + off;
        if(idx < 0 || idx >= pages.length) continue;
        const txt = pages[idx];
        const stats = extractStatsFromText(txt);
        // heuristic score
        let score = 0;
        if(stats.wounds) score += 5;
        if(stats.movement) score += 4;
        if(stats.profile) score += 6;
        if(stats.skills) score += 2;
        if(stats.talents) score += 2;
        if(stats.traits) score += 2;
        // small bonus for presence of 'Transpired' or name tokens
        if(/transpired/i.test(txt)) score += 1;
        candidates.push({idx, off, stats, score, snippet: stats.snippet});
      }
      candidates.sort((a,b)=>b.score - a.score);
      const best = candidates[0];
      if(best){
        // combine surrounding pages for more robust parsing (handle broken headers)
        const start = Math.max(0, best.idx-2);
        const end = Math.min(pages.length-1, best.idx+2);
        const combined = pages.slice(start, end+1).join('\n\f\n');
        const refined = extractStatsFromText(combined);
        // carry over chosen metadata
        refined.chosenPageIndex = best.idx;
        refined.chosenPageNumberApprox = best.idx+1;
        refined.chosenOffset = best.off;
        matches.push({pdf:targetPdf,pageIndex:best.idx,pageNumber:best.idx+1,snippet:refined.snippet,stats:refined});
      }
    }
  }
  const outPath = path.resolve(__dirname, '..', 'database', 'alexei-parse.json');
  fs.writeFileSync(outPath, JSON.stringify({generatedAt:new Date().toISOString(), matches},null,2));
  console.log('Wrote', outPath, 'matches:', matches.length);
  if(matches.length) console.log(JSON.stringify(matches[0],null,2));
})();
