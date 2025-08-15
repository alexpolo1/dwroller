// One-time script to fix player passwords at the top level
const mongoose = require('mongoose');
const Player = require('./playerModel');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/deathwatch';

async function fixPasswords() {
  await mongoose.connect(MONGO_URI);
  const players = await Player.find();
  for (const player of players) {
    let pw = player.pw;
    let pwHash = player.pwHash;
    // Try to extract from tabInfo if not set at top level
    if ((!pw || pw === '') && player.tabInfo && player.tabInfo.pw) pw = player.tabInfo.pw;
    if ((!pwHash || pwHash === '') && player.tabInfo && player.tabInfo.pwHash) pwHash = player.tabInfo.pwHash;
    // Try to extract from tabInfo.tabInfo (legacy nesting)
    if ((!pw || pw === '') && player.tabInfo && player.tabInfo.tabInfo && player.tabInfo.tabInfo.pw) pw = player.tabInfo.tabInfo.pw;
    if ((!pwHash || pwHash === '') && player.tabInfo && player.tabInfo.tabInfo && player.tabInfo.tabInfo.pwHash) pwHash = player.tabInfo.tabInfo.pwHash;
    // Only update if needed
    if (pw && pwHash && (player.pw !== pw || player.pwHash !== pwHash)) {
      player.pw = pw;
      player.pwHash = pwHash;
      await player.save();
      console.log(`Updated ${player.name}: pw=${pw}, pwHash=${pwHash}`);
    }
  }
  await mongoose.disconnect();
  console.log('Done.');
}

fixPasswords().catch(e => { console.error(e); process.exit(1); });
