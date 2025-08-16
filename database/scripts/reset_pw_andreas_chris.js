const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { playerHelpers } = require('../sqlite-db');

(async function main(){
  const names = ['andreas','chris'];
  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const ts = Date.now();
  for (const name of names) {
    const player = playerHelpers.getByName(name);
    if (!player) {
      console.log('Player not found, skipping:', name);
      continue;
    }
    const beforePath = path.join(backupsDir, `${name}.pw.before.${ts}.json`);
    fs.writeFileSync(beforePath, JSON.stringify(player, null, 2), 'utf8');
    console.log('Backup written:', beforePath);

    const plain = '1234';
    const hash = await bcrypt.hash(plain, 10);
    const ok = playerHelpers.update(name, { name, rollerInfo: player.rollerInfo || {}, shopInfo: player.shopInfo || {}, tabInfo: player.tabInfo || {}, pw: '', pwHash: hash });
    if (!ok) {
      console.error('Failed to update pw for', name);
      continue;
    }
    const updated = playerHelpers.getByName(name);
    const afterPath = path.join(backupsDir, `${name}.pw.after.${ts}.json`);
    fs.writeFileSync(afterPath, JSON.stringify(updated, null, 2), 'utf8');
    console.log('Updated player:', name, 'pwHash set. After backup:', afterPath);
    console.log(JSON.stringify({ name: updated.name, pwHashPresent: !!updated.pwHash, _id: updated._id }, null, 2));
  }
  console.log('All done. Password for andreas and chris set to "1234" (hashed).');
})();
