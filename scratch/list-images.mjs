import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const files = fs.readdirSync(publicDir).filter(f => /\.(jpg|png|webp|jpeg)$/i.test(f));
console.log('Total images in public:', files.length);
console.log('Sample images:', files.slice(0, 30));

const setDir = path.join(publicDir, 'set_images');
if (fs.existsSync(setDir)) {
  const setFiles = fs.readdirSync(setDir);
  console.log('Set images:', setFiles);
}
