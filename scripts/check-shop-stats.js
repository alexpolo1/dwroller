const shop = require('../database/shop-helpers');

shop.getAllItems().then(items => {
  console.log('items:', items.length);
  const s = items.find(i => i.id === 786) || items[0];
  console.log('sample id', s.id, 'stats type', typeof s.stats);
  console.log('stats sample', JSON.stringify(s.stats, null, 2).slice(0, 400));
}).catch(err => {
  console.error(err);
  process.exit(1);
});
