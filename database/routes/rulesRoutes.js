const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

console.log('Loading rules routes...');

// Load rules database
let rulesDatabase = null;
let searchIndex = null;

function loadRulesDatabase() {
  try {
    const dbPath = path.join(__dirname, '../rules/rules-database.json');
    if (fs.existsSync(dbPath)) {
      const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      rulesDatabase = data.rules;
      searchIndex = data.searchIndex;
      console.log(`Loaded ${rulesDatabase.length} rules from database`);
      return true;
    }
    console.warn('Rules database not found, using empty database');
    rulesDatabase = [];
    searchIndex = {};
    return false;
  } catch (error) {
    console.error('Failed to load rules database:', error);
    rulesDatabase = [];
    searchIndex = {};
    return false;
  }
}

// Load the database on startup
loadRulesDatabase();

// Get all rule categories
router.get('/categories', (req, res) => {
  try {
    if (!rulesDatabase) {
      return res.json([
        { id: 'all', name: 'All Rules' },
        { id: 'combat', name: 'Combat' },
        { id: 'weapons', name: 'Weapons' },
        { id: 'armor', name: 'Armor' },
        { id: 'skills', name: 'Skills' },
        { id: 'talents', name: 'Talents' },
        { id: 'psychic', name: 'Psychic Powers' },
        { id: 'equipment', name: 'Equipment' }
      ]);
    }
    
    const categories = [...new Set(rulesDatabase.map(rule => rule.category))];
    const categoryList = categories.map(cat => ({
      id: cat,
      name: cat.charAt(0).toUpperCase() + cat.slice(1)
    }));
    
    res.json([{ id: 'all', name: 'All Rules' }, ...categoryList]);
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Search rules
router.get('/search', (req, res) => {
  console.log('Search route hit! Query:', req.query);
  try {
    const { q: query, category, limit = 20 } = req.query;
    
    if (!query || !query.trim()) {
      return res.json([]);
    }
    
    if (!rulesDatabase || rulesDatabase.length === 0) {
      return res.json([
        {
          id: 'no_database',
          title: 'Rules Database Not Available',
          content: 'The rules database has not been loaded. Run the extract-rules.js script to populate the database from the PDF files.',
          category: 'system',
          page: null,
          source: 'System'
        }
      ]);
    }
    
    const searchTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);

    // scoring helper - returns Map(index -> score)
    const scoreResults = (applyCategoryFilter) => {
      const scores = new Map();
      rulesDatabase.forEach((rule, index) => {
        let score = 0;
        const titleLower = (rule.title || '').toLowerCase();
        const contentLower = (rule.content || '').toLowerCase();

        if (titleLower === query.toLowerCase()) score += 100;
        if (titleLower.includes(query.toLowerCase())) score += 50;

        searchTerms.forEach(term => {
          if (titleLower.includes(term)) score += 20;
          if (contentLower.includes(term)) score += 5;
          if (searchIndex && searchIndex[term] && searchIndex[term].includes(index)) score += 3;
        });

        if (applyCategoryFilter && category && category !== 'all' && rule.category !== category) {
          // skip when category filtering is requested
          score = 0;
        }

        if (score > 0) scores.set(index, score);
      });
      return scores;
    };

    const limitInt = Math.max(1, parseInt(limit) || 20);

    // Primary: category-filtered results (if category requested)
  const primaryScores = scoreResults(true);
    const primarySorted = Array.from(primaryScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limitInt)
      .map(([index]) => index);

    // Secondary: best matches ignoring category (fallback)
    const secondaryScores = scoreResults(false);
    const secondarySorted = Array.from(secondaryScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([index]) => index)
      .filter(idx => !primarySorted.includes(idx))
      .slice(0, Math.max(0, limitInt - primarySorted.length));

    // If a category is requested but yields no primary results, fall back to best cross-category matches
    let combinedIndices;
    if (category && category !== 'all') {
      if (primarySorted.length === 0 && secondarySorted.length > 0) {
        combinedIndices = secondarySorted;
      } else {
        combinedIndices = [...primarySorted, ...secondarySorted];
      }
    } else {
      combinedIndices = Array.from(secondaryScores.entries()).sort((a,b)=>b[1]-a[1]).slice(0, limitInt).map(([i])=>i);
    }

    const results = combinedIndices.slice(0, limitInt).map(index => ({
      ...rulesDatabase[index],
      content: rulesDatabase[index].content && rulesDatabase[index].content.length > 300
        ? rulesDatabase[index].content.substring(0, 300) + '...'
        : rulesDatabase[index].content
    }));

    console.log(`Rules search: "${query}" (category: ${category || 'all'}) - ${results.length} results (primary ${primarySorted.length}, secondary ${secondarySorted.length})`);
    res.json(results);
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get a specific rule by ID
router.get('/rule/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    if (!rulesDatabase) {
      return res.status(404).json({ error: 'Rules database not available' });
    }
    
    const rule = rulesDatabase.find(r => r.id === id);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
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
    
    if (!rulesDatabase || rulesDatabase.length === 0) {
      return res.json([]);
    }
    
    let eligibleRules = rulesDatabase;
    if (category && category !== 'all') {
      eligibleRules = rulesDatabase.filter(rule => rule.category === category);
    }
    
    const randomRules = [];
    const maxCount = Math.min(parseInt(count), eligibleRules.length);
    const usedIndices = new Set();
    
    while (randomRules.length < maxCount && usedIndices.size < eligibleRules.length) {
      const randomIndex = Math.floor(Math.random() * eligibleRules.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        randomRules.push({
          ...eligibleRules[randomIndex],
          content: eligibleRules[randomIndex].content.length > 200 
            ? eligibleRules[randomIndex].content.substring(0, 200) + '...'
            : eligibleRules[randomIndex].content
        });
      }
    }
    
    res.json(randomRules);
  } catch (error) {
    console.error('Random rules error:', error);
    res.status(500).json({ error: 'Failed to get random rules' });
  }
});

// Get rules statistics
router.get('/stats', (req, res) => {
  try {
    if (!rulesDatabase) {
      return res.json({
        totalRules: 0,
        categories: [],
        sources: [],
        searchTerms: 0
      });
    }
    
    const categories = [...new Set(rulesDatabase.map(rule => rule.category))];
    const sources = [...new Set(rulesDatabase.map(rule => rule.source))];
    
    const categoryStats = categories.map(cat => ({
      category: cat,
      count: rulesDatabase.filter(rule => rule.category === cat).length
    }));
    
    res.json({
      totalRules: rulesDatabase.length,
      categories: categoryStats,
      sources: sources.map(source => ({
        source,
        count: rulesDatabase.filter(rule => rule.source === source).length
      })),
      searchTerms: Object.keys(searchIndex).length
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Reload the rules database (admin only)
router.post('/reload', (req, res) => {
  try {
    // Check for GM secret
    const gmSecret = req.headers['x-gm-secret'];
    if (gmSecret !== 'bongo') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const success = loadRulesDatabase();
    res.json({
      success,
      totalRules: rulesDatabase ? rulesDatabase.length : 0,
      message: success ? 'Rules database reloaded successfully' : 'Failed to reload rules database'
    });
    
  } catch (error) {
    console.error('Reload error:', error);
    res.status(500).json({ error: 'Failed to reload database' });
  }
});

console.log('Rules routes registered');
module.exports = router;
