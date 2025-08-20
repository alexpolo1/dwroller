const fs = require('fs');
const path = require('path');
const { db } = require('../database/sqlite-db');

if (process.argv.length < 3) {
  console.error('Usage: node scripts/sync-skills-csv-to-db.js <csv-path>');
  process.exit(1);
}

const csvPath = process.argv[2];
if (!fs.existsSync(csvPath)) {
  console.error('CSV file not found:', csvPath);
  process.exit(1);
}

function parseCSV(content) {
  // Minimal RFC4180-ish parser supporting quoted fields and commas
  const lines = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const nxt = content[i + 1];
    if (ch === '"') {
      if (inQuotes && nxt === '"') { // escaped quote
        cur += '"';
        i++; // skip next
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === '\n' && !inQuotes) {
      lines.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.length) lines.push(cur);

  return lines.map(l => {
    const cols = [];
    let cell = '';
    let q = false;
    for (let i = 0; i < l.length; i++) {
      const ch = l[i];
      const nx = l[i + 1];
      if (ch === '"') {
        if (q && nx === '"') { cell += '"'; i++; continue; }
        q = !q; continue;
      }
      if (ch === ',' && !q) { cols.push(cell); cell = ''; continue; }
      cell += ch;
    }
    cols.push(cell);
    return cols.map(c => c.trim());
  });
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const outDir = path.join(__dirname, '..', 'database', 'backups');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');

try {
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(raw);
  if (rows.length < 2) {
    console.error('No CSV rows found');
    process.exit(1);
  }
  const headers = rows[0].map(h => h.toLowerCase());
  const data = rows.slice(1).map(r => {
    const obj = {};
    for (let i = 0; i < headers.length; i++) obj[headers[i]] = r[i] || '';
    return obj;
  }).filter(d => (d.name || '').trim());

  // Backup existing skills rows
  const backupFile = path.join(outDir, `rules_skills_backup_${ts}.json`);
  const existing = db.prepare('SELECT * FROM rules WHERE category = ?').all('skills');
  fs.writeFileSync(backupFile, JSON.stringify({ backedAt: new Date().toISOString(), count: existing.length, rows: existing }, null, 2), 'utf8');
  console.log('Backup written to', backupFile, ' (rows:', existing.length, ')');

  // Delete existing skill rows
  const del = db.prepare('DELETE FROM rules WHERE category = ?');
  const delRes = del.run('skills');
  console.log('Deleted rules where category=skills, changes:', delRes.changes);

  // Prepare statements: delete any conflicting rule_id and insert
  const deleteById = db.prepare('DELETE FROM rules WHERE rule_id = ?');
  const insert = db.prepare('INSERT INTO rules (rule_id, title, content, page, source, source_abbr, category) VALUES (?, ?, ?, ?, ?, ?, ?)');

  const inserted = [];
  db.transaction(() => {
    for (const r of data) {
      const name = (r.name || '').trim();
      const skill_text = (r.skill_text || '').trim();
      const skill_description = (r.skill_description || '').trim();
      const skill_use = (r.skill_use || '').trim();
      const content = [skill_text, skill_description, skill_use ? `Use: ${skill_use}` : ''].filter(Boolean).join('\n\n');
      const rule_id = slugify(name);
      // Remove any existing row with this rule_id (ensures 1:1 mapping to CSV)
      try {
        deleteById.run(rule_id);
      } catch (e) {
        // ignore
      }
      insert.run(rule_id, name, content || '', null, 'csv-import', 'CSV', 'skills');
      inserted.push(rule_id);
    }
  })();

  const newCount = db.prepare('SELECT COUNT(*) as c FROM rules WHERE category = ?').get('skills').c;
  console.log('Inserted rows from CSV:', inserted.length, 'DB now has skills rows:', newCount);
  if (newCount !== inserted.length) {
    console.warn('Count mismatch: inserted', inserted.length, 'but DB count is', newCount);
  }

  // Ensure only CSV-sourced skills exist (sanity check)
  const nonCsv = db.prepare("SELECT COUNT(*) as c FROM rules WHERE category = ? AND source != ?").get('skills', 'csv-import').c;
  console.log('Non-CSV skill rows remaining:', nonCsv);

  // Output sample first 10
  const sample = db.prepare('SELECT rule_id, title FROM rules WHERE category = ? ORDER BY id LIMIT 10').all('skills');
  console.log('Sample rows:');
  sample.forEach((s, i) => console.log(`${i + 1}. ${s.rule_id} | ${s.title}`));

  // final verification: write sync report
  const report = { syncedAt: new Date().toISOString(), csvRows: data.length, inserted: inserted.length, dbSkills: newCount };
  fs.writeFileSync(path.join(outDir, `rules_skills_sync_report_${ts}.json`), JSON.stringify(report, null, 2), 'utf8');
  console.log('Sync report written');

} catch (e) {
  console.error('Failure during sync:', e);
  process.exit(1);
} finally {
  db.close();
}

console.log('Done');
