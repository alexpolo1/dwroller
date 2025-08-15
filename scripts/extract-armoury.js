/*
  Usage:
    node scripts/extract-armoury.js "/absolute/path/to/Deathwatch-Core-Rulebook.pdf" public/deathwatch-armoury.json
    
    Optional env/args to narrow extraction:
      --between "Table 5–5" "Table 5–6"   (slice text between two anchors)
*/

const fs = require('fs')
const path = require('path')
const pdfParse = require('pdf-parse')

function slugify(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'') }

async function extractTextFromPDF(pdfPath) {
  const dataBuffer = fs.readFileSync(pdfPath)
  const data = await pdfParse(dataBuffer)
  return String(data.text || '')
}

function sliceBetween(text, startAnchor, endAnchor) {
  if (!startAnchor || !endAnchor) return text
  const t = String(text)
  const sIdx = t.indexOf(startAnchor)
  if (sIdx === -1) return text
  const eIdx = t.indexOf(endAnchor, sIdx + startAnchor.length)
  if (eIdx === -1) return t.slice(sIdx)
  return t.slice(sIdx, eIdx)
}

function cleanName(s) {
  let n = String(s||'').trim()
  n = n.replace(/^[-–—•\s"'`]+/,'')
  n = n.replace(/^(a|an|the)\s+/i,'')
  const m = n.match(/([A-Z][A-Za-z0-9'()\-\/ ]{3,80})/)
  if (m) n = m[1].trim()
  n = n.replace(/\s{2,}/g,' ')
  return n
}

function normalizeItem(it) {
  const name = cleanName(it.name)
  if (!name || name.length < 3) return null
  const id = String(it.id||slugify(name))
  const category = String(it.category||'Gear').trim()
  const req = Math.max(0, Number.isFinite(+it.req) ? +it.req : 0)
  const renown = String(it.renown||'None')
  const desc = String(it.desc||'').trim()
  return { id, name, category, req, renown, desc }
}

const RANKS = ['None','Respected','Distinguished','Famed','Hero']
function detectRenown(s) {
  const m = String(s||'').match(/\b(Respected|Distinguished|Famed|Hero)\b/i)
  return m ? (m[1][0].toUpperCase()+m[1].slice(1).toLowerCase()) : 'None'
}

// Improved req extraction: try explicit, then tail, then last number
function detectReq(s) {
  // 1. Explicit Req/Cost
  const reqMatch = String(s||'').match(/\b(Req(?:uisition)?|Cost)\s*[:=\-]?\s*(\d{1,3})\b/i)
  if (reqMatch) return Number(reqMatch[2])
  // 2. Number before renown
  const m2 = String(s||'').match(/(?:^|\s)(\d{1,3})\s+(Respected|Distinguished|Famed|Hero)\b/i)
  if (m2) return Number(m2[1])
  // 3. Last number in line (common for gear/armor)
  const nums = String(s||'').match(/(\d{1,3})(?!.*\d)/)
  if (nums) return Number(nums[1])
  return 0
}

function detectCategory(s) {
  const t = String(s||'').toLowerCase()
  if (/grenade|missile/.test(t)) return 'Explosives'
  if (/sword|axe|hammer|fist|claw|melee|knife|chainfist|thunder/.test(t)) return 'Melee'
  if (/bolter|boltgun|pistol|rifle|gun|cannon|lascannon|plasma|melta|flamer|shotgun|launcher|assault cannon|sniper|cyclone/.test(t)) return 'Ranged'
  if (/armor|armour|shield|helmet|helm|terminator|artificer/.test(t)) return 'Armor'
  if (/ammo|rounds|shells|backpack|charge pack|fuel|canister/.test(t)) return 'Ammunition'
  return 'Gear'
}

const KEYWORDS = /(chainsword|bolter|boltgun|storm bolter|plasma|melta|flamer|assault cannon|shotgun|autogun|autopistol|lasgun|laspistol|lascannon|missile|launcher|grenade|knife|sword|axe|hammer|fist|claw|shield|armor|armour|power|force|stasis|vortex|nova|sniper|needle|auspex|medicae|preysense|telescopic|red[- ]?dot|silencer|suspensor|backpack|ammo|rounds)/i
const CLASS_TOK = /(Basic|Pistol|Heavy|Mounted)\b/i
const ROW_SIGNATURE = /\b\d{1,3}m\b.*S\//i

function extractItemsFromText(text, tableType = 'weapon') {
  const lines = text.split(/\n|\.|;|\s{2,}/).map(s=>s.trim()).filter(Boolean)
  const items = []
  for (const s of lines) {
    // Table type awareness
    if (tableType === 'weapon') {
      if (!CLASS_TOK.test(s) || !ROW_SIGNATURE.test(s)) continue
      if (!KEYWORDS.test(s)) continue
    } else {
      // For gear/armor/upgrades: just need a keyword and a number
      if (!KEYWORDS.test(s)) continue
      if (!/(\d{1,3})/.test(s)) continue
    }
    const req = detectReq(s)
    const name = cleanName(s)
    const renown = detectRenown(s)
    const category = detectCategory(s)
    const desc = s
    const it = normalizeItem({ name, req, renown, category, desc })
    if (it) items.push(it)
  }
  // Deduplicate by name (case-insensitive)
  const byName = new Map()
  for (const it of items) {
    const key = it.name.toLowerCase()
    const prev = byName.get(key)
    if (!prev) byName.set(key, it)
    else {
      const rankIdx = (r)=>RANKS.indexOf(r)
      const better = (it.req > prev.req) || (it.req === prev.req && rankIdx(it.renown) > rankIdx(prev.renown)) || (it.desc.length > prev.desc.length)
      if (better) byName.set(key, it)
    }
  }
  return Array.from(byName.values()).sort((a,b)=> String(a.category).localeCompare(String(b.category)) || a.name.localeCompare(b.name))
}

async function main() {
  const input = process.argv[2] || path.resolve('Deathwatch-Core-Rulebook.pdf')
  const output = process.argv[3] || path.resolve('public/deathwatch-armoury.json')

  // List of [startAnchor, endAnchor, tableType] for all relevant tables
  const tableSections = [
    ['Table 5–5', 'Table 5–6', 'weapon'], // Ranged Weapons
    ['Table 5–6', 'Table 5–7', 'weapon'], // Melee Weapons
    ['Table 5–7', 'Table 5–8', 'upgrade'], // Weapon Upgrades
    ['Table 5–8', 'Table 5–9', 'ammo'], // Ammunition
    ['Table 5–9', 'Table 5–10', 'explosive'], // Explosives
    ['Table 5–10', 'Table 5–11', 'armor'], // Armour
    ['Table 5–11', 'Table 5–12', 'gear'], // Gear
  ]

  if (!fs.existsSync(input)) {
    console.error('PDF not found:', input)
    process.exit(1)
  }
  let text = await extractTextFromPDF(input)
  let allItems = []
  for (const [startAnchor, endAnchor, tableType] of tableSections) {
    const sectionText = sliceBetween(text, startAnchor, endAnchor)
    const items = extractItemsFromText(sectionText, tableType)
    allItems = allItems.concat(items)
  }
  // Deduplicate by name (case-insensitive)
  const byName = new Map()
  for (const it of allItems) {
    const key = it.name.toLowerCase()
    const prev = byName.get(key)
    if (!prev) byName.set(key, it)
    else {
      const rankIdx = (r)=>RANKS.indexOf(r)
      const better = (it.req > prev.req) || (it.req === prev.req && rankIdx(it.renown) > rankIdx(prev.renown)) || (it.desc.length > prev.desc.length)
      if (better) byName.set(key, it)
    }
  }
  const merged = Array.from(byName.values()).sort((a,b)=> String(a.category).localeCompare(String(b.category)) || a.name.localeCompare(b.name))
  fs.mkdirSync(path.dirname(output), { recursive: true })
  fs.writeFileSync(output, JSON.stringify(merged, null, 2), 'utf8')
  console.log('Wrote items:', merged.length, '->', output)
}

if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1) })
}
