import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function getMd5(filepath) {
  if (!fs.existsSync(filepath)) return 'NOT_FOUND';
  const buf = fs.readFileSync(filepath);
  return crypto.createHash('md5').update(buf).digest('hex');
}

const SET_DIR = path.resolve('image/SET');
const CARDS_DIR = path.resolve('public/cards');

const mapping = [
  { folder: 'R Flower', start: 1 },
  { folder: 'SR Light', start: 7 },
  { folder: 'R2 School', start: 151 },
  { folder: 'SSR NMIXX', start: 157 },
  { folder: 'SR2 Blue Valentine', start: 301 },
  { folder: 'UR EPISODE 1 ZERO FRONTIER', start: 451 },
];

const members = [
  { nameKo: '릴리', offset: 0 },
  { nameKo: '해원', offset: 1 },
  { nameKo: '설윤', offset: 2 },
  { nameKo: '배이', offset: 3 },
  { nameKo: '지우', offset: 4 },
  { nameKo: '규진', offset: 5 },
];

mapping.forEach(m => {
  console.log('=== ' + m.folder + ' ===');
  members.forEach(mem => {
    const cardNum = m.start + mem.offset;
    const cardFile = 'card_' + String(cardNum).padStart(3, '0') + '.jpg';
    const cardPath = path.join(CARDS_DIR, cardFile);
    const srcPath = path.join(SET_DIR, m.folder, mem.nameKo + '.jpg');
    
    const srcExists = fs.existsSync(srcPath);
    const cardExists = fs.existsSync(cardPath);
    
    let match = false;
    if (srcExists && cardExists) {
      match = getMd5(srcPath) === getMd5(cardPath);
    }
    console.log(`  ${mem.nameKo} (#${cardNum}): src=${srcExists}, card=${cardExists}, match=${match}`);
  });
});
