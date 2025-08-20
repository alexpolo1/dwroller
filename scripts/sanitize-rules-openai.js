#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { callChat } = require('./openai-client');

async function sanitizeBlock(block) {
  const system = {
    role: 'system',
    content: 'You are a precise text sanitizer and normalizer and verification assistant for the Deathwatch tabletop RPG (Warhammer 40k RPG) rulebooks. The text is from the Core Rulebook / GM\'s Kit and primarily contains skills and rules entries. Your job is to: 1) clean OCR artifacts and normalize the text; 2) verify that the cleaned text represents a valid Deathwatch RPG rule/skill entry and report confidence. Return structured JSON only.'
  };

  const user = {
    role: 'user',
    content: `Context: these are Deathwatch RPG rule entries (skills, talents, actions, examples). Prefer canonical skill names when possible and drop obvious OCR noise (weird punctuation, duplicated letters, incorrect ligatures). If the block appears to be a heading/title, return it as the 'title'. If it contains rule text, return cleaned 'content'. Also verify the entry: include keys 'verified' (boolean), 'confidence' (number between 0 and 1) and an optional 'verification_notes' string explaining any uncertainty.

Raw extracted block:
TITLE: ${block.title || ''}
PAGE: ${block.page || ''}
CONTENT:
${block.content || ''}

Return a single valid JSON object with keys: title, content, category (optional), page (optional), verified, confidence (0-1), verification_notes (optional). Use short titles (<=80 chars). If you cannot determine a category, omit it. Keep JSON compact.`
  };

  const resp = await callChat([system, user], { max_tokens: 1600 });
  // The assistant should return a single JSON object. Extract JSON substring and parse.
  const jsonStart = resp && resp.indexOf('{');
  if (jsonStart >= 0) {
    const raw = resp.slice(jsonStart);
    try {
      const parsed = JSON.parse(raw);
      // Ensure verification fields exist; if not, try a lightweight verification step
      if (typeof parsed.verified === 'undefined' || typeof parsed.confidence === 'undefined') {
        const v = await verifyItem(parsed);
        parsed.verified = typeof parsed.verified === 'undefined' ? v.verified : parsed.verified;
        parsed.confidence = typeof parsed.confidence === 'undefined' ? v.confidence : parsed.confidence;
        if (v.notes) parsed.verification_notes = (parsed.verification_notes || '') + '\n' + v.notes;
      }
      return parsed;
    } catch (e) {
      const lastBrace = raw.lastIndexOf('}');
      if (lastBrace > 0) {
        try {
          const sliced = raw.slice(0, lastBrace + 1);
          const parsed = JSON.parse(sliced);
          if (typeof parsed.verified === 'undefined' || typeof parsed.confidence === 'undefined') {
            const v = await verifyItem(parsed);
            parsed.verified = typeof parsed.verified === 'undefined' ? v.verified : parsed.verified;
            parsed.confidence = typeof parsed.confidence === 'undefined' ? v.confidence : parsed.confidence;
            if (v.notes) parsed.verification_notes = (parsed.verification_notes || '') + '\n' + v.notes;
          }
          return parsed;
        } catch (e2) {
          throw new Error('Failed to parse JSON from OpenAI response');
        }
      }
      throw new Error('Failed to parse JSON from OpenAI response');
    }
  }
  throw new Error('Unexpected OpenAI response format');
}

async function verifyItem(item) {
  // Lightweight verification asking the model to judge whether this represents a Deathwatch rule/skill
  try {
    const sys = { role: 'system', content: 'You are an expert on the Deathwatch (Warhammer 40k) RPG Core Rulebook. Given a title and cleaned content, judge whether the text accurately represents an in-book rule/skill and give a confidence score.' };
    const user = { role: 'user', content: `TITLE: ${item.title || ''}\nCONTENT:\n${item.content || ''}\n\nReturn a single JSON object: {"verified": true|false, "confidence": 0.00-1.00, "notes": "optional explanation (short)"}` };
    const resp = await callChat([sys, user], { max_tokens: 400 });
    const start = resp && resp.indexOf('{');
    if (start >= 0) {
      const raw = resp.slice(start);
      try {
        const parsed = JSON.parse(raw);
        return { verified: !!parsed.verified, confidence: Number(parsed.confidence) || 0, notes: parsed.notes || '' };
      } catch (e) {
        const last = raw.lastIndexOf('}');
        if (last>0) {
          try { return JSON.parse(raw.slice(0,last+1)); } catch(e2){}
        }
      }
    }
  } catch (e) {
    // fall through
  }
  return { verified: false, confidence: 0, notes: 'verification-failed' };
}

async function main() {
  const input = process.argv[2] || 'database/backups/extracted-blocks.json';
  const out = process.argv[3] || 'database/backups/sanitized-rules.json';
  if (!fs.existsSync(input)) {
    console.error('Input file not found:', input);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
  if (!Array.isArray(raw)) {
    console.error('Expected input to be an array of blocks');
    process.exit(1);
  }

  const sanitized = [];
  const batchSize = parseInt(process.env.SANITIZE_BATCH_SIZE || '4', 10);
  for (let i = 0; i < raw.length; i += batchSize) {
    const batch = raw.slice(i, i + batchSize);
    console.log(`Sanitizing batch ${i + 1}-${Math.min(i + batchSize, raw.length)} of ${raw.length}`);
    // Build a batch prompt: ask for an array of JSON objects corresponding to each block
    const systemBatch = {
      role: 'system',
      content: 'You are a precise text sanitizer and verification assistant for the Deathwatch tabletop RPG (skills/rules). For the supplied list of raw blocks, return a single valid JSON array where each element corresponds to the cleaned block. Each element must be an object with keys: title, content, category (optional), page (optional), verified (boolean), confidence (0-1), verification_notes (optional). The order must match the input order. Do not include commentary.'
    };

    const userBatch = {
      role: 'user',
      content: batch.map((b, idx) => `BLOCK_INDEX:${idx}\nTITLE:${b.title || ''}\nPAGE:${b.page || ''}\nCONTENT:\n${b.content || ''}\n---`).join('\n') + '\n\nReturn a JSON array of objects.'
    };

    try {
      const resp = await callChat([systemBatch, userBatch], { max_tokens: 3200 });
      // attempt to parse JSON array from resp
      const start = resp && resp.indexOf('[');
      if (start >= 0) {
        const rawArr = resp.slice(start);
        try {
          const parsed = JSON.parse(rawArr);
          if (Array.isArray(parsed)) {
            // Attach originals and ensure verification fields exist
            for (let j = 0; j < parsed.length; j++) {
              const p = parsed[j] || {};
              const withOrig = Object.assign({ original: batch[j] || null }, p);
              // if verification is missing, run verifyItem
              if (typeof withOrig.verified === 'undefined' || typeof withOrig.confidence === 'undefined') {
                try {
                  const v = await verifyItem(withOrig);
                  withOrig.verified = typeof withOrig.verified === 'undefined' ? v.verified : withOrig.verified;
                  withOrig.confidence = typeof withOrig.confidence === 'undefined' ? v.confidence : withOrig.confidence;
                  if (v.notes) withOrig.verification_notes = (withOrig.verification_notes || '') + '\n' + v.notes;
                } catch (ve) {
                  withOrig.verified = false; withOrig.confidence = 0; withOrig.verification_notes = (withOrig.verification_notes||'') + '\nverification-error';
                }
              }
              sanitized.push(withOrig);
            }
            // small backoff
            await new Promise(r => setTimeout(r, 300));
            continue;
          }
        } catch (e) {
          console.error('Failed to parse batch JSON response', e && e.message);
        }
      }
      // Fallback: try individual processing
      for (let j = 0; j < batch.length; j++) {
        const idx = i + j;
        const block = batch[j];
        console.log(`Falling back to single sanitize for block ${idx + 1}`);
        try {
          const s = await sanitizeBlock(block);
          sanitized.push(Object.assign({ original: block }, s));
        } catch (e) {
          console.error('Sanitize failed for block:', idx, e.message);
          sanitized.push({ original: block, error: e.message });
        }
      }
    } catch (e) {
      console.error('Batch sanitize failed:', e && e.message);
      // On error, fallback to per-item processing for this batch
      for (let j = 0; j < batch.length; j++) {
        const idx = i + j;
        const block = batch[j];
        console.log(`Fallback single sanitize for block ${idx + 1}`);
        try {
          const s = await sanitizeBlock(block);
          sanitized.push(Object.assign({ original: block }, s));
        } catch (err) {
          console.error('Sanitize failed for block:', idx, err.message);
          sanitized.push({ original: block, error: err.message });
        }
      }
    }
  }

  fs.writeFileSync(out, JSON.stringify({ sanitized, meta: { generatedAt: new Date().toISOString(), count: sanitized.length } }, null, 2));
  console.log('Wrote sanitized output to', out);
}

if (require.main === module) main().catch(err => { console.error(err); process.exit(1); });
