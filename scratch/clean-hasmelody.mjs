import fs from 'fs';
import path from 'path';

const cardsTsPath = path.join(process.cwd(), 'src', 'data', 'cards.ts');
let cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

cardsTs = cardsTs.replace(/,\n\s*"hasMelody": true/g, '');

fs.writeFileSync(cardsTsPath, cardsTs, 'utf8');
console.log('Successfully cleaned hasMelody property from cards.ts!');
