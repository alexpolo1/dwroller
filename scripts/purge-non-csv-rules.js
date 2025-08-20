const fs = require('fs');
const path = require('path');
const { db } = require('../database/sqlite-db');

const outDir = path.join(__dirname, '..', 'database', 'backups');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');

try {
  // Select rows to purge: any rule where source != 'csv-import' OR page contains 'p.1' (case-insensitive)
  const rowsToPurge = db.prepare("SELECT * FROM rules WHERE source != ? OR (page IS NOT NULL AND lower(page) LIKE '%p.1%')").all('csv-import');
  console.log('Found rows to purge:', rowsToPurge.length);
  const backupFile = path.join(outDir, `purge_non_csv_rules_backup_${ts}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({ purgedAt: new Date().toISOString(), count: rowsToPurge.length, rows: rowsToPurge }, null, 2), 'utf8');
  console.log('Backup written to', backupFile);

  if (rowsToPurge.length === 0) {
    console.log('Nothing to purge');
    db.close();
    process.exit(0);
  }

  // Delete by id in transaction
  const del = db.prepare('DELETE FROM rules WHERE id = ?');
  db.transaction(() => {
    for (const r of rowsToPurge) {
      del.run(r.id);
    }
  })();

  const remaining = db.prepare("SELECT source, COUNT(*) as c FROM rules GROUP BY source ORDER BY c DESC").all();
  console.log('Remaining rows by source:', remaining);

  const total = db.prepare('SELECT COUNT(*) as c FROM rules').get().c;
  console.log('Total rules now in DB:', total);

  const report = { purgedAt: new Date().toISOString(), purgedCount: rowsToPurge.length, remaining, total };
  fs.writeFileSync(path.join(outDir, `purge_non_csv_rules_report_${ts}.json`), JSON.stringify(report, null, 2), 'utf8');
  console.log('Purge report written');

} catch (e) {
  console.error('Error during purge:', e);
  process.exit(1);
} finally {
  db.close();
}

console.log('Done');
