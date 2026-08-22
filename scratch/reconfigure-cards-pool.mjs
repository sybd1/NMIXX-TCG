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

// public/cards/ 파일 해시 매핑 및 멤버별 이미지 리스트 구성
const memberImageFiles = {
  LILY: [],
  HAEWON: [],
  SULLYOON: [],
  BAE: [],
  JIWOO: [],
  KYUJIN: [],
  NMIXX: [],
};

const cardFiles = fs.readdirSync(cardsDir);
cardFiles.forEach(f => {
  const fullPath = path.join(cardsDir, f);
  const hash = getFileHash(fullPath);
  if (hash && hashMapToMember.has(hash)) {
    const member = hashMapToMember.get(hash);
    const relPath = '/cards/' + f;
    if (memberImageFiles[member]) {
      memberImageFiles[member].push(relPath);
    }
  }
});

// 2. cards.ts 읽기
let cardsTs = fs.readFileSync(cardsTsPath, 'utf8');
const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const currentCards = JSON.parse(masterMatch[1]);

// 1~600번 기본 카드 추출
const base600Cards = currentCards.slice(0, 600).map((c, idx) => ({
  ...c,
  collectionNumber: idx + 1,
}));

console.log('Base 600 cards count:', base600Cards.length);

const MEMBER_NAMES_KO = {
  LILY: '릴리',
  HAEWON: '해원',
  SULLYOON: '설윤',
  BAE: '배이',
  JIWOO: '지우',
  KYUJIN: '규진',
  NMIXX: 'NMIXX',
};

const PACK_META = {
  op01: { code: 'OP-01', name: '1탄 계승되는 의지' },
  op02: { code: 'OP-02', name: '2탄 정점결전' },
  op03: { code: 'OP-03', name: '3탄 Blue Valentine' },
  op04: { code: 'OP-04', name: '4탄 ZERO FRONTIER' },
};
const PACK_IDS = ['op01', 'op02', 'op03', 'op04'];

const newHighTierCards = [];
let colNum = 601;

// 1) MR 카드 4개 (#601 ~ #604)
const mrMembers = ['LILY', 'HAEWON', 'SULLYOON', 'NMIXX'];
mrMembers.forEach((member, i) => {
  const packId = PACK_IDS[i % PACK_IDS.length];
  const meta = PACK_META[packId];
  const imgList = memberImageFiles[member];
  const img = imgList[(i * 7 + 13) % imgList.length];
  const nameKo = MEMBER_NAMES_KO[member];

  newHighTierCards.push({
    id: `card_mr_embossed_${packId}_${member.toLowerCase()}_${colNum}`,
    name: `[3D Cosmic Mythic] ${nameKo}`,
    member: member,
    category: 'CHARACTER',
    rarity: 'MR',
    finishType: 'COSMIC_GHOST',
    collectionNumber: colNum++,
    cost: 0,
    power: 0,
    description: `${nameKo}의 3D 입체 뎁스와 코스믹 오로라 셰이더가 적용된 최상위 신화 카드.`,
    dustValue: 5000,
    craftCost: null,
    theme: 'MIXXTOPIA COSMIC',
    era: 'MIXXTOPIA COSMIC',
    gradient: 'from-amber-400 via-pink-500 to-cyan-400',
    symbol: '🌌',
    quote: `${nameKo}의 영혼이 깃든 3D 코스믹 신화의 절정.`,
    image: img,
    packCode: meta.code,
    packId: packId,
    packName: meta.name,
    isSpecialEdition: true,
    isEmbossed3D: true,
    hasMelody: true,
  });
});

// 2) LR 카드 6개 (#605 ~ #610 - 6명 멤버 각각 1장)
const lrMembers = ['LILY', 'HAEWON', 'SULLYOON', 'BAE', 'JIWOO', 'KYUJIN'];
lrMembers.forEach((member, i) => {
  const packId = PACK_IDS[i % PACK_IDS.length];
  const meta = PACK_META[packId];
  const imgList = memberImageFiles[member];
  const img = imgList[(i * 9 + 21) % imgList.length];
  const nameKo = MEMBER_NAMES_KO[member];

  newHighTierCards.push({
    id: `card_lr_embossed_${packId}_${member.toLowerCase()}_${colNum}`,
    name: `[3D 24K Gold Relic] ${nameKo}`,
    member: member,
    category: 'CHARACTER',
    rarity: 'LR',
    finishType: 'TEXTURE_GOLD',
    collectionNumber: colNum++,
    cost: 0,
    power: 0,
    description: `24K 순금 엠보싱 양각 텍스처와 골드 라이브 오버레이가 적용된 전설 카드.`,
    dustValue: 3000,
    craftCost: null,
    theme: 'HERITAGE 24K GOLD',
    era: 'HERITAGE 24K GOLD',
    gradient: 'from-yellow-400 via-amber-300 to-yellow-600',
    symbol: '👑',
    quote: `24K 순금 엠보싱으로 영원히 빛나는 ${nameKo}의 전설.`,
    image: img,
    packCode: meta.code,
    packId: packId,
    packName: meta.name,
    isSpecialEdition: true,
    isEmbossed3D: true,
    hasMelody: true,
  });
});

// 3) UR 카드 10개 (#611 ~ #620 - 6명 멤버 + 단체)
const urMembers = ['LILY', 'HAEWON', 'SULLYOON', 'BAE', 'JIWOO', 'KYUJIN', 'NMIXX', 'HAEWON', 'SULLYOON', 'KYUJIN'];
urMembers.forEach((member, i) => {
  const packId = PACK_IDS[i % PACK_IDS.length];
  const meta = PACK_META[packId];
  const imgList = memberImageFiles[member];
  const img = imgList[(i * 11 + 35) % imgList.length];
  const nameKo = MEMBER_NAMES_KO[member];

  newHighTierCards.push({
    id: `card_ur_embossed_${packId}_${member.toLowerCase()}_${colNum}`,
    name: `[3D Prism Crystal] ${nameKo}`,
    member: member,
    category: 'CHARACTER',
    rarity: 'UR',
    finishType: 'PRISM_GLITTER',
    collectionNumber: colNum++,
    cost: 0,
    power: 0,
    description: `다이아몬드 별빛 글리터와 3D 양각 베벨 림이 탑재된 극희귀 카드.`,
    dustValue: 1500,
    craftCost: null,
    theme: 'ZERO FRONTIER PRISM',
    era: 'ZERO FRONTIER PRISM',
    gradient: 'from-cyan-400 via-sky-300 to-indigo-500',
    symbol: '💎',
    quote: `다이아몬드 빛 프리즘 스펙트럼 속 ${nameKo}의 광채.`,
    image: img,
    packCode: meta.code,
    packId: packId,
    packName: meta.name,
    isSpecialEdition: true,
    isEmbossed3D: true,
    hasMelody: true,
  });
});

// 4) SSR 카드 30개 (#621 ~ #650 - 멤버별 4~5장)
const ssrMembers = [
  'LILY', 'HAEWON', 'SULLYOON', 'BAE', 'JIWOO', 'KYUJIN', 'NMIXX',
  'LILY', 'HAEWON', 'SULLYOON', 'BAE', 'JIWOO', 'KYUJIN', 'NMIXX',
  'LILY', 'HAEWON', 'SULLYOON', 'BAE', 'JIWOO', 'KYUJIN', 'NMIXX',
  'LILY', 'HAEWON', 'SULLYOON', 'BAE', 'JIWOO', 'KYUJIN', 'NMIXX',
  'HAEWON', 'SULLYOON'
]; // exactly 30 entries
ssrMembers.forEach((member, i) => {
  const packId = PACK_IDS[i % PACK_IDS.length];
  const meta = PACK_META[packId];
  const imgList = memberImageFiles[member];
  const img = imgList[(i * 13 + 47) % imgList.length];
  const nameKo = MEMBER_NAMES_KO[member];

  newHighTierCards.push({
    id: `card_ssr_embossed_${packId}_${member.toLowerCase()}_${colNum}`,
    name: `[3D Crystal Fragment] ${nameKo}`,
    member: member,
    category: 'CHARACTER',
    rarity: 'SSR',
    finishType: 'SHATTERED_GLASS',
    collectionNumber: colNum++,
    cost: 0,
    power: 0,
    description: `크리스탈 파편 굴절과 3D 엠보싱 테두리가 결합된 슈퍼 스페셜 카드.`,
    dustValue: 800,
    craftCost: null,
    theme: 'FE3O4 BREAK GLASS',
    era: 'FE3O4 BREAK GLASS',
    gradient: 'from-purple-500 via-pink-400 to-rose-400',
    symbol: '✨',
    quote: `크리스탈 파편처럼 눈부시게 빛나는 ${nameKo}의 3D 모먼트.`,
    image: img,
    packCode: meta.code,
    packId: packId,
    packName: meta.name,
    isSpecialEdition: true,
    isEmbossed3D: true,
    hasMelody: true,
  });
});

console.log('Created new high-tier cards count:', newHighTierCards.length);
console.log('Breakdown:', {
  MR: newHighTierCards.filter(c => c.rarity === 'MR').length,
  LR: newHighTierCards.filter(c => c.rarity === 'LR').length,
  UR: newHighTierCards.filter(c => c.rarity === 'UR').length,
  SSR: newHighTierCards.filter(c => c.rarity === 'SSR').length,
});

// 5) XR 박진영 히든 초월 카드 (#651)
const xrCard = {
  id: 'card_xr_transcendent_park_741',
  name: '[XR] Transcendent - 박진영',
  member: 'PARK',
  category: 'CHARACTER',
  rarity: 'XR',
  finishType: 'TRANSCENDENT_COSMIC',
  collectionNumber: colNum++,
  cost: 0,
  power: 0,
  theme: 'JYP TRANSCENDENT MASTER',
  era: 'JYP TRANSCENDENT MASTER',
  gradient: 'from-rose-600 via-purple-600 to-amber-400',
  symbol: '👑',
  image: '/image/XR-park.jpg',
  packCode: 'OP-04',
  packId: 'op04',
  packName: '4탄 ZERO FRONTIER',
  quote: '이 카드를 제외한 모든 카드를 수집한 자에게 주어지는 궁극의 마스터피스.',
  description: '이 카드를 제외한 모든 카드를 수집하면 자동으로 획득할 수 있는 유일무이한 궁극의 초월 카드입니다.',
  dustValue: 100000,
  craftCost: null,
  isSpecialEdition: true,
  isEmbossed3D: true,
  hasMelody: true,
};

const finalMasterCards = [...base600Cards, ...newHighTierCards, xrCard];
console.log('Total MASTER_CARDS count:', finalMasterCards.length);

// cards.ts 파일 쓰기
const newMasterJson = JSON.stringify(finalMasterCards, null, 2);
const updatedCardsTs = cardsTs.replace(
  /export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/,
  `export const MASTER_CARDS: Card[] = ${newMasterJson};\n\nexport const CONCEPT_SETS`
);

fs.writeFileSync(cardsTsPath, updatedCardsTs, 'utf8');
console.log('Successfully updated cards.ts with exact 651 cards pool!');
