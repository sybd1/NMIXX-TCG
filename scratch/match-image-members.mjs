import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const root = process.cwd();
const imageDir = path.join(root, 'image');
const cardsDir = path.join(root, 'public', 'cards');

function getFileHash(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('md5');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  } catch (e) {
    return null;
  }
}

// 1. image/ 폴더 내 모든 파일의 해시와 실제 멤버 매핑 생성
const hashMapToMember = new Map();
const memberFolders = [
  { folder: 'Bae', member: 'BAE' },
  { folder: 'Haewon', member: 'HAEWON' },
  { folder: 'Jiwoo', member: 'JIWOO' },
  { folder: 'Kyujin', member: 'KYUJIN' },
  { folder: 'Lilly', member: 'LILY' },
  { folder: 'Sullyoon', member: 'SULLYOON' },
  { folder: 'all-member', member: 'NMIXX' },
];

memberFolders.forEach(({ folder, member }) => {
  const dirPath = path.join(imageDir, folder);
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    files.forEach(f => {
      const fullPath = path.join(dirPath, f);
      if (fs.statSync(fullPath).isFile()) {
        const hash = getFileHash(fullPath);
        if (hash) {
          hashMapToMember.set(hash, { member, originalFile: f, folder });
        }
      }
    });
  }
});

console.log('Total indexed image files in image/ folders:', hashMapToMember.size);

// 2. public/cards/ 내 파일들을 해시로 매칭
const cardFileToMember = new Map();
const cardFiles = fs.readdirSync(cardsDir);
let matchedCount = 0;
let unmatchedCount = 0;

cardFiles.forEach(f => {
  const fullPath = path.join(cardsDir, f);
  const hash = getFileHash(fullPath);
  if (hash && hashMapToMember.has(hash)) {
    cardFileToMember.set('cards/' + f, hashMapToMember.get(hash));
    cardFileToMember.set('/cards/' + f, hashMapToMember.get(hash));
    matchedCount++;
  } else {
    unmatchedCount++;
  }
});

console.log('Matched public/cards files to actual members:', matchedCount, 'Unmatched:', unmatchedCount);
