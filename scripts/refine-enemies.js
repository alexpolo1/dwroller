#!/usr/bin/env node
// Refine and produce a high-confidence enemy DB from structured entries

const fs = require('fs');
const path = require('path');

const IN_FILE = path.join(__dirname, '..', 'database', 'deathwatch-enemies.json');
const OUT_FILE = path.join(__dirname, '..', 'database', 'deathwatch-enemies-highconfidence.json');
const OUT_SAMPLE = path.join(__dirname, '..', 'database', 'deathwatch-enemies-highconfidence-sample.json');

function strongNormalize(s) {
  if (!s) return '';
  let t = s.toString();
  // remove parenthetical notes
  t = t.replace(/\(.*?\)/g, '');
  // remove descriptors after dash or colon
  t = t.split(/[-:—–]/)[0];
  t = t.replace(/[^\w\s'']/g, ' ');
  t = t.replace(/\bthe\b\s*/gi, '');
  // remove common suffix tokens
  t = t.replace(/\b(elite|swarm|pack|horde|unit|squad|group|team|vehicle|daemon|daemonhost|host|variant)\b/gi, '');
  t = t.replace(/\s+/g, ' ').trim().toLowerCase();
  // simple singularize (if very likely plural)
  if (t.length > 4 && t.endsWith('s') && !t.endsWith('ss')) {
    t = t.slice(0, -1);
  }
  return t;
}

function mergeNumeric(a,b) {
  // choose the max non-null
  if (typeof a !== 'number') return b;
  if (typeof b !== 'number') return a;
  return Math.max(a,b);
}

function chooseRepresentative(namesMap) {
  let bestName = null; let bestCount = -1;
  for (const [name,count] of Object.entries(namesMap)) {
    if (count > bestCount) { bestCount = count; bestName = name; }
  }
  return bestName || Object.keys(namesMap)[0] || '';
}

function main() {
  if (!fs.existsSync(IN_FILE)) { console.error('Missing input', IN_FILE); process.exit(1); }
  const raw = JSON.parse(fs.readFileSync(IN_FILE, 'utf8'));
  const groups = new Map();

  for (const e of raw) {
    const name = (e.name || '').trim();
    if (!name) continue;
    const key = strongNormalize(name);
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        names: {},
        count: 0,
        sources: {},
        snippets: new Set(),
        wounds: null,
        toughness: null,
        armour: null,
        armourByLoc: null,
        pages: new Set()
      });
    }
    const g = groups.get(key);
    g.count += (e.count||1);
    g.names[name] = (g.names[name]||0) + (e.count||1);
    if (e.source) g.sources[e.source] = (g.sources[e.source]||0)+1;
    for (const s of (e.snippets||[])) {
      if (s && g.snippets.size < 10) g.snippets.add(s);
    }
    if (e.wounds) g.wounds = mergeNumeric(g.wounds, e.wounds);
    if (e.toughness) g.toughness = mergeNumeric(g.toughness, e.toughness);
    if (e.armour) g.armour = mergeNumeric(g.armour, e.armour);
    if (e.armourByLoc && !g.armourByLoc) g.armourByLoc = e.armourByLoc;
    if (e.page) g.pages.add(e.page);
  }

  // Score and filter
  const preferredSources = ['core rulebook','rising tempest','rites of battle','the emperor protects','the emperors chosen','final sanction'];
  const out = [];
  for (const g of groups.values()) {
    let score = g.count;
    const hasStats = (typeof g.wounds === 'number') || (typeof g.toughness === 'number') || (typeof g.armour === 'number');
    if (hasStats) score += 50;
    if (g.pages.size) score += 10;
    // source boost
    for (const src of Object.keys(g.sources)) {
      const lowered = src.toLowerCase();
      for (const p of preferredSources) if (lowered.includes(p)) score += 5;
    }
    // name length penalty for very short keys
    if (g.key.length < 3) score = 0;

    // filter: require either stats or count>=2 or page hint
    if (!(hasStats || g.count >= 2 || g.pages.size)) continue;

    const repName = chooseRepresentative(g.names);
    out.push({
      id: g.key,
      name: repName,
      count: g.count,
      score,
      wounds: g.wounds || null,
      toughness: g.toughness || null,
      armour: g.armour || null,
      armourByLoc: g.armourByLoc || null,
      sources: Object.keys(g.sources),
      pages: Array.from(g.pages),
      snippets: Array.from(g.snippets).slice(0,5)
    });
  }

  out.sort((a,b) => b.score - a.score || b.count - a.count);
  // Keep top N high confidence — we'll keep all for now but the user expects ~300; further pruning below
  // Additional pruning: drop low-score tail: keep only score >= 10 or top 1000
  const final = out.filter((x,i)=> x.score >= 10 || i < 1000);

  fs.writeFileSync(OUT_FILE, JSON.stringify(final, null, 2));
  fs.writeFileSync(OUT_SAMPLE, JSON.stringify(final.slice(0,200), null, 2));
  console.log('Wrote', OUT_FILE, 'with', final.length, 'high-confidence entries (out of', out.length, 'promising groups)');
}

if (require.main === module) main();
