const express = require('express');
const fs = require('fs');
const path = require('path');
const { rulesHelpers, logToFile } = require('../mariadb');
const router = express.Router();

console.log('Rules routes registered (MariaDB)');

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

// Fetch all rules from MariaDB
async function getAllRules() {
  try {
    const rows = await rulesHelpers.getAll();
    return rows.map(r => ({ 
      id: r.id, 
      rule_id: r.rule_id, 
      title: cleanTitle(r.title), 
      content: cleanText(r.content), 
      page: r.page_num, 
      source: r.source, 
      sourceAbbr: r.source_abbr, 
      category: r.category 
    }));
  } catch (e) {
    console.error('Failed to read rules from MariaDB:', e);
    logToFile('Error getting all rules:', e);
    return [];
  }
}

async function getRuleById(ruleId) {
  try {
    const rows = await rulesHelpers.getAll();
    const row = rows.find(r => r.rule_id === ruleId || r.id === ruleId);
    if (!row) return null;
    return { 
      id: row.rule_id || row.id, 
      title: cleanTitle(row.title), 
      content: cleanText(row.content), 
      page: row.page_num, 
      source: row.source, 
      sourceAbbr: row.source_abbr, 
      category: row.category 
    };
  } catch (e) {
    console.error('Failed to read rule by id:', e);
    logToFile('Error getting rule by id:', ruleId, e);
    return null;
  }
}

// Get all rule categories
router.get('/categories', async (req, res) => {
  try {
    const rows = await getAllRules();
    const categories = [...new Set(rows.map(r => r.category).filter(Boolean))];
    const categoryList = categories.map(cat => ({ id: cat, name: cleanTitle(cat) }));
    res.json([{ id: 'all', name: 'All Rules' }, ...categoryList]);
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Search rules (MariaDB)
router.get('/search', async (req, res) => {
  try {
    const { q: query, category, limit = 20 } = req.query;
    if (!query || !query.trim()) return res.json([]);
    const limitInt = Math.max(1, parseInt(limit) || 20);
    
    const allRules = await getAllRules();
    const term = query.toLowerCase();
    
    let filtered = allRules.filter(rule => {
      const titleMatch = rule.title && rule.title.toLowerCase().includes(term);
      const contentMatch = rule.content && rule.content.toLowerCase().includes(term);
      const categoryMatch = !category || category === 'all' || rule.category === category;
      
      return (titleMatch || contentMatch) && categoryMatch;
    });
    
    // If category filtering yielded no results, try without category filter
    if (filtered.length === 0 && category && category !== 'all') {
      filtered = allRules.filter(rule => {
        const titleMatch = rule.title && rule.title.toLowerCase().includes(term);
        const contentMatch = rule.content && rule.content.toLowerCase().includes(term);
        return titleMatch || contentMatch;
      });
    }
    
    // Limit results and truncate content
    const results = filtered.slice(0, limitInt).map(r => ({
      ...r,
      content: r.content && r.content.length > 300 ? r.content.substring(0, 300) + '...' : r.content
    }));
    
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get a specific rule by ID
router.get('/rule/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await getRuleById(id);
    if (!rule) return res.status(404).json({ error: 'Rule not found' });
    res.json(rule);
  } catch (error) {
    console.error('Get rule error:', error);
    res.status(500).json({ error: 'Failed to get rule' });
  }
});

// Get random rules for discovery
router.get('/random', async (req, res) => {
  try {
    const { count = 5, category } = req.query;
    const max = Math.max(1, parseInt(count) || 5);
    
    const allRules = await getAllRules();
    let filtered = allRules;
    
    if (category && category !== 'all') {
      filtered = allRules.filter(rule => rule.category === category);
    }
    
    // Shuffle and pick random rules
    const shuffled = filtered.sort(() => 0.5 - Math.random());
    const randomRules = shuffled.slice(0, max).map(r => ({
      ...r,
      content: r.content && r.content.length > 200 ? r.content.substring(0, 200) + '...' : r.content
    }));
    
    res.json(randomRules);
  } catch (error) {
    console.error('Random rules error:', error);
    res.status(500).json({ error: 'Failed to get random rules' });
  }
});

// Get rules statistics
router.get('/stats', async (req, res) => {
  try {
    const allRules = await getAllRules();
    const totalRules = allRules.length;
    
    const categoryCount = {};
    const sourceCount = {};
    
    allRules.forEach(rule => {
      if (rule.category) {
        categoryCount[rule.category] = (categoryCount[rule.category] || 0) + 1;
      }
      if (rule.source) {
        sourceCount[rule.source] = (sourceCount[rule.source] || 0) + 1;
      }
    });
    
    const categories = Object.entries(categoryCount).map(([category, c]) => ({ category, c }));
    const sources = Object.entries(sourceCount).map(([source, c]) => ({ source, c }));
    
    res.json({ totalRules, categories, sources, searchTerms: 0 });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Reload the rules database (admin only)
router.post('/reload', async (req, res) => {
  try {
    const gmSecret = req.headers['x-gm-secret'];
    if (gmSecret !== 'bongo') return res.status(403).json({ error: 'Unauthorized' });
    
    const allRules = await getAllRules();
    const totalRules = allRules.length;
    
    res.json({ success: true, totalRules, message: 'Rules are MariaDB-backed; already loaded' });
  } catch (error) {
    console.error('Reload error:', error);
    res.status(500).json({ error: 'Failed to reload database' });
  }
});

console.log('Rules routes registered');
module.exports = router;
