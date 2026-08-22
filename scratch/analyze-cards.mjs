import fs from 'fs';
import path from 'path';

const cardsTsPath = path.join(process.cwd(), 'src', 'data', 'cards.ts');
const cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const currentCards = JSON.parse(masterMatch[1]);
console.log('Total Current Cards Count:', currentCards.length);

const baseCards = currentCards.slice(0, 600);
const rarityCounts = {};
baseCards.forEach(c => {
  rarityCounts[c.rarity] = (rarityCounts[c.rarity] || 0) + 1;
});
console.log('Base 600 Cards Rarity Breakdown:', rarityCounts);

const specialCards = currentCards.slice(600, 740);
const spCounts = {};
specialCards.forEach(c => {
  spCounts[c.rarity] = (spCounts[c.rarity] || 0) + 1;
});
console.log('Existing Special Cards Breakdown:', spCounts);
