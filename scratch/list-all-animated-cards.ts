import { MASTER_CARDS } from '../src/data/cards.ts';

const animatedCards = MASTER_CARDS.filter(c => 
  c.image && (c.image.endsWith('.gif') || c.image.includes('live_motion'))
);

console.log('All Animated Live Motion Cards (Total ' + animatedCards.length + ' cards):');
animatedCards.forEach((c, idx) => {
  console.log(`${idx + 1}. #${c.collectionNumber} [${c.rarity}] ${c.name} (${c.member}) -> ${c.image}`);
});
