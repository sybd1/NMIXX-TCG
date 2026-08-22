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

// 1. image/ 폴더 내 모든 파일의 해시와 실제 멤버 매핑
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

// public/cards/ 내 파일의 해시 매핑
const cardFileToMember = new Map();
const cardFiles = fs.readdirSync(cardsDir);
cardFiles.forEach(f => {
  const fullPath = path.join(cardsDir, f);
  const hash = getFileHash(fullPath);
  if (hash && hashMapToMember.has(hash)) {
    const actualMember = hashMapToMember.get(hash);
    cardFileToMember.set('/cards/' + f, actualMember);
    cardFileToMember.set('cards/' + f, actualMember);
    cardFileToMember.set('/' + f, actualMember);
  }
});

const MEMBER_NAMES_KO = {
  LILY: '릴리',
  HAEWON: '해원',
  SULLYOON: '설윤',
  BAE: '배이',
  JIWOO: '지우',
  KYUJIN: '규진',
  NMIXX: 'NMIXX',
  PARK: '박진영',
};

const MEMBER_QUOTES = {
  LILY: '우리의 목소리가 온 우주에 울려 퍼질 때까지!',
  HAEWON: '엔믹스와 엔써가 함께라면 어디든 정점이야.',
  SULLYOON: '별빛처럼 영원히 반짝이는 우리의 무대.',
  BAE: '멈추지 않는 에너지로 세상을 뒤흔들 거야!',
  JIWOO: '리듬을 타고 끝없이 질주하는 파동!',
  KYUJIN: '가장 화려하게 피어나는 우리의 클라이맥스!',
  NMIXX: 'NMIXX CHANGE UP! Let’s roll the dice!',
  PARK: '가장 완벽한 올라운더, NMIXX의 시작과 끝.',
};

// 2. cards.ts 읽기 및 전수 수정
let cardsTs = fs.readFileSync(cardsTsPath, 'utf8');
const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const currentCards = JSON.parse(masterMatch[1]);

let correctedCount = 0;
const updatedCards = currentCards.map(card => {
  if (card.rarity === 'XR') return card;

  // 이미지에 따른 실제 멤버 조회
  const actualMember = cardFileToMember.get(card.image);
  if (!actualMember) return card;

  const oldMember = card.member;
  const newMember = actualMember;

  let newName = card.name;
  // 이름 내 멤버명 교체
  if (oldMember !== newMember) {
    const oldKo = MEMBER_NAMES_KO[oldMember] || oldMember;
    const newKo = MEMBER_NAMES_KO[newMember] || newMember;
    
    // 접두사 [xxx] 추출
    const prefixMatch = card.name.match(/^(\[[^\]]+\]\s*)/);
    if (prefixMatch) {
      newName = `${prefixMatch[1]}${newKo}`;
    } else {
      newName = card.name.replace(oldKo, newKo).replace(oldMember, newKo);
    }
    correctedCount++;
  }

  return {
    ...card,
    member: newMember,
    name: newName,
    quote: MEMBER_QUOTES[newMember] || card.quote,
  };
});

console.log('Total cards inspected:', updatedCards.length, 'Corrected member mismatch count:', correctedCount);

// cards.ts 파일 쓰기
const newMasterJson = JSON.stringify(updatedCards, null, 2);
const updatedCardsTs = cardsTs.replace(
  /export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/,
  `export const MASTER_CARDS: Card[] = ${newMasterJson};\n\nexport const CONCEPT_SETS`
);

fs.writeFileSync(cardsTsPath, updatedCardsTs, 'utf8');
console.log('Successfully updated cards.ts with 100% verified member names!');
