import fs from 'fs';
import path from 'path';

const root = process.cwd();
const webpFiles = [];

function scanWebp(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) scanWebp(fullPath);
      else if (file.toLowerCase().endsWith('.webp')) {
        webpFiles.push({
          file,
          path: path.relative(root, fullPath),
          sizeKb: (stat.size / 1024).toFixed(1) + ' KB',
        });
      }
    } catch (e) {}
  }
}

scanWebp(root);
console.log('Webp files found:', webpFiles.length);
webpFiles.forEach((f, idx) => console.log(`${idx + 1}. [${f.sizeKb}] ${f.path}`));
