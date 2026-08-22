import fs from 'fs';
import path from 'path';

const root = process.cwd();
const cardsTsPath = path.join(root, 'src', 'data', 'cards.ts');
let cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

// MR/LR 설윤 및 최고 등급 카드에 5개 움직이는 GIF 매핑
const gifReplacements = [
  // 1. #603 [MR] [3D Cosmic Mythic] 설윤
  {
    targetId: 'card_mr_embossed_op03_sullyoon_603',
    newImage: '/cards/live_motion_sullyoon_01.gif',
  },
  // 2. #607 [LR] [3D 24K Gold Relic] 설윤
  {
    targetId: 'card_lr_embossed_op03_sullyoon_607',
    newImage: '/cards/live_motion_sullyoon_02.gif',
  },
  // 3. #449 [LR] [OP-03] 전원 올라운더 (또는 설윤 LR)
  {
    targetId: 'card_449',
    newImage: '/cards/live_motion_sullyoon_03.gif',
  },
  // 4. #599 [MR] [OP-04] 믹스토피아의 빛
  {
    targetId: 'card_599',
    newImage: '/cards/live_motion_sullyoon_04.gif',
  },
  // 5. #450 [LR] [OP-03] 계승되는 의지
  {
    targetId: 'card_450',
    newImage: '/cards/live_motion_sullyoon_05.gif',
  },
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
console.log('Successfully updated MR and LR cards with animated live motion GIFs!');
