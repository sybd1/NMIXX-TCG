import { MASTER_CARDS } from '../src/data/cards.ts';

const numbersToCheck = [604, 608, 614, 624];
numbersToCheck.forEach(num => {
  const card = MASTER_CARDS.find(c => c.collectionNumber === num);
  if (card) {
    console.log(`- #${num}: ID="${card.id}", Name="${card.name}", Rarity="${card.rarity}", Member="${card.member}", Current Image="${card.image}"`);
  }
});
