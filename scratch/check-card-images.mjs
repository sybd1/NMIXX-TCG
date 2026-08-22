import fs from 'fs';

const cardsTs = fs.readFileSync('src/data/cards.ts', 'utf8');
const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const masterCards = JSON.parse(masterMatch[1]);

const sampleImages = masterCards.map(c => c.image).filter(Boolean);
console.log('Total cards with image:', sampleImages.length);
console.log('Sample images used by cards:', sampleImages.slice(0, 20));
console.log('Unique images used:', new Set(sampleImages).size);
