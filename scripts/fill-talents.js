#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');
const { db } = require('../database/sqlite-db');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'dwroller-bot/1.0' } }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

function sanitizeText(s) {
  if (!s) return '';
  let t = String(s);
  t = t.replace(/Explore More/ig, '');
  t = t.replace(/Skip to content/ig, '');
  t = t.replace(/40k-?RPG-?FFG Wiki/ig, '');
  t = t.replace(/Explore Main Page/ig, '');
  t = t.replace(/^(Category:|Special:|Local sitemap).*/gi, '');
  t = t.replace(/\[\d+\]/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  t = t.replace(/^This (article|page) .*/i, '');
  return t.trim();
}

function extractContentFromFandom(html) {
  const out = { paragraphs: [], sourceLines: [] };
  const m = html.match(/<div[^>]+class="mw-parser-output"[^>]*>([\s\S]*?)<div class="printfooter">/i);
  const block = m ? m[1] : html;

  const pushText = (txt) => {
    if (!txt) return;
    let clean = txt.replace(/<[^>]+>/g, '').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    if (/^Source[:\s]/i.test(clean)) { out.sourceLines.push(clean); return; }
    out.paragraphs.push(clean);
  };

  const paraRe = /<p[^>]*>([\s\S]*?)<\/p>/ig;
  let p;
  while ((p = paraRe.exec(block)) !== null) pushText(p[1]);

  if (out.paragraphs.length < 2) {
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/ig;
    while ((p = liRe.exec(block)) !== null) pushText(p[1]);
  }
  if (out.paragraphs.length < 2) {
    const ddRe = /<dd[^>]*>([\s\S]*?)<\/dd>/ig;
    while ((p = ddRe.exec(block)) !== null) pushText(p[1]);
  }
  if (out.paragraphs.length < 2) {
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/ig;
    while ((p = tdRe.exec(block)) !== null) pushText(p[1]);
  }

  out.paragraphs = out.paragraphs.filter(p => p && p.length > 20 && !/(?:Explore|Skip to content|Advertisement)/i.test(p));
  out.paragraphs = Array.from(new Set(out.paragraphs));
  return out;
}

function findUseText(paragraphs) {
  for (const p of paragraphs) {
    if (/^(Use|Usage)[:\s]/i.test(p) || /\bUse[:\s]/i.test(p)) return p;
  }
  return '';
}

async function main() {
  const mode = (process.argv[2] || 'preview').toLowerCase();
  if (!['preview','commit'].includes(mode)) { console.error('Mode must be preview or commit'); process.exit(1); }

  const q = db.prepare("SELECT id, title, content FROM rules WHERE category = 'talents' AND (content IS NULL OR trim(content) = '' OR length(trim(content)) < 30) ORDER BY id");
  const rows = q.all();
  console.log('Found', rows.length, 'talents with missing/short content');
  const results = [];

  for (const r of rows) {
    try {
      const title = (r.title || '').replace(/\s*\(Talent\)\s*$/i,'').trim();
      const urlTitle = encodeURIComponent(title.replace(/ /g, '_'));
      const url = `https://40k-rpg-ffg.fandom.com/wiki/${urlTitle}`;
      console.log('Fetching', title);
      const res = await fetchUrl(url);
      if (res.status !== 200) {
        console.warn('Failed to fetch', title, 'status', res.status);
        results.push({ id: r.id, title: r.title, status: 'fetch_failed', statusCode: res.status });
        continue;
      }
      const block = extractContentFromFandom(res.body);
      const orig = block.paragraphs || [];
      const paragraphs = orig.map(p => sanitizeText(p)).filter(Boolean);
      const main = paragraphs.length ? paragraphs[0] : '';
      const use = findUseText(paragraphs) || '';
      const descParts = paragraphs.filter(p => p !== main && p !== use);
      const description = descParts.join('\n\n');
      const newContent = [main, description, use ? `Use: ${use.replace(/^Use[:\s]*/i,'')}` : ''].filter(Boolean).join('\n\n');

      results.push({ id: r.id, title: r.title, fetchedTitle: title, url, oldContent: r.content || '', newContent: newContent || '', extracted_paragraphs: orig });

      if (mode === 'commit' && newContent && newContent.trim().length > 20) {
        const upd = db.prepare('UPDATE rules SET content = ?, source = ?, source_abbr = ? WHERE id = ?');
        upd.run(newContent, 'fandom', 'FAN', r.id);
        console.log('Updated id', r.id, title);
      }

      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.error('Error processing id', r.id, e && e.message ? e.message : e);
      results.push({ id: r.id, title: r.title, status: 'error', error: e && e.message });
    }
  }

  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const out = { generatedAt: new Date().toISOString(), mode, count: results.length, items: results };
  const outPath = path.join('/tmp', `talents_fill_${mode}_${ts}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote report to', outPath);
  db.close();
}

main().catch(err => { console.error(err && err.stack ? err.stack : err); try{db.close()}catch(e){}; process.exit(1); });
