import fs from 'fs';
import path from 'path';

const root = process.cwd();
const imageDir = path.join(root, 'image');
if (fs.existsSync(imageDir)) {
  const files = fs.readdirSync(imageDir);
  console.log('Files in image dir:', files);
} else {
  console.log('image dir does not exist');
}

const publicDir = path.join(root, 'public');
if (fs.existsSync(publicDir)) {
  const files = fs.readdirSync(publicDir);
  console.log('Files in public dir:', files);
}
