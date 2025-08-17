const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

// Ensure source data files are available
const weaponsPath = path.join(__dirname, '../database/public/deathwatch-weapons-comprehensive.json')
const armourPath = path.join(__dirname, '../database/public/deathwatch-armor-comprehensive.json')
let comprehensiveWeapons = { rangedWeapons: [], meleeWeapons: [], grenades: [], other: [] }
let comprehensiveArmor = {}
try { comprehensiveWeapons = JSON.parse(fs.readFileSync(weaponsPath, 'utf8')) } catch (e) { console.warn('Could not read weapons JSON:', e && e.message) }
try { comprehensiveArmor = JSON.parse(fs.readFileSync(armourPath, 'utf8')) } catch (e) { console.warn('Could not read armour JSON:', e && e.message) }

const dbPath = path.join(__dirname, '..', 'database', 'sqlite', 'deathwatch.db')

function safeRead(obj, key) {
  try { return obj[key] } catch (e) { return undefined }
}

if (require.main === module) {
  if (!fs.existsSync(dbPath)) {
    console.error('Database not found at', dbPath)
    process.exit(1)
  }

  const backup = dbPath + '.backup.' + Date.now()
  fs.copyFileSync(dbPath, backup)
  console.log('Backup DB created at', backup)

  const db = new Database(dbPath)

  // Ensure shop tables exist (idempotent)
  db.exec(`
    CREATE TABLE IF NOT EXISTS shop_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      requisition_cost INTEGER NOT NULL DEFAULT 0,
      renown_requirement TEXT NOT NULL DEFAULT 'None',
      item_type TEXT NOT NULL,
      stats TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)

  const insert = db.prepare(`
    INSERT OR REPLACE INTO shop_items (name, category, requisition_cost, renown_requirement, item_type, stats, source)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const tx = db.transaction((items) => {
    for (const it of items) {
      const name = it.name || it.id || '(unnamed)'
      const category = it.category || 'Misc'
      const req = Number(it.req ?? it.cost ?? it.requisition_cost ?? 0) || 0
      const renown = it.renown || it.renown_level || 'None'
      const itemType = (it.stats && (it.stats.class || it.stats.type)) || safeRead(it, 'category') || 'gear'
      const stats = JSON.stringify(it.stats || {})
      const source = (it.stats && it.stats.source) || it.source || ''
      insert.run(name, category, req, renown, itemType, stats, source)
    }
  })

  // Collect items from comprehensive datasets
  const allItems = []
  const weaponCats = ['rangedWeapons','meleeWeapons','grenades','other']
  for (const cat of weaponCats) {
    if (Array.isArray(comprehensiveWeapons[cat])) allItems.push(...comprehensiveWeapons[cat].map(it => ({ ...it, category: cat })))
  }

  const armorCats = ['powerArmor','powerArmorHelms','carapaceArmor','naturalArmor','primitiveArmor','xenosArmor','shields','otherArmor']
  for (const cat of armorCats) {
    if (Array.isArray(comprehensiveArmor[cat])) allItems.push(...comprehensiveArmor[cat].map(it => ({ ...it, category: cat })))
  }

  console.log('Inserting', allItems.length, 'shop items into DB...')
  try {
    tx(allItems)
    console.log('Inserted shop items successfully')
  } catch (e) {
    console.error('Failed to insert shop items:', e)
  } finally {
    db.close()
  }
}
