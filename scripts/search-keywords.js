const fs = require('fs').promises;
const path = require('path');
const pdf = require('pdf-parse');

async function search(){
  const dataDir = path.resolve(__dirname, '../data');
  const outFile = path.resolve(__dirname, '../database/search-keywords.json');
  const files = await fs.readdir(dataDir);
  const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'));
  const keywords = ['alexei','drahj','transpired','transpired alteration','ryza','plasma pistol','custom ryza','xeno-filament','transpired circle'];
  const results = [];
  for(const pdfName of pdfs){
    const filePath = path.join(dataDir, pdfName);
    try{
      const data = await fs.readFile(filePath);
      const parsed = await pdf(data);
      const text = parsed.text || '';
      const pages = text.split('\f');
      for(let i=0;i<pages.length;i++){
        const pageText = pages[i];
        const lower = pageText.toLowerCase();
        for(const kw of keywords){
          if(lower.includes(kw)){
            results.push({pdf:pdfName,pageIndex:i,pageNumberApprox:i+1,keyword:kw,snippet: pageText.trim().slice(0,800).replace(/\s+/g,' ')});
          }
        }
      }
    }catch(err){ console.error('err', pdfName, err.message); }
  }
  await fs.writeFile(outFile, JSON.stringify({generatedAt: new Date().toISOString(), matches: results}, null, 2));
  console.log('Wrote', outFile, 'matches:', results.length);
}

search().catch(err=>{ console.error(err); process.exit(2); });
