import fs from 'fs';
import path from 'path';

const root = process.cwd();
const cardsTsPath = path.join(root, 'src', 'data', 'cards.ts');
let cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

const webpMappings = [
  { targetId: 'card_mr_embossed_op04_nmixx_604', newImage: '/cards/live_motion_nmixx_01.webp' },
  { targetId: 'card_lr_embossed_op04_bae_608', newImage: '/cards/live_motion_bae_01.webp' },
  { targetId: 'card_ur_embossed_op04_bae_614', newImage: '/cards/live_motion_bae_02.webp' },
  { targetId: 'card_ssr_embossed_op04_bae_624', newImage: '/cards/live_motion_bae_03.webp' },
];

webpMappings.forEach(({ targetId, newImage }) => {
  const regex = new RegExp(`("id":\\s*"${targetId}"[\\s\\S]*?"image":\\s*)"[^"]+"`, 'm');
  if (regex.test(cardsTs)) {
    cardsTs = cardsTs.replace(regex, `$1"${newImage}"`);
    console.log(`Updated ${targetId} -> ${newImage}`);
  } else {
    console.warn(`Pattern not matched for ${targetId}`);
  }
});

fs.writeFileSync(cardsTsPath, cardsTs, 'utf8');
console.log('All 4 animated WebP cards mapped successfully!');
