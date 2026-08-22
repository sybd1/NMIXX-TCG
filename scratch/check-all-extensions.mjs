import fs from 'fs';
import path from 'path';

const root = process.cwd();
const extMap = {};

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
    const fullPath = path.join(dir, file);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (!extMap[ext]) extMap[ext] = 0;
        extMap[ext]++;
      }
    } catch (e) {}
  }
}

scanDir(root);
console.log('Project file extension distribution:');
console.log(JSON.stringify(extMap, null, 2));
