const fs = require('fs');
const path = require('path');

function backup(filePath) {
  const ts = Date.now();
  const bakPath = filePath + `.backup.${ts}.json`;
  fs.copyFileSync(filePath, bakPath);
  return bakPath;
}

function normalizeFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data.results)) {
    console.error('No results array in', filePath);
    return { updated: 0, total: 0 };
  }
  const total = data.results.length;
  let updated = 0;

  const mapped = data.results.map((e) => {
    const out = Object.assign({}, e);
    if (e.stats && typeof e.stats === 'object') {
      const s = e.stats;
      const fields = ['profile','wounds','movement','toughness','skills','talents','traits','armour','weapons','gear','snippet'];
      let any = false;
      fields.forEach(f => {
        if (s[f] !== undefined && out[f] === undefined) {
          out[f] = s[f];
          any = true;
        }
      });
      if (any) updated++;
    }
    return out;
  });

  // update count if present
  if (typeof data.count === 'number') data.count = mapped.length;
  data.results = mapped;

  const bak = backup(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Normalized ${filePath}: ${updated}/${total} entries updated. Backup created at ${bak}`);
  return { updated, total, backup: bak };
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const targets = [
    path.join(repoRoot, 'database', 'deathwatch-bestiary-extracted.json'),
    path.join(repoRoot, 'public', 'deathwatch-bestiary-extracted.json'),
  ];
  targets.forEach(tp => {
    if (fs.existsSync(tp)) {
      try {
        normalizeFile(tp);
      } catch (err) {
        console.error('Error normalizing', tp, err);
      }
    } else {
      console.warn('File not found, skipping:', tp);
    }
  });
}

main();
