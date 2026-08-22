import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const SET_DIR = path.join(ROOT_DIR, 'image', 'SET');
const PUBLIC_CARDS_DIR = path.join(ROOT_DIR, 'public', 'cards');
const ARTIFACT_DIR = 'C:\\Users\\gjffp\\.gemini\\antigravity\\brain\\69ef337b-8ea5-41e5-9376-27c9219806d5';
const PREVIEW_DIR = path.join(ARTIFACT_DIR, 'set_previews');

// 사용자 지정 한글 파일명 -> Member Key 매핑
const MEMBER_MAPPING = [
  { filePrefix: '릴리', member: 'LILY', nameKo: '릴리' },
  { filePrefix: '해원', member: 'HAEWON', nameKo: '해원' },
  { filePrefix: '설윤', member: 'SULLYOON', nameKo: '설윤' },
  { filePrefix: '배이', member: 'BAE', nameKo: '배이' },
  { filePrefix: '지우', member: 'JIWOO', nameKo: '지우' },
  { filePrefix: '규진', member: 'KYUJIN', nameKo: '규진' },
];

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

const SET_CONFIGS = [
  // OP-01 (1탄 계승되는 의지)
  {
    folder: 'R Flower',
    setId: 'set_r_flower',
    conceptName: 'Flower',
    setTitle: '[Flower] NMIXX 세트 카드',
    era: 'Flower',
    rarity: 'R',
    packCode: 'OP-01',
    packId: 'op01',
    packName: '1탄 계승되는 의지',
    memberRarity: 'UC',
    finishType: 'SILVER_STAMPING',
    startNo: 1, // #001 ~ #006
    cost: 4,
    power: 5200,
    desc: 'Flower 테마의 꽃처럼 피어난 6명 멤버를 모두 모아 완성된 은박 스탬핑 R 세트 카드입니다.',
    quote: '활짝 피어나는 우리들의 가장 아름다운 계절.',
  },
  {
    folder: 'SR Light',
    setId: 'set_sr_light',
    conceptName: 'Light',
    setTitle: '[Light] NMIXX 세트 카드',
    era: 'Light',
    rarity: 'SR',
    packCode: 'OP-01',
    packId: 'op01',
    packName: '1탄 계승되는 의지',
    memberRarity: 'R',
    finishType: 'RAINBOW_FOIL',
    startNo: 7, // #007 ~ #012
    cost: 5,
    power: 7000,
    desc: 'Light 테마의 찬란한 빛을 담은 6명 멤버를 모두 수집하여 완성된 레인보우 포일 SR 세트 카드입니다.',
    quote: '어둠 속을 밝히는 우리들의 눈부신 빛!',
  },

  // OP-02 (2탄 정점결전)
  {
    folder: 'R2 School',
    setId: 'set_r_school',
    conceptName: 'School',
    setTitle: '[School] NMIXX 세트 카드',
    era: 'School',
    rarity: 'R',
    packCode: 'OP-02',
    packId: 'op02',
    packName: '2탄 정점결전',
    memberRarity: 'UC',
    finishType: 'SILVER_STAMPING',
    startNo: 151, // #151 ~ #156
    cost: 4,
    power: 5000,
    desc: 'School 스쿨룩 테마의 활기찬 6명 멤버를 모두 모아 완성된 기념비적인 R 세트 카드입니다.',
    quote: '풋풋하고 당찬 우리들의 청춘 스토리!',
  },
  {
    folder: 'SSR NMIXX',
    setId: 'set_ssr_nmixx',
    conceptName: 'NMIXX',
    setTitle: '[NMIXX] NMIXX 세트 카드',
    era: 'Fe3O4',
    rarity: 'SSR',
    packCode: 'OP-02',
    packId: 'op02',
    packName: '2탄 정점결전',
    memberRarity: 'SR',
    finishType: 'SHATTERED_GLASS',
    startNo: 157, // #157 ~ #162
    cost: 7,
    power: 9500,
    desc: 'NMIXX 공식 6인 멤버를 모두 수집하여 완성된 특급 희귀 SSR 풀아트 세트 카드입니다.',
    quote: '전원 올라운더 6인의 정점의 무대, NMIXX CHANGE UP!',
  },

  // OP-03 (3탄 Blue Valentine)
  {
    folder: 'SR2 Blue Valentine',
    setId: 'set_sr_blue_valentine',
    conceptName: 'Blue Valentine',
    setTitle: '[Blue Valentine] NMIXX 세트 카드',
    era: 'Blue Valentine',
    rarity: 'SR',
    packCode: 'OP-03',
    packId: 'op03',
    packName: '3탄 Blue Valentine',
    memberRarity: 'R',
    finishType: 'RAINBOW_FOIL',
    startNo: 301, // #301 ~ #306
    cost: 5,
    power: 6800,
    desc: 'Blue Valentine의 몽환적이고 매혹적인 6명 멤버를 모두 모아 완성된 SR 세트 카드입니다.',
    quote: '파란빛 감성의 로맨틱 발렌타인 멜로디.',
  },

  // OP-04 (4탄 ZERO FRONTIER)
  {
    folder: 'UR EPISODE 1 ZERO FRONTIER',
    setId: 'set_ur_zero_frontier',
    conceptName: 'ZERO FRONTIER',
    setTitle: '[ZERO FRONTIER] NMIXX 세트 카드',
    era: 'ZERO FRONTIER',
    rarity: 'UR',
    packCode: 'OP-04',
    packId: 'op04',
    packName: '4탄 ZERO FRONTIER',
    memberRarity: 'SR',
    finishType: 'PRISM_GLITTER',
    startNo: 451, // #451 ~ #456
    cost: 8,
    power: 13000,
    desc: 'EPISODE 1 ZERO FRONTIER의 6명 멤버를 모두 수집하여 해금된 최상위 UR 풀아트 세트 카드입니다.',
    quote: '신시대를 여는 믹스팝의 개척자, ZERO FRONTIER!',
  },
];

// master cards 불러오기
const cardsTsPath = path.join(ROOT_DIR, 'src', 'data', 'cards.ts');
const masterCardsText = fs.readFileSync(cardsTsPath, 'utf8');
const masterMatch = masterCardsText.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const currentCards = JSON.parse(masterMatch[1]);

const conceptSets = [];

SET_CONFIGS.forEach((conf) => {
  const folderPath = path.join(SET_DIR, conf.folder);
  const files = fs.readdirSync(folderPath);
  console.log(`Processing folder: ${conf.folder}`);

  const setCardIds = [];

  // 각 멤버별로 정확한 한글 파일명 찾기
  MEMBER_MAPPING.forEach((memSpec, mIdx) => {
    // 예: '릴리.jpg' 또는 '릴리'가 포함된 파일
    const matchedFile = files.find(f => f.startsWith(memSpec.filePrefix) || f.includes(memSpec.filePrefix));
    if (!matchedFile) {
      console.warn(`Warning: Could not find file for ${memSpec.filePrefix} in ${conf.folder}`);
    }
    const targetFile = matchedFile || files[mIdx];
    const srcPath = path.join(folderPath, targetFile);

    const cardNum = conf.startNo + mIdx;
    const numStr = String(cardNum).padStart(3, '0');
    const ext = path.extname(targetFile) || '.jpg';
    const destName = `card_${numStr}${ext}`;
    const destPath = path.join(PUBLIC_CARDS_DIR, destName);

    fs.copyFileSync(srcPath, destPath);

    // 아티팩트 미리보기용 복사
    const previewName = `${conf.setId}_${memSpec.member}_${numStr}${ext}`;
    fs.copyFileSync(srcPath, path.join(PREVIEW_DIR, previewName));

    const cardId = `nmixx_${numStr}`;
    setCardIds.push(cardId);

    // 카드명: [멤버명] - [컨셉명] (예: '릴리 - Flower', '해원 - Blue Valentine')
    const cardTitle = `${memSpec.nameKo} - ${conf.conceptName}`;

    const cardIndex = cardNum - 1;
    currentCards[cardIndex] = {
      ...currentCards[cardIndex],
      id: cardId,
      name: cardTitle,
      member: memSpec.member,
      category: 'CHARACTER',
      rarity: conf.memberRarity,
      finishType: RARITY_TO_FINISH[conf.memberRarity],
      collectionNumber: cardNum,
      era: conf.era,
      image: `/cards/${destName}`,
      packCode: conf.packCode,
      packId: conf.packId,
      packName: conf.packName,
      setId: conf.setId,
      setTitle: conf.setTitle,
    };
  });

  const rewardCardId = `reward_${conf.setId}`;
  const rewardImg = `/cards/card_${String(conf.startNo).padStart(3, '0')}.jpg`;

  const rewardCard = {
    id: rewardCardId,
    name: `[${conf.rarity} SET] ${conf.setTitle}`,
    member: 'NMIXX',
    category: 'LEADER',
    rarity: conf.rarity,
    finishType: conf.finishType,
    collectionNumber: 900 + conceptSets.length + 1,
    cost: conf.cost,
    power: conf.power,
    description: conf.desc,
    dustValue: conf.rarity === 'UR' ? 3000 : (conf.rarity === 'SSR' ? 1000 : (conf.rarity === 'SR' ? 300 : 100)),
    craftCost: null,
    theme: '엔믹스 단체',
    era: conf.era,
    gradient: 'from-pink-600 via-purple-600 to-amber-500',
    symbol: conf.rarity === 'UR' ? '💎' : (conf.rarity === 'SSR' ? '👑' : '✨'),
    quote: conf.quote,
    image: rewardImg,
    packCode: conf.packCode,
    packId: conf.packId,
    packName: conf.packName,
    setId: conf.setId,
    setTitle: conf.setTitle,
  };

  conceptSets.push({
    setId: conf.setId,
    setTitle: conf.setTitle,
    era: conf.era,
    packCode: conf.packCode,
    packId: conf.packId,
    packName: conf.packName,
    cardIds: setCardIds,
    members: MEMBER_MAPPING.map(m => m.member),
    rewardCard,
  });
});

const tsContent = `import { Card, Rarity, ConceptSetCard } from '../types/card';

export const MASTER_CARDS: Card[] = ${JSON.stringify(currentCards, null, 2)};

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

fs.writeFileSync(cardsTsPath, tsContent, 'utf8');
console.log('Successfully written src/data/cards.ts with exact user named photos!');
