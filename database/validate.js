// Simple validation and normalization utilities for player records
function isObject(v) { return v && typeof v === 'object' && !Array.isArray(v); }

function normalizeName(name) {
  if (!name) return '';
  return String(name).trim().replace(/\s+/g, ' ');
}

function normalizeTabInfo(tabInfo) {
  const out = Object.assign({}, isObject(tabInfo) ? tabInfo : {});
  // Flatten nested tabInfo.tabInfo
  if (isObject(out.tabInfo)) {
    Object.assign(out, out.tabInfo);
    delete out.tabInfo;
  }

  // numeric fields
  ['rp','xp','xpSpent','wounds','movement'].forEach(k=>{
    if (out[k] !== undefined) {
      const n = Number(out[k]);
      out[k] = Number.isFinite(n) ? n : 0;
    } else {
      out[k] = 0;
    }
  });

  // Ensure standard arrays/objects exist
  if (!Array.isArray(out.skills)) out.skills = [];
  if (!Array.isArray(out.inventory)) out.inventory = [];
  if (!isObject(out.characteristics)) out.characteristics = {};

  // Ensure standard Deathwatch Space Marine characteristic keys exist (lowercase keys
  // matching the frontend PlayerTab expectations). Do not overwrite existing values.
  const standardChars = ['ws','bs','s','t','ag','int','per','wp','fel'];
  // Accept existing upper/lower keys but store lowercase
  const charsIn = Object.assign({}, out.characteristics);
  out.characteristics = {};
  for (const k of standardChars) {
    // prefer existing lowercase, then uppercase variants
    if (charsIn[k] !== undefined) out.characteristics[k] = Number(charsIn[k]) || 0;
    else if (charsIn[k.toUpperCase()] !== undefined) out.characteristics[k] = Number(charsIn[k.toUpperCase()]) || 0;
    else out.characteristics[k] = 0;
  }

  // Standard Deathwatch core skills to add if missing (preserve existing extras)
  const standardSkills = [
    'Acrobatics (Ag)', 'Awareness (Per)', 'Barter (Fel)', 'Blather (Fel)',
    'Carouse (Fel)', 'Charm (Fel)', 'Chem-Use (Int)', 'Ciphers (Int)',
    'Chapter Runes', 'Climb (S)', 'Command (Fel)', 'Common Lore (Int)',
    'Adeptus Astartes', 'Deathwatch', 'Imperium', 'War', 'Concealment (Ag)',
    'Contortionist (Ag)', 'Deceive (Fel)', 'Demolition (Int)', 'Disguise (Fel)',
    'Dodge (Ag)', 'Drive (Ag)', 'Evaluate', 'Forbidden Lore (Int)', 'Xenos',
    'Gamble (Int)', 'Inquiry (Fel)', 'Interrogation (WP)', 'Intimidate (S)',
    'Invocation (WP)', 'Lip Reading (Per)', 'Literacy (Int)', 'Logic (Int)',
    'Medicae (Int)', 'Navigation (Int)', 'Surface', 'Performer (Fel)',
    'Pilot (Ag)', 'Psyniscience (Per)', 'Scholastic Lore (Int)', 'Codex Astartes',
    'Scrutiny (Per)', 'Search (Per)', 'Secret Tongue (Int)', 'Security (Ag)',
    'Shadowing (Ag)', 'Silent Move (Ag)', 'Sleight of Hand (Ag)', 'Speak Language (Int)',
    'Survival (Int)', 'Swim (S)', 'Tactics (Int)', 'Tech-Use (Int)', 'Tracking (Int)',
    'Trade (Int)', 'Wrangling (Int)'
  ];
  // Add any missing standard skills (case-sensitive check)
  for (const s of standardSkills) {
    if (!out.skills.includes(s)) out.skills.push(s);
  }

  // renown normalization - allowed values: None, Respected, Distinguished, Renowned
  const allowedRenown = ['None','Respected','Distinguished','Renowned'];
  if (out.renown === '' || out.renown === null || out.renown === undefined) out.renown = 'None';
  if (typeof out.renown === 'string') {
    // normalize casing
    const cand = out.renown.trim();
    const found = allowedRenown.find(a => a.toLowerCase() === cand.toLowerCase());
    out.renown = found || 'None';
  } else {
    out.renown = 'None';
  }

  // Clamp rp/xp ranges to reasonable bounds
  out.rp = Math.max(0, Math.min(1000000, Number(out.rp || 0)));
  out.xp = Math.max(0, Math.min(1000000, Number(out.xp || 0)));
  out.xpSpent = Math.max(0, Math.min(out.xp, Number(out.xpSpent || 0)));

  return out;
}

function validatePlayer(player) {
  const errors = [];
  const normalized = Object.assign({}, player);

  // name
  normalized.name = normalizeName(player.name);
  if (!normalized.name) errors.push('name: required');
  if (normalized.name.length > 100) errors.push('name: too long');

  // roller/shop/tab must be objects
  normalized.rollerInfo = isObject(player.rollerInfo) ? player.rollerInfo : {};
  normalized.shopInfo = isObject(player.shopInfo) ? player.shopInfo : {};

  // If caller provided flat tab-related fields at top-level (common from frontend),
  // move them into tabInfo before normalization so defaults and validation apply.
  const flatFields = [
    'playerName','charName','gear','chapter','demeanour','speciality','rank','powerArmour',
    'description','pastEvent','personalDemeanour','characteristics','skills','weapons','armour',
    'talents','psychic','wounds','insanity','movement','fate','corruption','renown','xp','xpSpent',
    'notes','rp','inventory'
  ];

  const incomingTab = isObject(player.tabInfo) ? Object.assign({}, player.tabInfo) : {};
  for (const k of flatFields) {
    if (Object.prototype.hasOwnProperty.call(player, k) && incomingTab[k] === undefined) {
      incomingTab[k] = player[k];
    }
  }

  normalized.tabInfo = normalizeTabInfo(incomingTab);

  // Validate characteristics structure
  if (isObject(normalized.tabInfo.characteristics)) {
    const chars = normalized.tabInfo.characteristics;
    Object.keys(chars).forEach(k => {
      const n = Number(chars[k]);
      if (!Number.isFinite(n) || n < 0 || n > 100) {
        errors.push(`characteristics.${k}: must be number 0-100`);
        chars[k] = Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
      }
    });
  } else {
    normalized.tabInfo.characteristics = {};
  }

  // Truncate very long free-text fields
  if (typeof normalized.tabInfo.description === 'string' && normalized.tabInfo.description.length > 2000) {
    normalized.tabInfo.description = normalized.tabInfo.description.substring(0,2000);
    errors.push('description: truncated to 2000 chars');
  }

  // passwords: prefer pwHash; if plain pw present flag it (do not accept plaintext pw)
  if (player.pw && player.pw.length > 0) errors.push('pw: plain password present; provide pwHash instead');

  return { valid: errors.length === 0, errors, normalized };
}

module.exports = { validatePlayer, normalizeTabInfo };
