const { db, playerHelpers } = require('./sqlite-db');

// Update all player passwords to '1234'
function updateAllPasswords() {
  try {
    // First check the table structure
    const columns = db.prepare("PRAGMA table_info(players)").all();
    console.log('Table columns:', columns.map(c => c.name));
    
    // Update only the pw column (pwHash might not exist)
    const updateStmt = db.prepare('UPDATE players SET pw = ?');
    const result = updateStmt.run('1234');
    
    console.log(`Updated ${result.changes} player passwords to '1234'`);
    
    // Verify the changes
    const players = playerHelpers.getAll();
    console.log('Current players:');
    players.forEach(player => {
      console.log(`- ${player.name}: pw="${player.pw}"`);
    });
    
  } catch (error) {
    console.error('Error updating passwords:', error);
  } finally {
    db.close();
  }
}

updateAllPasswords();
