#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BESTIARY_PATH = path.join(__dirname, '../database/deathwatch-bestiary-extracted.json');
const BACKUP_PATH = path.join(__dirname, '../database/deathwatch-bestiary-extracted.backup.' + Date.now() + '.json');

function cleanDatabase() {
  console.log('=== CLEANING CORRUPTED DATABASE ENTRIES ===');
  
  // Backup original
  const originalData = fs.readFileSync(BESTIARY_PATH, 'utf8');
  fs.writeFileSync(BACKUP_PATH, originalData);
  console.log(`✅ Backup created: ${path.basename(BACKUP_PATH)}`);
  
  const data = JSON.parse(originalData);
  const entries = data.results;
  
  console.log(`📊 Original entries: ${entries.length}`);
  
  // Define corrupted entry patterns
  const corruptedPatterns = [
    // Entries with Hive Tyrant stats (T:78, W:120) that aren't Hive Tyrants
    entry => {
      const stats = entry.stats?.profile || entry.profile || {};
      const name = (entry.bestiaryName || entry.name || '').toLowerCase();
      return stats.t === 78 && entry.wounds === 120 && !name.includes('tyrant');
    },
    
    // Entries with Tyranid page text but non-Tyranid names
    entry => {
      const name = (entry.bestiaryName || entry.name || '').toLowerCase();
      const pageText = entry.pageText || '';
      return pageText.includes('Tyranid') && 
             !name.includes('tyranid') && 
             !name.includes('genestealer') &&
             !name.includes('hive') &&
             !name.includes('hormagaunt') &&
             !name.includes('termagant');
    }
  ];
  
  // Filter out corrupted entries
  const cleanEntries = entries.filter((entry, i) => {
    const isCorrupted = corruptedPatterns.some(pattern => pattern(entry));
    
    if (isCorrupted) {
      console.log(`❌ Removing corrupted: ${entry.bestiaryName || entry.name}`);
      return false;
    }
    
    return true;
  });
  
  // Create cleaned database
  const cleanedData = {
    ...data,
    generatedAt: new Date().toISOString(),
    count: cleanEntries.length,
    results: cleanEntries,
    cleaningInfo: {
      originalCount: entries.length,
      removedCount: entries.length - cleanEntries.length,
      cleanedAt: new Date().toISOString(),
      backup: path.basename(BACKUP_PATH)
    }
  };
  
  // Write cleaned database
  fs.writeFileSync(BESTIARY_PATH, JSON.stringify(cleanedData, null, 2));
  
  console.log(`✅ Clean entries: ${cleanEntries.length}`);
  console.log(`❌ Removed corrupted: ${entries.length - cleanEntries.length}`);
  console.log(`💾 Database cleaned and saved`);
  
  // Show remaining entries summary
  console.log();
  console.log('=== REMAINING CLEAN ENTRIES ===');
  cleanEntries.forEach((entry, i) => {
    const stats = entry.stats?.profile || entry.profile || {};
    const name = entry.bestiaryName || entry.name;
    const tb = Math.floor((stats.t || 0) / 10);
    console.log(`${i+1}. ${name} (TB:${tb} W:${entry.wounds} - ${entry.book})`);
  });
  
  console.log();
  console.log('🎯 Database is now clean and ready for use!');
  console.log(`📁 Original backed up to: ${path.basename(BACKUP_PATH)}`);
}

cleanDatabase();
