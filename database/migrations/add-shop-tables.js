const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

// Get database path
const dbPath = path.join(__dirname, '..', 'sqlite', 'deathwatch.db');

// Create database connection
const db = new sqlite3.Database(dbPath);

// Load shop data
const shopData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/deathwatch-armoury.json'), 'utf8'));

// Migration function
async function migrate() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      try {
        // Create shop_items table
        db.run(`
          CREATE TABLE IF NOT EXISTS shop_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL,
            requisition_cost INTEGER NOT NULL DEFAULT 0,
            renown_requirement TEXT NOT NULL DEFAULT 'None',
            item_type TEXT NOT NULL,
            stats TEXT NOT NULL,
            source TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Create player_inventory table
        db.run(`
          CREATE TABLE IF NOT EXISTS player_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            transaction_details TEXT,
            FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES shop_items (id) ON DELETE CASCADE,
            UNIQUE(player_id, item_id)
          )
        `);

        // Create transactions table for purchase history
        db.run(`
          CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            requisition_cost INTEGER NOT NULL,
            previous_rp INTEGER NOT NULL,
            new_rp INTEGER NOT NULL,
            transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES shop_items (id) ON DELETE CASCADE
          )
        `);

        // Add triggers for updated_at timestamps
        db.run(`
          CREATE TRIGGER IF NOT EXISTS update_shop_items_timestamp
          AFTER UPDATE ON shop_items
          BEGIN
            UPDATE shop_items SET updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.id;
          END
        `);

        // Migrate existing shop data
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO shop_items (
            name, category, requisition_cost, renown_requirement,
            item_type, stats, source
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        // Insert weapons
        for (const category of Object.keys(shopData.items)) {
          const items = shopData.items[category];
          items.forEach(item => {
            stmt.run(
              item.name,
              category,
              item.req,
              item.renown,
              item.stats.class || item.stats.type,
              JSON.stringify(item.stats),
              item.stats.source
            );
          });
        }

        stmt.finalize();

        // Add new columns to players table if they don't exist
        db.all("PRAGMA table_info(players)", [], (err, rows) => {
          if (err) throw err;
          
          const columns = rows.map(row => row.name);
          
          if (!columns.includes('requisition_points')) {
            db.run(`ALTER TABLE players ADD COLUMN requisition_points INTEGER DEFAULT 0`);
          }
          
          if (!columns.includes('renown_level')) {
            db.run(`ALTER TABLE players ADD COLUMN renown_level TEXT DEFAULT 'None'`);
          }
        });

        // Migrate existing player inventory data
        db.all(`SELECT id, tab_info FROM players`, [], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          const inventoryStmt = db.prepare(`
            INSERT OR IGNORE INTO player_inventory (
              player_id, item_id, quantity, transaction_details
            ) 
            SELECT ?, shop_items.id, 1, ?
            FROM shop_items 
            WHERE shop_items.name = ?
          `);

          // Convert rows processing to Promise-based
          const processRows = async () => {
            for (const row of rows) {
              if (!row.tab_info) continue;
              
              try {
                const tabInfo = JSON.parse(row.tab_info);
                if (!tabInfo.gear) continue;

                // Add each gear item to inventory
                for (const item of tabInfo.gear) {
                  await new Promise((resolve, reject) => {
                    inventoryStmt.run(
                      row.id,
                      JSON.stringify({
                        acquired_via: 'data_migration',
                        original_data: item
                      }),
                      item.name,
                      (err) => {
                        if (err) reject(err);
                        else resolve();
                      }
                    );
                  });
                }

                // Update player's RP
                if (tabInfo.rp !== undefined) {
                  await new Promise((resolve, reject) => {
                    db.run(
                      'UPDATE players SET requisition_points = ? WHERE id = ?',
                      [tabInfo.rp, row.id],
                      (err) => {
                        if (err) reject(err);
                        else resolve();
                      }
                    );
                  });
                }

                // Update player's renown
                if (tabInfo.renown) {
                  await new Promise((resolve, reject) => {
                    db.run(
                      'UPDATE players SET renown_level = ? WHERE id = ?',
                      [tabInfo.renown, row.id],
                      (err) => {
                        if (err) reject(err);
                        else resolve();
                      }
                    );
                  });
                }
              } catch (e) {
                console.error('Error processing player data:', e);
              }
            }
            
            inventoryStmt.finalize();
          };

          processRows()
            .then(() => {
              console.log('Migration completed successfully');
              resolve();
            })
            .catch(err => {
              console.error('Error during migration:', err);
              reject(err);
            });
        });
      } catch (error) {
        console.error('Migration failed:', error);
        reject(error);
      }
    });
  });
}

// Run migration
migrate()
  .then(() => {
    console.log('Migration completed');
    // Give SQLite operations time to complete
    setTimeout(() => db.close(), 1000);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    // Give SQLite operations time to complete
    setTimeout(() => db.close(), 1000);
  });
