const mongoose = require('mongoose');
const Player = require('./playerModel');
const { playerHelpers, sessionHelpers } = require('./sqlite-db');

require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/deathwatch';

async function migratePlayers() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    // Fetch all players from MongoDB
    console.log('Fetching players from MongoDB...');
    const mongoPlayers = await Player.find();
    console.log(`Found ${mongoPlayers.length} players in MongoDB`);

    // Migrate each player to SQLite
    let migratedCount = 0;
    let skippedCount = 0;

    for (const mongoPlayer of mongoPlayers) {
      try {
        // Check if player already exists in SQLite
        const existingPlayer = playerHelpers.getByName(mongoPlayer.name);
        
        if (existingPlayer) {
          console.log(`Player ${mongoPlayer.name} already exists in SQLite, updating...`);
          const updated = playerHelpers.update(mongoPlayer.name, {
            rollerInfo: mongoPlayer.rollerInfo || {},
            shopInfo: mongoPlayer.shopInfo || {},
            tabInfo: mongoPlayer.tabInfo || {},
            pw: mongoPlayer.pw || '',
            pwHash: mongoPlayer.pwHash || ''
          });
          
          if (updated) {
            console.log(`✓ Updated player: ${mongoPlayer.name}`);
            migratedCount++;
          } else {
            console.log(`⚠ Failed to update player: ${mongoPlayer.name}`);
            skippedCount++;
          }
        } else {
          // Create new player in SQLite
          const newPlayer = playerHelpers.create({
            name: mongoPlayer.name,
            rollerInfo: mongoPlayer.rollerInfo || {},
            shopInfo: mongoPlayer.shopInfo || {},
            tabInfo: mongoPlayer.tabInfo || {},
            pw: mongoPlayer.pw || '',
            pwHash: mongoPlayer.pwHash || ''
          });
          
          console.log(`✓ Migrated player: ${mongoPlayer.name}`);
          migratedCount++;
        }
        
        // Log the data being migrated
        console.log(`  - Roller info: ${Object.keys(mongoPlayer.rollerInfo || {}).length} keys`);
        console.log(`  - Shop info: ${Object.keys(mongoPlayer.shopInfo || {}).length} keys`);
        console.log(`  - Tab info: ${Object.keys(mongoPlayer.tabInfo || {}).length} keys`);
        
      } catch (error) {
        console.error(`Error migrating player ${mongoPlayer.name}:`, error);
        skippedCount++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total players in MongoDB: ${mongoPlayers.length}`);
    console.log(`Successfully migrated/updated: ${migratedCount}`);
    console.log(`Skipped/failed: ${skippedCount}`);

    // Verify the migration
    console.log('\n=== Verification ===');
    const sqlitePlayers = playerHelpers.getAll();
    console.log(`Total players in SQLite: ${sqlitePlayers.length}`);
    
    // Show sample data
    if (sqlitePlayers.length > 0) {
      console.log('\nSample migrated player:');
      const sample = sqlitePlayers[0];
      console.log(`Name: ${sample.name}`);
      console.log(`Roller info keys: ${Object.keys(sample.rollerInfo).length}`);
      console.log(`Shop info keys: ${Object.keys(sample.shopInfo).length}`);
      console.log(`Tab info keys: ${Object.keys(sample.tabInfo).length}`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close connections
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Export player data to JSON for backup
async function exportToJson() {
  try {
    console.log('Exporting MongoDB data to JSON backup...');
    
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    
    // Fetch all players
    const players = await Player.find();
    
    // Create backup object
    const backup = {
      exportDate: new Date().toISOString(),
      playerCount: players.length,
      players: players.map(player => ({
        name: player.name,
        rollerInfo: player.rollerInfo || {},
        shopInfo: player.shopInfo || {},
        tabInfo: player.tabInfo || {},
        pw: player.pw || '',
        pwHash: player.pwHash || '',
        mongoId: player._id.toString()
      }))
    };
    
    // Write to file
    const fs = require('fs');
    const path = require('path');
    const backupPath = path.join(__dirname, 'mongo-backup.json');
    
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`✓ Backup saved to: ${backupPath}`);
    console.log(`✓ Exported ${players.length} players`);
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('Export failed:', error);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--export-only')) {
    await exportToJson();
  } else if (args.includes('--migrate-only')) {
    await migratePlayers();
  } else {
    // Do both
    await exportToJson();
    await migratePlayers();
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { migratePlayers, exportToJson };
