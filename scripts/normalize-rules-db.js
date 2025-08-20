#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { db, logToFile } = require('../database/sqlite-db');

function nowTs() { return new Date().toISOString().replace(/[:.]/g,'-'); }

function titleCase(str) {
  return str.toLowerCase().split(/\s+/).map(w => {
    if (!w) return '';
    return w[0].toUpperCase() + w.slice(1);
  }).join(' ');
}

function cleanTitle(title) {
  if (!title) return title;
  const letters = title.replace(/[^A-Za-z]/g,'');
  const uppers = (title.match(/[A-Z]/g) || []).length;
  // if mostly uppercase, convert to title case
  if (letters && (uppers / letters.length) > 0.5) {
    return titleCase(title.replace(/\s+/g,' ').trim());
  }
  // otherwise trim
  return title.trim();
}

function cleanContent(text) {
  if (!text) return text;
  let s = String(text);
  s = s.replace(/\r\n/g, '\n');
  s = s.replace(/[ \t]+/g, ' ');
  // remove hyphenation at line breaks
  s = s.replace(/-\n\s*/g, '');
  // collapse more than 2 newlines into paragraph breaks
  s = s.replace(/\n{3,}/g, '\n\n');
  // join lines that look like soft-wrapped lines: a line break between
  // a non-punctuation end and a lowercase/digit start
  s = s.replace(/([^\.\!\?\:\;\"\'\)\]\}])\n(\s*[a-z0-9])/g, '$1 $2');
  // trim spaces at start/end of lines
  s = s.split('\n').map(l => l.trim()).join('\n');
  // collapse repeated spaces
  s = s.replace(/ {2,}/g, ' ');
  // trim overall
  s = s.trim();
  return s;
}

function backupRules(rows) {
  const backupDir = path.join(__dirname, '..', 'database', 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const file = path.join(backupDir, `rules-backup-${nowTs()}.json`);
  fs.writeFileSync(file, JSON.stringify({ backedAt: new Date().toISOString(), count: rows.length, rows }, null, 2), 'utf8');
  return file;
}

function main() {
  console.log('Backing up rules table and normalizing content...');
  const rows = db.prepare('SELECT id, title, content FROM rules').all();
  if (!rows || rows.length === 0) {
    console.log('No rules found in DB. Exiting.');
    return;
  }
  const backupFile = backupRules(rows);
  console.log('Backup written to', backupFile);

  const updateStmt = db.prepare('UPDATE rules SET title = ?, content = ? WHERE id = ?');
  let changed = 0;
  db.transaction(() => {
    for (const r of rows) {
      const cleanedTitle = cleanTitle(r.title || '');
      const cleanedContent = cleanContent(r.content || '');
      if ((cleanedTitle !== (r.title||'').trim()) || (cleanedContent !== (r.content||'').trim())) {
        updateStmt.run(cleanedTitle, cleanedContent, r.id);
        changed++;
      }
    }
  })();

  console.log(`Normalization complete. Rows updated: ${changed}`);
  logToFile('normalize-rules-db: completed', { updated: changed });
}

main();
