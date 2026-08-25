const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');

function fileExistsCaseSensitive(filePath) {
  const normalized = path.normalize(filePath);
  if (!fs.existsSync(normalized)) return false;

  const parts = normalized.split(path.sep);
  let current = parts[0] + path.sep;

  for (let i = 1; i < parts.length; i++) {
    const segment = parts[i];
    const entries = fs.readdirSync(current);
    if (!entries.includes(segment)) {
      return false;
    }
    current = path.join(current, segment);
  }
  return true;
}

const scannedExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
const allFoundImages = new Set();

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walkDir(full);
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (scannedExtensions.includes(ext)) {
        const content = fs.readFileSync(full, 'utf8');
        const imgRegex = /['"](\/(?:card-pack-image|cards|images|assets)[^'"]+\.(?:jpg|jpeg|png|webp|svg|gif|JPG|JPEG|PNG))['"]/g;
        let m;
        while ((m = imgRegex.exec(content)) !== null) {
          allFoundImages.add(m[1]);
        }
      }
    }
  }
}

walkDir(path.join(projectRoot, 'src'));

let errors = 0;
for (const imgUrl of Array.from(allFoundImages)) {
  const cleanUrl = imgUrl.split('?')[0].split('#')[0];
  const targetPath = path.join(publicDir, cleanUrl);

  if (!fs.existsSync(targetPath)) {
    console.error(`❌ [BUILD GUARD ERROR] Missing image file: ${imgUrl}`);
    errors++;
  } else if (!fileExistsCaseSensitive(targetPath)) {
    console.error(`❌ [BUILD GUARD ERROR] Case mismatch for image: ${imgUrl}`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\n🚨 Image verification failed: ${errors} errors found. Aborting build.`);
  process.exit(1);
} else {
  console.log(`✅ [Image Guard] All ${allFoundImages.size} static images verified and case-matched!`);
}
