import fs from 'fs';
import path from 'path';

const root = process.cwd();
const cardsTsPath = path.join(root, 'src', 'data', 'cards.ts');
let cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

const updates = [
  { id: 'nmixx_449', name: '[Live Motion Legend] 설윤', member: 'SULLYOON' },
  { id: 'nmixx_450', name: '[Live Motion Gold] 설윤', member: 'SULLYOON' },
  { id: 'nmixx_599', name: '[Live Motion Mythic] 설윤', member: 'SULLYOON' },
];

updates.forEach(({ id, name, member }) => {
  const nameRegex = new RegExp(`("id":\\s*"${id}"[\\s\\S]*?"name":\\s*)"[^"]+"`, 'm');
  const memberRegex = new RegExp(`("id":\\s*"${id}"[\\s\\S]*?"member":\\s*)"[^"]+"`, 'm');
  cardsTs = cardsTs.replace(nameRegex, `$1"${name}"`);
  cardsTs = cardsTs.replace(memberRegex, `$1"${member}"`);
  console.log(`Updated metadata for ${id} -> Name: ${name}, Member: ${member}`);
});

fs.writeFileSync(cardsTsPath, cardsTs, 'utf8');
console.log('Metadata updated successfully!');
