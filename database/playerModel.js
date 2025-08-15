const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollerInfo: { type: Object, default: {} },
  shopInfo: { type: Object, default: {} },
  tabInfo: { type: Object, default: {} },
  pw: { type: String, default: '' },
  pwHash: { type: String, default: '' },
});

const Player = mongoose.model('Player', playerSchema);

module.exports = Player;
