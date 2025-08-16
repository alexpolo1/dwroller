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
  const name = 'chris';
  if (playerHelpers.getByName(name)) return console.error('Player already exists', name);

  // Template for a Rank 1 Techmarine (inspired by Deathwatch rules and existing pregens)
  const charName = 'Brother Corvin';
  const chapter = 'iron hands';
  const speciality = 'techmarine';
  const rank = '1';

  const characteristics = {
    ws: 44,
    bs: 40,
    s: 42,
    t: 41,
    ag: 39,
    int: 46,
    per: 42,
    wp: 43,
    fel: 38
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

  const skillMap = {};
  for (const s of canonicalSkills) skillMap[s] = { trained: false, plus10: false, plus20: false };

  // Techmarine-focused trained skills
  ['Tech-Use (Int)', 'Scholastic Lore (Int)', 'Common Lore (Int)', 'Tactics (Int)', 'Awareness (Per)', 'Guns (BS)', 'Melee (WS)'].forEach(s => {
    if (!skillMap[s]) skillMap[s] = { trained: true, plus10: false, plus20: false };
    else skillMap[s].trained = true;
  });

  // Weapons: prefer Astartes Bolter and Bolt Pistol; include Chainsword as backup
  const weapons = [];
  const wpNames = ['Astartes Bolter', 'Astartes Bolt Pistol', 'Chainsword'];
  for (const wn of wpNames) {
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

  const frag = findItemByName('Astartes Frag Grenade') || { name: 'Astartes Frag Grenade' };
  const krak = findItemByName('Astartes Krak Grenade') || { name: 'Astartes Krak Grenade' };
  const combatKnife = findItemByName('Astartes Combat Knife') || { name: 'Astartes Combat Knife' };

  const inventory = [{ name: frag.name, count: 3 }, { name: krak.name, count: 3 }];
  const gear = [{ name: frag.name, qty: 3 }, { name: krak.name, qty: 3 }, { name: combatKnife.name, qty: 1 }];
  const powerArmourLookup = findItemByName('Mark VII Power Armour') || findItemByName('Astartes Power Armour');
  gear.push({ name: powerArmourLookup ? powerArmourLookup.name : 'Mark VII Power Armour', qty: 1 });

  const armourItem = powerArmourLookup;
  const armour = armourItem ? {
    body: armourItem.name,
    ap: (armourItem.stats && armourItem.stats.protection && (armourItem.stats.protection.body || armourItem.stats.protection.total)) ? (armourItem.stats.protection.body || armourItem.stats.protection.total) : 8,
    head: 0,
    ra: 8,
    la: 8,
    rl: 8,
    ll: 8
  } : { body: 'Mark VII Power Armour', ap: 8, head: 0, ra: 8, la: 8, rl: 8, ll: 8 };

  const talents = ['Tech-Use Specialist', 'Deathwatch Training'];
  const fate = { total: 2, current: 2 };
  const wounds = { total: 22, current: 22, fatigue: 0 };
  const movement = { half: 5, full: 10, charge: 15, halfAction: 5, fullAction: 10, run: 30 };

  const tabInfo = {
    charName,
    playerName: name,
    chapter,
    speciality,
    rank,
    characteristics,
    skills: skillMap,
    weapons,
    inventory,
    gear,
    armour,
    talents,
    fate,
    wounds,
    movement,
    renown: 'Rank 1',
    powerArmour: true
  };

  // create with backup
  const ts = Date.now();
  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const beforePath = path.join(backupsDir, `${name}.before.${ts}.json`);
  fs.writeFileSync(beforePath, JSON.stringify({ note: 'creating new player', name }, null, 2), 'utf8');

  const created = playerHelpers.create({ name, rollerInfo: {}, shopInfo: {}, tabInfo, pw: '', pwHash: '' });
  const afterPath = path.join(backupsDir, `${name}.after.${ts}.json`);
  fs.writeFileSync(afterPath, JSON.stringify(created, null, 2), 'utf8');
  console.log('Created player', name);
  console.log(JSON.stringify(created, null, 2));
})();
