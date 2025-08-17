const express = require('express')
const router = express.Router()
const { db } = require('../sqlite-db')

// Return weapons in a normalized shape
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT id,name,category,stats,source FROM weapons ORDER BY name').all()
    const parsed = rows.map(r => {
      let stats = {}
      try { stats = JSON.parse(r.stats || '{}') } catch (e) {}
      return { id: r.id, name: r.name, category: r.category, stats: stats, source: r.source }
    })
    res.json(parsed)
  } catch (e) {
    console.error('Failed to load weapons from sqlite:', e)
    res.status(500).json({ error: 'Failed to get weapons' })
  }
})

module.exports = router
