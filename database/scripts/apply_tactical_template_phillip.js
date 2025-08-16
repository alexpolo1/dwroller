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
  const name = 'phillip';
  const player = playerHelpers.getByName(name);
  if (!player) return console.error('Player not found', name);

  // Tactical Marine template (reasonable defaults)
  const characteristics = player.tabInfo && player.tabInfo.characteristics ? player.tabInfo.characteristics : {
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

  const canonicalSkills = [
    'Acrobatics (Ag)', 'Awareness (Per)', 'Charm (Fel)', 'Climb (S)', 'Command (Fel)',
    'Common Lore (Int)', 'Deathwatch', 'Imperium', 'War', 'Dodge (Ag)',
    'Forbidden Lore (Int)', 'Xenos', 'Intimidate (S)', 'Literacy (Int)', 'Medicae (Int)',
    'Navigation (Int)', 'Pilot (Ag)', 'Scholastic Lore (Int)', 'Codex Astartes',
    'Scrutiny (Per)', 'Search (Per)', 'Silent Move (Ag)', 'Speak Language (Int)',
    'High Gothic', 'Low Gothic', 'Survival (Int)', 'Tactics (Int)', 'Tracking (Int)',
    'Tech-Use (Int)'
  ];

  const tacticalTrain = [
    'Awareness (Per)', 'Common Lore (Int)', 'Dodge (Ag)', 'Intimidate (S)', 'Scholastic Lore (Int)', 'Search (Per)',
    'Guns (BS)', 'Melee (WS)', 'Tactics (Int)', 'Medicae (Int)', 'Command (Fel)',
    'Codex Astartes', 'Adeptus Astartes', 'Imperium', 'War'
  ];

  const existingSkills = player.tabInfo && player.tabInfo.skills ? player.tabInfo.skills : [];
  const skillMap = {};
  for (const s of canonicalSkills) {
    skillMap[s] = { trained: false, plus10: false, plus20: false };
  }
  for (const s of tacticalTrain) {
    if (!skillMap[s]) skillMap[s] = { trained: true, plus10: false, plus20: false };
    else skillMap[s].trained = true;
  }
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

  const weaponNames = ['Astartes Bolter', 'Astartes Bolt Pistol', 'Sacris Claymore'];
  const weapons = [];
  for (const wn of weaponNames) {
    const item = findItemByName(wn);
    if (item) {
      const stats = item.stats || {};
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

  const inventory = [];
  const frag = findItemByName('Frag Grenade') || findItemByName('Astartes Frag Grenade') || { name: 'Frag Grenade' };
  const krak = findItemByName('Krak Grenade') || findItemByName('Astartes Krak Grenade') || { name: 'Krak Grenade' };
  inventory.push({ name: frag.name, count: 3 });
  inventory.push({ name: krak.name, count: 3 });

  const gearEntries = [];
  gearEntries.push({ name: frag.name, qty: 3 });
  gearEntries.push({ name: krak.name, qty: 3 });
  const sacris = findItemByName('Sacris Claymore') || { name: 'Sacris Claymore' };
  gearEntries.push({ name: sacris.name, qty: 1 });
  const powerArmourLookup = findItemByName('Mark VII Power Armour') || findItemByName('Astartes Power Armour');
  gearEntries.push({ name: powerArmourLookup ? powerArmourLookup.name : 'Mark VII Power Armour', qty: 1 });

  const armourItem = findItemByName('Mark VII Power Armour') || findItemByName('Astartes Power Armour');
  const armour = {};
  if (armourItem) {
    armour.body = armourItem.name;
    if (armourItem.stats && armourItem.stats.protection) {
      armour.ap = armourItem.stats.protection.body || 8;
      armour.head = armourItem.stats.protection.head || 0;
      armour.ra = armourItem.stats.protection.arms || armour.ap;
      armour.la = armour.ra;
      armour.rl = armourItem.stats.protection.legs || armour.ap;
      armour.ll = armour.rl;
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

  const talents = ['Bolter Mastery', 'Deathwatch Training'];
  const fate = { total: 2, current: 2 };
  const renown = 'Rank 1';
  const powerArmour = true;
  const wounds = { total: 24, current: 24, fatigue: 0 };
  const movement = { half: 4, full: 8, charge: 12, halfAction: 4, fullAction: 8, run: 24 };

  const charName = 'Brother Skold';

  const newTab = Object.assign({}, player.tabInfo || {}, {
    charName,
    speciality: 'tactical',
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
