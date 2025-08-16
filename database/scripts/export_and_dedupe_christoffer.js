const fs = require('fs');
const path = require('path');
const { playerHelpers } = require('../sqlite-db');

async function main() {
  const name = 'christoffer';
  const player = playerHelpers.getByName(name);
  if (!player) {
    console.error('Player not found:', name);
    process.exit(1);
  }

  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

  const beforePath = path.join(backupsDir, 'christoffer.before.json');
  fs.writeFileSync(beforePath, JSON.stringify(player, null, 2));
  console.log('Wrote', beforePath);

  // Dedupe gear by name (sum qty)
  const tab = player.tabInfo || {};
  const gear = Array.isArray(tab.gear) ? tab.gear : [];
  const map = new Map();
  for (const g of gear) {
    const key = String(g.name || g).trim();
    if (!key) continue;
    const existing = map.get(key.toLowerCase());
    const qty = parseInt((g.qty !== undefined && g.qty !== null) ? g.qty : (g.count !== undefined ? g.count : 1), 10) || 1;
    if (existing) {
      existing.qty = (existing.qty || 0) + qty;
    } else {
      map.set(key.toLowerCase(), { name: key, qty });
    }
  }
  const dedupedGear = Array.from(map.values());

  // Also dedupe inventory by name (sum counts)
  const inventory = Array.isArray(tab.inventory) ? tab.inventory : [];
  const invMap = new Map();
  for (const it of inventory) {
    const key = String(it.name || it).trim();
    if (!key) continue;
    const cnt = parseInt(it.count || 0, 10) || 0;
    const existing = invMap.get(key.toLowerCase());
    if (existing) existing.count += cnt; else invMap.set(key.toLowerCase(), { name: key, count: cnt });
  }
  const dedupedInventory = Array.from(invMap.values());

  // Update player with deduped lists
  const newTab = Object.assign({}, tab, { gear: dedupedGear, inventory: dedupedInventory });
  const ok = playerHelpers.update(name, { name, rollerInfo: player.rollerInfo || {}, shopInfo: player.shopInfo || {}, tabInfo: newTab, pw: player.pw || '', pwHash: player.pwHash || '' });
  if (!ok) {
    console.error('Failed to update player');
    process.exit(1);
  }

  const updated = playerHelpers.getByName(name);
  const afterPath = path.join(backupsDir, 'christoffer.after.json');
  fs.writeFileSync(afterPath, JSON.stringify(updated, null, 2));
  console.log('Wrote', afterPath);

  // Create a simple HTML snapshot
  const html = generateHtmlSnapshot(updated);
  const htmlPath = path.join(backupsDir, 'christoffer.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('Wrote', htmlPath);

  // Try to take a PNG screenshot using puppeteer if available
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto('file://' + htmlPath);
    const pngPath = path.join(backupsDir, 'christoffer.png');
    await page.screenshot({ path: pngPath, fullPage: true });
    await browser.close();
    console.log('Wrote', pngPath);
  } catch (err) {
    console.log('Puppeteer not available or failed to run; skip PNG. Error:', err.message);
    console.log('You can install puppeteer and re-run this script to generate a PNG.');
  }
}

function generateHtmlSnapshot(player) {
  const t = player.tabInfo || {};
  const safe = v => (v === undefined || v === null) ? '' : String(v);
  const char = t.characteristics || {};
  const weapons = Array.isArray(t.weapons) ? t.weapons : [];
  const gear = Array.isArray(t.gear) ? t.gear : [];
  const inventory = Array.isArray(t.inventory) ? t.inventory : [];
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${safe(player.name)} - snapshot</title>
<style>body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;padding:20px}h1{font-size:20px}table{border-collapse:collapse;margin-bottom:12px}td,th{border:1px solid #ccc;padding:6px}</style>
</head><body>
<h1>${escapeHtml(safe(t.charName || player.name))} (${escapeHtml(safe(player.name))})</h1>
<h2>Characteristics</h2>
<table><tr>${Object.keys(char).map(k=>`<th>${escapeHtml(k)}</th>`).join('')}</tr>
<tr>${Object.keys(char).map(k=>`<td>${escapeHtml(safe(char[k]))}</td>`).join('')}</tr></table>
<h2>Weapons</h2>
${weapons.map(w=>`<div><strong>${escapeHtml(safe(w.name))}</strong> — ${escapeHtml(safe(w.damage||w.special||''))}</div>`).join('')}
<h2>Gear</h2>
<ul>${gear.map(g=>`<li>${escapeHtml(safe(g.name))} x${escapeHtml(safe(g.qty||g.count||1))}</li>`).join('')}</ul>
<h2>Inventory</h2>
<ul>${inventory.map(i=>`<li>${escapeHtml(safe(i.name))} x${escapeHtml(safe(i.count||0))}</li>`).join('')}</ul>
<h2>Fate / Wounds</h2>
<div>Fate: ${escapeHtml(safe((t.fate||{}).total))} (current ${escapeHtml(safe((t.fate||{}).current))})</div>
<div>Wounds: ${escapeHtml(safe((t.wounds||{}).total))} (current ${escapeHtml(safe((t.wounds||{}).current))})</div>
<h2>Talents</h2>
<div>${escapeHtml((t.talents||[]).join(', '))}</div>
</body></html>`;
}

function escapeHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

main().catch(err=>{ console.error(err); process.exit(1); });
