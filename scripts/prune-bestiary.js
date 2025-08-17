const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(__dirname, '..', 'database', 'deathwatch-bestiary-extracted.json')
const BACKUP_DIR = path.join(__dirname, '..', 'database', 'backups')

function loadDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
}

function writeBackup(db) {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
  const ts = Date.now()
  const backupPath = path.join(BACKUP_DIR, `deathwatch-bestiary-extracted.json.backup.${ts}.json`)
  fs.writeFileSync(backupPath, JSON.stringify(db, null, 2), 'utf8')
  return backupPath
}

function saveDb(db) {
  db.generatedAt = new Date().toISOString()
  db.count = db.results.length
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8')
}

function hasCompleteProfile(entry) {
  if (!entry || !entry.stats) return false
  const p = entry.stats.profile
  if (!p || typeof p !== 'object') return false
  const required = ['ws','bs','s','t','ag','int','per','wp','fel']
  for (const k of required) {
    if (p[k] === undefined || p[k] === null) return false
  }
  return true
}

function main() {
  const db = loadDb()
  if (!Array.isArray(db.results)) {
    console.error('DB format unexpected: results is not an array')
    process.exit(2)
  }

  const originalCount = db.results.length
  const toKeep = []
  const removed = []

  for (const entry of db.results) {
    if (hasCompleteProfile(entry)) {
      toKeep.push(entry)
    } else {
      removed.push({ name: entry.bestiaryName || '<unknown>', pdf: entry.pdf || '', page: entry.page || '' })
    }
  }

  if (removed.length === 0) {
    console.log(`No entries removed. DB count remains ${originalCount}`)
    process.exit(0)
  }

  const backupPath = writeBackup(db)
  console.log(`Backed up DB to ${backupPath}`)

  db.results = toKeep
  db.count = toKeep.length
  db.generatedAt = new Date().toISOString()

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8')

  console.log(`Pruned bestiary: removed ${removed.length} entries (from ${originalCount} -> ${db.count})`)
  console.log('Removed entries:')
  for (const r of removed) console.log(` - ${r.name} (pdf=${r.pdf} page=${r.page})`)

  process.exit(0)
}

if (require.main === module) main()
