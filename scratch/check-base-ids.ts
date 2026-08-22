import { MASTER_CARDS } from '../src/data/cards.ts';

const idsToCheck = [449, 450, 599, 600];
idsToCheck.forEach(num => {
  const card = MASTER_CARDS.find(c => c.collectionNumber === num);
  if (card) {
    console.log(`- #${num}: ID="${card.id}", Name="${card.name}", Rarity="${card.rarity}", Image="${card.image}"`);
  }
});
