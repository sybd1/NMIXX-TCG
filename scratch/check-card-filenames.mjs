import fs from 'fs';
import path from 'path';

const root = process.cwd();
const cardsDir = path.join(root, 'public', 'cards');
const cardFiles = fs.readdirSync(cardsDir);
console.log('Sample 30 card filenames:');
console.log(cardFiles.slice(0, 30));

const imageDir = path.join(root, 'image');
const subDirs = fs.readdirSync(imageDir);
console.log('Subdirectories in image/:', subDirs);
