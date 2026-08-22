import fs from 'fs';
import path from 'path';

const root = process.cwd();

function findGifFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findGifFiles(fullPath, fileList);
      } else if (file.toLowerCase().endsWith('.gif')) {
        fileList.push({
          fileName: file,
          relPath: path.relative(root, fullPath),
          sizeBytes: stat.size,
          sizeKb: (stat.size / 1024).toFixed(1) + ' KB',
        });
      }
    } catch (e) {}
  }
  return fileList;
}

const gifFiles = findGifFiles(root);
console.log('Total GIF files count:', gifFiles.length);
console.log('GIF files list:');
gifFiles.forEach((f, idx) => {
  console.log(`${idx + 1}. [${f.sizeKb}] ${f.relPath}`);
});
