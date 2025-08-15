const axios = require('axios');
const cheerio = require('cheerio');

async function fetchWeaponData() {
  try {
    const response = await axios.get('http://www.40krpgtools.com/armoury/weapons/');
    const html = response.data;
    const $ = cheerio.load(html);
    
    const weapons = [];
    
    // Select the table and iterate through rows
    $('table tr').each((i, row) => {
      if (i === 0) return; // Skip header row
      
      const cols = $(row).find('td');
      if (cols.length < 8) return; // Skip incomplete rows
      
      weapons.push({
        name: $(cols[0]).text().trim(),
        class: $(cols[1]).text().trim(),
        damage: $(cols[2]).text().trim(),
        cost: parseInt($(cols[3]).text().trim()) || 0,
        availability: $(cols[4]).text().trim(),
        gameSetting: $(cols[5]).text().trim(),
        book: $(cols[6]).text().trim(),
        pageNo: $(cols[7]).text().trim()
      });
    });

    // Filter for Deathwatch items only
    const deathwatchItems = weapons.filter(w => 
      w.gameSetting === 'Deathwatch' && 
      w.name.startsWith('Astartes')
    );

    // Convert to our shop format
    const shopItems = deathwatchItems.map(w => ({
      name: w.name,
      req: w.cost,
      renown: mapAvailabilityToRenown(w.availability),
      category: mapClassToCategory(w.class),
      stats: {
        damage: w.damage,
        class: w.class,
        source: `${w.book} p${w.pageNo}`
      }
    }));

    return shopItems;
  } catch (error) {
    console.error('Error fetching weapon data:', error);
    return [];
  }
}

function mapAvailabilityToRenown(availability) {
  const map = {
    'Any': 'None',
    'Common': 'None',
    'Scarce': 'None',
    'Rare': 'Respected',
    'Very Rare': 'Distinguished',
    'Extremely Rare': 'Hero',
    'Near Unique': 'Hero',
    'Unique': 'Legend'
  };
  return map[availability] || 'Distinguished';
}

function mapClassToCategory(itemClass) {
  if (itemClass.includes('Melee')) return 'Melee Weapon';
  if (itemClass.includes('Pistol')) return 'Ranged Weapon';
  if (itemClass.includes('Basic') || itemClass.includes('Heavy')) return 'Ranged Weapon';
  return 'Other';
}

if (require.main === module) {
  fetchWeaponData()
    .then(items => {
      console.log(JSON.stringify(items, null, 2));
    })
    .catch(console.error);
}

module.exports = { fetchWeaponData };
