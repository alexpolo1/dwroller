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
  const name = 'andreas';
  const player = playerHelpers.getByName(name);
  if (!player) return console.error('Player not found', name);

  const ts = Date.now();
  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const beforePath = path.join(backupsDir, `${name}.before.${ts}.json`);
  fs.writeFileSync(beforePath, JSON.stringify(player, null, 2), 'utf8');
  console.log('Backup written:', beforePath);

  const charName = 'Brother Lucian';
  const chapter = 'ultramarines';
  const speciality = 'apothecary';
  const rank = '1';

  const characteristics = {
    ws: 46,
    bs: 40,
    s: 41,
    t: 40,
    ag: 43,
    int: 43,
    per: 41,
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

  const skillMap = {};
  for (const s of canonicalSkills) skillMap[s] = { trained: false, plus10: false, plus20: false };
  // Mark trained skills exactly as on the sheet
  ['Common Lore (Int)', 'Medicae (Int)', 'Scholastic Lore (Int)', 'Awareness (Per)', 'Dodge (Ag)'].forEach(s => {
    if (!skillMap[s]) skillMap[s] = { trained: true, plus10: false, plus20: false };
    else skillMap[s].trained = true;
  });

  // Weapons
  const weapons = [];
  const wpNames = ['Chainsword', 'Astartes Bolt Pistol'];
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

  // Inventory and gear
  const frag = findItemByName('Astartes Frag Grenade') || { name: 'Astartes Frag Grenade' };
  const krak = findItemByName('Astartes Krak Grenade') || { name: 'Astartes Krak Grenade' };
  const combatKnife = findItemByName('Astartes Combat Knife') || { name: 'Combat Knife' };
  const chainsword = findItemByName('Chainsword') || { name: 'Chainsword' };
  const powerArmourLookup = findItemByName('Mark VII Power Armour') || findItemByName('Astartes Power Armour');

  const inventory = [{ name: frag.name, count: 3 }, { name: krak.name, count: 3 }];
  const gear = [{ name: frag.name, qty: 3 }, { name: krak.name, qty: 3 }, { name: chainsword.name, qty: 1 }, { name: powerArmourLookup ? powerArmourLookup.name : 'Mark VII Power Armour', qty: 1 }, { name: combatKnife.name, qty: 1 }];

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

  const talents = ['Enhance Healing', 'Deathwatch Training'];
  const fate = { total: 2, current: 2 };
  const wounds = { total: 19, current: 19, fatigue: 0 };
  const movement = { half: 5, full: 10, charge: 15, halfAction: 5, fullAction: 10, run: 30 };

  const demeanour = 'Honour the Codex';
  const personalDemeanour = 'Studious';

  const tabInfo = Object.assign({}, player.tabInfo || {}, {
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
    powerArmour: true,
    demeanour,
    personalDemeanour
  });

  const ok = playerHelpers.update(name, { name, rollerInfo: player.rollerInfo || {}, shopInfo: player.shopInfo || {}, tabInfo, pw: player.pw || '', pwHash: player.pwHash || '' });
  if (!ok) return console.error('Failed to update player');

  const updated = playerHelpers.getByName(name);
  const afterPath = path.join(backupsDir, `${name}.after.${ts}.json`);
  fs.writeFileSync(afterPath, JSON.stringify(updated, null, 2), 'utf8');
  console.log('After backup written:', afterPath);
  console.log(JSON.stringify(updated, null, 2));
})();
