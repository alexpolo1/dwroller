#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BESTIARY = path.resolve(__dirname, '..', 'database', 'deathwatch-bestiary-extracted.json');

function usage() {
  console.log('Usage: node scripts/show-bestiary-entry.js --id <number> | --name "Name"');
  process.exit(1);
}

const argv = require('minimist')(process.argv.slice(2));
if ((!argv.id && !argv.name) || (argv.id && argv.name)) usage();

let j;
try {
  j = JSON.parse(fs.readFileSync(BESTIARY,'utf8'));
} catch (e) {
  console.error('Failed to load bestiary:', e.message);
  process.exit(2);
}

const results = j.results || [];
let idx = -1;
if (argv.id) {
  const id = Number(argv.id);
  idx = results.findIndex(r => r.stats && r.stats.id === id || r.id === id || r._id === id);
}
if (argv.name) {
  const q = argv.name.toLowerCase();
  idx = results.findIndex(r => (r.bestiaryName || '').toLowerCase() === q || (r.name||'').toLowerCase() === q);
}

if (idx === -1) {
  // try fuzzy by includes
  if (argv.name) {
    const q = argv.name.toLowerCase();
    idx = results.findIndex(r => (r.bestiaryName || '').toLowerCase().includes(q) || (r.name||'').toLowerCase().includes(q));
  }
}

if (idx === -1) {
  console.error('Entry not found in bestiary for', argv.id || argv.name);
  console.error('You can list available names via: jq -r ".results[] | .bestiaryName" database/deathwatch-bestiary-extracted.json');
  process.exit(3);
}

function printEntry(i, label) {
  const e = results[i];
  if (!e) return;
  console.log('\n=== ' + label + ' (index=' + i + ') ===');
  console.log('bestiaryName:', e.bestiaryName || e.name || '<no-name>');
  console.log('book:', e.book || e.source || '');
  console.log('page:', e.page || (e.stats && e.stats.page) || '');
  console.log('pdf:', e.pdf || '');
  console.log('snippet:', (e.stats && e.stats.snippet) ? 'present' : (e.snippet ? 'present' : '')); 
  console.log('raw->');
  console.log(JSON.stringify(e, null, 2));
}

// print previous, current, next
if (idx-1 >= 0) printEntry(idx-1, 'Previous');
printEntry(idx, 'Current');
if (idx+1 < results.length) printEntry(idx+1, 'Next');

// print a compact stats summary
const cur = results[idx];
console.log('\n--- Compact stats summary ---');
if (cur.stats) {
  console.log('profile:', cur.stats.profile || cur.stats.stats || null);
  console.log('movement:', cur.stats.movement || (cur.stats.secondary_stats && cur.stats.secondary_stats.movement) || null);
  console.log('wounds:', cur.stats.wounds || (cur.stats.secondary_stats && cur.stats.secondary_stats.wounds) || null);
  console.log('weapons:', cur.stats.weapons || null);
  console.log('armour:', cur.stats.armour || null);
  console.log('skills:', cur.stats.skills || null);
}
console.log('\nDone.');
