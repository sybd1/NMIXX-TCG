import fs from 'fs';
import path from 'path';

const root = process.cwd();
const publicCardsDir = path.join(root, 'public', 'cards');

const webpCopyList = [
  { src: 'image/all-member/nmixx-20260328-104529-000.webp', dest: 'live_motion_nmixx_01.webp' },
  { src: 'image/Bae/nmixx-20251228-003612-004.webp', dest: 'live_motion_bae_01.webp' },
  { src: 'image/Bae/nmixx-20251228-003617-000.webp', dest: 'live_motion_bae_02.webp' },
  { src: 'image/Bae/nmixx-20251228-003624-002.webp', dest: 'live_motion_bae_03.webp' },
];

if (!fs.existsSync(publicCardsDir)) {
  fs.mkdirSync(publicCardsDir, { recursive: true });
}

webpCopyList.forEach(({ src, dest }) => {
  const srcPath = path.join(root, src);
  const destPath = path.join(publicCardsDir, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied: ${src} -> public/cards/${dest}`);
  } else {
    console.error(`Not found: ${srcPath}`);
  }
});
