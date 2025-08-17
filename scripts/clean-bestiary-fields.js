#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Helper function to extract clean field data
function extractCleanData(text, fieldType) {
  if (!text || typeof text !== 'string') return '';
  
  // Remove the massive duplicated text by finding patterns
  let cleaned = text;
  
  // Find the actual useful data before the corruption starts
  // Look for common patterns that indicate where the real data ends
  const endMarkers = [
    '. 361 X I I I : A d v e r s a r i e s',
    '.Gear: Respirator, 3 reloads for autopistol. 361',
    'Chaos "Every moment of anger',
    'X I I I : A d v e r s a r i e s',
    '361 X I I I',
    'reality of the universe'
  ];
  
  for (const marker of endMarkers) {
    const index = cleaned.indexOf(marker);
    if (index !== -1) {
      cleaned = cleaned.substring(0, index).trim();
      break;
    }
  }
  
  // Field-specific cleaning
  switch (fieldType) {
    case 'skills':
      // Extract skills section
      if (cleaned.includes('Skills: ')) {
        const skillsMatch = cleaned.match(/Skills:\s*([^.]*(?:\([^)]+\)[^.]*)*)/);
        if (skillsMatch) {
          cleaned = skillsMatch[1].trim();
        }
      }
      break;
      
    case 'talents':
      // Extract talents section
      if (cleaned.includes('Talents: ')) {
        const talentsMatch = cleaned.match(/Talents:\s*([^.]*(?:\([^)]+\)[^.]*)*)/);
        if (talentsMatch) {
          cleaned = talentsMatch[1].trim();
        }
      }
      break;
      
    case 'traits':
      // Extract traits section
      if (cleaned.includes('Traits: ')) {
        const traitsMatch = cleaned.match(/Traits:\s*([^.]*(?:\([^)]+\)[^.]*)*)/);
        if (traitsMatch) {
          cleaned = traitsMatch[1].trim();
        }
      }
      break;
      
    case 'armour':
      // Extract armour section
      if (cleaned.includes('Armour: ')) {
        const armourMatch = cleaned.match(/Armour:\s*([^.]*(?:\([^)]+\)[^.]*)*)/);
        if (armourMatch) {
          cleaned = armourMatch[1].trim();
        }
      }
      break;
      
    case 'weapons':
      // Extract weapons section
      if (cleaned.includes('Weapons: ')) {
        const weaponsMatch = cleaned.match(/Weapons:\s*([^.]*(?:\([^)]+\)[^.]*)*)/);
        if (weaponsMatch) {
          cleaned = weaponsMatch[1].trim();
        }
      }
      break;
      
    case 'gear':
      // Extract gear section
      if (cleaned.includes('Gear: ')) {
        const gearMatch = cleaned.match(/Gear:\s*([^.]*(?:\([^)]+\)[^.]*)*)/);
        if (gearMatch) {
          cleaned = gearMatch[1].trim();
        }
      }
      break;
  }
  
  // Remove any remaining corruption patterns
  cleaned = cleaned.replace(/\.\s*Talents:.*$/s, '');
  cleaned = cleaned.replace(/\.\s*Traits:.*$/s, '');
  cleaned = cleaned.replace(/\.\s*Armour:.*$/s, '');
  cleaned = cleaned.replace(/\.\s*Weapons:.*$/s, '');
  cleaned = cleaned.replace(/\.\s*Gear:.*$/s, '');
  
  // Trim and clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

async function cleanBestiaryFields() {
  console.log('=== CLEANING BESTIARY FIELD DATA ===');
  
  const bestiaryPath = path.join(__dirname, '../database/deathwatch-bestiary-extracted.json');
  
  if (!fs.existsSync(bestiaryPath)) {
    console.error('❌ Bestiary file not found:', bestiaryPath);
    return;
  }
  
  // Create backup
  const backupPath = `${bestiaryPath}.backup.${Date.now()}.json`;
  fs.copyFileSync(bestiaryPath, backupPath);
  console.log('✅ Backup created:', path.basename(backupPath));
  
  // Load data
  const data = JSON.parse(fs.readFileSync(bestiaryPath, 'utf8'));
  console.log('📊 Total entries:', data.results.length);
  
  let cleanedCount = 0;
  let totalSavings = 0;
  
  // Clean each entry
  for (let i = 0; i < data.results.length; i++) {
    const entry = data.results[i];
    if (!entry.stats) continue;
    
    const originalSize = JSON.stringify(entry.stats).length;
    
    // Clean each problematic field
    const fieldsToClean = ['skills', 'talents', 'traits', 'armour', 'weapons', 'gear'];
    let wasChanged = false;
    
    for (const field of fieldsToClean) {
      if (entry.stats[field] && typeof entry.stats[field] === 'string' && entry.stats[field].length > 200) {
        const original = entry.stats[field];
        const cleaned = extractCleanData(original, field);
        
        if (cleaned !== original) {
          entry.stats[field] = cleaned;
          wasChanged = true;
          console.log(`🧹 Cleaned ${field} for ${entry.bestiaryName}: ${original.length} → ${cleaned.length} chars`);
        }
      }
    }
    
    if (wasChanged) {
      cleanedCount++;
      const newSize = JSON.stringify(entry.stats).length;
      totalSavings += originalSize - newSize;
    }
  }
  
  // Save cleaned data
  fs.writeFileSync(bestiaryPath, JSON.stringify(data, null, 2));
  
  console.log('✅ Cleaned entries:', cleanedCount);
  console.log('💾 Total size reduction:', Math.round(totalSavings / 1024), 'KB');
  console.log('✅ Cleaned bestiary saved');
  
  // Show final statistics
  const finalSize = fs.statSync(bestiaryPath).size;
  const originalSize = fs.statSync(backupPath).size;
  console.log('📊 File size reduction:', Math.round((originalSize - finalSize) / 1024), 'KB');
  console.log('📈 Compression ratio:', Math.round((1 - finalSize / originalSize) * 100) + '%');
}

if (require.main === module) {
  cleanBestiaryFields().catch(console.error);
}

module.exports = { cleanBestiaryFields, extractCleanData };
