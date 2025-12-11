const express = require('express')
const router = express.Router()
const { weaponsHelpers, logToFile } = require('../mariadb')

// Return weapons in a normalized shape
router.get('/', async (req, res) => {
  try {
    const rows = await weaponsHelpers.getAll()
    const parsed = rows.map(r => {
      let stats = {}
      try { 
        stats = typeof r.stats === 'string' ? JSON.parse(r.stats) : r.stats || {}
      } catch (e) {
        logToFile('Error parsing weapon stats for', r.name, e)
      }
      return { id: r.id, name: r.name, category: r.category, stats: stats, source: r.source }
    })
    res.json(parsed)
  } catch (e) {
    console.error('Failed to load weapons from MariaDB:', e)
    logToFile('Error getting weapons:', e)
    res.status(500).json({ error: 'Failed to get weapons' })
  }
})

module.exports = router
