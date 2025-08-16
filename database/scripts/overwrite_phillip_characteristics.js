const fs = require('fs');
const path = require('path');
const { playerHelpers } = require('../sqlite-db');

(function main(){
  const name = 'phillip';
  const player = playerHelpers.getByName(name);
  if (!player) return console.error('Player not found', name);

  const ts = Date.now();
  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const beforePath = path.join(backupsDir, `${name}.before.${ts}.json`);
  fs.writeFileSync(beforePath, JSON.stringify(player, null, 2), 'utf8');
  console.log('Backup written:', beforePath);

  // Tactical sheet characteristic values (from attached Tactical image)
  const characteristics = {
    ws: 42,
    bs: 42,
    s: 42,
    t: 41,
    ag: 40,
    int: 41,
    per: 46,
    wp: 42,
    fel: 43
  };

  const newTab = Object.assign({}, player.tabInfo || {}, { characteristics });
  const ok = playerHelpers.update(name, { name, rollerInfo: player.rollerInfo || {}, shopInfo: player.shopInfo || {}, tabInfo: newTab, pw: player.pw || '', pwHash: player.pwHash || '' });
  if (!ok) return console.error('Failed to update player');

  const updated = playerHelpers.getByName(name);
  const afterPath = path.join(backupsDir, `${name}.after.${ts}.json`);
  fs.writeFileSync(afterPath, JSON.stringify(updated, null, 2), 'utf8');
  console.log('After backup written:', afterPath);
  console.log(JSON.stringify(updated, null, 2));
})();
