const Database = require('better-sqlite3');
const db = new Database('database/sqlite/deathwatch.db');

function slug(s){
  return (s||'rule').toString().toLowerCase().trim()
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)/g,'');
}

try{
  const staging = db.prepare('SELECT id,title,content,category,page,original_json,created_at FROM rules_staging ORDER BY id').all();
  console.log('stagingCount', staging.length);
  if(staging.length===0){ db.close(); process.exit(0); }

  const insert = db.prepare('INSERT OR IGNORE INTO rules (rule_id, title, content, page, source, source_abbr, category) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const exists = db.prepare('SELECT COUNT(*) as c FROM rules WHERE rule_id = ?');

  const inserted = [];
  const processedIds = [];

  const tx = db.transaction((rows)=>{
    for(const r of rows){
      const title = r.title || (r.original_json ? (JSON.parse(r.original_json).title || '') : '') || 'rule';
      let base = slug(title);
      if(!base) base = 'rule';
      let candidate = base;
      let i = 0;
      while(exists.get(candidate).c > 0){ i++; candidate = base + '-' + i; }
      const pageVal = (r.page && !isNaN(Number(r.page))) ? Number(r.page) : null;
      const res = insert.run(candidate, r.title || title, r.content || '', pageVal, 'sanitized', 'SAN', r.category || 'skills');
      if(res.changes && res.lastInsertRowid){
        inserted.push({rule_id: candidate, title: r.title || title, page: r.page});
        processedIds.push(r.id);
      }
    }
    if(processedIds.length){
      const placeholders = processedIds.map(()=>'?').join(',');
      db.prepare(`DELETE FROM rules_staging WHERE id IN (${placeholders})`).run(...processedIds);
    }
  });

  tx(staging);

  const counts = {
    staging: db.prepare('SELECT COUNT(*) as c FROM rules_staging').get().c,
    rules_sanitized: db.prepare('SELECT COUNT(*) as c FROM rules WHERE source = ?').get('sanitized').c,
    rules_total: db.prepare('SELECT COUNT(*) as c FROM rules').get().c
  };

  console.log(JSON.stringify({inserted, count: inserted.length, counts}, null, 2));

}catch(err){
  console.error('ERROR', err && err.stack ? err.stack : err);
  process.exit(1);
}finally{
  try{ db.close(); }catch(e){}
}
