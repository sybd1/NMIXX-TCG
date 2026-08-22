import fs from 'fs';
import path from 'path';

const root = process.cwd();
const imageSullyoonDir = path.join(root, 'image', 'Sullyoon');
const publicCardsDir = path.join(root, 'public', 'cards');

const gifFiles = [
  { src: '1758816202916.gif', dest: 'live_motion_sullyoon_01.gif' },
  { src: '1758816202996.gif', dest: 'live_motion_sullyoon_02.gif' },
  { src: '1758816203080.gif', dest: 'live_motion_sullyoon_03.gif' },
  { src: 'nmixx-20251016-001937-000.gif', dest: 'live_motion_sullyoon_04.gif' },
  { src: '[엔믹스] 설윤 영어로 주문하기_HD(1).gif', dest: 'live_motion_sullyoon_05.gif' },
];

if (!fs.existsSync(publicCardsDir)) {
  fs.mkdirSync(publicCardsDir, { recursive: true });
}

gifFiles.forEach(({ src, dest }) => {
  const srcPath = path.join(imageSullyoonDir, src);
  const destPath = path.join(publicCardsDir, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied: ${src} -> public/cards/${dest}`);
  } else {
    console.error(`Not found: ${srcPath}`);
  }
});
