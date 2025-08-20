#!/usr/bin/env node
const fs = require('fs');
const Database = require('better-sqlite3');
const path = require('path');

const argv = require('minimist')(process.argv.slice(2), { boolean: ['dry-run','use-openai','all'], alias: { d: 'dry-run' } });
const dryRun = argv['dry-run'] !== false; // default true
const useOpenAI = !!argv['use-openai'];
const checkAll = !!argv['all'];
const backupDir = 'database/backups';

if (useOpenAI) {
  try { require('./openai-client'); } catch (e) { console.error('openai-client not available or OPENAI_API_KEY missing'); process.exit(1); }
}

function loadPdfItems(){
  const files = [
    'database/backups/rules-backup-before-pdf-import-2025-08-17T18-24-49-259Z.json',
    'database/backups/rules-backup-before-pdf-import-2025-08-17T18-23-31-203Z.json'
  ];
  for (const f of files){
    if (fs.existsSync(f)){
      const data = JSON.parse(fs.readFileSync(f,'utf8'));
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.sanitized)) return data.sanitized;
    }
  }
  console.error('No extracted PDF backup found in expected paths');
  process.exit(1);
}

function normalize(s){ return (s||'').toString().toLowerCase().replace(/\s+/g,' ').trim(); }

(async function main(){
  const pdfItems = loadPdfItems();
  const pdfIndex = pdfItems.map(it => ({ id: it.id, title: normalize(it.title), content: normalize(it.content||'') }));

  const db = new Database('database/sqlite/deathwatch.db');
  const rules = checkAll ? db.prepare('SELECT id,rule_id,title FROM rules ORDER BY id').all() : db.prepare("SELECT id,rule_id,title FROM rules WHERE source = 'sanitized' ORDER BY id").all();

  const toRemove = [];
  const ambiguous = [];

  for (const r of rules){
    const title = normalize(r.title || r.rule_id || '');
    if (!title){ toRemove.push({ id: r.id, rule_id: r.rule_id, title: r.title, reason: 'empty title' }); continue; }
    // exact title match in pdf titles
    const foundTitle = pdfIndex.find(p => p.title === title);
    if (foundTitle){ continue; }
    // fuzzy: title appears in any content or title contains most tokens
    const titleTokens = title.split(/[^a-z0-9]+/).filter(Boolean);
    let bestScore = 0; let best = null;
    for (const p of pdfIndex){
      let score = 0;
      for (const t of titleTokens){ if (p.title.includes(t) || p.content.includes(t)) score++; }
      if (score > bestScore){ bestScore = score; best = p; }
    }
    // heuristic: if token match covers >= half tokens, accept
    if (titleTokens.length > 0 && bestScore >= Math.ceil(titleTokens.length/2)){
      continue;
    }
    // else ambiguous -> optionally consult OpenAI
    ambiguous.push({ rule: r, bestScore, best });
  }

  console.log('rulesChecked', rules.length, 'ambiguousCount', ambiguous.length);

  const finalRemove = [];

  if (useOpenAI){
    const { callChat } = require('./openai-client');
    for (const a of ambiguous){
      const snippets = [];
      if (a.best) snippets.push(`Best match title: "${a.best.title}"\nSnippet: ${a.best.content.slice(0,400)}`);
      const sys = [{ role: 'system', content: 'You are a helpful assistant with access to Deathwatch Core Rulebook snippets. Answer whether the candidate rule title is present in the provided snippets from the PDF. Respond with JSON: { present: true|false, confidence: 0-1, note: "..." } only.' }];
      const user = [{ role: 'user', content: `Candidate title: "${a.rule.title || a.rule.rule_id}"\n
Snippets:\n${snippets.join('\n---\n') || 'none'}` }];
      try{
        const resp = await callChat([...sys, ...user], { max_tokens: 200 });
        try{
          const j = JSON.parse(resp);
          if (j && j.present === true) continue; // keep
          finalRemove.push({ id: a.rule.id, rule_id: a.rule.rule_id, title: a.rule.title, reason: 'openai_not_present', oaijson: j });
        }catch(e){
          finalRemove.push({ id: a.rule.id, rule_id: a.rule.rule_id, title: a.rule.title, reason: 'openai_parse_failed', raw: resp });
        }
      }catch(err){
        console.error('OpenAI call failed', err && err.message);
        finalRemove.push({ id: a.rule.id, rule_id: a.rule.rule_id, title: a.rule.title, reason: 'openai_error', error: err && err.message });
      }
    }
  } else {
    // without OpenAI, mark ambiguous for removal
    for (const a of ambiguous){ finalRemove.push({ id: a.rule.id, rule_id: a.rule.rule_id, title: a.rule.title, reason: 'not_found_in_pdf', bestScore: a.bestScore }); }
  }

  console.log('toRemoveCount', finalRemove.length);

  if (finalRemove.length === 0){
    console.log('Nothing to remove.');
    db.close();
    process.exit(0);
  }

  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const outFile = path.join(backupDir, `pruned-rules-${ts}.json`);
  fs.writeFileSync(outFile, JSON.stringify(finalRemove, null, 2), 'utf8');
  console.log('Wrote backup of removed rows to', outFile);

  if (dryRun){
    console.log('Dry run enabled; no DB changes made. To actually delete run with --no-dry-run or --dry-run=false');
    db.close();
    process.exit(0);
  }

  const ids = finalRemove.map(r=>r.id);
  const placeholders = ids.map(()=>'?').join(',');
  const del = db.prepare(`DELETE FROM rules WHERE id IN (${placeholders})`);
  const res = del.run(...ids);
  console.log('Deleted', res.changes, 'rows from rules');
  db.close();
})();
