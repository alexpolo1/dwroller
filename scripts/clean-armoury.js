const rawWeaponData = `
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
Astartes Digital Laser 	Pistol - Exotic 	Range 4m; S/-/-; 1d10+4 E; Pen 7; Clip 1; Reload 1d5 Hours; Reliable 	35 	Famed 	Deathwatch 	Living Errata v1.1 	153
Astartes Digital Melta 	Pistol - Exotic 	Range 4m; S/-/-; 2d10+12 E; Pen 10; Clip 1; Reload 1d5 Hours; 	35 	Famed 	Deathwatch 	Living Errata v1.1 	153
Astartes Executioner Axe 	Two-Handed Melee - Power 	1d10+13 E; Pen 8; Two handed; Power Field, Unwieldy, Felling (x1) 	25 	Famed 	Deathwatch 	Living Errata v1.1 	139
Astartes Flamer 	Basic - Flame 	Range 20m; S/-/-; 1d10+9 E; Pen 4; Clip 6; Reload 2 Full; Two handed; Flame, Spray 	10 	Any 	Deathwatch 	Living Errata v1.1 	148
Astartes Force Staff 	One-Handed Melee - Primitive 	1d10+"1+PR+SB" S; Pen "PR"; Balanced 	25 	Respected 	Deathwatch 	Living Errata v1.1 	155
Astartes Force Sword 	One-Handed Melee - Primitive 	1d10+"2+PR+SB" S; Pen "2+PR"; Balanced 	25 	Respected 	Deathwatch 	Living Errata v1.1 	156
Astartes Frag Grenade 	Thrown - Grenade 	2d10+2 X; Pen 0; Blast (4) 	1 	Any 	Deathwatch 	Living Errata v1.1 	150
Astartes Hand Flamer 	Pistol - Flame 	Range 10m; S/-/-; 1d10+7 E; Pen 4; Clip 4; Reload 2 Full; Flame, Spray 	10 	Any 	Deathwatch 	Living Errata v1.1 	149
Astartes Heavy Flamer 	Heavy - Flame 	Range 30m; S/-/-; 1d10+12 E; Pen 6; Clip 10; Reload 2 Full; Two handed; Flame, Spray 	15 	Any 	Deathwatch 	Living Errata v1.1 	149
Astartes Heavy-Bolter 	Heavy - Bolt 	Range 150m; -/-/6; 1d10+12 X; Pen 5; Clip 60; Reload 1 Full; Two handed; Tearing 	20 	Any 	Deathwatch 	Living Errata v1.1 	147
Astartes Incendiary Grenade 	Thrown - Grenade 	1d10+4 E; Pen 0; Blast (3) 	15 	Any 	Deathwatch 	Living Errata v1.1 	150
Astartes Infernus Pistol 	Pistol - Melta 	Range 10m; S/-/-; 2d10+12 E; Pen 12; Clip 4; Reload 1 Full; Melta 	35 	Famed 	Deathwatch 	Living Errata v1.1 	148
Astartes Krak Grenade 	Thrown - Grenade 	3d10+4 X; Pen 6; 	1 	Any 	Deathwatch 	Living Errata v1.1 	150
Astartes Lascannon 	Heavy - Las 	Range 300m; S/-/-; 5d10+10 E; Pen 10; Clip 6; Reload 2 Full; Two handed; Proven (3) 	30 	Respected 	Deathwatch 	Living Errata v1.1 	149
Astartes Lightning Claw 	One-Handed Melee - Power 	1d10+6 E; Pen 8; Power Field, Proven (4) 	30 	Distinguished 	Deathwatch 	Living Errata v1.1 	154
Astartes Meltagun-Vulkan 	Basic - Melta 	Range 30m; S/-/-; 2d10+14 E; Pen 12; Clip 6; Reload 2 Full; Two handed; Melta 	20 	Respected 	Deathwatch 	Living Errata v1.1 	148
Astartes Missile Launcher-Soundstrike 	Heavy - Launch 	Range 250m; S/-/-; 0d0 S; Pen 0; Clip 8; Reload 1 Full; Two handed; 	10 	Any 	Deathwatch 	Living Errata v1.1 	152
Astartes Multi-Melta - Maxima 	Heavy - Melta 	Range 60m; S/-/-; 2d10+16 E; Pen 12; Clip 12; Reload 2 Full; Two handed; Blast (1), Melta 	35 	Respected 	Deathwatch 	Living Errata v1.1 	148
Astartes Nova Grenade 	Thrown - Grenade 	1d10 E; Pen 0; Blast (3) 	15 	Any 	Deathwatch 	Living Errata v1.1 	151
Astartes Photon Flash Grenade 	Thrown - Grenade 	0d0 S; Pen 0; 	5 	Any 	Deathwatch 	Living Errata v1.1 	151
Astartes Plasma Cannon 	Heavy - Plasma 	Range 150m; S/-/-; 2d10+12 E; Pen 10; Clip 16; Reload 5 Full; Two handed; Blast (3), Volatile, Maximal 	30 	Distinguished 	Deathwatch 	Living Errata v1.1 	147
Astartes Plasma Grenade 	Thrown - Grenade 	1d10+12 E; Pen 8; Blast (3) 	20 	Distinguished 	Deathwatch 	Living Errata v1.1 	151
Astartes Plasma Gun -Ragefire 	Basic - Plasma 	Range 100m; S/2/-; 1d10+12 E; Pen 10; Clip 24; Reload 4 Full; Volatile, Maximal 	20 	Respected 	Deathwatch 	Living Errata v1.1 	148
Astartes Plasma Pistol 	Pistol - Plasma 	Range 30m; S/2/-; 1d10+10 E; Pen 8; Clip 12; Reload 3 Full; Volatile, Maximal 	25 	Respected 	Deathwatch 	Living Errata v1.1 	148
Astartes Power Axe 	One-Handed Melee - Power 	1d10+8 E; Pen 7; Power Field, Unbalanced 	20 	Respected 	Deathwatch 	Living Errata v1.1 	155
Astartes Power Claymore 	Two-Handed Melee - Power 	1d10+11 E; Pen 8; Two handed; Power Field, Unwieldy, Devastating (1) 	15 	Distinguished 	Deathwatch 	Living Errata v1.1 	139
Astartes Power Falchion 	One-Handed Melee - Power 	1d10+4 E; Pen 6; Two handed; Power Field, Razor Sharp 	25 	Distinguished 	Deathwatch 	Living Errata v1.1 	139
Astartes Power Fist 	One-Handed Melee - Power 	2d10+"2*SB" E; Pen 9; Power Field, Unwieldy 	30 	Distinguished 	Deathwatch 	Living Errata v1.1 	155
Astartes Power Spear 	Two-Handed Melee - Power 	1d10+6 E; Pen 7; Two handed; Power Field 	15 	Distinguished 	Deathwatch 	Living Errata v1.1 	139
Astartes Power Sword 	One-Handed Melee - Power 	1d10+6 E; Pen 6; Balanced, Power Field 	20 	Respected 	Deathwatch 	Living Errata v1.1 	155
Astartes Servo-Arm 	Mounted - Primitive 	2d10+14 I; Pen 10; 	30 	Any 	Deathwatch 	Living Errata v1.1 	177
`.trim();

/** Parse raw weapon data */
const parseWeaponData = (data) => {
  // Split into lines and filter out empty ones
  const lines = data.split('\n').filter(line => line.trim());
  const weapons = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t').map(col => col.trim());
    if (cols.length >= 8) {
      weapons.push({
        name: cols[0],
        class: cols[1],
        damage: cols[2],
        cost: parseInt(cols[3]) || 0,
        availability: cols[4],
        gameSetting: cols[5],
        book: cols[6],
        pageNo: cols[7]
      });
    }
  }
  return weapons;
};

/** Core Deathwatch equipment types */
const weaponData = `
Name	Class	Damage	Cost	Availability	Game Setting	Book	Page No.
${rawWeaponData}
`.trim();

const weapons = parseWeaponData(weaponData);

// Use Map to deduplicate items, preferring Living Errata versions
const uniqueWeapons = new Map();

weapons.forEach(weapon => {
  const key = weapon.name;
  const existing = uniqueWeapons.get(key);
  
  // Prefer Living Errata over Core Rulebook
  if (!existing || weapon.book.includes('Living Errata')) {
    uniqueWeapons.set(key, weapon);
  }
});

const mapAvailabilityToRenown = (availability) => {
  const map = {
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
  return map[availability] || 'Distinguished';
};

const mapClassToCategory = (itemClass) => {
  if (itemClass.toLowerCase().includes('melee')) return 'Melee Weapon';
  if (itemClass.toLowerCase().includes('pistol')) return 'Ranged Weapon';
  if (itemClass.toLowerCase().includes('basic') || 
      itemClass.toLowerCase().includes('heavy') ||
      itemClass.toLowerCase().includes('mounted')) return 'Ranged Weapon';
  if (itemClass.toLowerCase().includes('thrown')) return 'Grenade';
  return 'Other';
};

// Group items by category
const generateShopItems = () => {
  const items = Array.from(uniqueWeapons.values()).map(w => ({
    name: w.name,
    req: w.cost,
    renown: mapAvailabilityToRenown(w.availability),
    category: mapClassToCategory(w.class),
    stats: {
      damage: w.damage,
      class: w.class,
      source: `${w.book} p${w.pageNo}`
    }
  }));

  return {
    armor: [
      { name: "Astartes Power Armour", req: 40, renown: "None", category: "Armor" },
      { name: "Astartes Mk6 Corvus Power Armour", req: 45, renown: "Distinguished", category: "Armor" },

// Convert the raw weapons into categorized shop items
const generateShopItems = () => {
  const items = Array.from(uniqueWeapons.values()).map(w => ({
    name: w.name,
    req: w.cost,
    renown: mapAvailabilityToRenown(w.availability),
    category: mapClassToCategory(w.class),
    stats: {
      damage: w.damage,
      class: w.class,
      source: `${w.book} p${w.pageNo}`
    }
  }));

  // Group items by category
  const categorized = {
    armor: [
      { name: "Astartes Power Armour", req: 40, renown: "None", category: "Armor" },
      { name: "Astartes Mk6 Corvus Power Armour", req: 45, renown: "Distinguished", category: "Armor" },
    { name: "Astartes Mk7 Aquila Power Armour", req: 45, renown: "Distinguished", category: "Armor" },
    { name: "Astartes Mk8 Errant Power Armour", req: 50, renown: "Distinguished", category: "Armor" },
    { name: "Armour of the Remorseless Crusader", req: 70, renown: "Hero", category: "Armor" },
    { name: "Astartes Scout Armour", req: 30, renown: "None", category: "Armor" },
    { name: "Astartes Terminator Armour", req: 100, renown: "Hero", category: "Armor" },
    { name: "Astartes Artificer Armour", req: 60, renown: "Distinguished", category: "Armor" },
    { name: "Astartes Storm Shield", req: 35, renown: "Distinguished", category: "Armor" },
    { name: "Astartes Combat Shield", req: 20, renown: "Distinguished", category: "Armor" },
    { name: "Astartes Iron Halo", req: 45, renown: "Hero", category: "Armor" },
    { name: "Astartes Sacred Shield", req: 40, renown: "Hero", category: "Armor" }
  ],
  rangedWeapons: [
    { name: "Astartes Bolt Pistol", req: 15, renown: "None", category: "Ranged Weapon" },
    { name: "Astartes Boltgun", req: 20, renown: "None", category: "Ranged Weapon" },
    { name: "Astartes Heavy Bolter", req: 30, renown: "None", category: "Ranged Weapon" },
    { name: "Astartes Storm Bolter", req: 25, renown: "Distinguished", category: "Ranged Weapon" },
    { name: "Angelus Bolter", req: 25, renown: "Respected", category: "Ranged Weapon" },
    { name: "Stalker Pattern Boltgun", req: 30, renown: "Distinguished", category: "Ranged Weapon" },
    { name: "Hellfire Bolter", req: 35, renown: "Distinguished", category: "Ranged Weapon" },
    { name: "Plasma Pistol", req: 30, renown: "Distinguished", category: "Ranged Weapon" },
    { name: "Plasma Gun", req: 35, renown: "Distinguished", category: "Ranged Weapon" },
    { name: "Plasma Cannon", req: 45, renown: "Hero", category: "Ranged Weapon" },
    { name: "Meltagun", req: 35, renown: "Distinguished", category: "Ranged Weapon" },
    { name: "Multi-Melta", req: 45, renown: "Hero", category: "Ranged Weapon" },
    { name: "Flamer", req: 25, renown: "None", category: "Ranged Weapon" },
    { name: "Heavy Flamer", req: 35, renown: "Distinguished", category: "Ranged Weapon" },
    { name: "Lascannon", req: 40, renown: "Distinguished", category: "Ranged Weapon" },
    { name: "Missile Launcher", req: 40, renown: "Distinguished", category: "Ranged Weapon" },
    { name: "Vengeance Launcher", req: 45, renown: "Hero", category: "Ranged Weapon" },
    { name: "Astartes Grenade Launcher", req: 30, renown: "Distinguished", category: "Ranged Weapon" }
  ],
  meleeWeapons: [
    { name: "Chainsword", req: 15, renown: "None", category: "Melee Weapon" },
    { name: "Eviscerator", req: 35, renown: "Distinguished", category: "Melee Weapon" },
    { name: "Power Sword", req: 25, renown: "Distinguished", category: "Melee Weapon" },
    { name: "Power Axe", req: 25, renown: "Distinguished", category: "Melee Weapon" },
    { name: "Power Maul", req: 25, renown: "Distinguished", category: "Melee Weapon" },
    { name: "Power Lance", req: 30, renown: "Distinguished", category: "Melee Weapon" },
    { name: "Power Fist", req: 35, renown: "Distinguished", category: "Melee Weapon" },
    { name: "Lightning Claw", req: 35, renown: "Distinguished", category: "Melee Weapon" },
    { name: "Thunder Hammer", req: 40, renown: "Hero", category: "Melee Weapon" },
    { name: "Force Sword", req: 35, renown: "Distinguished", category: "Melee Weapon" },
    { name: "Force Axe", req: 35, renown: "Distinguished", category: "Melee Weapon" },
    { name: "Force Halberd", req: 35, renown: "Distinguished", category: "Melee Weapon" },
    { name: "Force Staff", req: 35, renown: "Distinguished", category: "Melee Weapon" },
    { name: "Combat Knife", req: 10, renown: "None", category: "Melee Weapon" }
  ],
  ammunition: [
    { name: "Bolt Pistol Magazine", req: 2, renown: "None", category: "Ammunition" },
    { name: "Boltgun Magazine", req: 2, renown: "None", category: "Ammunition" },
    { name: "Storm Bolter Magazine", req: 3, renown: "None", category: "Ammunition" },
    { name: "Heavy Bolter Belt", req: 5, renown: "None", category: "Ammunition" },
    { name: "Hellfire Rounds", req: 8, renown: "Distinguished", category: "Ammunition" },
    { name: "Metal Storm Rounds", req: 8, renown: "Distinguished", category: "Ammunition" },
    { name: "Dragonfire Rounds", req: 8, renown: "Distinguished", category: "Ammunition" },
    { name: "Vengeance Rounds", req: 8, renown: "Distinguished", category: "Ammunition" },
    { name: "Kraken Penetrator Rounds", req: 8, renown: "Distinguished", category: "Ammunition" },
    { name: "Plasma Charge Pack", req: 5, renown: "None", category: "Ammunition" },
    { name: "Melta Charge", req: 5, renown: "None", category: "Ammunition" },
    { name: "Promethium Tank", req: 3, renown: "None", category: "Ammunition" },
    { name: "Missile Pack", req: 5, renown: "None", category: "Ammunition" },
    { name: "Krak Missiles", req: 8, renown: "None", category: "Ammunition" },
    { name: "Frag Missiles", req: 6, renown: "None", category: "Ammunition" },
    { name: "Vengeance Launcher Shells", req: 6, renown: "Distinguished", category: "Ammunition" }
  ]
};

const path = require('path');
const fs = require('fs');

if (require.main === module) {
  const output = path.resolve('public/deathwatch-armoury.json');
  fs.writeFileSync(output, JSON.stringify(coreItems, null, 2), 'utf8');
  console.log('Wrote core items to:', output);
}

module.exports = coreItems;
