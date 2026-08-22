import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const root = process.cwd();
const imageDir = path.join(root, 'image');
const cardsDir = path.join(root, 'public', 'cards');
const cardsTsPath = path.join(root, 'src', 'data', 'cards.ts');

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

// 1. image/ 폴더 내 파일 해시 매핑
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
          hashMapToMember.set(hash, member);
        }
      }
    });
  }
});

// public/cards/ 파일 해시 매핑
const cardFileToMember = new Map();
const cardFiles = fs.readdirSync(cardsDir);
const memberImageFiles = {
  LILY: [],
  HAEWON: [],
  SULLYOON: [],
  BAE: [],
  JIWOO: [],
  KYUJIN: [],
  NMIXX: [],
};

cardFiles.forEach(f => {
  const fullPath = path.join(cardsDir, f);
  const hash = getFileHash(fullPath);
  if (hash && hashMapToMember.has(hash)) {
    const member = hashMapToMember.get(hash);
    const relPath = '/cards/' + f;
    cardFileToMember.set(relPath, member);
    if (memberImageFiles[member]) {
      memberImageFiles[member].push(relPath);
    }
  }
});

console.log('Member image counts in public/cards:');
Object.keys(memberImageFiles).forEach(m => {
  console.log(`- ${m}: ${memberImageFiles[m].length} images`);
});
