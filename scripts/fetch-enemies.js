// Some axios/undici versions expect a global `File` constructor to exist
// in certain Node environments. Polyfill a minimal noop File if missing
// so the script can run in CI/dev Node without changing dependencies.
if (typeof File === 'undefined') global.File = class File {};
const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

async function fetchEnemies(pageUrl = 'http://www.40krpgtools.com/library/bestiary/') {
  try {
    const res = await axios.get(pageUrl);
    const html = res.data;
    const $ = cheerio.load(html);

    const out = [];
    // Try to select rows from the bestiary table body (server-side rendered)
    $('#bestiaryTable tbody tr').each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length < 6) return; // skip malformed rows

      const nameCell = $(cols[0]);
      const name = nameCell.text().trim();
      const rel = nameCell.find('a').attr('href') || '';
      const fullUrl = rel ? (new URL(rel, pageUrl)).toString() : '';
      const type = $(cols[1]).text().trim();
      const affiliation = $(cols[2]).text().trim();
      const setting = $(cols[3]).text().trim();
      const book = $(cols[4]).text().trim();
      const pageNo = $(cols[5]).text().trim();

      out.push({ name, type, affiliation, setting, book, pageNo, url: fullUrl });
    });

    // Fallback: some pages render the table client-side. If we found nothing,
    // try to collect library links (e.g. /library/deathwatch/...) and turn
    // them into a basic list of entries (name + url). This provides useful
    // results even when the full table is not present in the HTML.
    if (out.length === 0) {
      const seen = new Set();
      $('a[href^="/library/"]').each((i, a) => {
        const href = $(a).attr('href')
        const text = $(a).text().trim()
        if (!href || !text) return
        // we want links that look like entity pages (multiple path segments)
        const parts = href.replace(/^\//, '').split('/');
        if (parts.length < 3) return // skip category index links
        const fullUrl = (new URL(href, pageUrl)).toString()
        const key = fullUrl
        if (seen.has(key)) return
        seen.add(key)
        out.push({ name: text, url: fullUrl })
      })
    }

    return out;
  } catch (err) {
    console.error('Error fetching/parsing enemies page:', err && err.message);
    return [];
  }
}

if (require.main === module) {
  const page = process.argv[2] || 'http://www.40krpgtools.com/library/bestiary/';
  fetchEnemies(page)
    .then(list => console.log(JSON.stringify(list, null, 2)))
    .catch(err => { console.error(err); process.exit(1) });
}

module.exports = { fetchEnemies };
