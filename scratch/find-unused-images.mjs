import fs from 'fs';
import path from 'path';

const cardsTs = fs.readFileSync('src/data/cards.ts', 'utf8');
const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const masterCards = JSON.parse(masterMatch[1]);
const usedImages = new Set(masterCards.map(c => c.image.replace(/^\//, '')));

const cardsDir = path.join(process.cwd(), 'public', 'cards');
const allCardFiles = fs.readdirSync(cardsDir).map(f => 'cards/' + f);

const unusedCardFiles = allCardFiles.filter(f => !usedImages.has(f));
console.log('Total files in public/cards:', allCardFiles.length);
console.log('Used card images:', usedImages.size);
console.log('Unused card images:', unusedCardFiles.length);
console.log('Sample unused files:', unusedCardFiles.slice(0, 20));
