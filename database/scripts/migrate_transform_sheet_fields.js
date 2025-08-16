#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { playerHelpers } = require('../sqlite-db');
const { validatePlayer } = require('../validate');

const dbDir = path.join(__dirname, '..', 'sqlite');
const dbPath = path.join(dbDir, 'deathwatch.db');
const backupsDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

const armouryPath = path.join(__dirname, '..', '..', 'public', 'deathwatch-armoury.json');
let armoury = {};
try { armoury = JSON.parse(fs.readFileSync(armouryPath, 'utf8')); } catch (e) { console.warn('Armoury not found or invalid'); }

function timestamp() { return new Date().toISOString().replace(/[:.]/g,''); }

const args = process.argv.slice(2);
const doApply = args.includes('--apply');

// canonical skill list (from PlayerTab)
const SKILLS = [
  'Acrobatics (Ag)','Awareness (Per)','Barter (Fel)','Blather (Fel)','Carouse (Fel)','Charm (Fel)','Chem-Use (Int)','Ciphers (Int)','Chapter Runes','Climb (S)','Command (Fel)','Common Lore (Int)','Adeptus Astartes','Deathwatch','Imperium','War','Concealment (Ag)','Contortionist (Ag)','Deceive (Fel)','Demolition (Int)','Disguise (Fel)','Dodge (Ag)','Drive (Ag)','Evaluate','Forbidden Lore (Int)','Xenos','Gamble (Int)','Inquiry (Fel)','Interrogation (WP)','Intimidate (S)','Invocation (WP)','Lip Reading (Per)','Literacy (Int)','Logic (Int)','Medicae (Int)','Navigation (Int)','Surface','Performer (Fel)','Pilot (Ag)','Psyniscience (Per)','Scholastic Lore (Int)','Codex Astartes','Scrutiny (Per)','Search (Per)','Secret Tongue (Int)','Security (Ag)','Shadowing (Ag)','Silent Move (Ag)','Sleight of Hand (Ag)','Speak Language (Int)','Survival (Int)','Swim (S)','Tactics (Int)','Tech-Use (Int)','Tracking (Int)','Trade (Int)','Wrangling (Int)'
];

function mapCharacteristics(chars) {
  // produce lower-case keys expected by frontend
  const keys = { ws: 'WS', bs: 'BS', s: 'S', t: 'T', ag: 'Ag', int: 'Int', per: 'Per', wp: 'Wp', fel: 'Fel' };
  const out = {};
  if (!chars || typeof chars !== 'object') return Object.fromEntries(Object.keys(keys).map(k=>[k,0]));
  // copy by case-insensitive match
  const lookup = {};
  Object.keys(chars).forEach(k => { lookup[k.toLowerCase()] = chars[k]; lookup[k.toUpperCase()] = chars[k]; });
  Object.entries(keys).forEach(([lk, up]) => {
    let val = 0;
    if (chars[lk] !== undefined) val = Number(chars[lk]) || 0;
    else if (chars[up] !== undefined) val = Number(chars[up]) || 0;
    else if (chars[lk.toLowerCase()] !== undefined) val = Number(chars[lk.toLowerCase()]) || 0;
    else if (chars[up.toLowerCase()] !== undefined) val = Number(chars[up.toLowerCase()]) || 0;
    out[lk] = val;
  });
  return out;
}

function convertSkills(skillsIn) {
  // skillsIn may be array of strings or object map
  const out = {};
  for (const s of SKILLS) out[s] = { trained: false, plus10: false, plus20: false };
  if (!skillsIn) return out;
  if (Array.isArray(skillsIn)) {
    for (const s of skillsIn) {
      const key = SKILLS.find(k => k.toLowerCase() === String(s).toLowerCase());
      if (key) out[key].trained = true;
    }
    return out;
  }
  if (typeof skillsIn === 'object') {
    // assume already in map form
    for (const k of Object.keys(skillsIn)) {
      const key = SKILLS.find(s => s.toLowerCase() === k.toLowerCase()) || k;
      out[key] = Object.assign({ trained:false, plus10:false, plus20:false }, skillsIn[k]);
    }
    // ensure all standard skills exist
    for (const s of SKILLS) if (!out[s]) out[s] = { trained:false, plus10:false, plus20:false };
    return out;
  }
  return out;
}

function resolveInventoryToWeaponsAndArmour(inv, existingWeapons, existingArmour) {
  const weapons = Array.isArray(existingWeapons) ? [...existingWeapons] : [];
  const armour = Object.assign({}, existingArmour || {});

  if (!Array.isArray(inv)) return { weapons, armour };

  for (const it of inv) {
    if (!it || !it.name) continue;
    const name = it.name;
    // armoury.items is an object keyed by category; search each category array
    let fromArmoury = null;
    if (armoury && armoury.items) {
      for (const cat of Object.keys(armoury.items)) {
        const arr = armoury.items[cat];
        if (Array.isArray(arr)) {
          const found = arr.find(i => i.name === name || String(i.name).toLowerCase() === String(name).toLowerCase());
          if (found) { fromArmoury = found; break; }
        }
      }
    }
    if (fromArmoury) {
      const item = fromArmoury;
      // stats may be in item.stats: { damage, class, source } or similar
      const stats = item.stats || {};
      const damageStr = stats.damage || '';
      const cls = stats.class || '';

      // heuristics: if stats.damage looks like weapon or category contains 'Weapon'
      const isWeapon = /Range|Pen|Clip|Reload|RoF|Tearing|Melta|Flame|Shotgun|Bolt|Pistol|Rifle|Cannon|Gun/i.test(damageStr) || /weapon/i.test(item.category || '');
      const isArmour = /Armor|Armour|Power Armor|Carapace|Shield/i.test(item.category || '') || /armou?r/i.test(name) || /power armour/i.test(name);

      if (isWeapon) {
        // extract simple fields from damageStr
        const rangeMatch = damageStr.match(/Range\s*([^;]+)/i);
        const penMatch = damageStr.match(/Pen\s*(\d+)/i);
        const clipMatch = damageStr.match(/Clip\s*(\d+)/i);
        const rldMatch = damageStr.match(/Reload\s*([^;]+)/i);
        const rofMatch = damageStr.match(/RoF/i);
        const specialParts = [];
        if (damageStr) specialParts.push(damageStr);
        if (stats.source) specialParts.push(stats.source);

        weapons.push({
          name: item.name || name,
          class: cls || '',
          damage: damageStr || '',
          type: item.category || '',
          pen: penMatch ? penMatch[1] : '',
          range: rangeMatch ? rangeMatch[1].trim() : '',
          rof: rofMatch ? 'RoF' : '',
          clip: clipMatch ? clipMatch[1] : '',
          rld: rldMatch ? rldMatch[1].trim() : '',
          special: specialParts.join(' | ')
        });
      } else if (isArmour) {
        // place power/carapace armour into body slot by default
        armour.body = armour.body || item.name || name;
        // if protection object present, map head/arms/legs
        if (stats.protection && typeof stats.protection === 'object') {
          if (stats.protection.head !== undefined) armour.head = armour.head || stats.protection.head;
          if (stats.protection.arms !== undefined) armour.ra = armour.ra || stats.protection.arms;
          if (stats.protection.body !== undefined) armour.body = armour.body || stats.protection.body || item.name;
          if (stats.protection.legs !== undefined) armour.rl = armour.rl || stats.protection.legs;
        }
      }
    }
  }
  return { weapons, armour };
}

// Add pre-gen names if requested via a special flag file
function ensurePregens() {
  const pregensFile = path.join(__dirname, '..', 'pregen_names.json');
  if (!fs.existsSync(pregensFile)) {
    const sample = ["Brother-1","Brother-2","Brother-3","Brother-4","Brother-5"];
    fs.writeFileSync(pregensFile, JSON.stringify(sample, null, 2), 'utf8');
    return sample;
  }
  try { return JSON.parse(fs.readFileSync(pregensFile, 'utf8')); } catch { return []; }
}

(async function main(){
  console.log('Starting sheet transform migration');
  if (doApply) {
    const bak = path.join(dbDir, `deathwatch.db.pre_transform.${timestamp()}.bak`);
    fs.copyFileSync(dbPath, bak);
    console.log('Backup created at', bak);
  }

  const players = playerHelpers.getAll();
  const results = [];

  for (const p of players) {
    const before = JSON.parse(JSON.stringify(p.tabInfo || {}));
    const tab = Object.assign({}, before);

    // characteristics -> lowercase keys
    tab.characteristics = mapCharacteristics(tab.characteristics || {});

    // skills -> map form
    tab.skills = convertSkills(tab.skills || []);

    // fate defaults
    if (!tab.fate || typeof tab.fate !== 'object') tab.fate = { total: 1, current: 1 };
    else {
      tab.fate.total = Number(tab.fate.total) || 1;
      tab.fate.current = Number(tab.fate.current) || tab.fate.total || 1;
    }

    // ensure renown normalized via validate
    const validated = validatePlayer({ name: p.name, tabInfo: tab });
    tab.renown = validated.normalized.tabInfo.renown;

    // powerArmour normalization
    if (tab.powerArmour === 'true' || tab.powerArmour === true) tab.powerArmour = true;
    else tab.powerArmour = !!tab.powerArmour;

    // resolve inventory items into weapons/armour fields where possible
    const { weapons: newWeapons, armour: newArmour } = resolveInventoryToWeaponsAndArmour(tab.inventory || [], tab.weapons || [], tab.armour || {});
    if (newWeapons.length > 0) tab.weapons = newWeapons;
    tab.armour = Object.assign({}, tab.armour || {}, newArmour);

    // ensure talents is string
    if (!tab.talents) tab.talents = tab.talents || '';

    const after = tab;
    const changed = JSON.stringify(before) !== JSON.stringify(after);
    results.push({ name: p.name, changed, before, after });

    if (doApply && changed) {
      const ok = playerHelpers.update(p.name, { name: p.name, rollerInfo: p.rollerInfo, shopInfo: p.shopInfo, tabInfo: after, pw: p.pw, pwHash: p.pwHash });
      if (!ok) console.error('Failed to update', p.name);
    }
  }

  const out = { applied: !!doApply, timestamp: new Date().toISOString(), results };
  const outFile = path.join(backupsDir, `migrate_transform_sheet_fields.${doApply ? 'applied' : 'dryrun'}.${timestamp()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
  console.log((doApply ? 'Applied' : 'Dry-run complete') + ' - report written to', outFile);
})();
