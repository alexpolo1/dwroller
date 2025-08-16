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
      let found = arr.find(i => String(i.name).toLowerCase() === needle);
      if (found) return found;
      found = arr.find(i => String(i.name).toLowerCase().includes(needle));
      if (found) return found;
    }
  }
  return null;
}

(function main(){
  const name = 'anders';
  const player = playerHelpers.getByName(name);
  if (!player) return console.error('Player not found', name);

  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const before = path.join(backupsDir, `anders.before.${Date.now()}.json`);
  fs.writeFileSync(before, JSON.stringify(player, null, 2));
  console.log('Backup written:', before);

  // Character exact from screenshot
  const charName = 'Brother Sepheran';
  const characteristics = {
    ws: 47,
    bs: 48,
    s: 41,
    t: 43,
    ag: 42,
    int: 50,
    per: 43,
    wp: 48,
    fel: 38
  };

  // Skills to mark trained based on sheet
  const trained = [
    'Awareness (Per)',
    'Common Lore (Int)',
    'Dodge (Ag)',
    'Intimidate (S)',
    'Logic (Int)',
    'Scholastic Lore (Int)',
    // space marine defaults
    'Guns (BS)', 'Melee (WS)'
  ];

  const canonical = [
    'Acrobatics (Ag)', 'Awareness (Per)', 'Charm (Fel)', 'Climb (S)', 'Command (Fel)',
    'Common Lore (Int)', 'Deathwatch', 'Imperium', 'War', 'Dodge (Ag)',
    'Forbidden Lore (Int)', 'Xenos', 'Intimidate (S)', 'Literacy (Int)', 'Medicae (Int)',
    'Navigation (Int)', 'Pilot (Ag)', 'Scholastic Lore (Int)', 'Codex Astartes',
    'Scrutiny (Per)', 'Search (Per)', 'Silent Move (Ag)', 'Speak Language (Int)',
    'High Gothic', 'Low Gothic', 'Survival (Int)', 'Tactics (Int)', 'Tracking (Int)',
    'Tech-Use (Int)'
  ];

  const existingSkills = player.tabInfo && player.tabInfo.skills ? player.tabInfo.skills : [];
  const skillMap = {};
  for (const s of canonical) skillMap[s] = { trained: false, plus10: false, plus20: false };
  for (const s of trained) { skillMap[s] = skillMap[s] || { trained: false, plus10:false, plus20:false }; skillMap[s].trained = true; }
  if (Array.isArray(existingSkills)) {
    for (const s of existingSkills) { if (!skillMap[s]) skillMap[s] = { trained:true, plus10:false, plus20:false }; else skillMap[s].trained = true; }
  } else if (typeof existingSkills === 'object') {
    for (const [k,v] of Object.entries(existingSkills)) { skillMap[k] = Object.assign(skillMap[k]||{trained:false,plus10:false,plus20:false}, v); }
  }

  // Weapons & gear
  const weaponNames = ['Heavy Bolter', 'Astartes Bolt Pistol', 'Bolt Pistol'];
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

  const frag = findItemByName('Frag Grenade') || { name: 'Frag Grenade' };
  const krak = findItemByName('Krak Grenade') || { name: 'Krak Grenade' };
  const inventory = [ { name: frag.name, count: 3 }, { name: krak.name, count: 3 } ];
  const gearEntries = [ { name: frag.name, qty:3 }, { name: krak.name, qty:3 } ];
  const knife = findItemByName('Combat Knife') || findItemByName('Combat Knife') || { name: 'Combat Knife' };
  gearEntries.push({ name: knife.name, qty:1 });

  const armourItem = findItemByName('Mark VII Power Armour') || findItemByName('Astartes Power Armour');
  const armour = {};
  if (armourItem && armourItem.stats && armourItem.stats.protection) {
    armour.body = armourItem.name;
    armour.ap = armourItem.stats.protection.body || 8;
    armour.head = armourItem.stats.protection.head || 0;
    armour.ra = armourItem.stats.protection.arms || 8;
    armour.la = armour.ra;
    armour.rl = armourItem.stats.protection.legs || 8;
    armour.ll = armour.rl;
  } else {
    armour.body = armourItem ? armourItem.name : 'Mark VII Power Armour';
    armour.ap = 8; armour.head = 0; armour.ra = 8; armour.la = 8; armour.rl = 8; armour.ll = 8;
  }
  gearEntries.push({ name: armour.body, qty: 1 });

  const talents = ['Unrelenting Devastation', 'Deathwatch Training'];
  const fate = { total: 2, current: 2 };
  const wounds = { total: 23, current: 23, fatigue: 0 };
  const movement = { half:5, full:10, charge:15, halfAction:5, fullAction:10, run:30 };
  const renown = 'Rank 1';
  const powerArmour = true;

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
  const after = playerHelpers.getByName(name);
  const afterPath = path.join(backupsDir, `anders.after.${Date.now()}.json`);
  fs.writeFileSync(afterPath, JSON.stringify(after, null, 2));
  console.log('Updated player', name);
  console.log(JSON.stringify(after, null, 2));
})();
