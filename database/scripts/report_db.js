const { playerHelpers } = require('../sqlite-db');
const fs = require('fs');
const path = require('path');

const players = playerHelpers.getAll();
const total = players.length;
const names = players.map(p=>p.name).sort();

const renownCounts = {};
let rpSum=0, xpSum=0, xpSpentSum=0;
let rpMin=Infinity, rpMax=-Infinity, xpMin=Infinity, xpMax=-Infinity;
let charStats = {}; // key -> {min,max,sum,count}

players.forEach(p=>{
  const t = p.tabInfo || {};
  const ren = t.renown || 'None';
  renownCounts[ren] = (renownCounts[ren]||0)+1;
  const rp = Number(t.rp||0); rpSum+=rp; rpMin=Math.min(rpMin,rp); rpMax=Math.max(rpMax,rp);
  const xp = Number(t.xp||0); xpSum+=xp; xpMin=Math.min(xpMin,xp); xpMax=Math.max(xpMax,xp);
  const xps = Number(t.xpSpent||0); xpSpentSum+=xps;
  const chars = t.characteristics || {};
  Object.keys(chars).forEach(k=>{
    const v = Number(chars[k]||0);
    if (!charStats[k]) charStats[k]={min:Infinity,max:-Infinity,sum:0,count:0};
    charStats[k].min=Math.min(charStats[k].min,v);
    charStats[k].max=Math.max(charStats[k].max,v);
    charStats[k].sum+=v; charStats[k].count++;
  });
});

const summary = {
  totalPlayers: total,
  names,
  renownCounts,
  rp: { sum: rpSum, avg: total? rpSum/total:0, min: rpMin===Infinity?0:rpMin, max: rpMax===-Infinity?0:rpMax },
  xp: { sum: xpSum, avg: total? xpSum/total:0, min: xpMin===Infinity?0:xpMin, max: xpMax===-Infinity?0:xpMax },
  xpSpent: { sum: xpSpentSum, avg: total? xpSpentSum/total:0 },
  characteristics: Object.fromEntries(Object.entries(charStats).map(([k,v])=>[k,{min:v.min===Infinity?0:v.min,max:v.max===-Infinity?0:v.max,avg:v.count? v.sum/v.count:0,count:v.count}])),
  missingPwHash: players.filter(p=>!p.pwHash||p.pwHash.length===0).map(p=>p.name),
  samplePlayers: players.slice(0,5).map(p=>({name:p.name, tabInfo:p.tabInfo, rollerInfoKeys: Object.keys(p.rollerInfo||{}).length}))
};

const outDir = path.join(__dirname,'..','backups'); if (!fs.existsSync(outDir)) fs.mkdirSync(outDir,{recursive:true});
const fname = `db-summary.${new Date().toISOString().replace(/[:.]/g,'')}.json`;
const outPath = path.join(outDir,fname);
fs.writeFileSync(outPath, JSON.stringify(summary,null,2),'utf8');
console.log('Wrote summary to', outPath);
console.log('Summary:', JSON.stringify(summary, null, 2));
