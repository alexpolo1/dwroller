const { playerHelpers } = require('../sqlite-db');
const players = playerHelpers.getAll();
console.log(JSON.stringify(players.map(u=>({name:u.name, pw: !!u.pw, hasPwHash: !!u.pwHash, tabInfoKeys: Object.keys(u.tabInfo||{}).length})), null, 2));
