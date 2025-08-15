const armorData = `
Name	Type	Protection	Cost	Availability	Game Setting	Book	Page No.
Armour of the Remorseless Crusader 	Power 	12 all 	70 	Any 	Deathwatch 	Deathwatch Core Rulebook 	167
Astartes Artificer Armour 	Power 	12 all 	60 	Hero 	Deathwatch 	Deathwatch Core Rulebook 	163
Astartes Mk 1 Thunder Power Armour 	Power 	0 / 6 / 8 / 4 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk 2 Crusade Power Armour 	Power 	0 / 7 / 9 / 7 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk 3 Iron Power Armour 	Power 	0 / 9 / 10 / 9 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk 4 Maximus Power Armour 	Power 	0 / 7 / 9 / 7 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk 5 Heresy Power Armour 	Power 	0 / 8 / 9 / 8 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk 6 Corvus Power Armour 	Power 	0 / 8 / 9 / 8 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk 7 Aquilla Power Armour 	Power 	0 / 8 / 10 / 8 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk 8 Errant Power Armour 	Power 	0 / 8 / 11 / 8 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk1 Power Armour Helm 	Power 	6 / 0 / 0 / 0 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk2 Power Armour Helm 	Power 	7 / 0 / 0 / 0 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk3 Power Armour Helm 	Power 	9 / 0 / 0 / 0 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk4 Power Armour Helm 	Power 	7 / 0 / 0 / 0 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk5 Power Armour Helm 	Power 	8 / 0 / 0 / 0 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk6 Power Armour Helm 	Power 	8 / 0 / 0 / 0 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk7 Power Armour Helm 	Power 	8 / 0 / 0 / 0 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Mk8 Power Armour Helm 	Power 	8 / 0 / 0 / 0 	0 	Any 	Deathwatch 	Rites of Battle 	151
Astartes Power Armour 	Power 	0 / 8 / 10 / 8 	0 	Any 	Deathwatch 	Deathwatch Core Rulebook 	160
Astartes Power Armour Helm 	Power 	8 / 0 / 0 / 0 	0 	Any 	Deathwatch 	Deathwatch Core Rulebook 	160
Astartes Scout Armour 	Carapace 	0 / 6 / 6 / 0 	0 	Any 	Deathwatch 	Deathwatch Core Rulebook 	163
Astartes Storm Shield - Protective 	Shield 	0 / 0LA 4RA / 4 / 0 	35 	Distinguished 	Deathwatch 	Deathwatch Core Rulebook 	166
Astartes Tactical Dreadnaught-Terminator Armour 	Power 	0 / 14 / 14 / 14 	100 	Famed 	Deathwatch 	Deathwatch Core Rulebook 	164
Astartes Tactical Dreadnaught-Terminator Armour Helm 	Power 	14 / 0 / 0 / 0 	100 	Famed 	Deathwatch 	Deathwatch Core Rulebook 	164
Astartes Terminator Armour 	Power 	14 all 	100 	Famed 	Deathwatch 	Deathwatch Core Rulebook 	164
Auran Golden Saurian Scale Armour 	Primitive 	6 all 	0 	Any 	Deathwatch 	The Emperor Protects 	48
Auran Saurian Scale Armour 	Primitive 	4 all 	0 	Any 	Deathwatch 	The Emperor Protects 	46
Chaos Armour Plating 	Other 	6 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	91
Chaos Bones of Subersion 	Other 	9 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	86
Chaos Flak Robes and Brazen Carapace 	Carapace 	5 / 5 / 6 / 4 	0 	Any 	Deathwatch 	Deathwatch Core Rulebook 	364
Chaos Slinnar Obsidian Shell 	Other 	8 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	92
Chaos Warded Adamantine Shell 	Other 	9 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	95
CM Power Armour 	Power 	8 / 8 / 10 / 8 	0 	Any 	Deathwatch 	Mark of the Xenos 	114
Daemon Iron Hide 	Other 	13 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	101
Deathwatch Scout Armor 	Carapace 	0 / 6 / 6 / 6 	0 	Any 	Deathwatch 	Rites of Battle 	142
Diagnostor Helmet 	Power 	8 / 0 / 0 / 0 	15 	Any 	Deathwatch 	Deathwatch Core Rulebook 	165
Dmn Armour of Chaos 	Power 	12 all 	0 	Any 	Deathwatch 	Deathwatch Core Rulebook 	362
Dmn Brazen Chaos Armour 	Other 	12 all 	0 	Any 	Deathwatch 	The Emperor Protects 	136
Fenris Pattern Wolf Helm 	Power 	8 / 0 / 0 / 0 	0 	Respected 	Deathwatch 	Rites of Battle 	143
Nec Metallic Exoskeleton 	Necron 	8 all 	0 	Any 	Deathwatch 	The Emperor Protects 	94
Nec Metallic Shell 	Necron 	10 all 	0 	Any 	Deathwatch 	The Emperor Protects 	94
Obliterator Warped Mechnical Flesh 	Other 	12 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	120
Ork Eavy Armour 	Ork 	6 / 4 / 6 / 4 	0 	Any 	Deathwatch 	Mark of the Xenos 	57
Ork Flak Armour 	Ork 	0 / 0 / 2 / 0 	0 	Any 	Deathwatch 	Mark of the Xenos 	57
Ork Mega Armour 	Ork 	6 / 10 / 14 / 10 	0 	Any 	Deathwatch 	Mark of the Xenos 	57
Rad Corrupted Mechnical Flesh 	Other 	7 all 	0 	Any 	Deathwatch 	The Emperor Protects 	91
Scales 	Primitive 	2 all 	0 	Any 	Deathwatch 	The Emperor Protects 	50
Scaly Hide 	Primitive 	4 all 	0 	Any 	Deathwatch 	The Emperor Protects 	46
Skull Helm 	Power 	9 / 0 / 0 / 0 	0 	Any 	Deathwatch 	Rites of Battle 	143
Tau Fire Warrior Armour 	Carapace 	6 all 	0 	Any 	Deathwatch 	Deathwatch Core Rulebook 	368
Tau Gun Drone Armour 	Natural 	5 all 	0 	Any 	Deathwatch 	Deathwatch Core Rulebook 	367
Tau Pathfinder Armour 	Carapace 	7 / 0 / 7 / 0 	0 	Any 	Deathwatch 	Mark of the Xenos 	25
Tau XV-8 Crisis Battlesuit 	Power 	9 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	9
Tau XV-88 Broadside Battlesuit 	Power 	12 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	6
Tau XV15 Stealth Suit (Limbs) 	Power 	0 / 7 / 0 / 7 	0 	Any 	Deathwatch 	Deathwatch Core Rulebook 	367
Tau XV15 Stealth Suit (Top) 	Power 	8 / 0 / 8 / 0 	0 	Any 	Deathwatch 	Deathwatch Core Rulebook 	367
Tau XV8 Crisis Suit 	Power 	9 all 	0 	Any 	Deathwatch 	Deathwatch Core Rulebook 	366
Tyr Bonded Exoskeleton 	Natural 	10 all 	0 	Any 	Deathwatch 	Deathwatch Core Rulebook 	370
Tyr Chitinous Carapace 	Natural 	3 all 	0 	Any 	Deathwatch 	Deathwatch Core Rulebook 	371
Tyr Exoskeleton 	Natural 	2 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	43
Tyr Hardened Carapace 	Natural 	6 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	40
Tyr Light Reinforced Chitin 	Natural 	4 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	39
Tyr Medium Reinforced Chitin 	Natural 	6 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	37
Tyr Reinforced Chitin 	Natural 	8 all 	0 	Any 	Deathwatch 	Deathwatch Core Rulebook 	371
Tyr Thickened Scales 	Natural 	10 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	46
Vespid Chitin 	Natural 	3 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	26
Xenos Hardened Hide 	Natural 	6 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	66
Xenos Scaly Hide 	Natural 	3 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	63
Xenos Slimey Hide 	Natural 	2 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	68
Xenos Thick Scales 	Natural 	5 all 	0 	Any 	Deathwatch 	Mark of the Xenos 	65`;

// Parse armor data into structured objects
const parseArmor = (data) => {
  const lines = data.split('\n').filter(line => line.trim());
  return lines.map(line => {
    const cols = line.split('\t').map(col => col.trim());
    if (cols.length >= 8) {
      return {
        name: cols[0],
        type: cols[1],
        protection: cols[2],
        cost: parseInt(cols[3]) || 0,
        availability: cols[4],
        gameSetting: cols[5],
        book: cols[6],
        pageNo: cols[7]
      };
    }
    return null;
  }).filter(a => a !== null);
};

// Map armor types to categories
const typeToCategory = (armorType) => {
  const lowerType = armorType.toLowerCase();
  if (lowerType.includes('power')) return 'Power Armor';
  if (lowerType.includes('carapace')) return 'Carapace Armor';
  if (lowerType.includes('primitive')) return 'Primitive Armor';
  if (lowerType.includes('natural')) return 'Natural Armor';
  if (lowerType.includes('shield')) return 'Shields';
  if (lowerType === 'necron') return 'Xenos Armor';
  if (lowerType === 'ork') return 'Xenos Armor';
  return 'Other Armor';
};

// Parse protection values into a structured format
const parseProtection = (protection) => {
  if (protection.includes('all')) {
    const value = parseInt(protection.split(' ')[0]);
    return {
      head: value,
      arms: value,
      body: value,
      legs: value
    };
  }

  const parts = protection.split('/').map(p => p.trim());
  return {
    head: parseInt(parts[0]) || 0,
    arms: parseInt(parts[1]) || 0,
    body: parseInt(parts[2]) || 0,
    legs: parseInt(parts[3]) || 0
  };
};

// Map availability levels to renown levels (using the same mapping as weapons)
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

// Process armor into shop format
const processArmor = () => {
  const armor = parseArmor(armorData);
  // Use a Map to deduplicate items (keeping only the Living Errata version when available)
  const uniqueArmor = new Map();
  
  armor.forEach(item => {
    const key = item.name;
    const existing = uniqueArmor.get(key);
    
    // Prefer Living Errata over Core Rulebook
    if (!existing || item.book.includes('Living Errata')) {
      uniqueArmor.set(key, {
        name: item.name,
        req: parseInt(item.cost),
        renown: availabilityToRenown[item.availability] || 'Distinguished',
        category: typeToCategory(item.type),
        stats: {
          type: item.type,
          protection: parseProtection(item.protection),
          source: `${item.book} p${item.pageNo}`
        }
      });
    }
  });
  
  return Array.from(uniqueArmor.values());
};

// Process armor and organize by category
const armor = processArmor();
const categorizedArmor = {
  powerArmor: armor.filter(item => item.category === 'Power Armor'),
  carapaceArmor: armor.filter(item => item.category === 'Carapace Armor'),
  primitiveArmor: armor.filter(item => item.category === 'Primitive Armor'),
  naturalArmor: armor.filter(item => item.category === 'Natural Armor'),
  xenosArmor: armor.filter(item => item.category === 'Xenos Armor'),
  shields: armor.filter(item => item.category === 'Shields'),
  otherArmor: armor.filter(item => item.category === 'Other Armor')
};

if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  const output = path.resolve('public/deathwatch-armor.json');
  fs.writeFileSync(output, JSON.stringify(categorizedArmor, null, 2), 'utf8');
  console.log('Wrote armor data to:', output);
}

module.exports = { categorizedArmor, processArmor };
