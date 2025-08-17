const sqlite3 = require('sqlite3');
const path = require('path');

// Get database path
const dbPath = path.join(__dirname, 'sqlite', 'deathwatch.db');

// Create database connection
const db = new sqlite3.Database(dbPath);

// Shop and inventory related database operations
const shopHelpers = {
  // Get all items in the shop
  getAllItems: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM shop_items ORDER BY category, name', [], (err, rows) => {
        if (err) return reject(err);
        // Parse stats JSON string into object when possible
        const parsed = rows.map(r => {
          try {
            return Object.assign({}, r, { stats: r.stats ? JSON.parse(r.stats) : r.stats });
          } catch (e) {
            // if parsing fails, leave as-is
            return r;
          }
        });
        resolve(parsed);
      });
    });
  },

  // Get items by category
  getItemsByCategory: (category) => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM shop_items WHERE category = ? ORDER BY name', [category], (err, rows) => {
        if (err) return reject(err);
        const parsed = rows.map(r => {
          try {
            return Object.assign({}, r, { stats: r.stats ? JSON.parse(r.stats) : r.stats });
          } catch (e) {
            return r;
          }
        });
        resolve(parsed);
      });
    });
  },

  // Get player's inventory
  getPlayerInventory: (playerId) => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          pi.*,
          si.*
        FROM player_inventory pi
        JOIN shop_items si ON pi.item_id = si.id
        WHERE pi.player_id = ?
        ORDER BY si.category, si.name
      `, [playerId], (err, rows) => {
        if (err) return reject(err);
        const parsed = rows.map(r => {
          try {
            return Object.assign({}, r, { stats: r.stats ? JSON.parse(r.stats) : r.stats });
          } catch (e) {
            return r;
          }
        });
        resolve(parsed);
      });
    });
  },

  // Purchase item for player
  purchaseItem: (playerId, itemId, quantity = 1) => {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.get('BEGIN TRANSACTION');

        try {
          // Get player's current RP and the item cost
          db.get(`
            SELECT p.requisition_points, p.renown_level, si.requisition_cost, si.renown_requirement
            FROM players p, shop_items si
            WHERE p.id = ? AND si.id = ?
          `, [playerId, itemId], (err, row) => {
            if (err) throw err;
            if (!row) throw new Error('Player or item not found');

            const { requisition_points, renown_level, requisition_cost, renown_requirement } = row;
            const totalCost = requisition_cost * quantity;

            // Check if player has enough RP
            if (requisition_points < totalCost) {
              throw new Error('Insufficient requisition points');
            }

            // Check if player meets renown requirement
            const renownLevels = ['None', 'Respected', 'Distinguished', 'Hero', 'Legend'];
            const playerRenownIndex = renownLevels.indexOf(renown_level);
            const requiredRenownIndex = renownLevels.indexOf(renown_requirement);
            if (playerRenownIndex < requiredRenownIndex) {
              throw new Error('Insufficient renown level');
            }

            // Update player's RP
            const newRp = requisition_points - totalCost;
            db.run('UPDATE players SET requisition_points = ? WHERE id = ?',
              [newRp, playerId]);

            // Add to inventory or update quantity
            db.run(`
              INSERT INTO player_inventory (player_id, item_id, quantity)
              VALUES (?, ?, ?)
              ON CONFLICT(player_id, item_id) 
              DO UPDATE SET quantity = quantity + ?
            `, [playerId, itemId, quantity, quantity]);

            // Record transaction
            db.run(`
              INSERT INTO transactions (
                player_id, item_id, requisition_cost,
                previous_rp, new_rp
              ) VALUES (?, ?, ?, ?, ?)
            `, [playerId, itemId, totalCost, requisition_points, newRp]);

            db.get('COMMIT');
            resolve({ newRp });
          });
        } catch (error) {
          db.get('ROLLBACK');
          reject(error);
        }
      });
    });
  },

  // Get player's transaction history
  getPlayerTransactions: (playerId) => {
    return new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          t.*,
          si.name as item_name,
          si.category
        FROM transactions t
        JOIN shop_items si ON t.item_id = si.id
        WHERE t.player_id = ?
        ORDER BY t.transaction_date DESC
      `, [playerId], (err, rows) => {
        if (err) return reject(err);
        // transactions don't include full item stats, but parse if present
        const parsed = rows.map(r => {
          try {
            return Object.assign({}, r, { stats: r.stats ? JSON.parse(r.stats) : r.stats });
          } catch (e) {
            return r;
          }
        });
        resolve(parsed);
      });
    });
  }
};

module.exports = shopHelpers;
