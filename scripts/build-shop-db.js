const { categorizedWeapons } = require('./parse-weapons');
const { categorizedArmor } = require('./parse-armor');

// Combine all shop items into a single database
const buildShopDatabase = () => {
  const shopItems = {
    // Weapons
    rangedWeapons: categorizedWeapons.rangedWeapons,
    meleeWeapons: categorizedWeapons.meleeWeapons,
    grenades: categorizedWeapons.grenades,
    otherWeapons: categorizedWeapons.other,
    
    // Armor
    powerArmor: categorizedArmor.powerArmor,
    carapaceArmor: categorizedArmor.carapaceArmor,
    primitiveArmor: categorizedArmor.primitiveArmor,
    naturalArmor: categorizedArmor.naturalArmor,
    xenosArmor: categorizedArmor.xenosArmor,
    shields: categorizedArmor.shields,
    otherArmor: categorizedArmor.otherArmor
  };

  // Add metadata
  const shopDatabase = {
    version: "2.0.0",
    lastUpdated: new Date().toISOString(),
    categories: Object.keys(shopItems),
    items: shopItems
  };

  return shopDatabase;
};

// Write the database
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  
  // First ensure our source data is up to date
  require('./parse-weapons');
  require('./parse-armor');
  
  // Then build and write the combined database
  const output = path.resolve('public/deathwatch-armoury.json');
  const database = buildShopDatabase();
  fs.writeFileSync(output, JSON.stringify(database, null, 2), 'utf8');
  console.log('Wrote combined shop database to:', output);
}
