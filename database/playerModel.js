const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollerInfo: { type: Object, default: {} },
  shopInfo: { type: Object, default: {} },
  tabInfo: { type: Object, default: {} },
});

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;
