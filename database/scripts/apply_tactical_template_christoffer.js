const fs = require('fs');
const path = require('path');
const { playerHelpers } = require('../sqlite-db');

const armouryPath = path.join(__dirname, '..', '..', 'public', 'deathwatch-armoury.json');
const armoury = JSON.parse(fs.readFileSync(armouryPath, 'utf8'));

function findItemByName(name) {
  const needle = String(name).toLowerCase();
  for (const cat of Object.keys(armoury.items)) {
    const arr = armoury.items[cat];
    if (Array.isArray(arr)) {
      // Exact then partial match
      let found = arr.find(i => String(i.name).toLowerCase() === needle);
      if (found) return found;
      found = arr.find(i => String(i.name).toLowerCase().includes(needle));
      if (found) return found;
    }
  }
  return null;
}

(async function main(){
  const name = 'christoffer';
  const player = playerHelpers.getByName(name);
  if (!player) return console.error('Player not found', name);

  // Tactical Marine template (reasonable defaults)
  // Characteristics exactly as on the sheet
  const characteristics = {
    ws: 42,
    bs: 42,
    s: 42,
    t: 41,
    ag: 40,
    int: 41,
    per: 46,
    wp: 42,
    fel: 43
  };

  // Canonical skill keys aligned with frontend SKILLS array
  const canonicalSkills = [
    'Acrobatics (Ag)', 'Awareness (Per)', 'Charm (Fel)', 'Climb (S)', 'Command (Fel)',
    'Common Lore (Int)', 'Deathwatch', 'Imperium', 'War', 'Dodge (Ag)',
    'Forbidden Lore (Int)', 'Xenos', 'Intimidate (S)', 'Literacy (Int)', 'Medicae (Int)',
    'Navigation (Int)', 'Pilot (Ag)', 'Scholastic Lore (Int)', 'Codex Astartes',
    'Scrutiny (Per)', 'Search (Per)', 'Silent Move (Ag)', 'Speak Language (Int)',
    'High Gothic', 'Low Gothic', 'Survival (Int)', 'Tactics (Int)', 'Tracking (Int)',
    'Tech-Use (Int)'
  ];

  // Skills to mark trained based on sheet (map to canonical keys)
  const tacticalTrain = [
    'Awareness (Per)', 'Common Lore (Int)', 'Dodge (Ag)', 'Intimidate (S)', 'Scholastic Lore (Int)', 'Search (Per)',
    'Guns (BS)', 'Melee (WS)', 'Tactics (Int)', 'Medicae (Int)', 'Command (Fel)',
    'Codex Astartes', 'Adeptus Astartes', 'Imperium', 'War'
  ];

  // Build skills map starting from canonical skills, mark tacticalTrain as trained, then merge existing skills
  const existingSkills = player.tabInfo && player.tabInfo.skills ? player.tabInfo.skills : [];
  const skillMap = {};
  // initialize canonical skills as untrained
  for (const s of canonicalSkills) {
    skillMap[s] = { trained: false, plus10: false, plus20: false };
  }
  // mark trained skills from tacticalTrain
  for (const s of tacticalTrain) {
    if (!skillMap[s]) skillMap[s] = { trained: true, plus10: false, plus20: false };
    else skillMap[s].trained = true;
  }
  // keep previously trained ones too
  if (Array.isArray(existingSkills)) {
    for (const s of existingSkills) {
      if (!skillMap[s]) skillMap[s] = { trained: true, plus10: false, plus20: false };
      else skillMap[s].trained = true;
    }
  } else if (typeof existingSkills === 'object') {
    for (const [k,v] of Object.entries(existingSkills)) {
      if (!skillMap[k]) skillMap[k] = Object.assign({ trained:false, plus10:false, plus20:false }, v);
      else skillMap[k] = Object.assign(skillMap[k], v);
    }
  }

  // Weapons: Bolter (kraken rounds), Bolt Pistol, Sacris Claymore
  const weaponNames = ['Astartes Bolter', 'Astartes Bolt Pistol', 'Sacris Claymore'];
  const weapons = [];
  for (const wn of weaponNames) {
    const item = findItemByName(wn);
    if (item) {
      const stats = item.stats || {};
      // parse damage string for range and clip/pen as earlier
      const dmg = stats.damage || '';
      const rangeMatch = dmg.match(/Range\s*([^;]+)/i);
      const penMatch = dmg.match(/Pen\s*(\d+)/i);
      const clipMatch = dmg.match(/Clip\s*(\d+)/i);
      const rldMatch = dmg.match(/Reload\s*([^;]+)/i);
      weapons.push({
        name: item.name,
        class: stats.class || '',
        damage: dmg,
        type: item.category || '',
        pen: penMatch ? penMatch[1] : '',
        range: rangeMatch ? rangeMatch[1].trim() : '',
        rof: '',
        clip: clipMatch ? clipMatch[1] : '',
        rld: rldMatch ? rldMatch[1].trim() : '',
        special: stats.source || ''
      });
    }
  }

  // Inventory: grenades (3 frag, 3 krak)
  const inventory = [];
  const frag = findItemByName('Frag Grenade') || findItemByName('Astartes Frag Grenade') || { name: 'Frag Grenade' };
  const krak = findItemByName('Krak Grenade') || findItemByName('Astartes Krak Grenade') || { name: 'Krak Grenade' };
  inventory.push({ name: frag.name, count: 3 });
  inventory.push({ name: krak.name, count: 3 });

  // Also expose grenades and sacris claymore in the frontend "gear" list so they appear in Assigned Gear
  const gearEntries = [];
  gearEntries.push({ name: frag.name, qty: 3 });
  gearEntries.push({ name: krak.name, qty: 3 });
  const sacris = findItemByName('Sacris Claymore') || { name: 'Sacris Claymore' };
  gearEntries.push({ name: sacris.name, qty: 1 });
  // include power armour as gear note (lookup now to avoid referencing armourItem before init)
  const powerArmourLookup = findItemByName('Mark VII Power Armour') || findItemByName('Astartes Power Armour');
  gearEntries.push({ name: powerArmourLookup ? powerArmourLookup.name : 'Mark VII Power Armour', qty: 1 });

  // Armour: Mark VII Power Armour (Armour Points 8)
  const armourItem = findItemByName('Mark VII Power Armour') || findItemByName('Astartes Power Armour');
  const armour = {};
  if (armourItem) {
    armour.body = armourItem.name;
    // armoury stats may vary; set numeric AP where available or fallback to 8
    if (armourItem.stats && armourItem.stats.protection) {
      armour.ap = armourItem.stats.protection.body || 8;
      armour.head = armourItem.stats.protection.head || 0;
      armour.ra = armourItem.stats.protection.arms || armour.ap;
      armour.la = armour.ra; // mirror right arm
      armour.rl = armourItem.stats.protection.legs || armour.ap;
      armour.ll = armour.rl; // mirror left leg
    } else {
      armour.ap = 8;
      armour.head = 0;
      armour.ra = 8;
      armour.la = 8;
      armour.rl = 8;
      armour.ll = 8;
    }
  } else {
    armour.body = 'Mark VII Power Armour';
    armour.ap = 8;
    armour.head = 0;
    armour.ra = 8;
    armour.la = 8;
    armour.rl = 8;
    armour.ll = 8;
  }

  // talents/traits from sheet
  const talents = ['Bolter Mastery', 'Deathwatch Training'];

  const fate = { total: 2, current: 2 };
  const renown = 'Rank 1';
  const powerArmour = true;

  // wounds and movement per sheet
  const wounds = { total: 24, current: 24, fatigue: 0 };
  // write both canonical movement keys used across code: half/full/charge for frontend and halfAction/fullAction/run for other scripts
  const movement = { half: 5, full: 10, charge: 15, halfAction: 5, fullAction: 10, run: 30 };

  // Set display character name to match provided sheet
  const charName = 'Brother Gregor';

  const newTab = Object.assign({}, player.tabInfo || {}, {
    charName,
    characteristics,
    skills: skillMap,
    weapons,
    inventory,
    gear: (player.tabInfo && player.tabInfo.gear && player.tabInfo.gear.length) ? player.tabInfo.gear.concat(gearEntries) : gearEntries,
    armour,
    talents,
    fate,
    wounds,
    movement,
    renown,
    powerArmour
  });

  const ok = playerHelpers.update(name, { name, rollerInfo: player.rollerInfo || {}, shopInfo: player.shopInfo || {}, tabInfo: newTab, pw: player.pw || '', pwHash: player.pwHash || '' });
  if (!ok) return console.error('Failed to update player');
  console.log('Updated player', name);
  console.log(JSON.stringify(playerHelpers.getByName(name), null, 2));
})();
