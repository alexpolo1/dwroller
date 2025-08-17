#!/usr/bin/env node
// Extract candidate enemy names and nearby stat snippets from PDFs in /data
// Usage: node scripts/extract-enemies-from-pdfs.js

const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const DATA_DIR = path.join(__dirname, '..', 'data');
const OUT_DIR = path.join(__dirname, '..', 'database');
const OUT_FILE = path.join(OUT_DIR, 'enemies-raw.json');

function safeMkdir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function guessNamesFromText(text) {
  // Split into candidate lines by newlines. Heuristic: lines with 2-5 Titlecase words and length < 90
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const candidates = new Set();
  for (const line of lines) {
    if (line.length < 6 || line.length > 120) continue;
    // Skip lines that look like table headers or page footers
    if (/^(Page|Table|Contents|Chapter)\b/i.test(line)) continue;
    // Count Titlecase words
    const words = line.split(/\s+/);
    const titleCount = words.filter(w => /^[A-Z0-9][a-zA-Z'\-\(\)]{1,}/.test(w)).length;
    if (titleCount >= 2 && titleCount <= 6) {
      // Avoid lines with many punctuation marks
      if ((line.match(/[\|\=\*]/g) || []).length > 0) continue;
      // Likely a name/title
      candidates.add(line.replace(/\s{2,}/g, ' '));
    }
  }
  return Array.from(candidates);
}

function extractStatsFromSnippet(snippet) {
  const out = {};
  // Wounds
  const wounds = snippet.match(/Wounds[:\s]*([0-9]{1,3})/i) || snippet.match(/wounds[:\s]*([0-9]{1,3})/i);
  if (wounds) out.wounds = Number(wounds[1]);
  // Toughness / TB
  const tb = snippet.match(/\bToughness[:\s]*([0-9]{1,3})/i) || snippet.match(/\bTB[:\s]*([0-9]{1,3})/i);
  if (tb) out.toughness = Number(tb[1]);
  // Armour / AP
  const ap = snippet.match(/Armou?r(?:\s|:)?\s*AP[:\s]*([0-9]{1,3})/i) || snippet.match(/AP[:\s]*([0-9]{1,3})/i);
  if (ap) out.ap = Number(ap[1]);
  // Page number hints
  const page = snippet.match(/Page\s+No\.\s*([0-9]{1,4})/i) || snippet.match(/p(?:age)?\.?\s*([0-9]{1,4})/i);
  if (page) out.page = Number(page[1]);
  return out;
}

async function processPdf(filePath) {
  const buffer = fs.readFileSync(filePath);
  try {
    const data = await pdf(buffer);
    const text = data.text || '';
    const names = guessNamesFromText(text);
    const entries = [];
    for (const name of names) {
      const idx = text.indexOf(name);
      if (idx === -1) continue;
      const start = Math.max(0, idx - 300);
      const end = Math.min(text.length, idx + name.length + 400);
      const snippet = text.substring(start, end).replace(/\s{2,}/g, ' ');
      const stats = extractStatsFromSnippet(snippet);
      entries.push({ name, source: path.basename(filePath), snippet: snippet.trim(), stats });
    }
    return entries;
  } catch (err) {
    console.error('Error parsing PDF', filePath, err.message);
    return [];
  }
}

async function main() {
  safeMkdir(OUT_DIR);
  if (!fs.existsSync(DATA_DIR)) {
    console.error('Data directory not found:', DATA_DIR);
    process.exit(1);
  }
  const files = fs.readdirSync(DATA_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  const all = [];
  for (const f of files) {
    const p = path.join(DATA_DIR, f);
    console.log('Processing', f);
    const entries = await processPdf(p);
    all.push(...entries);
  }
  fs.writeFileSync(OUT_FILE, JSON.stringify(all, null, 2));
  console.log('Wrote', OUT_FILE, 'with', all.length, 'candidate entries');
}

if (require.main === module) main().catch(err => { console.error(err); process.exit(1); });
