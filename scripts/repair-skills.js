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

function extractContentFromFandom(html) {
  const out = { paragraphs: [], headings: [], sourceLines: [] };
  const m = html.match(/<div[^>]+class="mw-parser-output"[^>]*>([\s\S]*?)<div class="printfooter">/i);
  const block = m ? m[1] : html;

  const pushText = (txt) => {
    if (!txt) return;
    let clean = txt.replace(/<[^>]+>/g, '')
      .replace(/\[\d+\]/g, '')
      .replace(/\s+/g, ' ').trim();
    if (!clean) return;
    if (/^Source[:\s]/i.test(clean)) {
      out.sourceLines.push(clean);
      return;
    }
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

  const hRe = /<h[2-3][^>]*>([\s\S]*?)<\/h[2-3]>/ig;
  let h;
  while ((h = hRe.exec(block)) !== null) {
    const ht = h[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (ht.length) out.headings.push(ht);
  }

  const noiseRe = /(?:Explore|Skip to content|Advertisement|History|Main Page|Discuss|Community|Interactive Maps|Recently Changed|Explore More|All Pages|Pages|Recent Blog Posts|Recently Changed Pages|Explore Main Page)/i;
  out.paragraphs = out.paragraphs.filter(p => {
    if (noiseRe.test(p)) return false;
    if (p.length < 30) return false;
    if (/^\s*\w+(\s+\w+){0,2}\s*$/.test(p) && p.split(' ').length <= 3) return false;
    return true;
  });

  out.paragraphs = Array.from(new Set(out.paragraphs));
  return out;
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

async function repair({ commit = false } = {}) {
  // find problem rows: contain common nav noise OR very short content OR content starts with 'Source:' only
  const q = `SELECT title, content FROM rules WHERE category='skills' AND (content LIKE '%Explore More%' OR content LIKE '%Skip to content%' OR length(content) < 120 OR content LIKE 'Source:%' ) ORDER BY title`;
  const rows = db.prepare(q).all();
  console.log('Found', rows.length, 'skills to inspect');
  if (!rows.length) { db.close(); return; }

  const results = [];
  for (const r of rows) {
    try {
      const title = r.title;
      const urlTitle = encodeURIComponent(title.replace(/ /g, '_'));
      const url = `https://40k-rpg-ffg.fandom.com/wiki/${urlTitle}`;
      console.log('Fetching', title);
      const res = await fetchUrl(url);
      if (res.status !== 200) {
        console.warn('Fetch failed', title, res.status);
        continue;
      }
      const block = extractContentFromFandom(res.body);
      const paras = block.paragraphs.map(sanitizeText).filter(Boolean);
      const use = paras.find(p => /^(Use|Usage)[:\s]/i.test(p)) || '';
      const descParts = paras.filter(p => p !== use);
      let newContent = '';
      if (descParts.length) {
        // prefer the longest paragraph as primary
        const primary = descParts.reduce((a,b)=> a.length>=b.length?a:b,'');
        const others = descParts.filter(p=>p!==primary);
        newContent = [primary, others.join('\n\n')].filter(Boolean).join('\n\n');
      }
      if (block.sourceLines && block.sourceLines.length) {
        newContent = (newContent ? newContent + '\n\n' : '') + block.sourceLines.join(' | ');
      }
      if (!newContent) {
        // nothing useful extracted, skip
        console.log('No useful content for', title);
        continue;
      }
      results.push({ title, old: r.content, newContent, url });
    } catch (e) {
      console.error('Error for', r.title, e && e.message);
    }
  }

  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  const previewPath = path.join('/tmp', `repair_skills_preview_${ts}.json`);
  fs.writeFileSync(previewPath, JSON.stringify({ generatedAt: new Date().toISOString(), count: results.length, items: results }, null, 2), 'utf8');
  console.log('Wrote preview to', previewPath);

  if (!commit) { db.close(); return; }

  // apply updates
  const update = db.prepare('UPDATE rules SET content = ?, source = ?, source_abbr = ? WHERE title = ?');
  let changed = 0;
  db.transaction(() => {
    for (const it of results) {
      try {
        update.run(it.newContent, 'https://40k-rpg-ffg.fandom.com', 'fandom', it.title);
        changed++;
      } catch (e) {
        console.error('Failed update', it.title, e && e.message);
      }
    }
  })();

  const commitPath = path.join('/tmp', `repair_skills_committed_${ts}.json`);
  fs.writeFileSync(commitPath, JSON.stringify({ committedAt: new Date().toISOString(), changed, items: results.map(r=>({title:r.title})) }, null, 2), 'utf8');
  console.log('Committed', changed, 'rows. Details in', commitPath);
  db.close();
}

if (require.main === module) {
  const commit = (process.argv[2] === '--commit');
  repair({ commit }).then(()=>process.exit(0)).catch(err=>{ console.error(err); db.close(); process.exit(1); });
}
