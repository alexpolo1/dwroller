const mongoose = require('mongoose');
const Player = require('./playerModel');
const GMSession = require('./gmSessionModel');

async function setupDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/deathwatch', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB.');

    console.log('Initializing collections...');

    // Initialize Players collection
    const samplePlayers = [
      { name: 'Player1', rollerInfo: {}, shopInfo: {}, tabInfo: {} },
      { name: 'Player2', rollerInfo: {}, shopInfo: {}, tabInfo: {} },
    ];
    await Player.insertMany(samplePlayers);
    console.log('Players collection initialized.');

    // Initialize GM Sessions collection
    const sampleSessions = [
      { sessionId: 'session1', isActive: true },
      { sessionId: 'session2', isActive: false },
    ];
    await GMSession.insertMany(sampleSessions);
    console.log('GM Sessions collection initialized.');

    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Error during database setup:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

setupDatabase();
