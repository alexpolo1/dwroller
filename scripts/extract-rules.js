#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// This script will extract text from PDF files and create a searchable rules database
// It requires pdftotext (from poppler-utils) to be installed

const dataDir = path.join(__dirname, '../data');
const outputDir = path.join(__dirname, '../database/rules');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const rulebooks = [
  {
    filename: 'Deathwatch_Core_Rulebook_copy.pdf',
    name: 'Core Rulebook',
    abbreviation: 'CR',
    categories: ['combat', 'weapons', 'armor', 'skills', 'talents', 'psychic', 'equipment']
  },
  {
    filename: 'Deathwatch - Game Master\'s Kit.pdf',
    name: 'Game Master\'s Kit',
    abbreviation: 'GMK',
    categories: ['gm', 'enemies', 'vehicles', 'scenarios']
  }
];

// Rule patterns to identify different types of content
const rulePatterns = [
  // Combat rules
  { regex: /(?:attack|damage|wound|critical|hit|miss|dodge|parry)/i, category: 'combat' },
  // Weapons
  { regex: /(?:bolt|plasma|melta|flame|las|chain|power)\s*(?:pistol|rifle|cannon|sword|axe|gun)/i, category: 'weapons' },
  // Armor
  { regex: /(?:power\s*armor|carapace|flak|void\s*suit)/i, category: 'armor' },
  // Skills
  { regex: /(?:awareness|ballistic|weapon\s*skill|acrobatics|athletics|command|medicae)/i, category: 'skills' },
  // Talents
  { regex: /talent:?\s*([^.]+)/i, category: 'talents' },
  // Psychic
  { regex: /(?:psychic|warp|perils|manifestation)/i, category: 'psychic' },
  // Equipment
  { regex: /(?:equipment|gear|requisition|supply)/i, category: 'equipment' },
  // GM Rules
  { regex: /(?:game\s*master|narrator|npc|scenario|adventure)/i, category: 'gm' }
];

// Common rule keywords for better extraction
const ruleKeywords = [
  'Attack Roll', 'Damage Roll', 'Critical Hit', 'Righteous Fury',
  'Dodge', 'Parry', 'Full Auto', 'Semi Auto', 'Single Shot',
  'Power Armor', 'Requisition', 'Renown', 'Squad Mode', 'Cohesion',
  'Hordes', 'Fear', 'Pinning', 'Suppression', 'Cover',
  'Jamming', 'Overheating', 'Reload', 'Rate of Fire',
  'Penetration', 'Tearing', 'Felling', 'Proven', 'Unreliable',
  'Ballistic Skill', 'Weapon Skill', 'Strength', 'Toughness',
  'Agility', 'Intelligence', 'Perception', 'Willpower', 'Fellowship'
];

async function extractPDFText(pdfPath, outputPath) {
  return new Promise((resolve, reject) => {
    const command = `pdftotext -layout "${pdfPath}" "${outputPath}"`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error extracting ${pdfPath}:`, error);
        reject(error);
      } else {
        console.log(`Successfully extracted text from ${pdfPath}`);
        resolve(outputPath);
      }
    });
  });
}

function parseRulesFromText(text, source) {
  const rules = [];
  const lines = text.split('\n');
  let currentRule = null;
  let pageNumber = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Track page numbers (look for page number patterns)
    const pageMatch = line.match(/^\d+$/);
    if (pageMatch && parseInt(pageMatch[0]) > pageNumber) {
      pageNumber = parseInt(pageMatch[0]);
      continue;
    }
    
    // Look for rule headers (usually bold or all caps)
    const isRuleHeader = line.length > 3 && line.length < 50 && 
      (line === line.toUpperCase() || ruleKeywords.some(keyword => 
        line.toLowerCase().includes(keyword.toLowerCase())
      ));
    
    if (isRuleHeader) {
      // Save previous rule if it exists
      if (currentRule && currentRule.content.trim()) {
        rules.push(currentRule);
      }
      
      // Start new rule
      currentRule = {
        title: line,
        content: '',
        page: pageNumber,
        source: source.name,
        sourceAbbr: source.abbreviation,
        category: categorizeRule(line)
      };
    } else if (currentRule) {
      // Add content to current rule
      currentRule.content += line + '\n';
      
      // If content gets too long, split it
      if (currentRule.content.length > 1500) {
        rules.push(currentRule);
        currentRule = null;
      }
    }
  }
  
  // Add the last rule
  if (currentRule && currentRule.content.trim()) {
    rules.push(currentRule);
  }
  
  return rules;
}

function categorizeRule(title) {
  const titleLower = title.toLowerCase();
  
  for (const pattern of rulePatterns) {
    if (pattern.regex.test(title)) {
      return pattern.category;
    }
  }
  
  // Default categorization based on common terms
  if (titleLower.includes('attack') || titleLower.includes('combat') || titleLower.includes('damage')) {
    return 'combat';
  } else if (titleLower.includes('weapon') || titleLower.includes('gun') || titleLower.includes('sword')) {
    return 'weapons';
  } else if (titleLower.includes('armor') || titleLower.includes('protection')) {
    return 'armor';
  } else if (titleLower.includes('skill')) {
    return 'skills';
  } else if (titleLower.includes('talent')) {
    return 'talents';
  } else if (titleLower.includes('psychic') || titleLower.includes('power')) {
    return 'psychic';
  } else if (titleLower.includes('equipment') || titleLower.includes('gear')) {
    return 'equipment';
  } else {
    return 'general';
  }
}

function createSearchIndex(rules) {
  const index = {};
  
  rules.forEach((rule, ruleIndex) => {
    // Index by title words
    const titleWords = rule.title.toLowerCase().split(/\s+/);
    titleWords.forEach(word => {
      if (word.length > 2) {
        if (!index[word]) index[word] = [];
        index[word].push(ruleIndex);
      }
    });
    
    // Index by content words (first 100 words to avoid huge index)
    const contentWords = rule.content.toLowerCase().split(/\s+/).slice(0, 100);
    contentWords.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 3) {
        if (!index[cleanWord]) index[cleanWord] = [];
        if (!index[cleanWord].includes(ruleIndex)) {
          index[cleanWord].push(ruleIndex);
        }
      }
    });
  });
  
  return index;
}

async function processRulebooks() {
  console.log('Starting PDF processing...');
  
  let allRules = [];
  
  for (const rulebook of rulebooks) {
    const pdfPath = path.join(dataDir, rulebook.filename);
    
    if (!fs.existsSync(pdfPath)) {
      console.warn(`PDF not found: ${pdfPath}`);
      continue;
    }
    
    console.log(`Processing ${rulebook.name}...`);
    
    try {
      // Extract text
      const txtPath = path.join(outputDir, `${rulebook.abbreviation}.txt`);
      await extractPDFText(pdfPath, txtPath);
      
      // Read extracted text
      const text = fs.readFileSync(txtPath, 'utf8');
      
      // Parse rules
      const rules = parseRulesFromText(text, rulebook);
      console.log(`Extracted ${rules.length} rules from ${rulebook.name}`);
      
      allRules = allRules.concat(rules);
      
    } catch (error) {
      console.error(`Failed to process ${rulebook.name}:`, error);
    }
  }
  
  if (allRules.length === 0) {
    console.error('No rules extracted! Make sure pdftotext is installed (sudo apt install poppler-utils)');
    return;
  }
  
  // Assign unique IDs
  allRules.forEach((rule, index) => {
    rule.id = `rule_${index + 1}`;
  });
  
  // Create search index
  console.log('Creating search index...');
  const searchIndex = createSearchIndex(allRules);
  
  // Save rules database
  const rulesDbPath = path.join(outputDir, 'rules-database.json');
  fs.writeFileSync(rulesDbPath, JSON.stringify({
    rules: allRules,
    searchIndex: searchIndex,
    metadata: {
      totalRules: allRules.length,
      sources: rulebooks.map(rb => ({ name: rb.name, abbr: rb.abbreviation })),
      categories: [...new Set(allRules.map(r => r.category))],
      lastUpdated: new Date().toISOString()
    }
  }, null, 2));
  
  console.log(`Rules database created: ${rulesDbPath}`);
  console.log(`Total rules: ${allRules.length}`);
  console.log(`Search terms indexed: ${Object.keys(searchIndex).length}`);
  
  // Create a sample rules file for immediate testing
  const sampleRules = createSampleRules();
  const sampleDbPath = path.join(outputDir, 'sample-rules.json');
  fs.writeFileSync(sampleDbPath, JSON.stringify({
    rules: sampleRules,
    searchIndex: createSearchIndex(sampleRules),
    metadata: {
      totalRules: sampleRules.length,
      sources: [{ name: 'Sample Rules', abbr: 'SAMPLE' }],
      categories: [...new Set(sampleRules.map(r => r.category))],
      lastUpdated: new Date().toISOString()
    }
  }, null, 2));
  
  console.log(`Sample rules created for testing: ${sampleDbPath}`);
}

function createSampleRules() {
  return [
    {
      id: 'rule_sample_1',
      title: 'Attack Roll',
      content: 'To make an attack, roll 1d100 and compare to your Weapon Skill (for melee) or Ballistic Skill (for ranged). If the result is equal to or less than your skill, you hit. Apply modifiers for difficulty, range, and circumstances.',
      page: 45,
      source: 'Core Rulebook',
      sourceAbbr: 'CR',
      category: 'combat',
      examples: 'Brother Marcus has WS 40. Rolling 35 succeeds, rolling 45 fails.',
      relatedRules: ['Damage Roll', 'Critical Hit', 'Dodge']
    },
    {
      id: 'rule_sample_2',
      title: 'Damage Roll',
      content: 'When you successfully hit, roll damage using the weapon\'s damage dice plus your Strength Bonus (for melee) or the weapon\'s damage value (for ranged). Compare to the target\'s Toughness and armor.',
      page: 48,
      source: 'Core Rulebook',
      sourceAbbr: 'CR',
      category: 'combat',
      examples: 'Chainsword deals 1d10+3 damage. With SB 4, total damage is 1d10+7.',
      relatedRules: ['Attack Roll', 'Armor', 'Critical Hit']
    },
    {
      id: 'rule_sample_3',
      title: 'Power Armor',
      content: 'Astartes Power Armor provides 8 points of armor to all locations and includes built-in systems like auto-senses, vox communications, and life support. It also provides immunity to environmental hazards.',
      page: 150,
      source: 'Core Rulebook',
      sourceAbbr: 'CR',
      category: 'armor',
      examples: 'An attack dealing 12 damage is reduced to 4 damage (12-8=4).',
      relatedRules: ['Armor', 'Equipment', 'Requisition']
    },
    {
      id: 'rule_sample_4',
      title: 'Full Auto',
      content: 'Weapons with Full Auto can fire multiple shots in a single attack. Roll to hit as normal. For every 2 degrees of success, score one additional hit (maximum of half the weapon\'s Rate of Fire).',
      page: 52,
      source: 'Core Rulebook',
      sourceAbbr: 'CR',
      category: 'weapons',
      examples: 'Bolter RoF 4, hitting by 20 (2 degrees) scores 2 hits total.',
      relatedRules: ['Attack Roll', 'Semi Auto', 'Jamming']
    },
    {
      id: 'rule_sample_5',
      title: 'Requisition',
      content: 'Space Marines acquire equipment through the Requisition system using Requisition Points. Standard equipment costs 1-5 points, rare items cost more. Points are awarded for mission success and renewed each mission.',
      page: 130,
      source: 'Core Rulebook',
      sourceAbbr: 'CR',
      category: 'equipment',
      examples: 'Bolter costs 1 RP, Heavy Bolter costs 15 RP.',
      relatedRules: ['Equipment', 'Renown', 'Supply']
    },
    {
      id: 'rule_sample_6',
      title: 'Squad Mode',
      content: 'When Battle-Brothers maintain Cohesion, they can enter Squad Mode and use special abilities. Each round in Squad Mode, generate Cohesion points based on squad leadership and spend them on Squad Mode abilities.',
      page: 210,
      source: 'Core Rulebook',
      sourceAbbr: 'CR',
      category: 'squad',
      examples: 'A 5-man squad generates 2 Cohesion points per round.',
      relatedRules: ['Cohesion', 'Leadership', 'Tactics']
    }
  ];
}

// Check if pdftotext is available
exec('which pdftotext', (error) => {
  if (error) {
    console.log('pdftotext not found. Installing...');
    console.log('Run: sudo apt install poppler-utils');
    console.log('For now, creating sample rules database...');
    
    // Create sample rules even without PDF processing
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const sampleRules = createSampleRules();
    const sampleDbPath = path.join(outputDir, 'rules-database.json');
    fs.writeFileSync(sampleDbPath, JSON.stringify({
      rules: sampleRules,
      searchIndex: createSearchIndex(sampleRules),
      metadata: {
        totalRules: sampleRules.length,
        sources: [{ name: 'Sample Rules', abbr: 'SAMPLE' }],
        categories: [...new Set(sampleRules.map(r => r.category))],
        lastUpdated: new Date().toISOString()
      }
    }, null, 2));
    
    console.log('Sample rules database created for testing.');
  } else {
    // PDF processing is available
    processRulebooks().catch(console.error);
  }
});
