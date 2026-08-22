import fs from 'fs';
import path from 'path';

const root = process.cwd();
const webpFiles = [
  'image/all-member/nmixx-20260328-104529-000.webp',
  'image/Bae/nmixx-20251228-003612-004.webp',
  'image/Bae/nmixx-20251228-003617-000.webp',
  'image/Bae/nmixx-20251228-003624-002.webp',
  'image/Jiwoo/nmixx-20251212-030431-000.webp',
  'image/Jiwoo/nmixx-20251212-030439-002.webp',
  'image/Jiwoo/nmixx-20251212-030441-003.webp',
  'image/Jiwoo/nmixx-20251212-030459-006.webp',
  'image/Jiwoo/nmixx-20251212-030616-024.webp',
  'image/Sullyoon/nmixx-20251212-030516-008.webp',
  'image/Sullyoon/nmixx-20251212-030538-012.webp',
  'image/Sullyoon/nmixx-20251212-030553-020.webp',
  'image/Sullyoon/nmixx-20251212-030600-021.webp',
  'image/Sullyoon/nmixx-20251212-030608-022.webp',
];

function isAnimatedWebp(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 30) return false;
  // RIFF header
  const riff = buf.toString('ascii', 0, 4);
  const webp = buf.toString('ascii', 8, 12);
  if (riff !== 'RIFF' || webp !== 'WEBP') return false;
  
  // Look for ANIM chunk or VP8X animation flag
  const header = buf.toString('ascii', 12, 16);
  if (header === 'VP8X') {
    const flags = buf[20];
    const isAnim = (flags & 0x02) !== 0;
    return isAnim;
  }
  return false;
}

console.log('Testing Animated WebP:');
webpFiles.forEach(f => {
  const fullPath = path.join(root, f);
  if (fs.existsSync(fullPath)) {
    const anim = isAnimatedWebp(fullPath);
    console.log(`- ${f}: ${anim ? '🎬 ANIMATED (움직임!)' : '🖼️ STATIC (정지 사진)'}`);
  }
});
