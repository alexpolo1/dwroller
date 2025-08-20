#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

const argv = require('minimist')(process.argv.slice(2));
const pdfPath = argv._[0] || 'data/Deathwatch_Core_Rulebook_copy.pdf';
const batchSize = Number(argv.batch || 50);
const threshold = Number(argv.threshold || 0.6);
const dryRun = argv['dry-run'] !== false;

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY not set in env. Aborting.');
  process.exit(1);
}

if (!fs.existsSync(pdfPath)){
  console.error('PDF not found at', pdfPath);
  process.exit(1);
}

console.log('Uploading PDF to OpenAI:', pdfPath);
let uploadResp;
try{
  const cmd = `curl -s -X POST https://api.openai.com/v1/files -H "Authorization: Bearer ${process.env.OPENAI_API_KEY}" -F "file=@${pdfPath}" -F "purpose=responses"`;
  uploadResp = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
}catch(err){
  console.error('Upload failed', err && err.message);
  process.exit(1);
}

let uploadJson;
try{ uploadJson = JSON.parse(uploadResp); }catch(e){ console.error('Upload response parse failed', uploadResp); process.exit(1); }
if(!uploadJson || !uploadJson.id){ console.error('No file id returned', uploadJson); process.exit(1); }
const fileId = uploadJson.id;
console.log('Uploaded file id:', fileId);

// Read rules from DB
const db = new Database('database/sqlite/deathwatch.db');
const rules = db.prepare("SELECT id,rule_id,title FROM rules WHERE source = 'sanitized' ORDER BY id").all();
console.log('Rules to check:', rules.length);

const batches = [];
for(let i=0;i<rules.length;i+=batchSize) batches.push(rules.slice(i,i+batchSize));

const results = [];
let batchIndex = 0;
for(const b of batches){
  batchIndex++;
  console.log(`Validating batch ${batchIndex}/${batches.length} (${b.length} titles)`);
  const titlesList = b.map(r => ({ id: r.id, rule_id: r.rule_id, title: r.title }));
  const inputPrompt = `You are given an uploaded PDF (file id: ${fileId}) which contains the Deathwatch Core Rulebook. For each candidate title below, answer whether that title is present in the PDF (as a heading or clearly matching entry). Respond with a JSON array of objects: {"id": <id>, "rule_id": "...", "title": "...", "present": true|false, "confidence": 0-1, "note": "short note" } only. Candidate titles:\n\n` + titlesList.map(t=>`${t.id} | ${t.rule_id} | ${t.title}`).join('\n');

  const payload = {
    model: 'gpt-4o-mini',
    input: inputPrompt,
    files: [fileId]
  };

  let respRaw;
  try{
    const cmd = `curl -s -X POST https://api.openai.com/v1/responses -H "Authorization: Bearer ${process.env.OPENAI_API_KEY}" -H "Content-Type: application/json" -d '${JSON.stringify(payload)}'`;
    respRaw = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  }catch(err){
    console.error('Responses API call failed for batch', batchIndex, err && err.message);
    // fallback: mark as ambiguous
    for(const t of titlesList) results.push({ id: t.id, rule_id: t.rule_id, title: t.title, present: false, confidence: 0, note: 'responses_api_error' });
    continue;
  }

  // Try to extract JSON from response - look for a top-level output[0].content or similar
  let parsed;
  try{
    parsed = JSON.parse(respRaw);
  }catch(e){
    console.error('Failed to parse responses JSON for batch', batchIndex, 'saving raw to report');
    fs.writeFileSync(path.join('database','backups',`openai-raw-batch-${batchIndex}.json`), respRaw, 'utf8');
    for(const t of titlesList) results.push({ id: t.id, rule_id: t.rule_id, title: t.title, present: false, confidence: 0, note: 'parse_failed', raw: respRaw.slice(0,2000) });
    continue;
  }

  // responses API response structure: parsed.output[0].content[0].text or parsed.output[0].content[0].markdown? We'll try to find any string with JSON.
  let contentText = null;
  if (parsed.output && Array.isArray(parsed.output) && parsed.output.length > 0){
    // find content entries with type 'message' or 'output_text'
    for(const o of parsed.output){
      if (o.content){
        try{
          // flatten to string
          const str = JSON.stringify(o.content);
          if (str.includes('present')) contentText = JSON.stringify(o.content);
        }catch(e){}
      }
    }
    // fallback: search for any text fields
    if(!contentText){
      try{
        contentText = JSON.stringify(parsed.output[0]);
      }catch(e){ contentText = null; }
    }
  }

  // Try to extract JSON array from respRaw directly
  let candidateJson = null;
  try{
    const j = JSON.parse(respRaw);
    // look for 'output' -> 'content'
    if (j.output && j.output[0] && j.output[0].content){
      // attempt to find a string inside content
      const c = j.output[0].content;
      // stringify
      candidateJson = JSON.stringify(c);
    }
  }catch(e){}

  // Try simple approach: look for first occurrence of '[' and ']' in respRaw and parse substring
  if(!candidateJson){
    const first = respRaw.indexOf('[');
    const last = respRaw.lastIndexOf(']');
    if (first !== -1 && last !== -1 && last > first){
      const sub = respRaw.slice(first, last+1);
      try{ candidateJson = sub; }catch(e){}
    }
  }

  if(candidateJson){
    try{
      const arr = JSON.parse(candidateJson);
      for(const a of arr){ results.push(a); }
      continue;
    }catch(e){
      // parse failed
    }
  }

  // If we reach here, we couldn't decode structured output; mark as ambiguous
  for(const t of titlesList) results.push({ id: t.id, rule_id: t.rule_id, title: t.title, present: false, confidence: 0, note: 'no_parsable_json' });
}

const ts = new Date().toISOString().replace(/[:.]/g,'-');
const outPath = path.join('database','backups',`openai-pdf-validate-${ts}.json`);
fs.writeFileSync(outPath, JSON.stringify({ fileId, threshold, results }, null, 2), 'utf8');
console.log('Wrote validation report to', outPath);

if(!dryRun){
  // delete rules with present=false and confidence<threshold
  const toDelete = results.filter(r=>r.present===false || (typeof r.confidence==='number' && r.confidence < threshold));
  if(toDelete.length===0){ console.log('No rows to delete'); db.close(); process.exit(0); }
  const ids = toDelete.map(r=>r.id).filter(Boolean);
  if(ids.length===0){ console.log('No valid ids to delete'); db.close(); process.exit(0); }
  const placeholders = ids.map(()=>'?').join(',');
  const del = db.prepare(`DELETE FROM rules WHERE id IN (${placeholders})`);
  const res = del.run(...ids);
  console.log('Deleted', res.changes, 'rows from rules');
}

db.close();
process.exit(0);
