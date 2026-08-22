import fs from 'fs';
import path from 'path';

const root = process.cwd();
const cardsDir = path.join(root, 'public', 'cards');
const allCardFiles = fs.readdirSync(cardsDir);
console.log('Total card image files in public/cards:', allCardFiles.length);

const cardsTsPath = path.join(root, 'src', 'data', 'cards.ts');
const cardsTs = fs.readFileSync(cardsTsPath, 'utf8');
const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const currentCards = JSON.parse(masterMatch[1]);
console.log('Current total cards:', currentCards.length);

const usedImages = new Set(currentCards.map(c => c.image.replace(/^\//, '').replace(/^cards\//, '')));
const unusedCardFiles = allCardFiles.filter(f => !usedImages.has(f));
console.log('Unused image files in public/cards:', unusedCardFiles.length);
