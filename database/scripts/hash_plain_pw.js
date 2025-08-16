const { playerHelpers } = require('../sqlite-db');
const bcrypt = require('bcrypt');

async function run() {
  const players = playerHelpers.getAll();
  let changed = 0;
  for (const p of players) {
    try {
      if (p.pw && p.pw.length > 0) {
        const hash = await bcrypt.hash(p.pw, 10);
        playerHelpers.update(p.name, { rollerInfo: p.rollerInfo, shopInfo: p.shopInfo, tabInfo: p.tabInfo, pw: '', pwHash: hash });
        changed++;
        console.log('Hashed pw for:', p.name);
      }
    } catch (err) {
      console.error('Failed to hash for', p.name, err);
    }
  }
  console.log('Completed hashing. Total changed:', changed);
}

run().catch(err=>console.error(err));
