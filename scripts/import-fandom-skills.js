#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');
const { db } = require('../database/sqlite-db');

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '') // strip non-ascii
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '-');
}

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
  // extract content inside mw-parser-output; fall back to whole html
  const out = { paragraphs: [], headings: [], sourceLines: [] };
  const m = html.match(/<div[^>]+class="mw-parser-output"[^>]*>([\s\S]*?)<div class="printfooter">/i);
  const block = m ? m[1] : html;

  // helper to push cleaned text and deduplicate
  const pushText = (txt) => {
    if (!txt) return;
    let clean = txt.replace(/<[^>]+>/g, '')
      .replace(/\[\d+\]/g, '')
      .replace(/\s+/g, ' ').trim();
    if (!clean) return;
    // detect source lines like 'Source: ...'
    if (/^Source[:\s]/i.test(clean)) {
      out.sourceLines.push(clean);
      return;
    }
    out.paragraphs.push(clean);
  };

  // paragraphs
  const paraRe = /<p[^>]*>([\s\S]*?)<\/p>/ig;
  let p;
  while ((p = paraRe.exec(block)) !== null) pushText(p[1]);

  // fallback: list items
  if (out.paragraphs.length < 2) {
    const liRe = /<li[^>]*>([\s\S]*?)<\/li>/ig;
    while ((p = liRe.exec(block)) !== null) pushText(p[1]);
  }

  // fallback: definition descriptions
  if (out.paragraphs.length < 2) {
    const ddRe = /<dd[^>]*>([\s\S]*?)<\/dd>/ig;
    while ((p = ddRe.exec(block)) !== null) pushText(p[1]);
  }

  // fallback: table cells
  if (out.paragraphs.length < 2) {
    const tdRe = /<td[^>]*>([\s\S]*?)<\/td>/ig;
    while ((p = tdRe.exec(block)) !== null) pushText(p[1]);
  }

  // headings (h2/h3)
  const hRe = /<h[2-3][^>]*>([\s\S]*?)<\/h[2-3]>/ig;
  let h;
  while ((h = hRe.exec(block)) !== null) {
    const ht = h[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (ht.length) out.headings.push(ht);
  }

  // filter out common wiki/header/footer noise and very short items
  const noiseRe = /(?:Explore|Skip to content|Advertisement|History|Main Page|Discuss|Community|Interactive Maps|Recently Changed|Explore More|All Pages|Pages|Recent Blog Posts|Recently Changed Pages|Explore Main Page)/i;
  out.paragraphs = out.paragraphs.filter(p => {
    if (noiseRe.test(p)) return false;
    if (p.length < 30) return false; // require a bit more substance
    if (/^\s*\w+(\s+\w+){0,2}\s*$/.test(p) && p.split(' ').length <= 3) return false;
    return true;
  });

  // final dedupe
  out.paragraphs = Array.from(new Set(out.paragraphs));

  return out;
}

function findUseText(paragraphs) {
  for (const p of paragraphs) {
    if (/^(Use|Usage)[:\s]/i.test(p) || /\bUse[:\s]/i.test(p)) return p;
  }
  return '';
}

function sanitizeText(s) {
  if (!s) return '';
  let t = String(s);
  // remove common wiki boilerplate and nav strings
  t = t.replace(/Explore More/ig, '');
  t = t.replace(/Skip to content/ig, '');
  t = t.replace(/40k-?RPG-?FFG Wiki/ig, '');
  t = t.replace(/Explore Main Page/ig, '');
  // remove category/maintenance lines
  t = t.replace(/^(Category:|Special:|Local sitemap).*/gi, '');
  // remove trailing references like [1]
  t = t.replace(/\[\d+\]/g, '');
  // collapse whitespace
  t = t.replace(/\s+/g, ' ').trim();
  // strip leading 'From the' boilerplate
  t = t.replace(/^This (article|page) .*/i, '');
  return t.trim();
}

async function fetchCategoryMembers(categoryUrl) {
  console.log('Fetching category members from', categoryUrl);
  try {
    const res = await fetchUrl(categoryUrl);
    if (res.status !== 200) {
      console.warn('Failed to fetch category page', categoryUrl, 'status', res.status);
      return [];
    }
    const html = res.body;
    // simple extraction of /wiki/Title links from the category members block
    const members = new Set();
    // try the modern category page members container
    const blockMatch = html.match(/<div[^>]+class="category-page__members"[^>]*>([\s\S]*?)<\/div>/i);
    const block = blockMatch ? blockMatch[1] : html;
    const linkRe = /href="([^"]+\/wiki\/([^"#?]+))"/ig;
    let m;
    while ((m = linkRe.exec(block)) !== null) {
      try {
        const href = decodeURIComponent(m[2].replace(/_/g, ' '));
        // ignore files and special pages
        if (/^File:/i.test(href) || /^Special:/i.test(href)) continue;
        members.add(href);
      } catch (e) { /* ignore decode errors */ }
    }
    return Array.from(members);
  } catch (e) {
    console.error('Error fetching category members', e && e.message ? e.message : e);
    return [];
  }
}

// API fallback: query MediaWiki for category members if scraping yields nothing
async function fetchCategoryMembersApiFallback(categoryUrl) {
  try {
    const m = categoryUrl.match(/Category:([^?#/]+)/i);
    if (!m) return [];
    const category = decodeURIComponent(m[1]);
    const apiUrl = `https://40k-rpg-ffg.fandom.com/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(category)}&cmlimit=500&format=json`;
    console.log('Falling back to API:', apiUrl);
    const res = await fetchUrl(apiUrl);
    if (res.status !== 200) {
      console.warn('API fetch failed', res.status);
      return [];
    }
    let json;
    try { json = JSON.parse(res.body); } catch (e) { console.error('Failed to parse API JSON', e && e.message); return []; }
    const items = (json && json.query && json.query.categorymembers) ? json.query.categorymembers.map(c => c.title).filter(Boolean) : [];
    // filter out files and special
    return items.filter(t => !/^File:/i.test(t) && !/^Special:/i.test(t));
  } catch (e) {
    console.error('API fallback error', e && e.message ? e.message : e);
    return [];
  }
}

async function processList(listPath, mode = 'preview', category = 'skills') {
  if (!listPath) {
    console.error('No list path provided');
    process.exit(1);
  }

  let lines;
  if (/^https?:\/\//i.test(listPath)) {
    // treat as a category or index URL
    lines = await fetchCategoryMembers(listPath);
    if (!lines || lines.length === 0) {
      // try API fallback for category members
      lines = await fetchCategoryMembersApiFallback(listPath);
    }
  } else {
    if (!fs.existsSync(listPath)) {
      console.error('List file not found:', listPath);
      process.exit(1);
    }
    lines = fs.readFileSync(listPath, 'utf8').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  }

  console.log('Processing', lines.length, 'items (mode:', mode + ', category:', category + ')');

  const existsRules = db.prepare('SELECT COUNT(*) as c FROM rules WHERE rule_id = ?');
  const existsStaging = db.prepare('SELECT COUNT(*) as c FROM rules_staging WHERE title = ?');
  const insertStaging = db.prepare('INSERT INTO rules_staging (title, content, category, page, original_json) VALUES (?, ?, ?, ?, ?)');

  const results = [];
  for (const rawName of lines) {
    try {
      const title = rawName;
      const rule_id = slugify(title);

      // skip if already in rules
      if (existsRules.get(rule_id).c) { console.log('Already in rules, skipping:', title); continue; }
      if (existsStaging.get(title).c) { console.log('Already in staging, skipping:', title); continue; }

      const urlTitle = encodeURIComponent(title.replace(/ /g, '_'));
      const url = `https://40k-rpg-ffg.fandom.com/wiki/${urlTitle}`;
      console.log('Fetching', title);
      const res = await fetchUrl(url);
      if (res.status !== 200) {
        console.warn('Failed to fetch', title, 'status', res.status);
        continue;
      }

      const contentBlock = extractContentFromFandom(res.body);
      const origParagraphs = contentBlock.paragraphs || [];
      const paragraphs = origParagraphs.map(p => sanitizeText(p)).filter(Boolean);

      const skill_text = paragraphs.length ? paragraphs[0] : '';
      const skill_use = findUseText(paragraphs) || '';
      // remove the use paragraph from description list
      const descParts = paragraphs.filter(p => p !== skill_text && p !== skill_use);
      const skill_description = descParts.join('\n\n');

      // Build sanitized content matching DB expectations
      const content = [skill_text, skill_description, skill_use ? `Use: ${skill_use.replace(/^Use[:\s]*/i,'')}` : '']
        .filter(Boolean)
        .map(s => s.trim())
        .join('\n\n');

      const original = { url, source: 'https://40k-rpg-ffg.fandom.com', source_abbr: 'fandom', paragraphs: origParagraphs, extracted_paragraphs: paragraphs, use: skill_use };

      results.push({ rule_id, title, content, page: null, original });

      // polite delay
      await new Promise(r => setTimeout(r, 250));
    } catch (e) {
      console.error('Error processing', rawName, e && e.stack ? e.stack : e.message);
    }
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const previewPath = path.join('/tmp', `fandom_${category}_preview_${ts}.json`);
  fs.writeFileSync(previewPath, JSON.stringify({ generatedAt: new Date().toISOString(), count: results.length, items: results }, null, 2), 'utf8');
  console.log('Wrote preview to', previewPath);

  if (mode === 'preview') {
    console.log('Preview mode: no DB changes. Run with "commit" to stage items into rules_staging.');
    db.close();
    return;
  }

  // commit to staging
  let inserted = 0;
  db.transaction(() => {
    for (const it of results) {
      try {
        insertStaging.run(it.title, it.content || '', category, it.page || null, JSON.stringify(it.original || {}));
        inserted++;
      } catch (e) {
        console.error('Insert staging failed for', it.title, e && e.message);
      }
    }
  })();

  const commitPath = path.join('/tmp', `fandom_${category}_committed_${ts}.json`);
  fs.writeFileSync(commitPath, JSON.stringify({ committedAt: new Date().toISOString(), inserted, items: results.map(r=>({rule_id:r.rule_id,title:r.title})) }, null, 2), 'utf8');
  console.log('Committed', inserted, 'items to rules_staging. Details in', commitPath);
  db.close();
}

if (require.main === module) {
  const listFile = process.argv[2] || '/tmp/fandom_only_skills.txt';
  const mode = (process.argv[3] || 'preview').toLowerCase();
  const category = (process.argv[4] || 'skills').toLowerCase();
  if (!['preview','commit'].includes(mode)) { console.error('Mode must be preview or commit'); process.exit(1); }
  processList(listFile, mode, category).then(() => process.exit(0)).catch(err => { console.error(err); db.close(); process.exit(1); });
}
