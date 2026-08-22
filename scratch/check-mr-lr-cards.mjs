import fs from 'fs';
import path from 'path';

const cardsTsPath = path.join(process.cwd(), 'src', 'data', 'cards.ts');
const cardsTs = fs.readFileSync(cardsTsPath, 'utf8');
const match = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const LEGACY_CARDS/);
const masterCards = JSON.parse(match[1]);

const mrAndLrCards = masterCards.filter(c => c.rarity === 'MR' || c.rarity === 'LR');
console.log('All MR and LR cards in MASTER_CARDS:');
mrAndLrCards.forEach(c => {
  console.log(`- #${c.collectionNumber} [${c.rarity}] ${c.name} (${c.member}) -> ${c.image}`);
});
