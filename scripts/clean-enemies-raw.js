#!/usr/bin/env node
// Clean and dedupe enemies-raw.json into a compact structured file

const fs = require('fs');
const path = require('path');

const IN_FILE = path.join(__dirname, '..', 'database', 'enemies-raw.json');
const OUT_FILE = path.join(__dirname, '..', 'database', 'enemies-clean.json');
const OUT_SAMPLE = path.join(__dirname, '..', 'database', 'enemies-clean-sample.json');

function normalizeName(s) {
  if (!s) return '';
  let t = s.replace(/\(.*?\)/g, ''); // remove parentheses
  t = t.replace(/[^\w\s\-\:']/g, ' '); // keep words, spaces, dashes, colons, apostrophes
  t = t.replace(/\bthe\b\s*/i, '');
  t = t.replace(/[\-:]+/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.toLowerCase();
  return t;
}

function chooseRepresentative(namesMap) {
  // namesMap: Map originalName -> count
  let best = null;
  let bestCount = 0;
  for (const [name, count] of namesMap.entries()) {
    if (count > bestCount) { best = name; bestCount = count; }
  }
  if (best) return best;
  return Array.from(namesMap.keys())[0] || '';
}

function mergeStats(dest, src) {
  if (!src || typeof src !== 'object') return;
  for (const k of ['wounds','toughness','ap','page']) {
    const v = src[k];
    if (typeof v === 'number') {
      if (typeof dest[k] !== 'number') dest[k] = v;
      else dest[k] = Math.max(dest[k], v);
    }
  }
}

function topUnique(arr, n=3) {
  const seen = new Set();
  const out = [];
  for (const s of arr) {
    if (!s) continue;
    const t = s.trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= n) break;
  }
  return out;
}

function main() {
  if (!fs.existsSync(IN_FILE)) { console.error('Input file not found:', IN_FILE); process.exit(1); }
  const raw = JSON.parse(fs.readFileSync(IN_FILE, 'utf8'));
  const groups = new Map();

  for (const entry of raw) {
    const orig = (entry.name || '').trim();
    const key = normalizeName(orig || (entry.snippet||'').split('\n')[0]);
    if (!key) continue;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        count: 0,
        names: new Map(),
        sources: new Set(),
        snippets: [],
        stats: {},
      });
    }
    const g = groups.get(key);
    g.count += 1;
    g.names.set(orig, (g.names.get(orig)||0) + 1);
    if (entry.source) g.sources.add(entry.source);
    if (entry.snippet) g.snippets.push(entry.snippet);
    if (entry.stats) mergeStats(g.stats, entry.stats);
  }

  const output = [];
  for (const g of groups.values()) {
    const rep = chooseRepresentative(g.names);
    output.push({
      id: g.key,
      name: rep,
      count: g.count,
      sources: Array.from(g.sources),
      snippets: topUnique(g.snippets, 3),
      stats: g.stats
    });
  }

  // sort by count desc
  output.sort((a,b) => b.count - a.count);
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2));
  fs.writeFileSync(OUT_SAMPLE, JSON.stringify(output.slice(0, 200), null, 2));
  console.log('Wrote', OUT_FILE, 'with', output.length, 'unique entries');
}

if (require.main === module) main();
