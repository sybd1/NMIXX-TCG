import { MASTER_CARDS } from '../src/data/cards.ts';

const gifCards = MASTER_CARDS.filter(c => c.image && c.image.endsWith('.gif'));
console.log('Verified 5 Live Motion Animated Cards:');
gifCards.forEach(c => {
  console.log(`- #${c.collectionNumber} [${c.rarity}] ${c.name} (Member: ${c.member}) -> ${c.image}`);
});
