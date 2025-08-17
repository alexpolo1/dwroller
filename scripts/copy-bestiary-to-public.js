const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const src = path.join(repoRoot, 'database', 'deathwatch-bestiary-extracted.json');
const dst = path.join(repoRoot, 'public', 'deathwatch-bestiary-extracted.json');

if (!fs.existsSync(src)) {
  console.error('Source not found:', src);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(src, 'utf8'));
if (!Array.isArray(data.results)) {
  console.error('Source appears invalid, missing results array');
  process.exit(1);
}

// backup dst if exists
if (fs.existsSync(dst)) {
  const bak = dst + `.backup.${Date.now()}.json`;
  fs.copyFileSync(dst, bak);
  console.log('Backed up existing public file to', bak);
}

fs.writeFileSync(dst, JSON.stringify(data, null, 2), 'utf8');
console.log('Copied normalized bestiary to', dst);
