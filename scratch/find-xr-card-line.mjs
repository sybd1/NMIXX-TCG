import fs from 'fs';
import path from 'path';

const cardsTs = fs.readFileSync(path.join(process.cwd(), 'src', 'data', 'cards.ts'), 'utf8');
const lines = cardsTs.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('XR-park') || line.includes('"rarity": "XR"')) {
    console.log(`Line ${idx + 1}: ${line}`);
    // Print around 20 lines
    const start = Math.max(0, idx - 10);
    const end = Math.min(lines.length, idx + 20);
    console.log(lines.slice(start, end).join('\n'));
  }
});
