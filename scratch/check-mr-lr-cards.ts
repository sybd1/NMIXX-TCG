import { MASTER_CARDS } from '../src/data/cards.ts';

const mrAndLrCards = MASTER_CARDS.filter(c => c.rarity === 'MR' || c.rarity === 'LR');
console.log('All MR and LR cards in MASTER_CARDS (Total ' + mrAndLrCards.length + ' cards):');
mrAndLrCards.forEach(c => {
  console.log(`- #${c.collectionNumber} [${c.rarity}] ${c.name} (${c.member}) -> ${c.image}`);
});
