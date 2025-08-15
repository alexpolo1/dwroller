const weaponsData = `
Angelus Bolter 	Basic - Bolt 	Range 50m; S/3/-; 1d10+9 X; Pen 6; Clip 36; Reload 2 Full; Tearing 	25 	Respected 	Deathwatch 	First Founding 	97
Argrax Clawed Hooves 	Natural - Primitive 	1d10 I; Pen 0; 	0 	Any 	Deathwatch 	The Emperor Protects 	46
Armour of the Remorseless Crusader (Forearm Sword) 	One-Handed Melee - Primitive 	1d10+8 R; Pen 6; +10 to hit; Sanctified 	70 	Hero 	Deathwatch 	Deathwatch Core Rulebook 	167
Artificer Omnissian Axe 	One-Handed Melee - Power 	1d10+9 E; Pen 7; Power Field, Unbalanced 	25 	Distinguished 	Deathwatch 	First Founding 	99
Astartes Anti-Plant Grenade 	Thrown - Grenade 	3d10 E; Pen 0; Blast (3) 	18 	Any 	Deathwatch 	Living Errata v1.1 	136
Astartes Armoursbane Missile Launcher 	Heavy - Launch 	Range 200m; S/-/-; 0d0 S; Pen 0; Clip 1; Reload 2 Full; Two handed; 	15 	Any 	Deathwatch 	Living Errata v1.1 	137
Astartes Assault Cannon 	Mounted - Solid Projectile 	Range 150m; -/-/10; 2d10+12 I; Pen 6; Clip 200; Reload 3 Full; Tearing, Devastating (1) 	30 	Famed 	Deathwatch 	Living Errata v1.1 	149
Astartes Assault Shotgun 	Basic - Solid Projectile 	Range 30m; S/3/5; 1d10+10 I; Pen 4; Clip 20; Reload 1 Full; Two handed; Reliable, Scatter 	7 	Any 	Deathwatch 	Living Errata v1.1 	136
Astartes Blind Grenade 	Thrown - Grenade 	0d0 S; Pen 0; Smoke (10) 	10 	Any 	Deathwatch 	Living Errata v1.1 	150
Astartes Bolt Pistol 	Pistol - Bolt 	Range 30m; S/2/-; 1d10+9 X; Pen 4; Clip 14; Reload 1 Full; Tearing 	5 	Any 	Deathwatch 	Living Errata v1.1 	146
Astartes Bolter-Godwyn 	Basic - Bolt 	Range 100m; S/3/-; 1d10+9 X; Pen 4; Clip 28; Reload 1 Full; Two handed; Tearing 	5 	Any 	Deathwatch 	Living Errata v1.1 	146
Astartes Boltgun-Stalker 	Basic - Bolt 	Range 200m; S/-/-; 1d10+9 X; Pen 4; Clip 24; Reload 1 Full; Two handed; Accurate, Tearing 	15 	Respected 	Deathwatch 	Living Errata v1.1 	146
Astartes Chainfist 	One-Handed Melee - Power 	2d10+"2*SB" E; Pen 10; Power Field, Tearing, Unwieldy 	40 	Famed 	Deathwatch 	Living Errata v1.1 	154
Astartes Chainsword 	One-Handed Melee - Chain 	1d10+3 R; Pen 3; Balanced, Tearing 	5 	Any 	Deathwatch 	Living Errata v1.1 	153
Astartes Combat Knife 	One-Handed Melee - Primitive 	1d10 R; Pen 2; 	3 	Any 	Deathwatch 	Living Errata v1.1 	155
Astartes Combat Shield 	One-Handed Melee - Primitive 	1d5+1 I; Pen 0; Balanced 	20 	Distinguished 	Deathwatch 	Living Errata v1.1 	166
Astartes Combi-Weapon 	Basic - Bolt 	Range 100m; S/4/-; 1d10+9 X; Pen 4; Clip 28; Reload 1 Full; Two handed; Tearing 	15 	Respected 	Deathwatch 	Living Errata v1.1 	146
Astartes Conversion Beamer 	Heavy - Exotic 	Range 100m; S/-/-; 0d0 E; Pen 0; Clip 4; Reload 2 Full; Two handed; 	40 	Hero 	Deathwatch 	Living Errata v1.1 	152
Astartes Cyclone Missile Launcher 	Mounted - Launch 	Range 300m; S/2/-; 0d0 S; Pen 0; Clip 12; Reload 3 Full; 	25 	Famed 	Deathwatch 	Living Errata v1.1 	152
Astartes Digital Flamer 	Pistol - Exotic 	Range 4m; S/-/-; 1d10+9 E; Pen 4; Clip 1; Reload 1d5 Hours; Flame, Spray 	35 	Famed 	Deathwatch 	Living Errata v1.1 	153
Astartes Chainfist 	One-Handed Melee - Power 	2d10+"2*SB" E; Pen 10; Power Field, Tearing, Unwieldy 	40 	Famed 	Deathwatch 	Living Errata v1.1 	154
Astartes Chainfist 	One-Handed Melee - Power 	2d10+"2*SB" E; Pen 10; Power Field, Tearing 	40 	Famed 	Deathwatch 	Deathwatch Core Rulebook 	154
Astartes Chainsword 	One-Handed Melee - Chain 	1d10+3 R; Pen 4; Balanced, Tearing 	5 	Any 	Deathwatch 	Deathwatch Core Rulebook 	153
Astartes Chainsword 	One-Handed Melee - Chain 	1d10+3 R; Pen 3; Balanced, Tearing 	5 	Any 	Deathwatch 	Living Errata v1.1 	153
Astartes Combat Knife 	One-Handed Melee - Primitive 	1d10 R; Pen 2; 	3 	Any 	Deathwatch 	Living Errata v1.1 	155
Astartes Combat Knife 	One-Handed Melee - Primitive 	1d10+2 R; Pen 2; 	3 	Any 	Deathwatch 	Deathwatch Core Rulebook 	155
Astartes Combat Shield 	One-Handed Melee - Primitive 	1d5+1 I; Pen 0; Balanced 	20 	Distinguished 	Deathwatch 	Living Errata v1.1 	166
Astartes Combat Shield 	One-Handed Melee - Primitive 	1d5+1 I; Pen 0; Balanced 	20 	Distinguished 	Deathwatch 	Deathwatch Core Rulebook 	166
Astartes Combi-Weapon 	Basic - Bolt 	Range 100m; S/2/4; 2d10+5 X; Pen 5; Clip 28; Reload 1 Full; Two handed; Tearing 	15 	Respected 	Deathwatch 	Deathwatch Core Rulebook 	146
`;

// Parse weapon data into structured objects
const parseWeapons = (data) => {
  const lines = data.split('\n').filter(line => line.trim());
  return lines.map(line => {
    const cols = line.split('\t').map(col => col.trim());
    if (cols.length >= 8) {
      return {
        name: cols[0],
        class: cols[1],
        damage: cols[2],
        cost: parseInt(cols[3]) || 0,
        availability: cols[4],
        gameSetting: cols[5],
        book: cols[6],
        pageNo: cols[7]
      };
    }
    return null;
  }).filter(w => w !== null);
};

// Map availability levels to renown levels
const availabilityToRenown = {
  'Any': 'None',
  'Common': 'None',
  'Scarce': 'None',
  'Rare': 'Respected',
  'Very Rare': 'Distinguished',
  'Extremely Rare': 'Hero',
  'Near Unique': 'Hero',
  'Unique': 'Legend',
  'Distinguished': 'Distinguished',
  'Famed': 'Hero',
  'Respected': 'Respected',
  'Hero': 'Hero'
};

// Map weapon classes to shop categories
const classToCategory = (itemClass) => {
  const lowerClass = itemClass.toLowerCase();
  if (lowerClass.includes('melee')) return 'Melee Weapon';
  if (lowerClass.includes('pistol')) return 'Ranged Weapon';
  if (lowerClass.includes('basic') || 
      lowerClass.includes('heavy') ||
      lowerClass.includes('mounted')) return 'Ranged Weapon';
  if (lowerClass.includes('thrown')) return 'Grenade';
  return 'Other';
};

// Process weapons into shop format
const processWeapons = () => {
  const weapons = parseWeapons(weaponsData);
  // Use a Map to deduplicate items (keeping only the Living Errata version when available)
  const uniqueWeapons = new Map();
  
  weapons.forEach(weapon => {
    const key = weapon.name;
    const existing = uniqueWeapons.get(key);
    
    // Prefer Living Errata over Core Rulebook
    if (!existing || weapon.book.includes('Living Errata')) {
      uniqueWeapons.set(key, {
        name: weapon.name,
        req: parseInt(weapon.cost),
        renown: availabilityToRenown[weapon.availability] || 'Distinguished',
        category: classToCategory(weapon.class),
        stats: {
          damage: weapon.damage,
          class: weapon.class,
          source: `${weapon.book} p${weapon.pageNo}`
        }
      });
    }
  });
  
  return Array.from(uniqueWeapons.values());
};

// Process weapons and organize by category
const weapons = processWeapons();
const categorizedWeapons = {
  rangedWeapons: weapons.filter(item => item.category === 'Ranged Weapon'),
  meleeWeapons: weapons.filter(item => item.category === 'Melee Weapon'),
  grenades: weapons.filter(item => item.category === 'Grenade'),
  other: weapons.filter(item => item.category === 'Other')
};

if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const output = path.resolve('public/deathwatch-weapons.json');
  fs.writeFileSync(output, JSON.stringify(categorizedWeapons, null, 2), 'utf8');
  console.log('Wrote weapon data to:', output);
}

module.exports = { categorizedWeapons, processWeapons };
