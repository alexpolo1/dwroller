const { db } = require('./sqlite-db');

// Shop and inventory related database operations
const shopHelpers = {
  // Get all items in the shop
  getAllItems: () => {
    try {
      const rows = db.prepare('SELECT * FROM shop_items ORDER BY category, name').all();
      // Parse stats JSON string into object when possible
      const parsed = rows.map(r => {
        try {
          return Object.assign({}, r, { stats: r.stats ? JSON.parse(r.stats) : r.stats });
        } catch (e) {
          // if parsing fails, leave as-is
          return r;
        }
      });
      return Promise.resolve(parsed);
    } catch (err) {
      return Promise.reject(err);
    }
  },

  // Get items by category
  getItemsByCategory: (category) => {
    try {
      const rows = db.prepare('SELECT * FROM shop_items WHERE category = ? ORDER BY name').all(category);
      const parsed = rows.map(r => {
        try {
          return Object.assign({}, r, { stats: r.stats ? JSON.parse(r.stats) : r.stats });
        } catch (e) {
          return r;
        }
      });
      return Promise.resolve(parsed);
    } catch (err) {
      return Promise.reject(err);
    }
  },

  // Get player's inventory
  getPlayerInventory: (playerId) => {
    try {
      const rows = db.prepare(`
        SELECT 
          pi.*,
          si.*
        FROM player_inventory pi
        JOIN shop_items si ON pi.item_id = si.id
        WHERE pi.player_id = ?
        ORDER BY si.category, si.name
      `).all(playerId);
      const parsed = rows.map(r => {
        try {
          return Object.assign({}, r, { stats: r.stats ? JSON.parse(r.stats) : r.stats });
        } catch (e) {
          return r;
        }
      });
      return Promise.resolve(parsed);
    } catch (err) {
      return Promise.reject(err);
    }
  },

  // Purchase item for player
  purchaseItem: (playerId, itemId, quantity = 1) => {
    try {
      // Start transaction
      const transaction = db.transaction(() => {
        // Get player's current RP and the item cost
        const playerAndItem = db.prepare(`
          SELECT p.requisition_points, p.renown_level, si.requisition_cost, si.renown_requirement
          FROM players p, shop_items si
          WHERE p.id = ? AND si.id = ?
        `).get(playerId, itemId);

        if (!playerAndItem) {
          throw new Error('Player or item not found');
        }

        const { requisition_points, renown_level, requisition_cost, renown_requirement } = playerAndItem;
        const totalCost = requisition_cost * quantity;

        // Check if player has enough RP
        if (requisition_points < totalCost) {
          throw new Error('Insufficient requisition points');
        }

        // Check if player meets renown requirement
        // Keep renown levels in the same order used by the frontend
        const renownLevels = ['None', 'Respected', 'Distinguished', 'Famed', 'Hero'];
        const normalize = (r) => String(r || '').trim();
        const playerRenownIndex = renownLevels.findIndex(x => x.toLowerCase() === normalize(renown_level).toLowerCase());
        const requiredRenownIndex = renownLevels.findIndex(x => x.toLowerCase() === normalize(renown_requirement).toLowerCase());
        // If not found, treat unknown as lowest rank (index 0)
        const pIndex = playerRenownIndex === -1 ? 0 : playerRenownIndex;
        const reqIndex = requiredRenownIndex === -1 ? 0 : requiredRenownIndex;
        if (pIndex < reqIndex) {
          throw new Error('Insufficient renown level');
        }

        // Update player's RP
        const newRp = requisition_points - totalCost;
        db.prepare('UPDATE players SET requisition_points = ? WHERE id = ?')
          .run(newRp, playerId);

        // Add to inventory or update quantity
        db.prepare(`
          INSERT INTO player_inventory (player_id, item_id, quantity)
          VALUES (?, ?, ?)
          ON CONFLICT(player_id, item_id) 
          DO UPDATE SET quantity = quantity + ?
        `).run(playerId, itemId, quantity, quantity);

        // Record transaction
        db.prepare(`
          INSERT INTO transactions (
            player_id, item_id, requisition_cost, quantity,
            previous_rp, new_rp
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(playerId, itemId, totalCost, quantity, requisition_points, newRp);

        return { newRp };
      });

      // Execute transaction
      const result = transaction();
      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(error);
    }
  },

  // Get player's transaction history
  getPlayerTransactions: (playerId) => {
    try {
      const rows = db.prepare(`
        SELECT 
          t.*,
          si.name as item_name,
          si.category
        FROM transactions t
        JOIN shop_items si ON t.item_id = si.id
        WHERE t.player_id = ?
        ORDER BY t.transaction_date DESC
      `).all(playerId);
      const parsed = rows.map(r => {
        try {
          return Object.assign({}, r, { stats: r.stats ? JSON.parse(r.stats) : r.stats });
        } catch (e) {
          return r;
        }
      });
      return Promise.resolve(parsed);
    } catch (err) {
      return Promise.reject(err);
    }
  }
};

module.exports = shopHelpers;
