import fs from 'fs';
import path from 'path';

const cardsDir = path.join(process.cwd(), 'public', 'cards');
if (fs.existsSync(cardsDir)) {
  const files = fs.readdirSync(cardsDir);
  console.log('Total files in public/cards:', files.length);
}
