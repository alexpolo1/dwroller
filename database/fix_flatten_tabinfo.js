// Script to flatten tabInfo for all players in the database
const mongoose = require('mongoose');
const Player = require('./playerModel');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/deathwatch';

function flattenTabInfo(tabInfo) {
  let t = tabInfo;
  while (t && t.tabInfo) t = t.tabInfo;
  return { ...t };
}

async function main() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const players = await Player.find();
  for (const player of players) {
    if (player.tabInfo && player.tabInfo.tabInfo) {
      const flat = flattenTabInfo(player.tabInfo);
      player.tabInfo = flat;
      await player.save();
      console.log(`Flattened tabInfo for ${player.name}`);
    }
  }
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
