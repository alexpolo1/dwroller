const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');

async function extract(nameRegex) {
  const dataDir = path.resolve(__dirname, '../data');
  const outFile = path.resolve(__dirname, '../database/alexei-pages.json');
  const files = await fs.readdir(dataDir);
  const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'));

  const results = [];
  for (const pdfName of pdfs) {
    const filePath = path.join(dataDir, pdfName);
    try {
      const dataBuffer = await fs.readFile(filePath);
      const parsed = await pdf(dataBuffer);
      const text = parsed.text || '';
      const pages = text.split('\f');
      for (let idx = 0; idx < pages.length; idx++) {
        const pageText = pages[idx];
        if (nameRegex.test(pageText)) {
          // Include surrounding pages for context
          const context = [];
          for (let j = Math.max(0, idx-2); j <= Math.min(pages.length-1, idx+2); j++) {
            context.push({ pageIndex: j, text: pages[j].trim() });
          }
          results.push({ pdf: pdfName, matchPageIndex: idx, context });
        }
      }
    } catch (err) {
      console.error('failed', pdfName, err.message);
    }
  }

  const out = { generatedAt: new Date().toISOString(), matches: results };
  await fs.writeFile(outFile, JSON.stringify(out, null, 2));
  console.log('Wrote', outFile, 'matches:', results.length);
}

const nameRegex = /alexei\s+drahj/i;
extract(nameRegex).catch(err => { console.error(err); process.exit(2); });
