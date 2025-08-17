const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');

async function findName(nameRegex) {
  const dataDir = path.resolve(__dirname, '../data');
  const outFile = path.resolve(__dirname, '../database/search-alexei.json');
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
      pages.forEach((pageText, idx) => {
        if (nameRegex.test(pageText)) {
          results.push({
            pdf: pdfName,
            pageIndex: idx,
            pageNumberApprox: idx + 1,
            snippet: pageText.trim().slice(0, 800).replace(/\n+/g, ' ')
          });
        }
      });
    } catch (err) {
      console.error('failed', pdfName, err.message);
    }
  }

  const out = { generatedAt: new Date().toISOString(), query: nameRegex.toString(), matches: results };
  await fs.writeFile(outFile, JSON.stringify(out, null, 2));
  console.log('Wrote', outFile, 'matches:', results.length);
}

const nameRegex = /alexei\s+drahj/i;
findName(nameRegex).catch(err => { console.error(err); process.exit(2); });
