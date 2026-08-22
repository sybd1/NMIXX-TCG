import fs from 'fs';
import path from 'path';

const root = process.cwd();
const cardsTsPath = path.join(root, 'src', 'data', 'cards.ts');
let cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

const gifReplacements = [
  { targetId: 'card_mr_embossed_op03_sullyoon_603', newImage: '/cards/live_motion_sullyoon_01.gif' },
  { targetId: 'card_lr_embossed_op03_sullyoon_607', newImage: '/cards/live_motion_sullyoon_02.gif' },
  { targetId: 'nmixx_449', newImage: '/cards/live_motion_sullyoon_03.gif' },
  { targetId: 'nmixx_599', newImage: '/cards/live_motion_sullyoon_04.gif' },
  { targetId: 'nmixx_450', newImage: '/cards/live_motion_sullyoon_05.gif' },
];

gifReplacements.forEach(({ targetId, newImage }) => {
  const regex = new RegExp(`("id":\\s*"${targetId}"[\\s\\S]*?"image":\\s*)"[^"]+"`, 'm');
  if (regex.test(cardsTs)) {
    cardsTs = cardsTs.replace(regex, `$1"${newImage}"`);
    console.log(`Updated ${targetId} -> ${newImage}`);
  } else {
    console.warn(`Pattern not matched for ${targetId}`);
  }
});

fs.writeFileSync(cardsTsPath, cardsTs, 'utf8');
console.log('All 5 animated GIFs successfully mapped to MR and LR cards!');
