const express = require('express');
const router = express.Router();

console.log('Simple rules routes loading...');

// Test route
router.get('/test', (req, res) => {
  console.log('Simple test route hit!');
  res.json({ message: 'Simple rules test working!' });
});

// Stats route
router.get('/stats', (req, res) => {
  console.log('Simple stats route hit!');
  res.json({ 
    totalRules: 288,
    message: 'Simple stats working!'
  });
});

console.log('Simple rules routes registered');
module.exports = router;
