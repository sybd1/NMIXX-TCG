import fs from 'fs';
import path from 'path';

const cardsTs = fs.readFileSync('src/data/cards.ts', 'utf8');
const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const masterCards = JSON.parse(masterMatch[1]);

const rarityCounts = {};
masterCards.forEach(c => {
  rarityCounts[c.rarity] = (rarityCounts[c.rarity] || 0) + 1;
});
console.log('Current Total Cards:', masterCards.length);
console.log('Rarity breakdown:', rarityCounts);

const packs = {};
masterCards.forEach(c => {
  packs[c.packId] = (packs[c.packId] || 0) + 1;
});
console.log('Pack breakdown:', packs);
