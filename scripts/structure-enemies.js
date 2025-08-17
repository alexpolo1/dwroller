#!/usr/bin/env node
// Convert enemies-clean.json into structured enemy records with best-effort parsing

const fs = require('fs');
const path = require('path');

const IN_FILE = path.join(__dirname, '..', 'database', 'enemies-clean.json');
const OUT_FILE = path.join(__dirname, '..', 'database', 'deathwatch-enemies.json');
const OUT_SAMPLE = path.join(__dirname, '..', 'database', 'deathwatch-enemies-sample.json');

function parseArmourByLoc(snippet) {
  const lower = snippet.toLowerCase();
  const armour = {};
  // Try common labels
  const patterns = {
    head: /head(?:[:\s]+)([0-9]{1,3})/i,
    body: /body(?:[:\s]+)([0-9]{1,3})/i,
    ra: /r(?:ight)?\s*arm(?:[:\s]+)([0-9]{1,3})/i,
    la: /l(?:eft)?\s*arm(?:[:\s]+)([0-9]{1,3})/i,
    rl: /r(?:ight)?\s*leg(?:[:\s]+)([0-9]{1,3})/i,
    ll: /l(?:eft)?\s*leg(?:[:\s]+)([0-9]{1,3})/i,
    ra2: /ra[:\s]*([0-9]{1,3})/i,
    la2: /la[:\s]*([0-9]{1,3})/i,
    rl2: /rl[:\s]*([0-9]{1,3})/i,
    ll2: /ll[:\s]*([0-9]{1,3})/i,
    ap: /ap[:\s]*([0-9]{1,3})/i
  };
  for (const k of ['head','body','ra','la','rl','ll']) {
    const p = patterns[k] || patterns[k+'2'];
    if (p) {
      const m = snippet.match(p);
      if (m) armour[k] = Number(m[1]);
    }
  }
  // legacy format like "armour: body 10; head 0; ra 8; la 8; rl 8; ll 8"
  const armorLine = snippet.match(/armou?r[^\n]{0,120}/i);
  if (armorLine) {
    const line = armorLine[0];
    // find numbers after known keys
    const kvs = line.match(/(body|head|ra|la|rl|ll)[:\s]*([0-9]{1,3})/gi);
    if (kvs) {
      for (const kv of kvs) {
        const m = kv.match(/(body|head|ra|la|rl|ll)[:\s]*([0-9]{1,3})/i);
        if (m) armour[m[1].toLowerCase()] = Number(m[2]);
      }
    }
    // fallback: single number in armour line may be body AP
    const single = line.match(/(\d{1,3})/);
    if (single && !armour.body) armour.body = Number(single[1]);
  }
  // If we found any keys, return them, otherwise null
  return Object.keys(armour).length ? armour : null;
}

function parsePage(snippets, stats) {
  if (stats && stats.page) return stats.page;
  for (const s of snippets) {
    const m = s.match(/page\s*no\.\s*([0-9]{1,4})/i) || s.match(/p(?:age)?\.?\s*([0-9]{1,4})/i);
    if (m) return Number(m[1]);
  }
  return null;
}

function isPromising(entry) {
  const s = entry.stats || {};
  if (s.wounds || s.toughness || s.ap || s.page) return true;
  const snippetText = (entry.snippets||[]).join('\n');
  if (/\barmou?r\b|\bwounds?\b|\bTB\b|\btoughness\b|\bAP\b/i.test(snippetText)) return true;
  // frequency-based: if seen many times
  if (entry.count && entry.count >= 2) return true;
  return false;
}

function chooseSource(sources) {
  if (!sources || sources.length === 0) return null;
  // Prefer Deathwatch core and supplements in order
  const preferred = ['Deathwatch - Core Rulebook','Deathwatch - Core Rulebook.pdf','Deathwatch - Rising Tempest','Deathwatch - Rites of Battle','Deathwatch - The Emperor Protects','Deathwatch - The Emperors Chosen'];
  for (const p of preferred) {
    for (const s of sources) if (s.toLowerCase().includes(p.toLowerCase())) return s;
  }
  return sources[0];
}

function main() {
  if (!fs.existsSync(IN_FILE)) { console.error('Missing input', IN_FILE); process.exit(1); }
  const raw = JSON.parse(fs.readFileSync(IN_FILE, 'utf8'));
  const structured = [];
  for (const e of raw) {
    if (!isPromising(e)) continue;
    const name = e.name || '';
    const stats = e.stats || {};
    const snippets = e.snippets || [];
    const armourByLoc = parseArmourByLoc(snippets.join('\n')) || null;
    const page = parsePage(snippets, stats);
    const rec = {
      name: name,
      wounds: stats.wounds || null,
      toughness: stats.toughness || null,
      armour: stats.ap || (armourByLoc && armourByLoc.body) || null,
      armourByLoc: armourByLoc,
      source: chooseSource(e.sources || []),
      page: page,
      snippets: snippets.slice(0,3),
      count: e.count || 0
    };
    structured.push(rec);
  }

  // sort by count desc
  structured.sort((a,b) => (b.count||0) - (a.count||0));
  fs.writeFileSync(OUT_FILE, JSON.stringify(structured, null, 2));
  fs.writeFileSync(OUT_SAMPLE, JSON.stringify(structured.slice(0,200), null, 2));
  console.log('Wrote', OUT_FILE, 'with', structured.length, 'structured promising entries');
}

if (require.main === module) main();
