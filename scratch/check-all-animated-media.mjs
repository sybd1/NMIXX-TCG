import fs from 'fs';
import path from 'path';

const root = process.cwd();
const animatedExts = ['.gif', '.webp', '.mp4', '.webm', '.apng'];

function findMedia(dir, list = []) {
  if (!fs.existsSync(dir)) return list;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findMedia(fullPath, list);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (animatedExts.includes(ext)) {
          list.push({
            ext,
            file,
            path: path.relative(root, fullPath),
            sizeKb: (stat.size / 1024).toFixed(1) + ' KB',
          });
        }
      }
    } catch (e) {}
  }
  return list;
}

const media = findMedia(root);
console.log('Media by extension:');
animatedExts.forEach(ext => {
  const matching = media.filter(m => m.ext === ext);
  console.log(`- ${ext}: ${matching.length} files`);
});
