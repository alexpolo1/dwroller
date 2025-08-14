const express = require('express');
const Player = require('../playerModel');

const router = express.Router();

// Get all players
router.get('/', async (req, res) => {
  try {
    const players = await Player.find();
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Get a single player by name
router.get('/:name', async (req, res) => {
  try {
    const player = await Player.findOne({ name: req.params.name });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// Create a new player
router.post('/', async (req, res) => {
  try {
    const newPlayer = new Player(req.body);
    await newPlayer.save();
    res.status(201).json(newPlayer);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create player' });
  }
});

// Update a player
router.put('/:name', async (req, res) => {
  try {
    const updatedPlayer = await Player.findOneAndUpdate(
      { name: req.params.name },
      req.body,
      { new: true }
    );
    if (!updatedPlayer) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(updatedPlayer);
  } catch (error) {
    res.status(400).json({ error: 'Failed to update player' });
  }
});

// Delete a player
router.delete('/:name', async (req, res) => {
  try {
    const deletedPlayer = await Player.findOneAndDelete({ name: req.params.name });
    if (!deletedPlayer) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

module.exports = router;
