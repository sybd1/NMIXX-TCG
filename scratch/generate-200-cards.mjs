import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const ALL_DIR = path.join(ROOT_DIR, 'nmixx-allmember');
const YOONA_DIR = path.join(ROOT_DIR, 'yoona');
const PUBLIC_CARDS_DIR = path.join(ROOT_DIR, 'public', 'cards');

if (!fs.existsSync(PUBLIC_CARDS_DIR)) {
  fs.mkdirSync(PUBLIC_CARDS_DIR, { recursive: true });
}

// 이미지 파일 가져오기
const allFiles = fs.readdirSync(ALL_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
const yoonaFiles = fs.readdirSync(YOONA_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

console.log(`Available: nmixx-allmember=${allFiles.length}, yoona=${yoonaFiles.length}`);

// 200개 선택 (nmixx-allmember에서 120개 균등 분할 샘플링, yoona에서 80개 균등 분할 샘플링)
const selectedImages = [];

// 120개 from nmixx-allmember
const stepAll = Math.floor(allFiles.length / 120);
for (let i = 0; i < 120; i++) {
  const f = allFiles[i * stepAll];
  selectedImages.push({
    sourcePath: path.join(ALL_DIR, f),
    sourceType: 'all',
    filename: f,
  });
}

// 80개 from yoona
const stepYoona = Math.floor(yoonaFiles.length / 80);
for (let i = 0; i < 80; i++) {
  const f = yoonaFiles[i * stepYoona];
  selectedImages.push({
    sourcePath: path.join(YOONA_DIR, f),
    sourceType: 'yoona',
    filename: f,
  });
}

console.log(`Total selected images: ${selectedImages.length}`);

// 이미지 복사 및 카드 데이터 생성
const cards = [];

const MEMBERS = ['LILY', 'HAEWON', 'SULLYOON', 'BAE', 'JIWOO', 'KYUJIN', 'NMIXX'];
const ERAS = [
  'O.O', 'DICE', 'Love Me Like This', 'Roller Coaster',
  'Party O\'Clock', 'Soñar (Breaker)', 'DASH', 'Run For Roses',
  'See that?', 'High Class', 'Fe3O4: BREAK', 'Fe3O4: STICK OUT'
];

const MEMBER_TITLES = {
  LILY: [
    '천상의 6단 고음', '선샤인 보컬', '비타민 에너지', '올라운더 팝스타',
    '인이어 체크', '무대 위 꾀꼬리', '폭풍 가창력', '소울풀 그루브'
  ],
  HAEWON: [
    '캡틴의 카리스마', '맑고 단단한 보컬', '유쾌한 밈 장인', '엔써의 나침반',
    '리더십 모먼트', '청아한 아리아', '외모 췍 포인트', '신뢰의 캡틴'
  ],
  SULLYOON: [
    '독보적 사슴 요정', '프린세스 아우라', '빅웨이브의 중심', '러블리 엔딩',
    '꽃사슴 비주얼', '감미로운 음색', '숨멎 카리스마', '천상계 미모'
  ],
  BAE: [
    '시크한 락스타', '매력적인 중저음', '반전의 맑눈광', '무대 위의 돌풍',
    '장신 모델 포스', '허스키 보이스', '쿨한 댄스라인', '자유로운 텐션'
  ],
  JIWOO: [
    '쫀득한 래핑 마스터', '댕댕이의 미소', '힙합 그루브', '폭발적 댄스',
    '스트리트 스웨그', '러블리 펀치라인', '비트를 타는 춤선', '다이너마이트 에너지'
  ],
  KYUJIN: [
    '황금 막내의 칼군무', '매력만점 핑크 캣', '센터의 완벽함', '앙큼한 딕션',
    '다이아몬드 막내', '올라운더 퍼포머', '무대 위 지배자', '퍼펙트 타이밍'
  ],
  NMIXX: [
    'MIXXPOP의 여명', '완벽한 6인 시너지', '엔써와의 영원한 유대', '새로운 차원의 무대',
    '한계 없는 도약', '빅웨이브 크루', '빛나는 완전체', 'FE3O4 하모니'
  ]
};

const MEMBER_QUOTES = {
  LILY: '"모든 옥타브를 뚫고 전해지는 내 노래를 들어봐!"',
  HAEWON: '"NMIXX CHANGE UP! 우리가 가는 길이 곧 새로운 정답이야."',
  SULLYOON: '"엔써와 함께하는 모든 순간이 동화 속 마법 같아."',
  BAE: '"틀에 얽매이지 않고 나만의 템포로 달려갈 거야!"',
  JIWOO: '"비트가 터지는 순간 난 이미 한 발 앞서 있지."',
  KYUJIN: '"내 턴이야! 완벽함 그 이상을 보여줄게, 준비됐어?"',
  NMIXX: '"우리가 함께 달린 모든 순간이 찬란한 역사가 되었어."'
};

for (let i = 0; i < 200; i++) {
  const num = i + 1;
  const numStr = String(num).padStart(3, '0');
  const imgObj = selectedImages[i];
  
  // 타겟 이미지 복사: /cards/card_001.jpg 등
  const ext = path.extname(imgObj.filename) || '.jpg';
  const targetName = `card_${numStr}${ext}`;
  const targetPath = path.join(PUBLIC_CARDS_DIR, targetName);
  
  fs.copyFileSync(imgObj.sourcePath, targetPath);

  // Rarity 결정
  // #001 ~ #100: COMMON (100장)
  // #101 ~ #150: RARE (50장)
  // #151 ~ #180: EPIC / SR (30장)
  // #181 ~ #194: LEGENDARY / SEC (14장)
  // #195 ~ #199: MYTHIC / SP (5장)
  // #200: SECRET / MANGA (1장)
  let rarity = 'COMMON';
  let cost = 1;
  let power = 2000;
  let category = 'CHARACTER';

  if (num === 200) {
    rarity = 'SECRET';
    cost = 10;
    power = 15000;
    category = 'LEADER';
  } else if (num >= 195) {
    rarity = 'MYTHIC';
    cost = 8 + (num % 2);
    power = 11000 + (num % 3) * 500;
    category = 'LEADER';
  } else if (num >= 181) {
    rarity = 'LEGENDARY';
    cost = 6 + (num % 2);
    power = 9000 + (num % 4) * 500;
    category = 'LEADER';
  } else if (num >= 151) {
    rarity = 'EPIC';
    cost = 4 + (num % 3);
    power = 6500 + (num % 4) * 500;
    category = num % 5 === 0 ? 'STAGE' : 'CHARACTER';
  } else if (num >= 101) {
    rarity = 'RARE';
    cost = 3 + (num % 2);
    power = 4000 + (num % 4) * 500;
    category = num % 4 === 0 ? 'EVENT' : 'CHARACTER';
  } else {
    rarity = 'COMMON';
    cost = 1 + (num % 3);
    power = 2000 + (num % 4) * 500;
    category = num % 6 === 0 ? 'STAGE' : (num % 7 === 0 ? 'EVENT' : 'CHARACTER');
  }

  // 멤버 결정
  let member = 'NMIXX';
  if (imgObj.sourceType === 'yoona') {
    member = 'SULLYOON';
  } else {
    const memberIndex = (i % 6);
    member = MEMBERS[memberIndex];
  }
  if (num >= 195 && num < 200) {
    member = 'NMIXX';
  }
  if (num === 200) {
    member = 'NMIXX';
  }

  const era = ERAS[i % ERAS.length];
  const titleList = MEMBER_TITLES[member] || MEMBER_TITLES.NMIXX;
  const title = titleList[i % titleList.length];

  let cardName = `${member} - ${title}`;
  if (rarity === 'SECRET') {
    cardName = `[MANGA] NMIXX : FE3O4 - THE FINAL GODDESS`;
  } else if (rarity === 'MYTHIC') {
    cardName = `[SP] ${member === 'NMIXX' ? 'NMIXX COMPLETE' : member} - ${title}`;
  } else if (rarity === 'LEGENDARY') {
    cardName = `[SEC] ${member} - ${title}`;
  } else if (rarity === 'EPIC') {
    cardName = `[SR] ${member} - ${title}`;
  }

  const quote = MEMBER_QUOTES[member] || MEMBER_QUOTES.NMIXX;

  cards.push({
    id: `nm_${numStr}`,
    collectionNumber: num,
    name: cardName,
    member: member,
    category: category,
    rarity: rarity,
    cost: cost,
    power: power,
    era: era,
    theme: `${member} Photo Collection`,
    description: `${member}의 찬란한 ${era} 활동기 포토제닉 모먼트를 담은 오리지널 공식 테레카 포토카드.`,
    quote: quote,
    image: `/cards/${targetName}`,
    dustValue: rarity === 'SECRET' ? 5000 : rarity === 'MYTHIC' ? 1000 : rarity === 'LEGENDARY' ? 200 : rarity === 'EPIC' ? 50 : rarity === 'RARE' ? 15 : 5,
    craftCost: rarity === 'SECRET' ? null : rarity === 'MYTHIC' ? 25000 : rarity === 'LEGENDARY' ? 5000 : rarity === 'EPIC' ? 1000 : rarity === 'RARE' ? 300 : 100,
    gradient: member === 'LILY' ? 'from-sky-950 via-blue-900 to-slate-950'
      : member === 'HAEWON' ? 'from-blue-950 via-indigo-900 to-slate-950'
      : member === 'SULLYOON' ? 'from-pink-950 via-rose-900 to-slate-950'
      : member === 'BAE' ? 'from-amber-950 via-yellow-900 to-slate-950'
      : member === 'JIWOO' ? 'from-red-950 via-rose-900 to-slate-950'
      : member === 'KYUJIN' ? 'from-purple-950 via-violet-900 to-slate-950'
      : 'from-fuchsia-950 via-pink-900 to-purple-950',
    symbol: ''
  });
}

// cards.ts 파일 작성
const fileContent = `import { Card } from '../types/card';

export const MASTER_CARDS: Card[] = ${JSON.stringify(cards, null, 2)};

export function getCardById(id: string): Card | undefined {
  return MASTER_CARDS.find(c => c.id === id);
}

export function getCardsByRarity(rarity: Card['rarity']): Card[] {
  return MASTER_CARDS.filter(c => c.rarity === rarity);
}
`;

fs.writeFileSync(path.join(ROOT_DIR, 'src', 'data', 'cards.ts'), fileContent, 'utf-8');
console.log('Successfully generated 200 cards in src/data/cards.ts and copied 200 images to public/cards/');
