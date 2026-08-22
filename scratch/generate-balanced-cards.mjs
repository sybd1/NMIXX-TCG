import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const IMG_DIR = path.join(ROOT_DIR, 'image');
const PUBLIC_CARDS_DIR = path.join(ROOT_DIR, 'public', 'cards');

if (!fs.existsSync(PUBLIC_CARDS_DIR)) {
  fs.mkdirSync(PUBLIC_CARDS_DIR, { recursive: true });
}

const memberFolders = {
  LILY: 'Lilly',
  HAEWON: 'Haewon',
  SULLYOON: 'Sullyoon',
  BAE: 'Bae',
  JIWOO: 'Jiwoo',
  KYUJIN: 'Kyujin',
  NMIXX: 'all-member',
};

const memberFiles = {};
for (const [mem, folder] of Object.entries(memberFolders)) {
  const dirPath = path.join(IMG_DIR, folder);
  const files = fs.readdirSync(dirPath).filter(f => /\.(jpe?g|png|webp)$/i.test(f));
  memberFiles[mem] = files.map(f => path.join(dirPath, f));
}

const PACKS = [
  { id: 'op01', code: 'OP-01', name: 'NMIXX 계승되는 의지', startNo: 1, count: 150 },
  { id: 'op02', code: 'OP-02', name: 'NMIXX 정점결전', startNo: 151, count: 150 },
  { id: 'op03', code: 'OP-03', name: 'NMIXX 강대한 적', startNo: 301, count: 150 },
  { id: 'op04', code: 'OP-04', name: 'NMIXX 신시대의 주역', startNo: 451, count: 150 },
];

const ERAS = [
  'O.O', 'DICE', 'Love Me Like This', 'Roller Coaster',
  'Party O\'Clock', 'Soñar (Breaker)', 'DASH', 'Run For Roses',
  'See that?', 'Fe3O4: BREAK'
];

const MEMBER_NAMES_KO = {
  LILY: '릴리',
  HAEWON: '해원',
  SULLYOON: '설윤',
  BAE: '배이',
  JIWOO: '지우',
  KYUJIN: '규진',
  NMIXX: '엔믹스',
};

const MEMBER_TITLES = {
  LILY: ['천상의 6단 고음', '선샤인 보컬', '비타민 보이스', '팝의 여왕', '파워풀 샤우팅', '소울 그루브', '무대 위의 천사', '골든 보컬'],
  HAEWON: ['오마이갓 리더', '청아한 음색', '예능의 신', '믿고 듣는 리더', '카리스마 캡틴', '보컬의 정석', '워터밤의 여신', '맑은 영혼'],
  SULLYOON: ['비주얼 퀸', '사슴 눈망울', '국보급 미모', '요정 강림', '음색 보물', '엔믹스의 자부심', '퍼펙트 비주얼', '순정만화 주인공'],
  BAE: ['숏컷의 정석', '분위기 메이커', '매력적인 톤', '피지컬 퀸', '걸크러시 댄서', '황금 비율', '무대 체질', '스포티 에너지'],
  JIWOO: ['비주얼 래퍼', '파워풀 힙합', '쫀득한 랩핑', '카리스마 댄서', '귀염둥이 퍼피', '다이아몬드 보이스', '무대 장인', '매혹의 춤선'],
  KYUJIN: ['황금 막내', '메인 댄서', '고양이상 요정', '올라운더 캡틴', '퍼포먼스 퀸', '무대 위 맹수', '카리스마 눈빛', '천재 아이돌'],
  NMIXX: ['MIXX POP 개척자', '전원 올라운더', '계승되는 의지', '신시대의 주역', '정점의 카리스마', '엔써와의 항해', '무결점 라이브', '믹스토피아의 빛'],
};

const RARITY_TO_FINISH = {
  C: 'MATTE',
  UC: 'GLOSSY',
  R: 'SILVER_STAMPING',
  SR: 'RAINBOW_FOIL',
  SSR: 'SHATTERED_GLASS',
  UR: 'PRISM_GLITTER',
  LR: 'TEXTURE_GOLD',
  MR: 'COSMIC_GHOST',
};

const SIX_MEMBERS = ['LILY', 'HAEWON', 'SULLYOON', 'BAE', 'JIWOO', 'KYUJIN'];

const cards = [];
const conceptSets = [];

PACKS.forEach((pack, pIndex) => {
  const packCards = [];
  
  // 팩당 3개의 6인 세트 생성 (각 팩 3세트 * 6멤버 = 18장)
  for (let setIdx = 0; setIdx < 3; setIdx++) {
    const eraIdx = (pIndex * 3 + setIdx) % ERAS.length;
    const era = ERAS[eraIdx];
    const setId = `set_${pack.id}_${era.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    const setTitle = `[${era}] 6인 완전체 컬렉션`;
    const setCardIds = [];

    SIX_MEMBERS.forEach((member, mIdx) => {
      const cardNum = pack.startNo + packCards.length;
      const numStr = String(cardNum).padStart(3, '0');
      const cardId = `nmixx_${numStr}`;
      setCardIds.push(cardId);

      const rarity = setIdx === 0 ? 'SR' : (setIdx === 1 ? 'R' : 'UC');

      packCards.push({
        id: cardId,
        member,
        era,
        rarity,
        isConceptSet: true,
        setId,
        setTitle,
      });
    });

    // SSR급 보상 세트 카드 정의
    const rewardCardId = `set_reward_${setId}`;
    const rewardCard = {
      id: rewardCardId,
      name: `[SSR SET] ${setTitle}`,
      member: 'NMIXX',
      category: 'LEADER',
      rarity: 'SSR',
      finishType: 'SHATTERED_GLASS',
      collectionNumber: 900 + conceptSets.length + 1,
      cost: 7,
      power: 10000,
      description: `${era} 활동의 모든 멤버를 모아 완성된 전설의 6인 컴플리트 SSR 세트 카드입니다.`,
      dustValue: 1000,
      craftCost: null,
      theme: '엔믹스 6인 완전체',
      era: era,
      gradient: 'from-pink-600 via-purple-600 to-amber-500',
      symbol: '👑',
      quote: `우리가 모였을 때 비로소 완성되는 NMIXX CHANGE UP!`,
      image: `/cards/card_${String(pack.startNo).padStart(3, '0')}.jpg`,
      packCode: pack.code,
      packId: pack.id,
      setId: setId,
      setTitle: setTitle,
    };

    conceptSets.push({
      setId,
      setTitle,
      era,
      packCode: pack.code,
      packId: pack.id,
      cardIds: setCardIds,
      members: SIX_MEMBERS,
      rewardCard,
    });
  }

  // 나머지 일반 멤버 카드들 채우기 (각 멤버당 19장씩 균등 배분 = 114장)
  SIX_MEMBERS.forEach((member, mIdx) => {
    // 균등한 레어도 배분
    const memberRarities = [
      ...Array(9).fill('C'),
      ...Array(6).fill('UC'),
      ...Array(3).fill('R'),
      'SR'
    ];
    memberRarities.forEach((rarity, rIdx) => {
      const cardNum = pack.startNo + packCards.length;
      const numStr = String(cardNum).padStart(3, '0');
      packCards.push({
        id: `nmixx_${numStr}`,
        member,
        era: ERAS[(mIdx + rIdx) % ERAS.length],
        rarity,
        isConceptSet: false,
        setId: null,
        setTitle: null,
      });
    });
  });

  // NMIXX 스페셜 카드 (18장 채워서 정확히 150장 완성)
  const nmixxRarities = [
    ...Array(6).fill('C'),
    ...Array(5).fill('UC'),
    ...Array(3).fill('R'),
    ...Array(2).fill('SR'),
    'SSR',
    pack.code === 'OP-04' ? 'MR' : (pack.code === 'OP-03' ? 'LR' : 'UR')
  ];
  nmixxRarities.forEach((rarity, nIdx) => {
    const cardNum = pack.startNo + packCards.length;
    const numStr = String(cardNum).padStart(3, '0');
    packCards.push({
      id: `nmixx_${numStr}`,
      member: 'NMIXX',
      era: ERAS[nIdx % ERAS.length],
      rarity,
      isConceptSet: false,
      setId: null,
      setTitle: null,
    });
  });

  // 팩 내 150장의 카드 실제 데이터 생성 및 이미지 복사
  packCards.slice(0, 150).forEach((item, pIdx) => {
    const cardNum = pack.startNo + pIdx;
    const numStr = String(cardNum).padStart(3, '0');
    
    const fileList = memberFiles[item.member];
    const srcFile = fileList[(cardNum * 7) % fileList.length];
    const ext = path.extname(srcFile) || '.jpg';
    const destName = 'card_' + numStr + ext;
    const destPath = path.join(PUBLIC_CARDS_DIR, destName);
    
    fs.copyFileSync(srcFile, destPath);

    const memberKo = MEMBER_NAMES_KO[item.member];
    const titles = MEMBER_TITLES[item.member];
    const title = titles[cardNum % titles.length];
    const name = item.member === 'NMIXX' ? `[${pack.code}] ${title}` : `${memberKo} - ${title}`;

    let cost = 1;
    let power = 2000;
    const r = item.rarity;
    if (r === 'C') { cost = Math.floor(Math.random() * 2) + 1; power = 2000 + Math.floor(Math.random() * 1000); }
    else if (r === 'UC') { cost = Math.floor(Math.random() * 2) + 2; power = 3000 + Math.floor(Math.random() * 1000); }
    else if (r === 'R') { cost = Math.floor(Math.random() * 3) + 3; power = 4500 + Math.floor(Math.random() * 1500); }
    else if (r === 'SR') { cost = Math.floor(Math.random() * 3) + 4; power = 6000 + Math.floor(Math.random() * 2000); }
    else if (r === 'SSR') { cost = Math.floor(Math.random() * 3) + 6; power = 8500 + Math.floor(Math.random() * 2500); }
    else if (r === 'UR') { cost = Math.floor(Math.random() * 2) + 8; power = 12000 + Math.floor(Math.random() * 3000); }
    else if (r === 'LR') { cost = 10; power = 16000 + Math.floor(Math.random() * 4000); }
    else if (r === 'MR') { cost = 10; power = 22000 + Math.floor(Math.random() * 8000); }

    cards.push({
      id: item.id,
      name: name,
      member: item.member,
      category: item.member === 'NMIXX' ? 'LEADER' : 'CHARACTER',
      rarity: item.rarity,
      finishType: RARITY_TO_FINISH[item.rarity] || 'MATTE',
      collectionNumber: cardNum,
      cost: cost,
      power: power,
      description: item.member === 'NMIXX' ? `[${pack.code}] 우리가 바로 신시대의 주역, NMIXX CHANGE UP!` : `${memberKo}의 찬란한 순간이 영원히 기억됩니다.`,
      dustValue: 0,
      craftCost: null,
      theme: memberKo,
      era: item.era,
      gradient: 'from-pink-600 via-purple-600 to-amber-500',
      symbol: '✨',
      quote: `${memberKo}의 시그니처 멜로디`,
      image: '/cards/' + destName,
      packCode: pack.code,
      packId: pack.id,
      setId: item.setId,
      setTitle: item.setTitle,
    });
  });
});

console.log(`Generated Cards: ${cards.length}, Concept Sets: ${conceptSets.length}`);

const tsContent = `import { Card, Rarity, FinishType, ConceptSetCard } from '../types/card';

export const MASTER_CARDS: Card[] = ${JSON.stringify(cards, null, 2)};

export const CONCEPT_SETS: ConceptSetCard[] = ${JSON.stringify(conceptSets, null, 2)};

export const CARDS_DATA = MASTER_CARDS;

export const getCardsByRarity = (rarity: Rarity): Card[] => {
  return MASTER_CARDS.filter(c => c.rarity === rarity);
};

export const getCardsByPack = (packId: string): Card[] => {
  return MASTER_CARDS.filter(c => c.packId === packId);
};

export const getCardById = (id: string): Card | undefined => {
  return MASTER_CARDS.find(c => c.id === id);
};

export const getSetRewardCard = (setId: string): Card | undefined => {
  const s = CONCEPT_SETS.find(set => set.setId === setId);
  return s?.rewardCard;
};
`;

fs.writeFileSync(path.join(ROOT_DIR, 'src', 'data', 'cards.ts'), tsContent, 'utf8');
console.log('Successfully written src/data/cards.ts!');
