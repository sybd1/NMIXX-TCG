const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..', '..');
const publicDir = path.join(projectRoot, 'public');
const backupDir = 'C:\\Users\\gjffp\\OneDrive\\Desktop\\TCG-cardgame\\image_backup_temp';

const targetSubdirs = ['cards', 'card-pack-image', 'image'];
const extensionsToConvert = ['.png', '.jpg', '.jpeg'];

// Ensure backup folder exists
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function convertFile(fullPath, relativePath) {
  const ext = path.extname(fullPath).toLowerCase();
  if (!extensionsToConvert.includes(ext)) return;

  const destRelative = relativePath.slice(0, -ext.length) + '.webp';
  const destPath = path.join(publicDir, destRelative);
  const backupPath = path.join(backupDir, relativePath);

  // Ensure backup subdirectories exist
  fs.mkdirSync(path.dirname(backupPath), { recursive: true });

  console.log(`Backing up: ${relativePath} -> backup_temp`);
  fs.copyFileSync(fullPath, backupPath);

  console.log(`Converting: ${relativePath} -> ${destRelative}`);
  try {
    await sharp(fullPath)
      .webp({ quality: 85 })
      .toFile(destPath);
    
    // Successfully converted, delete original from public
    fs.unlinkSync(fullPath);
    console.log(`✓ Converted & deleted original: ${relativePath}`);
  } catch (err) {
    console.error(`❌ Failed to convert ${relativePath}:`, err);
  }
}

async function walkAndConvert(dir, relativePrefix = '') {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = relativePrefix ? path.join(relativePrefix, file) : file;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      await walkAndConvert(fullPath, relPath);
    } else {
      await convertFile(fullPath, relPath);
    }
  }
}

async function main() {
  console.log('🚀 Starting WebP conversion and backup process...');
  for (const sub of targetSubdirs) {
    const fullSubdir = path.join(publicDir, sub);
    if (fs.existsSync(fullSubdir)) {
      console.log(`Scanning: public/${sub}`);
      await walkAndConvert(fullSubdir, sub);
    }
  }
  console.log('🎉 WebP conversion completed successfully!');
}

main().catch(err => {
  console.error('Fatal error in conversion script:', err);
  process.exit(1);
});
