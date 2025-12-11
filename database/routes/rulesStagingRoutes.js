const express = require('express');
const router = express.Router();
const { stagingHelpers, rulesHelpers, logToFile } = require('../mariadb');

// List staged sanitized rules
router.get('/', async (req, res) => {
  try {
    const rows = await stagingHelpers.getAll();
    res.json(rows);
  } catch (e) {
    logToFile('staging:list:error', e && e.message);
    res.status(500).json({ error: e.message });
  }
});

// Approve staged rules: insert into rules table (appends) and clear staging
router.post('/approve', async (req, res) => {
  try {
    const rows = await stagingHelpers.getAll();
    let inserted = 0;
    
    for (const rule of rows) {
      const ruleData = {
        title: rule.title || '',
        content: rule.content || '',
        page_num: rule.page || '',
        source: 'sanitized',
        source_abbr: 'SAN',
        category: rule.category || null,
        rulebook: 'staging'
      };
      
      const result = await rulesHelpers.create(ruleData);
      if (result) {
        inserted++;
        await stagingHelpers.delete(rule.id);
      }
    }
    
    res.json({ success: true, inserted });
  } catch (e) {
    logToFile('staging:approve:error', e && e.stack ? e.stack : e);
    res.status(500).json({ error: e.message });
  }
});

// Clear staging without approving
router.delete('/', async (req, res) => {
  try {
    const rows = await stagingHelpers.getAll();
    for (const rule of rows) {
      await stagingHelpers.delete(rule.id);
    }
    res.json({ success: true });
  } catch (e) {
    logToFile('staging:clear:error', e && e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
