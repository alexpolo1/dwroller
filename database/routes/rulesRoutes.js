const express = require('express');
const fs = require('fs');
const path = require('path');
const { db } = require('../sqlite-db');
const router = express.Router();

console.log('Rules routes registered (sqlite-backed)');

// Helpers to clean up OCR/extracted text
function cleanText(s) {
  if (!s) return s;
  // Replace Windows newlines, collapse multi-whitespace, trim
  let out = s.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  out = out.replace(/[ \t]+/g, ' ');
  out = out.replace(/\n\s+/g, '\n');
  out = out.replace(/\s+\n/g, '\n');
  // Remove weird control characters
  out = out.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '');
  return out.trim();
}

function cleanTitle(t) {
  if (!t) return t;
  let s = String(t).trim();
  // If title is all-caps, make sentence case-ish
  if (s === s.toUpperCase() && s.length > 1) {
    s = s.toLowerCase();
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ');
  return s;
}

// We will query sqlite `rules` table on demand; helper to fetch all rules
function getAllRules() {
  try {
  const rows = db.prepare('SELECT id, rule_id, title, content, page, source, source_abbr, category FROM rules ORDER BY id').all();
  return rows.map(r => ({ id: r.id, rule_id: r.rule_id, title: cleanTitle(r.title), content: cleanText(r.content), page: r.page, source: r.source, sourceAbbr: r.source_abbr, category: r.category }));
  } catch (e) {
    console.error('Failed to read rules from sqlite:', e);
    return [];
  }
}
function getRuleById(ruleId) {
  try {
  const row = db.prepare('SELECT rule_id as id, title, content, page, source, source_abbr as sourceAbbr, category FROM rules WHERE rule_id = ?').get(ruleId);
  if (!row) return null;
  return { id: row.id, title: cleanTitle(row.title), content: cleanText(row.content), page: row.page, source: row.source, sourceAbbr: row.sourceAbbr, category: row.category };
  } catch (e) {
    console.error('Failed to read rule by id:', e);
    return null;
  }
}

// Get all rule categories
router.get('/categories', (req, res) => {
  try {
  const rows = getAllRules();
  const categories = [...new Set(rows.map(r => r.category).filter(Boolean))];
  const categoryList = categories.map(cat => ({ id: cat, name: cleanTitle(cat) }));
  res.json([{ id: 'all', name: 'All Rules' }, ...categoryList]);
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Search rules (sqlite-backed)
router.get('/search', (req, res) => {
  try {
    const { q: query, category, limit = 20 } = req.query;
    if (!query || !query.trim()) return res.json([]);
    const limitInt = Math.max(1, parseInt(limit) || 20);
    const term = `%${query}%`;

    let rows;
    if (category && category !== 'all') {
      rows = db.prepare('SELECT rule_id as id, title, content, page, source, source_abbr as sourceAbbr, category FROM rules WHERE (title LIKE ? OR content LIKE ?) AND category = ? ORDER BY id LIMIT ?').all(term, term, category, limitInt);
      if (!rows || rows.length === 0) {
        rows = db.prepare('SELECT rule_id as id, title, content, page, source, source_abbr as sourceAbbr, category FROM rules WHERE (title LIKE ? OR content LIKE ?) ORDER BY id LIMIT ?').all(term, term, limitInt);
      }
    } else {
      rows = db.prepare('SELECT rule_id as id, title, content, page, source, source_abbr as sourceAbbr, category FROM rules WHERE (title LIKE ? OR content LIKE ?) ORDER BY id LIMIT ?').all(term, term, limitInt);
    }

    const results = (rows || []).map(r => ({ ...r, content: r.content && r.content.length > 300 ? r.content.substring(0,300) + '...' : r.content }));
  // Clean text fields before returning
  const cleaned = (results || []).map(r => ({ ...r, title: cleanTitle(r.title), content: r.content ? cleanText(r.content) : r.content }));
  res.json(cleaned);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get a specific rule by ID
router.get('/rule/:id', (req, res) => {
  try {
    const { id } = req.params;
    const rule = getRuleById(id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (error) {
    console.error('Get rule error:', error);
    res.status(500).json({ error: 'Failed to get rule' });
  }
});

// Get random rules for discovery
router.get('/random', (req, res) => {
  try {
    const { count = 5, category } = req.query;
    const max = Math.max(1, parseInt(count) || 5);
    let rows;
    if (category && category !== 'all') {
      rows = db.prepare('SELECT rule_id as id, title, content, page, source, source_abbr as sourceAbbr, category FROM rules WHERE category = ? ORDER BY RANDOM() LIMIT ?').all(category, max);
    } else {
      rows = db.prepare('SELECT rule_id as id, title, content, page, source, source_abbr as sourceAbbr, category FROM rules ORDER BY RANDOM() LIMIT ?').all(max);
    }
    const randomRules = (rows || []).map(r => ({ ...r, content: r.content && r.content.length > 200 ? r.content.substring(0,200) + '...' : r.content }));
  // Clean before responding
  const cleaned = (randomRules || []).map(r => ({ ...r, title: cleanTitle(r.title), content: r.content ? cleanText(r.content) : r.content }));
  res.json(cleaned);
  } catch (error) {
    console.error('Random rules error:', error);
    res.status(500).json({ error: 'Failed to get random rules' });
  }
});

// Get rules statistics
router.get('/stats', (req, res) => {
  try {
    const totalRules = db.prepare('SELECT COUNT(*) as c FROM rules').get().c;
    const categories = db.prepare('SELECT category, COUNT(*) as c FROM rules GROUP BY category').all();
    const sources = db.prepare('SELECT source, COUNT(*) as c FROM rules GROUP BY source').all();
    res.json({ totalRules, categories, sources, searchTerms: 0 });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Reload the rules database (admin only)
router.post('/reload', (req, res) => {
  try {
    const gmSecret = req.headers['x-gm-secret'];
    if (gmSecret !== 'bongo') return res.status(403).json({ error: 'Unauthorized' });
    const totalRules = db.prepare('SELECT COUNT(*) as c FROM rules').get().c;
    res.json({ success: true, totalRules, message: 'Rules are sqlite-backed; no reload necessary' });
  } catch (error) {
    console.error('Reload error:', error);
    res.status(500).json({ error: 'Failed to reload database' });
  }
});

console.log('Rules routes registered');
module.exports = router;
