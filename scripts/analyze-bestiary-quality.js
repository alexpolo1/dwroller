#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const BESTIARY_PATH = path.join(__dirname, '../database/deathwatch-bestiary-extracted.json');

function analyzeDatabase() {
  const data = JSON.parse(fs.readFileSync(BESTIARY_PATH, 'utf8'));
  const entries = data.results;

  console.log('=== DATABASE QUALITY REVIEW ===');
  console.log(`Total entries: ${entries.length}`);
  console.log(`Generated at: ${data.generatedAt}`);
  console.log();

  // Check for duplicate stats
  console.log('=== CHECKING FOR DUPLICATE STATS ===');
  const statGroups = new Map();
  entries.forEach((entry, i) => {
    const stats = entry.stats?.profile || entry.profile;
    if (stats) {
      const key = `T:${stats.t}_W:${entry.wounds}_WS:${stats.ws}`;
      if (!statGroups.has(key)) {
        statGroups.set(key, []);
      }
      statGroups.get(key).push({ index: i, name: entry.bestiaryName || entry.name });
    }
  });

  let duplicateGroups = 0;
  statGroups.forEach((group, key) => {
    if (group.length > 1) {
      duplicateGroups++;
      console.log(`❌ Duplicate stats (${key}):`);
      group.forEach(item => console.log(`   - ${item.name}`));
      console.log();
    }
  });

  // Check for specific data quality issues
  console.log('=== DATA QUALITY ISSUES ===');
  let issueCount = 0;

  entries.forEach((entry, i) => {
    const name = entry.bestiaryName || entry.name || 'Unknown';
    const stats = entry.stats?.profile || entry.profile || {};
    const wounds = entry.wounds || entry.stats?.wounds;
    const issues = [];
    
    // Check T:78 entries (suspicious Hive Tyrant stats)
    if (stats.t === 78 && wounds === 120) {
      if (!name.toLowerCase().includes('tyrant')) {
        issues.push('Has Hive Tyrant stats but is not a Hive Tyrant');
      }
    }
    
    // Check for unrealistic civilian stats
    if (name.toLowerCase().includes('civilian') && (stats.t > 40 || wounds > 20)) {
      issues.push('Civilian with combat-level stats');
    }
    
    // Check for unrealistic servitor stats
    if (name.toLowerCase().includes('servitor') && stats.t > 50) {
      issues.push('Servitor with unrealistic toughness');
    }
    
    // Check for missing core data
    if (!stats.t || !wounds) {
      issues.push('Missing essential stats (Toughness or Wounds)');
    }
    
    // Check page text consistency
    if (entry.pageText && entry.pageText.includes('Tyranid') && !name.toLowerCase().includes('tyranid')) {
      issues.push('Page text mentions Tyranids but creature name suggests otherwise');
    }

    if (issues.length > 0) {
      issueCount++;
      console.log(`❌ ${i+1}. ${name}`);
      console.log(`   Book: ${entry.book || 'Unknown'} Page: ${entry.page || 'Unknown'}`);
      console.log(`   Stats: T:${stats.t} W:${wounds} WS:${stats.ws} BS:${stats.bs}`);
      issues.forEach(issue => console.log(`   ⚠️  ${issue}`));
      console.log();
    }
  });

  // Summary
  console.log('=== SUMMARY ===');
  console.log(`✅ Clean entries: ${entries.length - issueCount}`);
  console.log(`❌ Problematic entries: ${issueCount}`);
  console.log(`📊 Duplicate stat groups: ${duplicateGroups}`);
  
  if (issueCount > 0) {
    console.log();
    console.log('🔧 RECOMMENDATIONS:');
    console.log('- Review entries with identical stats for data corruption');
    console.log('- Check page text vs creature names for mismatched data');
    console.log('- Verify civilian/servitor entries have appropriate stats');
    console.log('- Consider re-extracting problematic entries from source PDFs');
  }
}

analyzeDatabase();
