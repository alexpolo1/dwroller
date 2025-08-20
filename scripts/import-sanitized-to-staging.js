#!/usr/bin/env node
const fs = require('fs');
const { stagingHelpers } = require('../database/sqlite-db');

const input = process.argv[2] || 'database/backups/sanitized-rules-test.json';
if (!fs.existsSync(input)) {
  console.error('Input not found', input);
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(input,'utf8'));
if (!data || !Array.isArray(data.sanitized)) {
  console.error('Expected file with { sanitized: [...] }');
  process.exit(1);
}

let count = 0;
for (const item of data.sanitized) {
  try {
    stagingHelpers.insert(item);
    count++;
  } catch (e) {
    console.error('Failed insert staging', e && e.message);
  }
}
console.log('Imported to staging:', count);
