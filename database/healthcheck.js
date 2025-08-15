// Simple healthcheck script for local use and systemd
// Exit code 0 = OK, non-zero = failure
const { playerHelpers, db } = require('./sqlite-db');

async function run() {
  try {
    const players = playerHelpers.getAll();
    console.log(`Players count: ${players.length}`);
    // optional: print first few names
    console.log(players.slice(0, 10).map(p => p.name));
    // Close DB and exit 0
    db.close();
    process.exit(0);
  } catch (err) {
    console.error('Healthcheck failed:', err && err.message ? err.message : err);
    try { db.close(); } catch(e){}
    process.exit(2);
  }
}

run();
