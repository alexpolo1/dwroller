const express = require('express');
const router = express.Router();
const shopHelpers = require('../shop-helpers');
const requireSession = require('../requireSession');

// Get all shop items (public endpoint)
router.get('/items', async (req, res) => {
  try {
    const items = await shopHelpers.getAllItems();
    res.json(items);
  } catch (error) {
    console.error('Failed to get shop items:', error);
    res.status(500).json({ error: 'Failed to get shop items' });
  }
});

// Get items by category (public endpoint)
router.get('/items/category/:category', async (req, res) => {
  try {
    const items = await shopHelpers.getItemsByCategory(req.params.category);
    res.json(items);
  } catch (error) {
    console.error('Failed to get shop items:', error);
    res.status(500).json({ error: 'Failed to get shop items' });
  }
});

// Protected routes below
router.use(requireSession);

// Get player's inventory
router.get('/inventory/:playerId', async (req, res) => {
  try {
    const inventory = await shopHelpers.getPlayerInventory(req.params.playerId);
    res.json(inventory);
  } catch (error) {
    console.error('Failed to get inventory:', error);
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

// Purchase item
router.post('/purchase', async (req, res) => {
  try {
    const { playerId, itemId, quantity = 1 } = req.body;
    const result = await shopHelpers.purchaseItem(playerId, itemId, quantity);
    res.json(result);
  } catch (error) {
    console.error('Failed to purchase item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get transaction history
router.get('/transactions/:playerId', async (req, res) => {
  try {
    const transactions = await shopHelpers.getPlayerTransactions(req.params.playerId);
    res.json(transactions);
  } catch (error) {
    console.error('Failed to get transactions:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

module.exports = router;
