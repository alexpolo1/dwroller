/*
  Clean and normalize armoury JSON produced from PDF extraction.
  Usage:
    node scripts/clean-armoury.js public/deathwatch-armoury.json [output.json]
*/

const fs = require('fs')
const path = require('path')

function loadJson(p){ return JSON.parse(fs.readFileSync(p,'utf8')) }
function saveJson(p, obj){ fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(obj,null,2),'utf8') }

function titleCaseWord(w){
  if (!w) return w
  if (w.toUpperCase()==='X' || w.toUpperCase()==='E') return w.toUpperCase()
  if (/^\d/.test(w)) return w
  if (w.length<=2) return w[0] ? (w[0].toUpperCase()+w.slice(1).toLowerCase()) : w
  return w[0].toUpperCase()+w.slice(1).toLowerCase()
}

function titleCaseName(s){
  return String(s||'')
    .split(/([\s\-()/]+)/)
    .map(part => /[\s\-()/]+/.test(part) ? part : titleCaseWord(part))
    .join('')
    .replace(/\bOf\b|\bAnd\b|\bThe\b/g, m=>m.toLowerCase())
}

function cleanName(raw, desc){
  let n = String(raw||'').trim()
  const d = String(desc||'')
  // Common OCR noise
  n = n.replace(/^rtes\b/i,'Astartes ')
  n = n.replace(/WeApons/gi,'Weapons')
  // If desc contains a canonical prefix use it
  const m1 = d.match(/\b(Astartes [A-Za-z][A-Za-z\-\s()]+?)(?:\s+(?:Basic|Pistol|Heavy|Mounted)\b)/)
  if (m1) n = m1[1]
  // Strip trailing stat blocks starting at class tokens
  n = n.replace(/\s+(Basic|Pistol|Heavy|Mounted)\b[\s\S]*$/,'')
  // Remove leading filler
  n = n.replace(/^[-–—•\s"'`]+/,'')
  n = n.replace(/^(a|an|the)\s+/i,'')
  // Compact whitespace
  n = n.replace(/\s{2,}/g,' ')
  // Title case
  n = titleCaseName(n)
  return n.trim()
}

const keepWord = /(Astartes|Bolter|Boltgun|Bolt Pistol|Storm Bolter|Plasma|Melta|Flamer|Lascannon|Shotgun|Autogun|Autopistol|Lasgun|Laspistol|Assault Cannon|Sniper Rifle|Combi|Cyclone|Missile|Launcher|Grenade|Power Sword|Power Axe|Power Fist|Thunder Hammer|Lightning Claw|Chainsword|Chainfist|Shield|Armor|Armour)/i
const looksBad = /\b(although|because|while|most|this|these|those|provides|requires|usually|common|mode|effects|counts|burst|power|pack|fuel|rounds|weapon is|weapon’s|weapons can|weapons work)\b/i

function isLikelyItem(name, cat){
  if (!name) return false
  if (name.length < 3 || name.length > 60) return false
  if (/^[a-z]/.test(name)) return false
  if (looksBad.test(name)) return false
  if (/(WeApons|Weapon)/i.test(name) && !/Power|Force|Storm|Shield|Astartes/i.test(name)) return false
  if (/(Grenade|Missile)/i.test(name)) return true
  if (/(Launcher)/i.test(name)) return true
  if (keepWord.test(name)) return true
  // Armor pieces
  if (/(Shield|Armour|Armor|Helmet|Helm)/i.test(name)) return true
  return false
}

function normalizeEntry(e){
  const name = cleanName(e.name, e.desc)
  let req = Number(e.req||0)
  if (!Number.isFinite(req) || req<0) req = 0
  const renown = /Respected|Distinguished|Famed|Hero/.test(e.renown||'') ? e.renown : 'None'
  const category = e.category || 'Gear'
  return { ...e, name, req, renown, category }
}

function main(){
  const input = process.argv[2] || path.resolve('public/deathwatch-armoury.json')
  const output = process.argv[3] || input
  const src = loadJson(input)
  const cleaned = []
  const seen = new Set()
  for (const e of src){
    const n = normalizeEntry(e)
    if (!isLikelyItem(n.name, n.category)) continue
    const key = n.name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    cleaned.push(n)
  }
  // Sort by category then name
  cleaned.sort((a,b)=> String(a.category).localeCompare(String(b.category)) || a.name.localeCompare(b.name))
  saveJson(output, cleaned)
  console.log('Cleaned items:', cleaned.length, 'from', src.length, '->', output)
}

if (require.main === module) main()
