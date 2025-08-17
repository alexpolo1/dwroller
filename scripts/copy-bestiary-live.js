#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple script to copy bestiary from database to public for live updates
function copyBestiaryToPublic() {
  const dbPath = path.join(__dirname, '../database/deathwatch-bestiary-extracted.json');
  const publicPath = path.join(__dirname, '../public/deathwatch-bestiary-extracted.json');
  const buildPath = path.join(__dirname, '../build/deathwatch-bestiary-extracted.json');
  
  try {
    if (!fs.existsSync(dbPath)) {
      console.error('❌ Database bestiary file not found:', dbPath);
      return false;
    }
    
    // Copy to public
    fs.copyFileSync(dbPath, publicPath);
    console.log('✅ Copied to public:', publicPath);
    
    // Copy to build if it exists
    if (fs.existsSync(path.dirname(buildPath))) {
      fs.copyFileSync(dbPath, buildPath);
      console.log('✅ Copied to build:', buildPath);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error copying bestiary files:', error.message);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  copyBestiaryToPublic();
}

module.exports = { copyBestiaryToPublic };
