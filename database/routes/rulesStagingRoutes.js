const express = require('express');
const router = express.Router();
const { db, logToFile, stagingHelpers } = require('../sqlite-db');

// List staged sanitized rules
router.get('/', (req, res) => {
  try {
    const rows = stagingHelpers.list();
    res.json(rows);
  } catch (e) {
    logToFile('staging:list:error', e && e.message);
    res.status(500).json({ error: e.message });
  }
});

// Approve staged rules: insert into rules table (appends) and clear staging
router.post('/approve', (req, res) => {
  try {
    const rows = stagingHelpers.list();
    const insert = db.prepare(`INSERT INTO rules (rule_id,title,content,page,source,source_abbr,category,created_at) VALUES (?,?,?,?,?,?,?,datetime('now'))`);
    const insertMany = db.transaction((items) => {
      items.forEach((it) => {
        insert.run(null, it.title || '', it.content || '', it.page || '', 'sanitized', 'SAN', it.category || null);
      });
    });
    insertMany(rows);
    stagingHelpers.clear();
    res.json({ success: true, inserted: rows.length });
  } catch (e) {
    logToFile('staging:approve:error', e && e.stack ? e.stack : e);
    res.status(500).json({ error: e.message });
  }
});

// Clear staging without approving
router.delete('/', (req, res) => {
  try {
    const del = stagingHelpers.clear();
    res.json({ success: true });
  } catch (e) {
    logToFile('staging:clear:error', e && e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
