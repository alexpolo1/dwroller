const { playerHelpers } = require('./mariadb');

async function migrateInventoryToGear() {
  try {
    console.log('Starting inventory to gear migration...');
    
    const players = await playerHelpers.getAll();
    
    for (const player of players) {
      if (player.tabInfo && player.tabInfo.inventory && player.tabInfo.inventory.length > 0) {
        console.log(`Migrating inventory for ${player.name}...`);
        
        const updatedTabInfo = { ...player.tabInfo };
        
        // Initialize gear if it doesn't exist
        if (!updatedTabInfo.gear) {
          updatedTabInfo.gear = [];
        }
        
        // Move inventory items to gear
        for (const invItem of updatedTabInfo.inventory) {
          const gearItem = {
            name: invItem.name,
            qty: invItem.count || invItem.quantity || 1
          };
          
          // Check if item already exists in gear
          const existingGearIndex = updatedTabInfo.gear.findIndex(g => g.name === gearItem.name);
          
          if (existingGearIndex >= 0) {
            // Update existing item quantity
            updatedTabInfo.gear[existingGearIndex].qty += gearItem.qty;
          } else {
            // Add new item to gear
            updatedTabInfo.gear.push(gearItem);
          }
        }
        
        // Clear inventory since we moved everything to gear
        updatedTabInfo.inventory = [];
        
        // Update player
        await playerHelpers.update(player.name, { ...player, tabInfo: updatedTabInfo });
        console.log(`  Moved ${player.tabInfo.inventory.length} items to gear`);
      }
    }
    
    console.log('Migration completed!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
  
  process.exit(0);
}

migrateInventoryToGear();
