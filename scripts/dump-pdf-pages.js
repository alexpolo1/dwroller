const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
(async ()=>{
  const pdfPath = path.resolve(__dirname, '../data/Deathwatch - The Emperor Protects.pdf');
  if (!fs.existsSync(pdfPath)) { console.error('PDF not found at', pdfPath); process.exit(2); }
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjs.getDocument({data});
  const doc = await loadingTask.promise;
  const pages = [88,89];
  for (const pnum of pages){
    try{
      const page = await doc.getPage(pnum);
      const content = await page.getTextContent();
      const text = content.items.map(i=>i.str).join(' ');
      console.log('----- PAGE', pnum, 'START -----');
      console.log(text);
      console.log('----- PAGE', pnum, 'END -----\n');
    }catch(err){
      console.error('error reading page', pnum, err.message);
    }
  }
  process.exit(0);
})();
