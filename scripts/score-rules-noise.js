#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { db } = require('../database/sqlite-db');

function nowTs() { return new Date().toISOString().replace(/[:.]/g,'-'); }

function charEntropy(s) {
  if (!s || s.length === 0) return 0;
  const freq = {};
  for (const ch of s) freq[ch] = (freq[ch]||0) + 1;
  const len = s.length;
  let ent = 0;
  for (const k in freq) {
    const p = freq[k]/len;
    ent -= p * Math.log2(p);
  }
  return ent;
}

function scoreText(text) {
  if (!text) return {score:0,metrics:{}};
  const s = String(text);
  const length = s.length;
  const letters = s.replace(/[^A-Za-z]/g,'');
  const upper = (s.match(/[A-Z]/g)||[]).length;
  const digits = (s.match(/[0-9]/g)||[]).length;
  const nonAlphaNum = (s.match(/[^A-Za-z0-9\s\.,;:\'"\-()\[\]\/\\]/g)||[]).length;
  const punctuation = (s.match(/[\.,;:\!\?\-\(\)\[\]"\']/g)||[]).length;
  const newlines = (s.match(/\n/g)||[]).length;
  const lines = s.split(/\n/);
  const shortLines = lines.filter(l => l.trim().length > 0 && l.trim().length < 40).length;
  const avgWordLen = (s.match(/\w+/g)||[]).reduce((a,w)=>a+w.length,0)/Math.max(1,(s.match(/\w+/g)||[]).length);
  const entropy = charEntropy(s);

  const upperRatio = letters.length ? upper/letters.length : 0;
  const nonAlphaRatio = length ? nonAlphaNum/length : 0;
  const newlineDensity = length ? newlines/length : 0;
  const shortLineRatio = lines.length ? shortLines/lines.length : 0;
  const punctDensity = length ? punctuation/length : 0;

  // Score: higher for uppercase-heavy, non-alpha junk, many newlines, many short lines, low avg word length, high entropy
  // Weights chosen empirically to bring noisy texts to the top.
  const score = (
    upperRatio * 2.5 +
    nonAlphaRatio * 4.0 +
    newlineDensity * 3.0 +
    shortLineRatio * 1.6 +
    (1/Math.max(1, avgWordLen)) * 1.2 +
    (entropy/6.0) * 1.0 +
    punctDensity * 0.8
  ) * 100;

  return { score, metrics: { length, upper, letters: letters.length, upperRatio, nonAlphaNum, nonAlphaRatio, newlines, newlineDensity, lines: lines.length, shortLines, shortLineRatio, avgWordLen, entropy, punctDensity } };
}

function main() {
  const rows = db.prepare('SELECT id, title, page, source, content FROM rules').all();
  if (!rows || rows.length === 0) {
    console.log('No rules found');
    return;
  }
  const scored = rows.map(r => {
    const text = (r.title||'') + '\n' + (r.content||'');
    const res = scoreText(text);
    return { id: r.id, title: (r.title||'').trim(), page: r.page, source: r.source, score: Math.round(res.score*100)/100, metrics: res.metrics, snippet: (r.content||'').replace(/\n/g,' ').slice(0,240) };
  });
  scored.sort((a,b)=>b.score - a.score);

  const top = scored.slice(0,40);
  const outDir = path.join(__dirname,'..','database','backups');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `rules-noise-report-${nowTs()}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ generatedAt: new Date().toISOString(), count: scored.length, top }, null, 2), 'utf8');

  console.log('Noise scoring complete. Total rules:', scored.length);
  console.log('Report written to', outFile);
  console.log('\nTop 25 noisy rules:');
  top.slice(0,25).forEach((r,i)=>{
    console.log(`${String(i+1).padStart(2,' ')}. id=${r.id} score=${r.score} title="${r.title}" page=${r.page} source=${r.source}`);
    console.log('    snippet:', r.snippet.replace(/\s+/g,' ').slice(0,200));
  });
}

main();
