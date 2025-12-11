#!/usr/bin/env node

const Database = require('better-sqlite3');
const mysql = require('mysql2/promise');
const path = require('path');

// SQLite database path
const sqliteDbPath = path.join(__dirname, 'sqlite', 'deathwatch.db');

// MariaDB configuration
const mariadbConfig = {
  host: 'localhost',
  user: 'deathwatch',
  password: 'dwroller2025',
  database: 'deathwatch'
};

// Helper function to convert SQLite datetime to MySQL format
function convertDateTime(dateString) {
  if (!dateString) return null;
  try {
    return new Date(dateString).toISOString().slice(0, 19).replace('T', ' ');
  } catch (error) {
    console.warn(`Warning: Could not convert datetime: ${dateString}`);
    return null;
  }
}

async function migrateData() {
  let sqliteDb = null;
  let mariadbConnection = null;

  try {
    console.log('Starting data migration from SQLite to MariaDB...');
    
    // Connect to SQLite
    console.log('Connecting to SQLite database...');
    sqliteDb = new Database(sqliteDbPath);
    
    // Connect to MariaDB
    console.log('Connecting to MariaDB database...');
    mariadbConnection = await mysql.createConnection(mariadbConfig);
    
    // Migrate players table (includes requisition_points and renown_level)
    console.log('Migrating players table...');
    const players = sqliteDb.prepare('SELECT * FROM players').all();
    console.log(`Found ${players.length} players to migrate`);
    
    for (const player of players) {
      console.log(`  Migrating player: ${player.name}`);
      
      // Convert text fields to proper JSON
      const rollerInfo = player.roller_info || '{}';
      const shopInfo = player.shop_info || '{}';
      const tabInfo = player.tab_info || '{}';
      
      await mariadbConnection.execute(
        `INSERT INTO players (id, name, roller_info, shop_info, tab_info, pw, pw_hash, created_at, updated_at, requisition_points, renown_level) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         roller_info = VALUES(roller_info), 
         shop_info = VALUES(shop_info), 
         tab_info = VALUES(tab_info), 
         pw = VALUES(pw), 
         pw_hash = VALUES(pw_hash), 
         updated_at = VALUES(updated_at),
         requisition_points = VALUES(requisition_points),
         renown_level = VALUES(renown_level)`,
        [
          player.id,
          player.name,
          rollerInfo,
          shopInfo,
          tabInfo,
          player.pw || '',
          player.pw_hash || '',
          convertDateTime(player.created_at),
          convertDateTime(player.updated_at),
          player.requisition_points || 0,
          player.renown_level || 'None'
        ]
      );
    }
    
    // Migrate sessions table
    console.log('Migrating sessions table...');
    const sessions = sqliteDb.prepare('SELECT * FROM sessions').all();
    console.log(`Found ${sessions.length} sessions to migrate`);
    
    for (const session of sessions) {
      console.log(`  Migrating session: ${session.session_id}`);
      
      await mariadbConnection.execute(
        `INSERT INTO sessions (id, session_id, data, expires_at, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         data = VALUES(data), 
         expires_at = VALUES(expires_at), 
         updated_at = VALUES(updated_at)`,
        [
          session.id,
          session.session_id,
          session.data || '{}',
          convertDateTime(session.expires_at),
          convertDateTime(session.created_at),
          convertDateTime(session.updated_at)
        ]
      );
    }
    
    // Migrate shop_items table
    console.log('Migrating shop_items table...');
    const shopItems = sqliteDb.prepare('SELECT * FROM shop_items').all();
    console.log(`Found ${shopItems.length} shop items to migrate`);
    
    for (const item of shopItems) {
      console.log(`  Migrating shop item: ${item.name}`);
      
      await mariadbConnection.execute(
        `INSERT INTO shop_items (id, name, category, requisition_cost, renown_requirement, item_type, stats, source, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         name = VALUES(name),
         category = VALUES(category),
         requisition_cost = VALUES(requisition_cost),
         renown_requirement = VALUES(renown_requirement),
         item_type = VALUES(item_type),
         stats = VALUES(stats),
         source = VALUES(source),
         updated_at = VALUES(updated_at)`,
        [
          item.id,
          item.name,
          item.category,
          item.requisition_cost,
          item.renown_requirement,
          item.item_type,
          item.stats,
          item.source,
          convertDateTime(item.created_at),
          convertDateTime(item.updated_at)
        ]
      );
    }
    
    // Migrate player_inventory table
    console.log('Migrating player_inventory table...');
    const playerInventory = sqliteDb.prepare('SELECT * FROM player_inventory').all();
    console.log(`Found ${playerInventory.length} inventory items to migrate`);
    
    for (const invItem of playerInventory) {
      console.log(`  Migrating inventory item for player ${invItem.player_id}`);
      
      await mariadbConnection.execute(
        `INSERT INTO player_inventory (id, player_id, item_id, quantity, acquired_at, transaction_details) 
         VALUES (?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         quantity = VALUES(quantity),
         transaction_details = VALUES(transaction_details)`,
        [
          invItem.id,
          invItem.player_id,
          invItem.item_id,
          invItem.quantity,
          convertDateTime(invItem.acquired_at),
          invItem.transaction_details
        ]
      );
    }
    
    // Migrate transactions table
    console.log('Migrating transactions table...');
    const transactions = sqliteDb.prepare('SELECT * FROM transactions').all();
    console.log(`Found ${transactions.length} transactions to migrate`);
    
    for (const transaction of transactions) {
      console.log(`  Migrating transaction ${transaction.id}`);
      
      await mariadbConnection.execute(
        `INSERT INTO transactions (id, player_id, item_id, requisition_cost, previous_rp, new_rp, transaction_date) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          transaction.id,
          transaction.player_id,
          transaction.item_id,
          transaction.requisition_cost,
          transaction.previous_rp,
          transaction.new_rp,
          convertDateTime(transaction.transaction_date)
        ]
      );
    }
    
    // Migrate armour table
    console.log('Migrating armour table...');
    const armour = sqliteDb.prepare('SELECT * FROM armour').all();
    console.log(`Found ${armour.length} armour items to migrate`);
    
    for (const armourItem of armour) {
      console.log(`  Migrating armour: ${armourItem.name}`);
      
      await mariadbConnection.execute(
        `INSERT INTO armour (id, name, req, renown, category, stats, source, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         req = VALUES(req),
         renown = VALUES(renown),
         category = VALUES(category),
         stats = VALUES(stats),
         source = VALUES(source)`,
        [
          armourItem.id,
          armourItem.name,
          armourItem.req,
          armourItem.renown,
          armourItem.category,
          armourItem.stats,
          armourItem.source,
          convertDateTime(armourItem.created_at)
        ]
      );
    }
    
    // Migrate weapons table
    console.log('Migrating weapons table...');
    const weapons = sqliteDb.prepare('SELECT * FROM weapons').all();
    console.log(`Found ${weapons.length} weapons to migrate`);
    
    for (const weapon of weapons) {
      console.log(`  Migrating weapon: ${weapon.name}`);
      
      await mariadbConnection.execute(
        `INSERT INTO weapons (id, name, req, renown, category, stats, source, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         req = VALUES(req),
         renown = VALUES(renown),
         category = VALUES(category),
         stats = VALUES(stats),
         source = VALUES(source)`,
        [
          weapon.id,
          weapon.name,
          weapon.req,
          weapon.renown,
          weapon.category,
          weapon.stats,
          weapon.source,
          convertDateTime(weapon.created_at)
        ]
      );
    }
    
    // Migrate bestiary table
    console.log('Migrating bestiary table...');
    const bestiary = sqliteDb.prepare('SELECT * FROM bestiary').all();
    console.log(`Found ${bestiary.length} bestiary entries to migrate`);
    
    for (const beast of bestiary) {
      console.log(`  Migrating bestiary: ${beast.name}`);
      
      await mariadbConnection.execute(
        `INSERT INTO bestiary (id, name, book, page, pdf, stats, profile, snippet, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         book = VALUES(book),
         page = VALUES(page),
         pdf = VALUES(pdf),
         stats = VALUES(stats),
         profile = VALUES(profile),
         snippet = VALUES(snippet)`,
        [
          beast.id,
          beast.name,
          beast.book,
          beast.page,
          beast.pdf,
          beast.stats,
          beast.profile,
          beast.snippet,
          convertDateTime(beast.created_at)
        ]
      );
    }
    
    // Migrate rules table
    console.log('Migrating rules table...');
    const rules = sqliteDb.prepare('SELECT * FROM rules').all();
    console.log(`Found ${rules.length} rules to migrate`);
    
    for (const rule of rules) {
      console.log(`  Migrating rule: ${rule.title}`);
      
      // Truncate rule_id if it's too long (max 255 chars)
      const ruleId = rule.rule_id ? rule.rule_id.substring(0, 255) : null;
      // Truncate title if it's too long (max 500 chars)
      const title = rule.title ? rule.title.substring(0, 500) : null;
      
      await mariadbConnection.execute(
        `INSERT INTO rules (id, rule_id, title, content, page, source, source_abbr, category, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         title = VALUES(title),
         content = VALUES(content),
         page = VALUES(page),
         source = VALUES(source),
         source_abbr = VALUES(source_abbr),
         category = VALUES(category)`,
        [
          rule.id,
          ruleId,
          title,
          rule.content,
          rule.page,
          rule.source,
          rule.source_abbr,
          rule.category,
          convertDateTime(rule.created_at)
        ]
      );
    }
    
    // Migrate rules_staging table
    console.log('Migrating rules_staging table...');
    const rulesStaging = sqliteDb.prepare('SELECT * FROM rules_staging').all();
    console.log(`Found ${rulesStaging.length} rules_staging entries to migrate`);
    
    for (const rule of rulesStaging) {
      console.log(`  Migrating rules_staging: ${rule.title}`);
      
      await mariadbConnection.execute(
        `INSERT INTO rules_staging (id, title, content, category, page, original_json, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         title = VALUES(title), 
         content = VALUES(content), 
         category = VALUES(category), 
         page = VALUES(page), 
         original_json = VALUES(original_json)`,
        [
          rule.id,
          rule.title,
          rule.content,
          rule.category,
          rule.page,
          rule.original_json,
          convertDateTime(rule.created_at)
        ]
      );
    }
    
    console.log('Migration completed successfully!');
    
    // Verify migration
    console.log('\nVerifying migration...');
    const [mariadbPlayers] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM players');
    const [mariadbSessions] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM sessions');
    const [mariadbShopItems] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM shop_items');
    const [mariadbInventory] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM player_inventory');
    const [mariadbTransactions] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM transactions');
    const [mariadbArmour] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM armour');
    const [mariadbWeapons] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM weapons');
    const [mariadbBestiary] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM bestiary');
    const [mariadbRules] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM rules');
    const [mariadbRulesStaging] = await mariadbConnection.execute('SELECT COUNT(*) as count FROM rules_staging');
    
    console.log(`MariaDB players: ${mariadbPlayers[0].count}`);
    console.log(`MariaDB sessions: ${mariadbSessions[0].count}`);
    console.log(`MariaDB shop_items: ${mariadbShopItems[0].count}`);
    console.log(`MariaDB player_inventory: ${mariadbInventory[0].count}`);
    console.log(`MariaDB transactions: ${mariadbTransactions[0].count}`);
    console.log(`MariaDB armour: ${mariadbArmour[0].count}`);
    console.log(`MariaDB weapons: ${mariadbWeapons[0].count}`);
    console.log(`MariaDB bestiary: ${mariadbBestiary[0].count}`);
    console.log(`MariaDB rules: ${mariadbRules[0].count}`);
    console.log(`MariaDB rules_staging: ${mariadbRulesStaging[0].count}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (sqliteDb) {
      sqliteDb.close();
    }
    if (mariadbConnection) {
      await mariadbConnection.end();
    }
  }
}

// Run migration
migrateData().catch(console.error);
