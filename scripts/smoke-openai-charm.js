#!/usr/bin/env node
const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');

const pdfPath = process.argv[2] || 'data/Deathwatch_Core_Rulebook_copy.pdf';
if (!fs.existsSync(pdfPath)) {
  console.error('PDF not found at', pdfPath);
  process.exit(1);
}

// read .env for OPENAI_API_KEY
const envRaw = fs.readFileSync(path.resolve(__dirname,'..','.env'),'utf8');
const m = envRaw.split(/\n|\r/).map(l=>l.trim()).find(l=>l.startsWith('OPENAI_API_KEY='));
if (!m) { console.error('OPENAI_API_KEY not found in .env'); process.exit(1); }
const key = m.replace(/^OPENAI_API_KEY=/,'').trim();
if (!key) { console.error('OPENAI_API_KEY is empty'); process.exit(1); }

console.log('Uploading PDF...');
let uploadResp;
try{
  uploadResp = execFileSync('curl', ['-s','-X','POST','https://api.openai.com/v1/files', '-H', `Authorization: Bearer ${key}`, '-F', `file=@${pdfPath}`, '-F', 'purpose=responses'], { encoding: 'utf8', maxBuffer: 20*1024*1024 });
}catch(err){
  console.error('Upload failed:', err.message);
  process.exit(1);
}

let uploadJson;
try{ uploadJson = JSON.parse(uploadResp); }catch(e){ console.error('Failed to parse upload response:', uploadResp.slice(0,1000)); process.exit(1); }
if (uploadJson.error){ console.error('Upload error from API:', uploadJson.error); process.exit(1); }
const fileId = uploadJson.id;
if (!fileId){ console.error('No file id returned in upload response'); process.exit(1); }
console.log('Uploaded file id:', fileId);

const prompt = `You are given an uploaded PDF (file id: ${fileId}). Does the Deathwatch Core Rulebook include a skill titled \"Charm\"? Answer with JSON only: {\"present\": true|false, \"confidence\": 0-1, \"note\": \"short reason\"}.`;
const payload = JSON.stringify({ model: 'gpt-4o-mini', input: prompt, files: [fileId], temperature: 0 });

console.log('Querying Responses API for "Charm"...');
let respRaw;
try{
  respRaw = execFileSync('curl', ['-s','-X','POST','https://api.openai.com/v1/responses', '-H', `Authorization: Bearer ${key}`, '-H', 'Content-Type: application/json', '-d', payload], { encoding: 'utf8', maxBuffer: 20*1024*1024 });
}catch(err){ console.error('Responses API call failed:', err.message); process.exit(1); }

// print a short preview of the response
console.log('Responses API raw response preview:');
console.log(respRaw.slice(0,4000));

// try to extract JSON in response text
try{
  const parsed = JSON.parse(respRaw);
  console.log('\nParsed Responses JSON keys:', Object.keys(parsed));
  // try to find text content
  if (parsed.output && parsed.output.length){
    console.log('\nModel output (first content item):');
    console.log(JSON.stringify(parsed.output[0], null, 2).slice(0,4000));
  }
}catch(e){
  console.log('\nCould not parse Responses raw as JSON; showing raw body (truncated)');
}

console.log('\nDone.');
