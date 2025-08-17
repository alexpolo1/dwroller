// scripts/validate-bestiary.js
// Validate structure of database/deathwatch-bestiary-extracted.json

const fs = require('fs');
const path = require('path');

const BESTIARY_PATH = path.join(__dirname, '../database/deathwatch-bestiary-extracted.json');

function isInt(n){return Number.isInteger(n);} 
function isNonEmptyString(s){return typeof s === 'string' && s.trim().length>0}

function validateProfile(profile){
  const keys = ['ws','bs','s','t','ag','int','per','wp','fel'];
  if(!profile || typeof profile !== 'object') return {ok:false,errs:['missing profile object']};
  const errs = [];
  for(const k of keys){
    const v = profile[k];
    if(v===null || v===undefined) errs.push(`profile.${k} is missing`);
    else if(!isInt(v)) errs.push(`profile.${k} is not integer (${v})`);
  }
  return {ok:errs.length===0, errs};
}

function validateMovement(mv){
  if(mv===null || mv===undefined) return {ok:false,errs:['movement missing']};
  if(typeof mv === 'string' && mv.match(/^\d+\/\d+\/\d+\/\d+$/)) return {ok:true,errs:[]};
  return {ok:false,errs:[`movement has unexpected format: ${mv}`]};
}

function validateWounds(w){
  if(w===null || w===undefined) return {ok:false,errs:['wounds missing']};
  if(typeof w === 'number' && Number.isFinite(w)) return {ok:true,errs:[]};
  if(typeof w === 'string' && /^\d+$/.test(w)) return {ok:true,errs:[]};
  return {ok:false,errs:[`wounds invalid: ${w}`]};
}

function validateEntry(e){
  const errs = [];
  if(!isNonEmptyString(e.bestiaryName) && !isNonEmptyString(e.name)) errs.push('missing bestiaryName/name');
  if(!isNonEmptyString(e.source) && !isNonEmptyString(e.book)) errs.push('missing source/book');

  const stats = e.stats || {};
  const profile = stats.profile || {};
  const p = validateProfile(profile);
  if(!p.ok) errs.push(...p.errs);

  const mv = validateMovement(stats.movement);
  if(!mv.ok) errs.push(...mv.errs);

  const w = validateWounds(stats.wounds);
  if(!w.ok) errs.push(...w.errs);

  // weapons or gear recommended
  if(!stats.weapons && !stats.gear) errs.push('neither weapons nor gear present');

  return errs;
}

function run(){
  if(!fs.existsSync(BESTIARY_PATH)){
    console.error('Bestiary file not found at', BESTIARY_PATH);
    process.exit(2);
  }
  let obj;
  try{ obj = JSON.parse(fs.readFileSync(BESTIARY_PATH,'utf8')); } catch(e){ console.error('Failed to parse bestiary JSON:', e.message); process.exit(2); }
  const arr = Array.isArray(obj) ? obj : (Array.isArray(obj.results) ? obj.results : []);
  if(!Array.isArray(arr)){
    console.error('Bestiary format unrecognized');
    process.exit(2);
  }

  let failures=0;
  const report = [];
  arr.forEach((entry, idx)=>{
    const errs = validateEntry(entry);
    if(errs.length){
      failures++;
      report.push({index: idx, name: entry.bestiaryName || entry.name || '(unknown)', errors: errs});
    }
  });

  console.log(`Entries checked: ${arr.length}. Failures: ${failures}`);
  if(report.length){
    console.log('Failures detail:');
    for(const r of report){
      console.log(`- [${r.index}] ${r.name}:`);
      for(const e of r.errors) console.log('   -', e);
    }
  }

  process.exit(failures>0?1:0);
}

run();
