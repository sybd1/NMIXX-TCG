import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const SET_DIR = path.join(ROOT_DIR, 'image', 'SET');
const PUBLIC_CARDS_DIR = path.join(ROOT_DIR, 'public', 'cards');
const ARTIFACT_DIR = 'C:\\Users\\gjffp\\.gemini\\antigravity\\brain\\69ef337b-8ea5-41e5-9376-27c9219806d5';
const PREVIEW_DIR = path.join(ARTIFACT_DIR, 'set_previews');

if (!fs.existsSync(PREVIEW_DIR)) {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
}

// 6인 멤버 순서
const SIX_MEMBERS = ['LILY', 'HAEWON', 'SULLYOON', 'BAE', 'JIWOO', 'KYUJIN'];
const MEMBER_NAMES_KO = {
  LILY: '릴리',
  HAEWON: '해원',
  SULLYOON: '설윤',
  BAE: '배이',
  JIWOO: '지우',
  KYUJIN: '규진',
  NMIXX: '엔믹스',
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

// 6개 세트 명세
const SET_CONFIGS = [
  {
    folder: 'UR EPISODE 1 ZERO FRONTIER',
    setId: 'set_ur_zero_frontier',
    setTitle: '[EPISODE 1 ZERO FRONTIER] 6인 완전체 컬렉션',
    era: 'ZERO FRONTIER',
    rarity: 'UR',
    packCode: 'OP-04',
    packId: 'op04',
    memberRarity: 'SR',
    finishType: 'PRISM_GLITTER',
    cost: 8,
    power: 13000,
    desc: 'EPISODE 1 ZERO FRONTIER의 6명 멤버를 모두 수집하여 해금된 최상위 UR 풀아트 세트 카드입니다.',
    quote: '신시대를 여는 믹스팝의 개척자, ZERO FRONTIER!',
  },
  {
    folder: 'SSR NMIXX',
    setId: 'set_ssr_nmixx',
    setTitle: '[NMIXX] 6인 완전체 컬렉션',
    era: 'Fe3O4',
    rarity: 'SSR',
    packCode: 'OP-03',
    packId: 'op03',
    memberRarity: 'SR',
    finishType: 'SHATTERED_GLASS',
    cost: 7,
    power: 9500,
    desc: 'NMIXX 공식 6인 완전체 멤버를 모두 수집하여 완성된 특급 희귀 SSR 풀아트 세트 카드입니다.',
    quote: '전원 올라운더 6인의 정점의 무대, NMIXX CHANGE UP!',
  },
  {
    folder: 'SR Light',
    setId: 'set_sr_light',
    setTitle: '[Light] 6인 완전체 컬렉션',
    era: 'Light',
    rarity: 'SR',
    packCode: 'OP-02',
    packId: 'op02',
    memberRarity: 'R',
    finishType: 'RAINBOW_FOIL',
    cost: 5,
    power: 7000,
    desc: 'Light 테마의 찬란한 빛을 담은 6명 멤버를 모두 수집하여 완성된 레인보우 포일 SR 세트 카드입니다.',
    quote: '어둠 속을 밝히는 우리들의 눈부신 빛!',
  },
  {
    folder: 'SR2 Blue Valentine',
    setId: 'set_sr_blue_valentine',
    setTitle: '[Blue Valentine] 6인 완전체 컬렉션',
    era: 'Blue Valentine',
    rarity: 'SR',
    packCode: 'OP-02',
    packId: 'op02',
    memberRarity: 'R',
    finishType: 'RAINBOW_FOIL',
    cost: 5,
    power: 6800,
    desc: 'Blue Valentine의 몽환적이고 매혹적인 6명 멤버를 모두 모아 완성된 SR 세트 카드입니다.',
    quote: '파란빛 감성의 로맨틱 발렌타인 멜로디.',
  },
  {
    folder: 'R Flower',
    setId: 'set_r_flower',
    setTitle: '[Flower] 6인 완전체 컬렉션',
    era: 'Flower',
    rarity: 'R',
    packCode: 'OP-01',
    packId: 'op01',
    memberRarity: 'UC',
    finishType: 'SILVER_STAMPING',
    cost: 4,
    power: 5200,
    desc: 'Flower 테마의 꽃처럼 피어난 6명 멤버를 모두 모아 완성된 은박 스탬핑 R 세트 카드입니다.',
    quote: '활짝 피어나는 우리들의 가장 아름다운 계절.',
  },
  {
    folder: 'R2 School',
    setId: 'set_r_school',
    setTitle: '[School] 6인 완전체 컬렉션',
    era: 'School',
    rarity: 'R',
    packCode: 'OP-01',
    packId: 'op01',
    memberRarity: 'UC',
    finishType: 'SILVER_STAMPING',
    cost: 4,
    power: 5000,
    desc: 'School 스쿨룩 테마의 활기찬 6명 멤버를 모두 모아 완성된 기념비적인 R 세트 카드입니다.',
    quote: '풋풋하고 당찬 우리들의 청춘 스토리!',
  },
];

// 기존 cards.ts 로드하여 일반 카드 풀과 결합
const cardsTsPath = path.join(ROOT_DIR, 'src', 'data', 'cards.ts');
const masterCardsText = fs.readFileSync(cardsTsPath, 'utf8');
const masterMatch = masterCardsText.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const currentCards = JSON.parse(masterMatch[1]);

// 6개 세트의 멤버 카드 36장 생성 및 교체 (세트별 6장 * 6세트 = 36장)
// 세트별 할당 번호:
// R Flower (OP-01): #001 ~ #006
// R2 School (OP-01): #007 ~ #012
// SR Light (OP-02): #151 ~ #156
// SR2 Blue Valentine (OP-02): #157 ~ #162
// SSR NMIXX (OP-03): #301 ~ #306
// UR EPISODE 1 ZERO FRONTIER (OP-04): #451 ~ #456

const conceptSets = [];
let setIndexOffset = 0;

SET_CONFIGS.forEach((conf) => {
  const folderPath = path.join(SET_DIR, conf.folder);
  const files = fs.readdirSync(folderPath);
  console.log(`Processing ${conf.folder}: ${files.length} files`);

  const setCardIds = [];

  // 6장의 멤버 사진 매핑
  SIX_MEMBERS.forEach((member, mIdx) => {
    const file = files[mIdx] || files[0];
    const srcPath = path.join(folderPath, file);
    
    // 시작 카드 번호 계산
    let startNo = 1;
    if (conf.packCode === 'OP-01') startNo = conf.setId.includes('school') ? 7 : 1;
    else if (conf.packCode === 'OP-02') startNo = conf.setId.includes('blue_valentine') ? 157 : 151;
    else if (conf.packCode === 'OP-03') startNo = 301;
    else if (conf.packCode === 'OP-04') startNo = 451;

    const cardNum = startNo + mIdx;
    const numStr = String(cardNum).padStart(3, '0');
    const ext = path.extname(file) || '.jpg';
    const destName = `card_${numStr}${ext}`;
    const destPath = path.join(PUBLIC_CARDS_DIR, destName);

    // public/cards 에 복사
    fs.copyFileSync(srcPath, destPath);

    // 아티팩트 미리보기 폴더에도 복사
    const previewName = `${conf.setId}_${member}_${numStr}${ext}`;
    fs.copyFileSync(srcPath, path.join(PREVIEW_DIR, previewName));

    const cardId = `nmixx_${numStr}`;
    setCardIds.push(cardId);

    const memberKo = MEMBER_NAMES_KO[member];
    const cardTitle = `${memberKo} - ${conf.setTitle.replace(/\[|\]/g, '').replace(' 6인 완전체 컬렉션', '')}`;

    // 해당 번호의 카드 데이터 업데이트
    const cardIndex = cardNum - 1;
    if (currentCards[cardIndex]) {
      currentCards[cardIndex] = {
        ...currentCards[cardIndex],
        id: cardId,
        name: cardTitle,
        member: member,
        category: 'CHARACTER',
        rarity: conf.memberRarity,
        finishType: RARITY_TO_FINISH[conf.memberRarity],
        collectionNumber: cardNum,
        era: conf.era,
        image: `/cards/${destName}`,
        packCode: conf.packCode,
        packId: conf.packId,
        setId: conf.setId,
        setTitle: conf.setTitle,
      };
    }
  });

  // 보상 카드 생성
  const rewardCardId = `reward_${conf.setId}`;
  const rewardImg = `/cards/card_${String(conf.packCode === 'OP-01' ? (conf.setId.includes('school') ? '007' : '001') : (conf.packCode === 'OP-02' ? (conf.setId.includes('blue_valentine') ? '157' : '151') : (conf.packCode === 'OP-03' ? '301' : '451'))).padStart(3, '0')}.jpg`;

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
    theme: '엔믹스 6인 완전체',
    era: conf.era,
    gradient: 'from-pink-600 via-purple-600 to-amber-500',
    symbol: conf.rarity === 'UR' ? '💎' : (conf.rarity === 'SSR' ? '👑' : '✨'),
    quote: conf.quote,
    image: rewardImg,
    packCode: conf.packCode,
    packId: conf.packId,
    setId: conf.setId,
    setTitle: conf.setTitle,
  };

  conceptSets.push({
    setId: conf.setId,
    setTitle: conf.setTitle,
    era: conf.era,
    packCode: conf.packCode,
    packId: conf.packId,
    cardIds: setCardIds,
    members: SIX_MEMBERS,
    rewardCard,
  });
});

console.log(`Updated cards: ${currentCards.length}, Concept Sets: ${conceptSets.length}`);

// src/data/cards.ts 작성
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
console.log('Successfully written src/data/cards.ts with user SET folders!');
