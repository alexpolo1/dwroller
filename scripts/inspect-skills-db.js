const { db } = require('../database/sqlite-db');

function listSkills(limit = 50) {
  try {
    const rows = db.prepare(`SELECT rule_id as id, title, content, page, source, source_abbr as sourceAbbr, category FROM rules WHERE category = ? ORDER BY id LIMIT ?`).all('skills', limit);
    console.log(`Found ${rows.length} skill rows (showing up to ${limit}):`);
    rows.forEach((r, i) => {
      console.log(`${i + 1}. ${r.id} | ${r.title} | page=${r.page} | source=${r.source} | sourceAbbr=${r.sourceAbbr}`);
    });
  } catch (e) {
    console.error('Failed to query skills:', e);
  } finally {
    db.close();
  }
}

listSkills(200);
