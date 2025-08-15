const { useEffect, useMemo, useState } = require('react')

// Tooltip component for abbreviations
function Tooltip({ children, text }) {
  return (
    <span className="group relative inline-block cursor-help border-b border-dotted border-white/30 hover:border-white/60">
      {children}
      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-black text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
        {text}
      </span>
    </span>
  )
}

function simpleCSVParse(txt) {
  const lines = String(txt ?? '').split(/\r?\n|\r/).filter(l=>l.trim().length>0)
  if (lines.length===0) return []
  const headers = lines[0].split(',').map(h=>h.trim())
  const rows = []
  for (let i=1;i<lines.length;i++) {
    const cells = lines[i].split(',')
    const obj = {}
    for (let j=0;j<headers.length;j++) obj[headers[j]] = (cells[j]||'').trim()
    rows.push(obj)
  }
  return rows
}

function parseDice(spec) {
  const s = String(spec || '').replace(/\s+/g, '').toLowerCase()
  const parts = s.split('+')
  let flat = 0
  let terms = []
  for (const p of parts) {
    if (!p) continue
    const m = p.match(/^(\d+)d(\d+)$/)
    if (m) {
      const c = parseInt(m[1], 10)
      const f = parseInt(m[2], 10)
      if (!Number.isFinite(c) || !Number.isFinite(f) || c < 1 || f < 2) throw new Error('Invalid dice bounds')
      terms.push({ count: c, faces: f })
    } else {
      const n = Number(p)
      if (!Number.isNaN(n)) flat += n
      else throw new Error(`Invalid dice term: ${p}`)
    }
  }
  if (terms.length === 0) terms = [{ count: 1, faces: 10 }]
  return { terms, flat }
}

function rollDie(faces) { return Math.floor(Math.random()*faces)+1 }

function rollDice(terms, opts) {
  const tearing = !!(opts && opts.tearing)
  const proven = Math.max(0, opts && typeof opts.proven==='number' ? opts.proven : 0)
  const out = []
  for (const t of terms) {
    for (let i=0;i<t.count;i++) {
      let r = rollDie(t.faces)
      if (tearing) { const alt = rollDie(t.faces); r = Math.max(r, alt) }
      if (proven>0 && t.faces===10) r = Math.max(r, proven)
      out.push(r)
    }
  }
  return { rolls: out, total: out.reduce((a,b)=>a+b,0) }
}

function d100() { return Math.floor(Math.random()*100)+1 }

function degrees(target, roll) {
  const success = roll <= target
  if (success) { const diff = target - roll; const dos = 1 + Math.floor(diff/10); return { success, dos, dof: 0 } }
  const diff = roll - target; const dof = 1 + Math.floor(diff/10); return { success, dos: 0, dof }
}

function hitsFromDoS(mode, dos, rof) {
  const r = rof && rof>0 ? rof : 1
  if (mode === 'single') return Math.min(1, r)
  if (mode === 'semi') return Math.max(1, Math.min(1 + Math.floor(dos/2), r))
  return Math.max(1, Math.min(1 + dos, r))
}

function hitLocationFromRoll(roll) {
  const rev = Number(String(roll).padStart(2,'0').split('').reverse().join(''))
  if (rev >= 1 && rev <= 10) return 'Head'
  if (rev <= 20) return 'Right Arm'
  if (rev <= 30) return 'Left Arm'
  if (rev <= 70) return 'Body'
  if (rev <= 85) return 'Right Leg'
  return 'Left Leg'
}

function mitigateDamage(dmg, tb, armour) { return Math.max(0, dmg - tb - armour) }

const STORAGE_PRESETS = 'dw:presets:v3'
const STORAGE_HISTORY = 'dw:history:v2'
const STORAGE_WEAPONS = 'dw:weapons:v3'
const STORAGE_ENEMIES = 'dw:enemies:v1'
const STORAGE_TRACKER = 'dw:tracker:v1'

const BODY_PARTS = ['Head','Body','Left Arm','Right Arm','Left Leg','Right Leg']

function safeGet(key) {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return null
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function safeSet(key, val) { try { if (typeof window !== 'undefined' && 'localStorage' in window) window.localStorage.setItem(key, JSON.stringify(val)) } catch {} }

const defaultWeapons = [
  { name:'Astartes Bolt Pistol', class:'pistol', damage:'2d10+5', pen:5, rof:3, modes:['single','semi'], tearing:true },
  { name:'Astartes Bolter (Godwyn)', class:'basic', damage:'2d10+5', pen:5, rof:4, modes:['single','semi','full'], tearing:true },
  { name:'Astartes Boltgun (Stalker)', class:'basic', damage:'2d10+5', pen:5, rof:1, modes:['single'], tearing:true },
  { name:'Astartes Combi-Weapon', class:'basic', damage:'2d10+5', pen:5, rof:4, modes:['single','semi','full'], tearing:true },
  { name:'Astartes Heavy Bolter', class:'heavy', damage:'2d10+10', pen:6, rof:10, modes:['full'], tearing:true },
  { name:'Astartes Storm Bolter', class:'basic', damage:'2d10+5', pen:5, rof:4, modes:['single','semi','full'], tearing:true },
  { name:'Astartes Plasma Cannon', class:'heavy', damage:'2d10+11', pen:10, rof:1, modes:['single'] },
  { name:'Astartes Plasma Gun (Ragefire)', class:'basic', damage:'1d10+9', pen:8, rof:2, modes:['single','semi'] },
  { name:'Astartes Plasma Pistol', class:'pistol', damage:'1d10+8', pen:8, rof:2, modes:['single','semi'] },
  { name:'Astartes Infernus Pistol', class:'pistol', damage:'2d10+8', pen:13, rof:1, modes:['single'] },
  { name:'Astartes Meltagun (Vulkan)', class:'basic', damage:'2d10+8', pen:13, rof:1, modes:['single'] },
  { name:'Astartes Multi-melta (Maxima)', class:'heavy', damage:'4d10+6', pen:13, rof:1, modes:['single'] },
  { name:'Astartes Flamer', class:'basic', damage:'2d10+2', pen:3, rof:1, modes:['single'] },
  { name:'Astartes Hand Flamer', class:'pistol', damage:'2d10+2', pen:3, rof:1, modes:['single'] },
  { name:'Astartes Heavy Flamer', class:'heavy', damage:'2d10+6', pen:6, rof:1, modes:['single'] },
  { name:'Astartes Assault Cannon', class:'heavy', damage:'3d10+6', pen:6, rof:10, modes:['full'], tearing:true },
  { name:'Astartes Shotgun', class:'basic', damage:'2d10+3', pen:0, rof:2, modes:['single','semi'], reliable:true },
  { name:'Autogun', class:'basic', damage:'1d10+3', pen:0, rof:10, modes:['single','semi','full'] },
  { name:'Autopistol', class:'pistol', damage:'1d10+2', pen:0, rof:6, modes:['single','full'] },
  { name:'Astartes Lascannon', class:'heavy', damage:'6d10+10', pen:10, rof:1, modes:['single'] },
  { name:'Lasgun', class:'basic', damage:'1d10+3', pen:0, rof:3, modes:['single','semi'], reliable:true },
  { name:'Laspistol', class:'pistol', damage:'1d10+2', pen:0, rof:1, modes:['single'], reliable:true },
  { name:'Astartes Digital Flamer', class:'pistol', damage:'2d10+2', pen:3, rof:1, modes:['single'] },
  { name:'Astartes Digital Laser', class:'pistol', damage:'1d10+4', pen:7, rof:1, modes:['single'], reliable:true },
  { name:'Astartes Digital Melta', class:'pistol', damage:'2d10+5', pen:12, rof:1, modes:['single'] },
  { name:'Astartes Sniper Rifle', class:'basic', damage:'1d10', pen:0, rof:1, modes:['single'] },
  { name:'Astartes Chainsword', class:'melee', damage:'1d10+3', pen:4, rof:1, modes:['single'], tearing:true },
  { name:'Astartes Power Axe', class:'melee', damage:'1d10+8', pen:6, rof:1, modes:['single'] },
  { name:'Astartes Power Sword', class:'melee', damage:'1d10+6', pen:6, rof:1, modes:['single'] },
  { name:'Astartes Power Fist', class:'melee', damage:'2d10', pen:9, rof:1, modes:['single'] },
  { name:'Astartes Thunder Hammer', class:'melee', damage:'2d10+5', pen:8, rof:1, modes:['single'] },
  { name:'Astartes Lightning Claw', class:'melee', damage:'1d10+6', pen:8, rof:1, modes:['single'], tearing:true },
  { name:'Astartes Chainfist', class:'melee', damage:'2d10', pen:10, rof:1, modes:['single'], tearing:true },
  { name:'Astartes Combat Knife', class:'melee', damage:'1d10+2', pen:2, rof:1, modes:['single'] },
  { name:'Ceremonial Sword', class:'melee', damage:'1d10+3', pen:2, rof:1, modes:['single'] },
  { name:'Sacris Claymore', class:'melee', damage:'2d10+2', pen:2, rof:1, modes:['single'] },
  { name:'Astartes Force Staff', class:'melee', damage:'1d10+1', pen:0, rof:1, modes:['single'] },
  { name:'Astartes Force Sword', class:'melee', damage:'1d10+2', pen:2, rof:1, modes:['single'] }
]

const defaultEnemies = [
  { name:'Custom/None', tb:4, armour:5, wounds:20 },
  { name:'Imperial Guardsman', tb:3, armourByLoc:{'Head':4,'Body':4,'Left Arm':4,'Right Arm':4,'Left Leg':4,'Right Leg':4}, wounds:10 },
  { name:'Chaos Space Marine', tb:8, armourByLoc:{'Head':8,'Body':10,'Left Arm':8,'Right Arm':8,'Left Leg':8,'Right Leg':8}, wounds:29 },
  { name:'Tyranid Warrior', tb:10, armourByLoc:{'Head':8,'Body':8,'Left Arm':8,'Right Arm':8,'Left Leg':8,'Right Leg':8}, wounds:48 },
  { name:'Hormagaunt', tb:3, armourByLoc:{'Head':3,'Body':3,'Left Arm':3,'Right Arm':3,'Left Leg':3,'Right Leg':3}, wounds:9 },
  { name:'Termagant', tb:3, armourByLoc:{'Head':3,'Body':3,'Left Arm':3,'Right Arm':3,'Left Leg':3,'Right Leg':3}, wounds:9 },
  { name:'Hive Tyrant', tb:15, armourByLoc:{'Head':10,'Body':10,'Left Arm':10,'Right Arm':10,'Left Leg':10,'Right Leg':10}, wounds:120 },
  { name:'Tau Commander (Crisis Suit)', tb:10, armourByLoc:{'Head':9,'Body':9,'Left Arm':9,'Right Arm':9,'Left Leg':9,'Right Leg':9}, wounds:90 },
  { name:'Industrial Servitor', tb:5, armourByLoc:{'Head':7,'Body':7,'Left Arm':7,'Right Arm':7,'Left Leg':7,'Right Leg':7}, wounds:20 },
  { name:'Ork Boy', tb:5, armour:3, wounds:13 },
  { name:'Ork Nob', tb:6, armour:4, wounds:22 },
  { name:'Genestealer', tb:6, armour:6, wounds:22 }
]

function normalizeWeapon(w) {
  const name = String(w.name||'').trim()
  const clsRaw = String(w.class||'other').toLowerCase()
  const cls = ['melee','pistol','basic','heavy','other'].includes(clsRaw) ? clsRaw : 'other'
  const damage = String(w.damage||'1d10').trim()
  let modes = Array.isArray(w.modes) ? w.modes.map(m=>String(m).toLowerCase()) : []
  modes = modes.filter(m=>['single','semi','full'].includes(m))
  if (modes.length===0) modes = ['single']
  const rof = Math.max(1, Number.isFinite(+w.rof) ? +w.rof : 1)
  const pen = Math.max(0, Number.isFinite(+w.pen) ? +w.pen : 0)
  const tearing = !!w.tearing
  const reliable = !!w.reliable
  const proven = Math.max(0, Number.isFinite(+w.proven) ? +w.proven : 0)
  return { name, class: cls, damage, modes, rof, pen, tearing, reliable, proven }
}

function computeWeaponDefaults(w) { return { damage: w.damage, tearing: !!w.tearing, proven: w.proven || 0, pen: w.pen || 0, reliable: !!w.reliable, rof: w.rof || 1, mode: (w.modes && w.modes[0]) || 'single' } }

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

function DeathwatchRoller() {
  const [bs,setBS] = useState(45)
  const [ws,setWS] = useState(45)
  const [defenderBS] = useState(45)
  const [defenderWS, setDefenderWS] = useState(45)
  const [defenderAg, setDefenderAg] = useState(45)
  const [modifier,setModifier] = useState(0)
  const [defenderModifier,setDefenderModifier] = useState(0)
  const [defenseType, setDefenseType] = useState('dodge')
  const [coverBonus, setCoverBonus] = useState(0)
  const [reactionUsed, setReactionUsed] = useState(false)
  const [aim,setAim] = useState(0)
  const [difficulty,setDifficulty] = useState('normal')
  const [awaitingDefense, setAwaitingDefense] = useState(false)
  const [pendingHits, setPendingHits] = useState(null)
  const [mode,setMode] = useState('single')
  const [rof,setRof] = useState(1)
  const [damage,setDamage] = useState('1d10+5')
  const [tearing,setTearing] = useState(false)
  const [proven,setProven] = useState(0)
  const [pen,setPen] = useState(0)
  const [reliable,setReliable] = useState(false)
  const [rfConfirm,setRfConfirm] = useState(true)
  const [targetTB,setTargetTB] = useState(4)
  const [targetArmour,setTargetArmour] = useState(5)
  const [weapons,setWeapons] = useState(()=> safeGet(STORAGE_WEAPONS) ?? defaultWeapons)
  const [weaponName,setWeaponName] = useState('')
  const [enemies] = useState(()=> safeGet(STORAGE_ENEMIES) ?? defaultEnemies)
  const [enemyName,setEnemyName] = useState('Custom/None')

  const trackerInit = safeGet(STORAGE_TRACKER)
  const [maxWounds,setMaxWounds] = useState(() => Math.max(0, trackerInit?.maxWounds ?? 20))
  const [curWounds,setCurWounds] = useState(() => Math.max(0, Math.min(trackerInit?.curWounds ?? 20, trackerInit?.maxWounds ?? 20)))
  const [partDamage,setPartDamage] = useState(() => {
    const zero = { 'Head':0, 'Body':0, 'Left Arm':0, 'Right Arm':0, 'Left Leg':0, 'Right Leg':0 }
    if (!trackerInit?.partDamage) return zero
    return { ...zero, ...trackerInit.partDamage }
  })

  const [armourMap,setArmourMap] = useState({ 'Head':5, 'Body':5, 'Left Arm':5, 'Right Arm':5, 'Left Leg':5, 'Right Leg':5 })

  const [manageWeapons,setManageWeapons] = useState(false)
  const [manageTab,setManageTab] = useState('json')
  const [appendMode,setAppendMode] = useState(true)
  const [weaponsJSON,setWeaponsJSON] = useState(JSON.stringify(weapons,null,2))
  const [weaponsCSV,setWeaponsCSV] = useState('name,class,damage,pen,rof,modes,tearing,proven,reliable')
  const [weaponFilter,setWeaponFilter] = useState('')
  const [presets,setPresets] = useState(()=> safeGet(STORAGE_PRESETS) ?? [])
  const [presetName,setPresetName] = useState('')
  const [history,setHistory] = useState(()=> safeGet(STORAGE_HISTORY) ?? [])
  const [error,setError] = useState('')
  const [info,setInfo] = useState('')
  
  // Manual mode state variables
  const [manualMode, setManualMode] = useState(false)
  const [manualAttackRoll, setManualAttackRoll] = useState('')
  const [manualDefenseRoll, setManualDefenseRoll] = useState('')
  const [manualDamageRolls, setManualDamageRolls] = useState('')

  const usingSkill = useMemo(()=>{ const w = weapons.find(x=>x.name===weaponName); if (!w) return 'BS'; return w.class==='melee' ? 'WS' : 'BS' },[weaponName, weapons])
  const diffMod = useMemo(()=>{ if (difficulty==='easy') return 20; if (difficulty==='hard') return -20; if (difficulty==='deadly') return -30; return 0 },[difficulty])
  const baseSkill = useMemo(()=> usingSkill === 'BS' ? bs : ws, [usingSkill, bs, ws])
  const target = useMemo(()=> Math.max(0, Math.min(100, baseSkill + modifier + aim + diffMod)), [baseSkill, modifier, aim, diffMod])

  useEffect(()=>{ safeSet(STORAGE_HISTORY, history) },[history])
  useEffect(()=>{ safeSet(STORAGE_PRESETS, presets) },[presets])
  useEffect(()=>{ safeSet(STORAGE_WEAPONS, weapons) },[weapons])
  useEffect(()=>{ safeSet(STORAGE_ENEMIES, enemies) },[enemies])
  useEffect(()=>{ safeSet(STORAGE_TRACKER, { maxWounds, curWounds, partDamage }) },[maxWounds, curWounds, partDamage])

  useEffect(()=>{ if (curWounds>maxWounds) setCurWounds(maxWounds) },[maxWounds, curWounds])

  const filteredWeapons = useMemo(()=>{
    const q = weaponFilter.trim().toLowerCase()
    if (!q) return weapons
    return weapons.filter(w => w.name.toLowerCase().includes(q))
  },[weapons, weaponFilter])

  function onSelectWeapon(name) {
    setWeaponName(name)
    const w = weapons.find(x=>x.name===name)
    if (!w) return
    const d = computeWeaponDefaults(w)
    setDamage(d.damage); setTearing(d.tearing); setProven(d.proven); setPen(d.pen); setReliable(d.reliable); setRof(d.rof); setMode(d.mode)
  }

  function uniformArmourMap(val){
    const v = Math.max(0, Number.isFinite(+val)? +val : 0)
    return { 'Head':v, 'Body':v, 'Left Arm':v, 'Right Arm':v, 'Left Leg':v, 'Right Leg':v }
  }

  function onSelectEnemy(name) {
    setEnemyName(name)
    const e = enemies.find(x=>x.name===name)
    if (!e) return
    setTargetTB(e.tb); setTargetArmour(e.armour ?? 0)
    if (e.armourByLoc) setArmourMap({ ...uniformArmourMap(0), ...e.armourByLoc })
    else setArmourMap(uniformArmourMap(e.armour ?? 0))
    if (typeof e.wounds === 'number' && e.wounds >= 0) { setMaxWounds(e.wounds); setCurWounds(e.wounds); setPartDamage({ 'Head':0, 'Body':0, 'Left Arm':0, 'Right Arm':0, 'Left Leg':0, 'Right Leg':0 }) }
  }

  function importFromJSONText(txt) {
    try {
      const arr = JSON.parse(txt)
      if (!Array.isArray(arr)) throw new Error('JSON must be an array')
      const next = arr.map(normalizeWeapon).filter(w=>w.name)
      const merged = appendMode ? mergeWeapons(weapons, next) : next
      setWeapons(merged); setWeaponsJSON(JSON.stringify(merged,null,2)); setInfo(`Loaded ${next.length} weapons`); console.info('[DW] Imported JSON weapons:', next.length)
    } catch (e) { setError('Invalid weapons JSON'); console.error('[DW] Import JSON error:', e) }
  }

  function importFromCSVText(txt) {
    try {
      const rows = simpleCSVParse(txt)
      const mapped = rows.map(r => normalizeWeapon({
        name: r.name,
        class: r.class,
        damage: r.damage,
        pen: Number(r.pen || 0),
        rof: Number(r.rof || 1),
        modes: String(r.modes || 'single').split('|').map(s => s.trim().toLowerCase()),
        tearing: ['1', 'true', 'yes', 'y'].includes(String(r.tearing || '').toLowerCase()),
        proven: Number(r.proven || 0),
        reliable: ['1', 'true', 'yes', 'y'].includes(String(r.reliable || '').toLowerCase()),
      }))
      const merged = appendMode ? mergeWeapons(weapons, mapped) : mapped
      setWeapons(merged); setWeaponsJSON(JSON.stringify(merged,null,2)); setInfo(`Loaded ${mapped.length} weapons from CSV`); console.info('[DW] Imported CSV weapons:', mapped.length)
    } catch (e) { setError('Invalid CSV'); console.error('[DW] Import CSV error:', e) }
  }

  function mergeWeapons(existing, incoming) {
    const byName = new Map(existing.map(w=>[w.name.toLowerCase(), w]))
    for (const w of incoming) byName.set(w.name.toLowerCase(), w)
    return Array.from(byName.values()).sort((a,b)=>a.name.localeCompare(b.name))
  }

  function exportWeapons() {
    try {
      const blob = new Blob([JSON.stringify(weapons,null,2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'deathwatch-weapons.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setInfo('Exported current weapons to JSON')
      console.info('[DW] Exported weapons:', weapons.length)
      setTimeout(()=> URL.revokeObjectURL(url), 2500)
    } catch (e) { setError('Export failed'); console.error('[DW] Export error:', e) }
  }

  function armourFor(where){ return (armourMap[where] ?? targetArmour) }

  function runAttack() {
    setError(''); setInfo('')
    setReactionUsed(false) // Reset reaction for new attack
    let dmgSpec
    try { dmgSpec = parseDice(damage) } catch (e) { setError('Invalid damage expression'); return }
    
    // Use manual roll if manual mode is enabled
    let attackRoll
    if (manualMode && manualAttackRoll.trim()) {
      const manualRoll = parseInt(manualAttackRoll.trim())
      if (isNaN(manualRoll) || manualRoll < 1 || manualRoll > 100) {
        setError('Manual attack roll must be a number between 1-100')
        return
      }
      attackRoll = manualRoll
    } else {
      attackRoll = d100()
    }
    
    const isRanged = usingSkill==='BS'
    const jamThreshold = isRanged ? (reliable ? 100 : 96) : 101
    const jammed = attackRoll >= jamThreshold
    const dg = degrees(target, attackRoll)
    const where = hitLocationFromRoll(attackRoll)

    if (dg.success) {
      const hits = hitsFromDoS(mode, dg.dos, rof)
      // Store attack info and prompt for defense roll
      setPendingHits({
        hits,
        attackRoll,
        where,
        isRanged,
        dmgSpec,
        jammed,
        mode,
        rof
      })
      setAwaitingDefense(true)
      setInfo(`Attack hit! Roll defense to determine if damage is applied.`)
      return
    }

    // Attack failed - no damage
    const res = { id: uid(), ts: Date.now(), attackRoll, target, success: dg.success, dos: dg.dos, dof: dg.dof, mode, rof, hits: 0, where, jammed, perHit: [], weapon: weaponName || undefined, enemy: enemyName || undefined, using: usingSkill }
    setHistory(prev => [res, ...prev].slice(0, 50))
    setInfo(`Attack missed with DoF ${dg.dof}`)
  }

  function resetTracker() {
    setCurWounds(maxWounds)
    setPartDamage({ 'Head':0, 'Body':0, 'Left Arm':0, 'Right Arm':0, 'Left Leg':0, 'Right Leg':0 })
  }

  function saveCurrentAsPreset() { if (!presetName.trim()) return; const p = { name: presetName.trim(), bs, ws, modifier, aim, mode, rof, damage, tearing, proven, pen, reliable, rfConfirm, targetTB, targetArmour, weapon: weaponName || undefined, enemy: enemyName || undefined }; setPresets(prev => { const others = prev.filter(x => x.name !== p.name); return [...others, p].sort((a,b)=>a.name.localeCompare(b.name)) }); setPresetName('') }
  function applyPreset(p) { setBS(p.bs ?? bs); setWS(p.ws ?? ws); setModifier(p.modifier); setAim(p.aim); setMode(p.mode); setRof(p.rof); setDamage(p.damage); setTearing(p.tearing); setProven(p.proven); setPen(p.pen); setReliable(p.reliable); setRfConfirm(p.rfConfirm); setTargetTB(p.targetTB); setTargetArmour(p.targetArmour); if (p.weapon) { onSelectWeapon(p.weapon) } else { setWeaponName('') } if (p.enemy) { onSelectEnemy(p.enemy) } else { setEnemyName('Custom/None') } }
  function deletePreset(name) { setPresets(prev => prev.filter(x => x.name !== name)) }
  function clearHistory() { setHistory([]) }

  function runDefense() {
    setError(''); setInfo('')
    if (!pendingHits) return
    
    // Check if reaction is already used
    if (reactionUsed) {
      setError('Reaction already used this round')
      return
    }

    // Determine defense type and target
    let defenseTarget, defenseSkill, defenseTypeName
    const isRanged = pendingHits.isRanged
    
    switch (defenseType) {
      case 'dodge':
        defenseSkill = defenderAg
        defenseTypeName = 'Dodge'
        break
      case 'parry':
        if (!isRanged) {
          defenseSkill = defenderWS
          defenseTypeName = 'Parry'
        } else {
          setError('Cannot parry ranged attacks')
          return
        }
        break
      case 'block':
        defenseSkill = defenderWS
        defenseTypeName = 'Block'
        break
      case 'cover':
        defenseSkill = defenderAg
        defenseTypeName = 'Cover'
        break
      default:
        defenseSkill = isRanged ? defenderBS : defenderWS
        defenseTypeName = isRanged ? 'BS' : 'WS'
    }

    // Calculate defense target with modifiers
    let totalModifier = defenderModifier
    if (defenseType === 'cover') totalModifier += 20 + coverBonus // Cover: +20 plus any input cover bonus
    if (defenseType === 'block') totalModifier += 10 // Block provides +10 bonus
    
    defenseTarget = Math.max(0, Math.min(100, defenseSkill + totalModifier))
    
    // Use manual roll if manual mode is enabled
    let defenseRoll
    if (manualMode && manualDefenseRoll.trim()) {
      const manualRoll = parseInt(manualDefenseRoll.trim())
      if (isNaN(manualRoll) || manualRoll < 1 || manualRoll > 100) {
        setError('Manual defense roll must be a number between 1-100')
        return
      }
      defenseRoll = manualRoll
    } else {
      defenseRoll = d100()
    }
    const dg = degrees(defenseTarget, defenseRoll)

    if (dg.success) {
      setInfo(`${defenseTypeName} successful! Attack avoided with DoS (Degrees of Success) ${dg.dos}`)
      const res = { 
        id: uid(),
        ts: Date.now(),
        attackRoll: pendingHits.attackRoll,
        target,
        success: true,
        hits: pendingHits.hits,
        where: pendingHits.where,
        jammed: pendingHits.jammed,
        perHit: [],
        weapon: weaponName || undefined,
        enemy: enemyName || undefined,
        using: pendingHits.isRanged ? 'BS' : 'WS',
        defenseRoll,
        defenseTarget,
        defenseType: defenseTypeName,
        defenseFailed: false,
        mode: pendingHits.mode,
        rof: pendingHits.rof
      }
      setHistory(prev => [res, ...prev].slice(0, 50))
      setAwaitingDefense(false)
      setPendingHits(null)
      setReactionUsed(true)
      return
    }

    // Defense failed, apply the pending hits
    const where = pendingHits.where
    const perHit = []
    let totalApplied = 0
    let nextParts = { ...partDamage }
    
    for (let i=0; i<pendingHits.hits; i++) {
      let r
      if (manualMode && manualDamageRolls.trim()) {
        // Parse manual damage rolls
        const manualRolls = manualDamageRolls.trim().split(/[,\s]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1)
        if (manualRolls.length === 0) {
          setError('Manual damage rolls must be comma-separated numbers (e.g., "7, 9")')
          return
        }
        r = { rolls: manualRolls, total: manualRolls.reduce((a,b) => a+b, 0) }
      } else {
        r = rollDice(pendingHits.dmgSpec.terms, { tearing, proven })
      }
      
      const tenCount = r.rolls.filter(x=>x===10).length
      let rfExtras = []
      if (tenCount>0) {
        if (rfConfirm) {
          let confirm
          if (manualMode && manualAttackRoll.trim()) {
            // Use a second manual roll for RF confirmation if available
            const confirmRoll = parseInt(manualAttackRoll.trim())
            if (!isNaN(confirmRoll) && confirmRoll >= 1 && confirmRoll <= 100) {
              confirm = confirmRoll
            } else {
              confirm = d100()
            }
          } else {
            confirm = d100()
          }
          if (confirm <= target) rfExtras = Array.from({length: tenCount}, ()=> Math.floor(Math.random()*10)+1)
        } else {
          rfExtras = Array.from({length: tenCount}, ()=> Math.floor(Math.random()*10)+1)
        }
      }
                            const raw = r.total + rfExtras.reduce((a,b)=>a+b,0) + pendingHits.dmgSpec.flat
                      const arForLoc = Math.max(0, armourFor(where) - pen)
                      const mitigated = mitigateDamage(raw, targetTB, arForLoc)
                      const flatText = pendingHits.dmgSpec.flat ? (' + ' + pendingHits.dmgSpec.flat) : ''
                      const rollsText = r.rolls.join(', ') + (rfExtras.length ? (' | RF: ' + rfExtras.join(', ')) : '')
                      const damageText = mitigated > 0 ? `${mitigated}` : `${mitigated} (Negated)`
                      perHit.push({ where, raw, mitigated, detail: `${rollsText}${flatText} - TB (Toughness Bonus) ${targetTB} - Armour(${where}) ${arForLoc} = ${damageText}` })
      if (BODY_PARTS.includes(where)) nextParts[where] = (nextParts[where]||0) + mitigated
      totalApplied += Math.max(0, mitigated|0)
    }
    
    const res = { 
      id: uid(), 
      ts: Date.now(), 
      attackRoll: pendingHits.attackRoll,
      target, 
      success: true, 
      hits: pendingHits.hits, 
      where, 
      jammed: pendingHits.jammed, 
      perHit,
      weapon: weaponName || undefined,
      enemy: enemyName || undefined,
      using: pendingHits.isRanged ? 'BS' : 'WS',
      defenseRoll,
      defenseTarget,
      defenseType: defenseTypeName,
      defenseFailed: true,
      mode: pendingHits.mode,
      rof: pendingHits.rof
    }
    
    setHistory(prev => [res, ...prev].slice(0, 50))
    if (totalApplied>0) {
      setPartDamage(nextParts)
      setCurWounds(w => Math.max(0, w - totalApplied))
      setInfo(`${defenseTypeName} failed with DoF (Degrees of Failure) ${dg.dof}. Applied ${totalApplied} damage to ${where}`)
    } else {
      setInfo(`${defenseTypeName} failed with DoF (Degrees of Failure) ${dg.dof}. No damage applied - attack completely negated by armour and toughness.`)
    }
    
    setAwaitingDefense(false)
    setPendingHits(null)
    setReactionUsed(true)
  }

  const allowedModes = useMemo(()=>{ const w = weapons.find(x=>x.name===weaponName); return w && Array.isArray(w.modes) && w.modes.length ? w.modes : ['single','semi','full'] },[weapons, weaponName])

  const woundPct = maxWounds>0 ? Math.max(0, Math.min(100, (curWounds/maxWounds)*100)) : 0
  const status = curWounds<=0 ? 'Dead' : (curWounds<maxWounds ? 'Wounded' : 'Alive')
  const statusColor = status==='Dead' ? 'bg-rose-600' : status==='Wounded' ? 'bg-amber-500' : 'bg-emerald-600'

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 p-6 md:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        {(error||info) && (
          <div className={`rounded-xl px-4 py-3 ${error? 'bg-rose-900/40 border border-rose-500/40 text-rose-200':'bg-emerald-900/30 border border-emerald-500/40 text-emerald-200'}`}>
            {error ? error : <div dangerouslySetInnerHTML={{ __html: info }} />}
          </div>
        )}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Deathwatch Roller Pro</h1>
          <div className="flex items-center gap-3">
            <div className="text-xs uppercase tracking-wide opacity-70">Target {target} • {usingSkill}</div>
            <span className={`text-xs px-2 py-1 rounded ${statusColor}`}>{status}</span>
            <button 
              onClick={() => setInfo(`
                <strong>Abbreviations Guide:</strong><br/>
                • <strong>BS</strong> - Ballistic Skill (ranged attacks)<br/>
                • <strong>WS</strong> - Weapon Skill (melee attacks)<br/>
                • <strong>Ag</strong> - Agility (dodge/cover defense)<br/>
                • <strong>TB</strong> - Toughness Bonus (reduces damage)<br/>
                • <strong>AR</strong> - Armour Rating (reduces damage)<br/>
                • <strong>Pen</strong> - Penetration (reduces armour)<br/>
                • <strong>RoF</strong> - Rate of Fire (max shots)<br/>
                • <strong>DoS</strong> - Degrees of Success<br/>
                • <strong>DoF</strong> - Degrees of Failure<br/>
                • <strong>RF</strong> - Righteous Fury (extra damage on 10s)<br/>
                • <strong>W</strong> - Wounds (health points)<br/><br/>
                <strong>Damage Calculation:</strong><br/>
                Final Damage = Raw Damage - TB - (Armour - Pen)<br/>
                If result ≤ 0, damage is completely negated<br/><br/>
                <strong>Manual Mode:</strong><br/>
                • Enable to input dice rolls manually<br/>
                • Attack/Defense: Enter 1-100 values<br/>
                • Damage: Enter comma-separated numbers (e.g., "7, 9")<br/>
                • Useful for physical dice or GM-controlled rolls
              `)} 
              className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600"
            >
              ?
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5 space-y-4 shadow-xl">
            {awaitingDefense && pendingHits && (
              <div className="mb-4 rounded-xl bg-amber-900/50 border border-amber-500/30 p-4">
                <div className="text-lg font-bold mb-2">Incoming Attack!</div>
                <div className="text-sm mb-4">
                  Attack hit with {pendingHits.hits} potential hit{pendingHits.hits !== 1 ? 's' : ''}.
                  Roll defense to determine if damage is applied.
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs uppercase opacity-70">Defense Type</label>
                    <select className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" value={defenseType} onChange={e=>setDefenseType(e.target.value)}>
                      <option value="dodge">Dodge (Agility)</option>
                      <option value="parry" disabled={pendingHits?.isRanged}>Parry (WS - Melee Only)</option>
                      <option value="block">Block (WS +10)</option>
                      <option value="cover">Cover (Agility +20)</option>
                    </select>
                    {pendingHits && (
                      <div className="text-xs opacity-60 mt-1">
                        {pendingHits.isRanged ? 'Ranged attack - Parry disabled' : 'Melee attack - Parry available'}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs uppercase opacity-70">Cover Bonus</label>
                    <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" value={coverBonus} onChange={e=>setCoverBonus(parseInt(e.target.value||'0'))} />
                  </div>
                  <div>
                    <label className="text-xs uppercase opacity-70">
                      <Tooltip text="Agility - Used for dodge and cover defenses">Defender's Ag</Tooltip>
                    </label>
                    <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" value={defenderAg} onChange={e=>setDefenderAg(parseInt(e.target.value||'0'))} />
                  </div>
                  <div>
                    <label className="text-xs uppercase opacity-70">
                      <Tooltip text="Weapon Skill - Used for parry and block defenses">Defender's WS</Tooltip>
                    </label>
                    <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" value={defenderWS} onChange={e=>setDefenderWS(parseInt(e.target.value||'0'))} />
                  </div>
                  <div>
                    <label className="text-xs uppercase opacity-70">Defense Modifier</label>
                    <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" value={defenderModifier} onChange={e=>setDefenderModifier(parseInt(e.target.value||'0'))} />
                  </div>
                  <div className="flex items-center">
                    <label className="text-xs uppercase opacity-70">Reaction Used</label>
                    <input type="checkbox" className="ml-2 align-middle" checked={reactionUsed} onChange={e=>setReactionUsed(e.target.checked)} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={runDefense} className="rounded-xl px-4 py-2 bg-amber-600 hover:bg-amber-500">Roll Defense</button>
                  <button onClick={()=>{ 
                    // Apply damage without defense
                    const where = pendingHits.where
                    const perHit = []
                    let totalApplied = 0
                    let nextParts = { ...partDamage }
                    
                    for (let i=0; i<pendingHits.hits; i++) {
                      let r
                      if (manualMode && manualDamageRolls.trim()) {
                        // Parse manual damage rolls
                        const manualRolls = manualDamageRolls.trim().split(/[,\s]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1)
                        if (manualRolls.length === 0) {
                          setError('Manual damage rolls must be comma-separated numbers (e.g., "7, 9")')
                          return
                        }
                        r = { rolls: manualRolls, total: manualRolls.reduce((a,b) => a+b, 0) }
                      } else {
                        r = rollDice(pendingHits.dmgSpec.terms, { tearing, proven })
                      }
                      
                      const tenCount = r.rolls.filter(x=>x===10).length
                      let rfExtras = []
                      if (tenCount>0) {
                        if (rfConfirm) {
                          let confirm
                          if (manualMode && manualAttackRoll.trim()) {
                            // Use a second manual roll for RF confirmation if available
                            const confirmRoll = parseInt(manualAttackRoll.trim())
                            if (!isNaN(confirmRoll) && confirmRoll >= 1 && confirmRoll <= 100) {
                              confirm = confirmRoll
                            } else {
                              confirm = d100()
                            }
                          } else {
                            confirm = d100()
                          }
                          if (confirm <= target) rfExtras = Array.from({length: tenCount}, ()=> Math.floor(Math.random()*10)+1)
                        } else {
                          rfExtras = Array.from({length: tenCount}, ()=> Math.floor(Math.random()*10)+1)
                        }
                      }
                      const raw = r.total + rfExtras.reduce((a,b)=>a+b,0) + pendingHits.dmgSpec.flat
                      const arForLoc = Math.max(0, armourFor(where) - pen)
                      const mitigated = mitigateDamage(raw, targetTB, arForLoc)
                      const flatText = pendingHits.dmgSpec.flat ? (' + ' + pendingHits.dmgSpec.flat) : ''
                      const rollsText = r.rolls.join(', ') + (rfExtras.length ? (' | RF: ' + rfExtras.join(', ')) : '')
                      const damageText = mitigated > 0 ? `${mitigated}` : `${mitigated} (Negated)`
                      perHit.push({ where, raw, mitigated, detail: `${rollsText}${flatText} - TB (Toughness Bonus) ${targetTB} - Armour(${where}) ${arForLoc} = ${damageText}` })
                      if (BODY_PARTS.includes(where)) nextParts[where] = (nextParts[where]||0) + mitigated
                      totalApplied += Math.max(0, mitigated|0)
                    }
                    
                    const res = { 
                      id: uid(), 
                      ts: Date.now(), 
                      attackRoll: pendingHits.attackRoll,
                      target, 
                      success: true, 
                      hits: pendingHits.hits, 
                      where, 
                      jammed: pendingHits.jammed, 
                      perHit,
                      weapon: weaponName || undefined,
                      enemy: enemyName || undefined,
                      using: pendingHits.isRanged ? 'BS' : 'WS',
                      defenseType: 'No Defense',
                      defenseFailed: true,
                      mode: pendingHits.mode,
                      rof: pendingHits.rof
                    }
                    
                    setHistory(prev => [res, ...prev].slice(0, 50))
                    if (totalApplied>0) {
                      setPartDamage(nextParts)
                      setCurWounds(w => Math.max(0, w - totalApplied))
                      setInfo(`No defense used. Applied ${totalApplied} damage to ${where}`)
                    } else {
                      setInfo(`No defense used. No damage applied - attack completely negated by armour and toughness.`)
                    }
                    
                    setAwaitingDefense(false)
                    setPendingHits(null)
                  }} className="rounded-xl px-4 py-2 bg-slate-700 hover:bg-slate-600">No Defense</button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 items-end">
              <div className="lg:col-span-3">
                <label className="text-xs uppercase opacity-70">Weapon</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 mb-2" placeholder="Search weapons..." value={weaponFilter} onChange={e=>setWeaponFilter(e.target.value)} />
                    <select className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" value={weaponName} onChange={e=>onSelectWeapon(e.target.value)}>
                      <option value="">Custom</option>
                      {filteredWeapons.map(w => (<option key={w.name} value={w.name}>{w.name}</option>))}
                    </select>
                  </div>
                  <button onClick={()=>{ setManageWeapons(v=>!v); setManageTab('json'); setWeaponsJSON(JSON.stringify(weapons,null,2)); setWeaponsCSV('name,class,damage,pen,rof,modes,tearing,proven,reliable') }} className="rounded-xl px-3 py-2 bg-slate-700 hover:bg-slate-600">Manage</button>
                </div>
              </div>
              <div className="lg:col-span-3">
                <label className="text-xs uppercase opacity-70">Enemy</label>
                <select className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" value={enemyName} onChange={e=>onSelectEnemy(e.target.value)}>
                  {enemies.map(en => (<option key={en.name} value={en.name}>{en.name}{en.name==='Custom/None' ? '' : ` (TB ${en.tb} / AR Var / W ${en.wounds??'-'})`}</option>))}
                </select>
                <div className="text-xs opacity-60 mt-1">
                  <Tooltip text="Toughness Bonus">TB</Tooltip> / <Tooltip text="Armour Rating">AR</Tooltip> / <Tooltip text="Wounds">W</Tooltip>
                </div>
              </div>
              <div>
                <label className="text-xs uppercase opacity-70">
                  <Tooltip text="Ballistic Skill - Used for ranged attacks">Attacker's BS</Tooltip>
                </label>
                <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" value={bs} onChange={e=>setBS(parseInt(e.target.value||'0'))} />
              </div>
              <div>
                <label className="text-xs uppercase opacity-70">
                  <Tooltip text="Weapon Skill - Used for melee attacks">Attacker's WS</Tooltip>
                </label>
                <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" value={ws} onChange={e=>setWS(parseInt(e.target.value||'0'))} />
              </div>
              <div>
                <label className="text-xs uppercase opacity-70">Modifier</label>
                <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" value={modifier} onChange={e=>setModifier(parseInt(e.target.value||'0'))} />
              </div>
              <div>
                <label className="text-xs uppercase opacity-70">Aim</label>
                <select className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" value={aim} onChange={e=>setAim(parseInt(e.target.value))}>
                  <option value={0}>None</option>
                  <option value={10}>Half (+10)</option>
                  <option value={20}>Full (+20)</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase opacity-70">Difficulty</label>
                <select className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" value={difficulty} onChange={e=>setDifficulty(e.target.value)}>
                  <option value="easy">Easy (+20)</option>
                  <option value="normal">Normal (+0)</option>
                  <option value="hard">Hard (-20)</option>
                  <option value="deadly">Deadly (-30)</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase opacity-70">Mode</label>
                <select className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" value={mode} onChange={e=>setMode(e.target.value)}>
                  {(['single','semi','full']).map(m => (
                    <option key={m} value={m} disabled={!allowedModes.includes(m)}>{m[0].toUpperCase()+m.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase opacity-70">
                  <Tooltip text="Rate of Fire - Maximum shots per attack">RoF</Tooltip>
                </label>
                <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" min={1} value={rof} onChange={e=>setRof(parseInt(e.target.value||'1'))} />
              </div>
              <div className="lg:col-span-3">
                <label className="text-xs uppercase opacity-70">Damage</label>
                <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" value={damage} onChange={e=>{ setDamage(e.target.value); if (error) setError('') }} />
              </div>
              <div>
                <label className="text-xs uppercase opacity-70">
                  <Tooltip text="Tearing - Roll damage dice twice, take highest">Tearing</Tooltip>
                </label>
                <input type="checkbox" className="ml-2 align-middle" checked={tearing} onChange={e=>setTearing(e.target.checked)} />
              </div>
              <div>
                <label className="text-xs uppercase opacity-70">
                  <Tooltip text="Proven - Minimum value for d10 damage dice">Proven</Tooltip>
                </label>
                <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" min={0} max={10} value={proven} onChange={e=>setProven(parseInt(e.target.value||'0'))} />
              </div>
              <div>
                <label className="text-xs uppercase opacity-70">
                  <Tooltip text="Penetration - Reduces target's armour value">Pen</Tooltip>
                </label>
                <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" min={0} value={pen} onChange={e=>setPen(parseInt(e.target.value||'0'))} />
              </div>
              <div>
                <label className="text-xs uppercase opacity-70">
                  <Tooltip text="Reliable - Weapon cannot jam on natural 96-00">Reliable</Tooltip>
                </label>
                <input type="checkbox" className="ml-2 align-middle" checked={reliable} onChange={e=>setReliable(e.target.checked)} />
              </div>
              <div>
                <label className="text-xs uppercase opacity-70">
                  <Tooltip text="Righteous Fury Confirm - Roll to confirm extra damage on 10s">RF confirm</Tooltip>
                </label>
                <input type="checkbox" className="ml-2 align-middle" checked={rfConfirm} onChange={e=>setRfConfirm(e.target.checked)} />
              </div>
              <div>
                <label className="text-xs uppercase opacity-70">
                  <Tooltip text="Toughness Bonus - Reduces incoming damage">Target TB</Tooltip>
                </label>
                <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" min={0} value={targetTB} onChange={e=>setTargetTB(parseInt(e.target.value||'0'))} />
              </div>
              <div>
                <label className="text-xs uppercase opacity-70">
                  <Tooltip text="Armour - Reduces incoming damage (Body location)">Target Armour (Body)</Tooltip>
                </label>
                <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" min={0} value={targetArmour} onChange={e=>{ const v = parseInt(e.target.value||'0'); setTargetArmour(v); setArmourMap(uniformArmourMap(v)) }} />
              </div>
            </div>
            
            {/* Manual Mode Controls */}
            <div className="rounded-xl bg-amber-900/20 border border-amber-500/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-amber-200">Manual Dice Mode</div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input 
                      type="checkbox" 
                      checked={manualMode} 
                      onChange={e=>{
                        setManualMode(e.target.checked)
                        if (!e.target.checked) {
                          // Clear manual rolls when disabling manual mode
                          setManualAttackRoll('')
                          setManualDefenseRoll('')
                          setManualDamageRolls('')
                        }
                      }} 
                      className="rounded"
                    />
                    Enable Manual Rolls
                  </label>
                </div>
              </div>
              
              {manualMode && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <label className="text-xs uppercase opacity-70">Manual Attack Roll (1-100)</label>
                    <input 
                      className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" 
                      type="number" 
                      min="1" 
                      max="100"
                      placeholder="e.g., 45"
                      value={manualAttackRoll} 
                      onChange={e=>setManualAttackRoll(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase opacity-70">Manual Defense Roll (1-100)</label>
                    <input 
                      className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" 
                      type="number" 
                      min="1" 
                      max="100"
                      placeholder="e.g., 67"
                      value={manualDefenseRoll} 
                      onChange={e=>setManualDefenseRoll(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase opacity-70">Manual Damage Rolls</label>
                    <input 
                      className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" 
                      type="text"
                      placeholder="e.g., 7, 9"
                      value={manualDamageRolls} 
                      onChange={e=>setManualDamageRolls(e.target.value)} 
                    />
                    <div className="text-xs opacity-60 mt-1">Comma-separated numbers</div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button onClick={runAttack} className="rounded-xl px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-[.99] transition">Roll</button>
              <div className="text-sm opacity-80">Target <span className="font-semibold">{target}</span></div>
            </div>
            {manageWeapons && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Manage Weapons</div>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1"><input type="checkbox" checked={appendMode} onChange={e=>setAppendMode(e.target.checked)} />Append</label>
                    <button onClick={()=>setManageWeapons(false)} className="rounded-xl px-3 py-1.5 bg-slate-700">Close</button>
                  </div>
                </div>
                <div className="flex gap-2 text-xs">
                  <button onClick={()=>setManageTab('json')} className={`px-2 py-1 rounded ${manageTab==='json'?'bg-slate-600':'bg-slate-800'}`}>JSON</button>
                  <button onClick={()=>setManageTab('csv')} className={`px-2 py-1 rounded ${manageTab==='csv'?'bg-slate-600':'bg-slate-800'}`}>CSV</button>
                  <button onClick={exportWeapons} className="px-2 py-1 rounded bg-emerald-700">Export JSON</button>
                </div>
                {manageTab==='json' ? (
                  <>
                    <textarea className="w-full h-48 rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs" value={weaponsJSON} onChange={e=>setWeaponsJSON(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={()=>importFromJSONText(weaponsJSON)} className="rounded-xl px-3 py-2 bg-blue-600">Import JSON</button>
                      <button onClick={()=>{ setWeapons(defaultWeapons); setWeaponsJSON(JSON.stringify(defaultWeapons,null,2)); setInfo('Reset to defaults') }} className="rounded-xl px-3 py-2 bg-slate-700">Reset Defaults</button>
                    </div>
                  </>
                ) : (
                  <>
                    <textarea className="w-full h-48 rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs" value={weaponsCSV} onChange={e=>setWeaponsCSV(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={()=>importFromCSVText(weaponsCSV)} className="rounded-xl px-3 py-2 bg-blue-600">Import CSV</button>
                    </div>
                  </>
                )}
              </div>
            )}
            {history[0] && (
              <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2">
                <div className="text-sm">{history[0].weapon ? `${history[0].weapon} • ` : ''}{history[0].using} • Attack <span className="font-semibold">{history[0].attackRoll}</span> → <span className="text-emerald-400">Hit!</span></div>
                {history[0].defenseRoll && (
                  <div className="text-sm">{history[0].defenseType || 'Defense'} <span className="font-semibold">{history[0].defenseRoll}</span> vs {history[0].defenseTarget} → {history[0].defenseFailed ? <span className="text-rose-400">Failed!</span> : <span className="text-emerald-400">Defended!</span>}</div>
                )}
                <div className="text-sm">{history[0].mode?.toUpperCase() || 'SINGLE'} • RoF <span className="font-semibold">{history[0].rof || 1}</span> • Hits <span className="font-semibold">{history[0].hits}</span> • {history[0].where}{history[0].jammed && <span className="ml-2 text-rose-400">JAM</span>}</div>
                {history[0].perHit && history[0].perHit.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Damage</div>
                    <ul className="text-sm list-disc ml-6">
                      {history[0].perHit.map((h, i)=>(<li key={i}><span className="font-semibold">{h.mitigated}</span> ({h.detail})</li>))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="pt-2 border-t border-white/10">
              <div className="flex gap-2">
                <input className="flex-1 rounded-xl border border-white/10 bg-white/10 px-3 py-2" placeholder="Preset name" value={presetName} onChange={e=>setPresetName(e.target.value)} />
                <button onClick={saveCurrentAsPreset} className="rounded-xl px-3 py-2 bg-slate-700 hover:bg-slate-600">Save</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {presets.map(p => (
                  <div key={p.name} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 flex items-center gap-2">
                    <button className="underline" onClick={()=>applyPreset(p)}>{p.name}</button>
                    <button onClick={()=>deletePreset(p.name)} className="text-xs px-2 py-1 rounded bg-rose-600">x</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold">Enemy Wounds Tracker</div>
                <button onClick={resetTracker} className="text-xs rounded px-2 py-1 bg-slate-700 hover:bg-slate-600">Reset</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs uppercase opacity-70">Max Wounds</label>
                  <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" min={0} value={maxWounds} onChange={e=>setMaxWounds(Math.max(0, parseInt(e.target.value||'0')))} />
                </div>
                <div>
                  <label className="text-xs uppercase opacity-70">Current Wounds</label>
                  <input className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2" type="number" min={0} value={curWounds} onChange={e=>setCurWounds(Math.max(0, parseInt(e.target.value||'0')))} />
                </div>
                <div className="col-span-2">
                  <div className="h-2 w-full bg-white/10 rounded overflow-hidden">
                    <div className="h-2 bg-emerald-500" style={{width: `${woundPct}%`}}></div>
                  </div>
                  <div className="text-xs opacity-70 mt-1">{curWounds}/{maxWounds} remaining</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BODY_PARTS.map(p => (
                  <div key={p} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="text-xs opacity-70">{p}</div>
                    <div className="text-lg font-semibold">{partDamage[p]||0}</div>
                    <div className="text-xs opacity-60 mt-1">
                      <Tooltip text="Armour Rating">AR</Tooltip> {armourMap[p]??targetArmour}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-5 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold">Roll History</div>
                <button onClick={clearHistory} className="text-xs rounded px-2 py-1 rounded-xl bg-slate-700 hover:bg-slate-600">Clear</button>
              </div>
              <div className="overflow-y-auto space-y-2 pr-2" style={{maxHeight:'520px'}}>
                {history.length===0 && <div className="text-sm opacity-70">No rolls yet</div>}
                {history.map(r => (
                  <div key={r.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center justify-between text-xs opacity-80">
                      <div>{new Date(r.ts).toLocaleTimeString()}</div>
                      <div>{r.weapon ? `${r.weapon} • ` : ''}{r.using || 'Unknown'} • {r.mode ? r.mode.toUpperCase() : 'SINGLE'} • RoF {r.rof || 1}</div>
                    </div>
                    <div className="text-sm mt-1">{r.success ? <span className="text-emerald-400">Success</span> : <span className="text-rose-400">Fail</span>} • Roll {r.attackRoll || '?'} • Target {r.target || '?'} • Hits {r.hits || 0} • {r.where || 'Unknown'}{r.jammed ? ' • JAM' : ''}</div>
                    {r.success && r.hits > 0 && r.perHit && Array.isArray(r.perHit) && (
                      <div className="text-xs opacity-80">{r.enemy? (r.enemy + ' • '): ''}{r.perHit.map((h,i)=>`${i+1}:${h.mitigated || 0}`).join('  ')}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            </div>
        </div>
      </div>
    </section>
  )
}

function __run_tests__() {
  const a = parseDice('1d10+5'); if (!(a.terms.length===1 && a.terms[0].count===1 && a.terms[0].faces===10 && a.flat===5)) throw new Error('parseDice a')
  const b = parseDice('2d10+3'); if (!(b.terms.length===1 && b.terms[0].count===2 && b.terms[0].faces===10 && b.flat===3)) throw new Error('parseDice b')
  const c1 = degrees(50,30); if (!(c1.success && c1.dos===3)) throw new Error('degrees success')
  const c2 = degrees(50,70); if (!(!c2.success && c2.dof===3)) throw new Error('degrees fail')
  if (hitsFromDoS('semi',3,3)!==2) throw new Error('hits semi')
  if (hitsFromDoS('full',3,3)!==3) throw new Error('hits full')
  if (hitsFromDoS('single',5,2)!==1) throw new Error('hits single')
  if (hitLocationFromRoll(1)!=='Head') throw new Error('hitloc head')
  if (hitLocationFromRoll(99)!=='Left Leg') throw new Error('hitloc leg')
  if (hitLocationFromRoll(15)!=='Body') throw new Error('hitloc body')
  if (mitigateDamage(15,4,5)!==6) throw new Error('mitigate a')
  if (mitigateDamage(7,4,5)!==0) throw new Error('mitigate b')
  const p = parseDice('1d10'); if (!(p.terms[0].count===1 && p.terms[0].faces===10 && p.flat===0)) throw new Error('parseDice c')
  if (hitsFromDoS('semi',1,3)!==1) throw new Error('hits semi edge')
  if (mitigateDamage(3,4,5)!==0) throw new Error('mitigate floor')
  try { parseDice('1d10+foo'); throw new Error('parseDice invalid should throw') } catch {}
  const z = (()=>{ try { parseDice('1d10+bar'); return 'ok' } catch { return 'err' } })(); if (z!=='err') throw new Error('invalid dice not handled')
  const eq = degrees(55,55); if (!(eq.success && eq.dos===1)) throw new Error('degrees equality')
  if (hitsFromDoS('semi',0,3)!==1) throw new Error('semi min hits')
  const sp = parseDice(' 2D10 + 5 '); if (!(sp.terms[0].count===2 && sp.terms[0].faces===10 && sp.flat===5)) throw new Error('parseDice spaces')
  const emp = parseDice(''); if (!(emp.terms[0].count===1 && emp.terms[0].faces===10 && emp.flat===0)) throw new Error('parseDice empty')
  try { parseDice('d10') } catch {}
  try { parseDice('0d10') } catch {}
  try { parseDice('1d0') } catch {}
  if (hitsFromDoS('single',3,0)!==1) throw new Error('single min hits')
  const csv1 = 'name,class,damage\nFoo,basic,1d10+5'; const r1 = simpleCSVParse(csv1); if (!(r1.length===1 && r1[0].name==='Foo')) throw new Error('csv lf')
  const csv2 = 'a,b\r\nc,d'; const r2 = simpleCSVParse(csv2); if (!(r2.length===1 && r2[0].a==='c' && r2[0].b==='d')) throw new Error('csv crlf')
}

// Run tests only in development
if (process.env.NODE_ENV === 'development') {
  let __DW_TESTS__RAN = false
  try {
    if (!__DW_TESTS__RAN) {
      __run_tests__()
      __DW_TESTS__RAN = true
    }
  } catch (e) {
    console.error('Test run failed:', e)
  }
}

export default DeathwatchRoller;
