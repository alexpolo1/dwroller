const { categorizedWeapons } = require('./parse-weapons');
const { categorizedArmor } = require('./parse-armor');
const comprehensiveWeapons = require('./comprehensive-weapons');
const comprehensiveArmor = require('./comprehensive-armor');

// Combine all shop items into a single database
const buildShopDatabase = () => {
  const shopItems = {
    // Use comprehensive weapons dataset
    rangedWeapons: comprehensiveWeapons.rangedWeapons,
    meleeWeapons: comprehensiveWeapons.meleeWeapons,
    grenades: comprehensiveWeapons.grenades,
    otherWeapons: comprehensiveWeapons.other,
    
    // Use comprehensive armor dataset
    powerArmor: comprehensiveArmor.powerArmor,
    powerArmorHelms: comprehensiveArmor.powerArmorHelms,
    carapaceArmor: comprehensiveArmor.carapaceArmor,
    naturalArmor: comprehensiveArmor.naturalArmor,
    primitiveArmor: comprehensiveArmor.primitiveArmor,
    xenosArmor: comprehensiveArmor.xenosArmor,
    shields: comprehensiveArmor.shields,
    otherArmor: comprehensiveArmor.otherArmor
  };

  // Add metadata
  const shopDatabase = {
    version: "3.0.0",
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
  const output = path.resolve('../public/deathwatch-armoury.json');
  const database = buildShopDatabase();
  fs.writeFileSync(output, JSON.stringify(database, null, 2), 'utf8');
  console.log('Wrote combined shop database to:', output);
}
