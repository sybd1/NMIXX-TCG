import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const IMG_DIR = path.join(ROOT_DIR, 'image');
const PUBLIC_CARDS_DIR = path.join(ROOT_DIR, 'public', 'cards');

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

// 6개의 세트 정의 (UR 1세트, SSR 1세트, SR 2세트, R 2세트)
const SET_SPECS = [
  {
    setId: 'set_ur_fe3o4',
    setTitle: '[Fe3O4: BREAK] 6인 완전체 컬렉션',
    era: 'Fe3O4: BREAK',
    targetRarity: 'UR',
    packCode: 'OP-04',
    packId: 'op04',
    memberRarity: 'SR',
    finishType: 'PRISM_GLITTER',
    power: 13000,
    cost: 8,
    desc: 'Fe3O4: BREAK 앨범의 6명 멤버를 모두 수집하여 해금된 최상위 UR 풀아트 세트 카드입니다.',
  },
  {
    setId: 'set_ssr_see_that',
    setTitle: '[See that?] 6인 완전체 컬렉션',
    era: 'See that?',
    targetRarity: 'SSR',
    packCode: 'OP-03',
    packId: 'op03',
    memberRarity: 'SR',
    finishType: 'SHATTERED_GLASS',
    power: 9500,
    cost: 7,
    desc: 'See that? 별빛 무대의 6명 멤버를 모두 수집하여 해금된 특급 희귀 SSR 풀아트 세트 카드입니다.',
  },
  {
    setId: 'set_sr_party',
    setTitle: '[Party O\'Clock] 6인 완전체 컬렉션',
    era: 'Party O\'Clock',
    targetRarity: 'SR',
    packCode: 'OP-02',
    packId: 'op02',
    memberRarity: 'R',
    finishType: 'RAINBOW_FOIL',
    power: 7000,
    cost: 5,
    desc: 'Party O\'Clock 서머 나잇의 6명 멤버를 모두 수집하여 완성된 레인보우 포일 SR 세트 카드입니다.',
  },
  {
    setId: 'set_sr_lmlt',
    setTitle: '[Love Me Like This] 6인 완전체 컬렉션',
    era: 'Love Me Like This',
    targetRarity: 'SR',
    packCode: 'OP-02',
    packId: 'op02',
    memberRarity: 'R',
    finishType: 'RAINBOW_FOIL',
    power: 6800,
    cost: 5,
    desc: 'Love Me Like This 찬란한 순간의 6명 멤버를 모두 모아 완성된 SR 세트 카드입니다.',
  },
  {
    setId: 'set_r_dice',
    setTitle: '[DICE] 6인 완전체 컬렉션',
    era: 'DICE',
    targetRarity: 'R',
    packCode: 'OP-01',
    packId: 'op01',
    memberRarity: 'UC',
    finishType: 'SILVER_STAMPING',
    power: 5200,
    cost: 4,
    desc: 'DICE 주사위를 굴려라! 6명 멤버를 모두 모아 완성된 은박 스탬핑 R 세트 카드입니다.',
  },
  {
    setId: 'set_r_oo',
    setTitle: '[O.O] 6인 완전체 컬렉션',
    era: 'O.O',
    targetRarity: 'R',
    packCode: 'OP-01',
    packId: 'op01',
    memberRarity: 'UC',
    finishType: 'SILVER_STAMPING',
    power: 5000,
    cost: 4,
    desc: '데뷔곡 O.O의 압도적 시작! 6명 멤버를 모두 모아 완성된 기념비적인 R 세트 카드입니다.',
  },
];

const cards = [];
const conceptSets = [];

// 4대 팩별로 150장씩 카드 생성
PACKS.forEach((pack, pIndex) => {
  const packCards = [];
  
  // 팩에 소속된 세트들 매핑
  const packSets = SET_SPECS.filter(s => s.packId === pack.id);

  // 1. 세트 멤버 카드 생성
  packSets.forEach(setSpec => {
    const setCardIds = [];
    SIX_MEMBERS.forEach((member, mIdx) => {
      const cardNum = pack.startNo + packCards.length;
      const numStr = String(cardNum).padStart(3, '0');
      const cardId = `nmixx_${numStr}`;
      setCardIds.push(cardId);

      packCards.push({
        id: cardId,
        member,
        era: setSpec.era,
        rarity: setSpec.memberRarity,
        isConceptSet: true,
        setId: setSpec.setId,
        setTitle: setSpec.setTitle,
      });
    });

    // 보상 카드 정의 (UR, SSR, SR, R)
    const rewardCardId = `reward_${setSpec.setId}`;
    const rewardCard = {
      id: rewardCardId,
      name: `[${setSpec.targetRarity} SET] ${setSpec.setTitle}`,
      member: 'NMIXX',
      category: 'LEADER',
      rarity: setSpec.targetRarity,
      finishType: setSpec.finishType,
      collectionNumber: 900 + conceptSets.length + 1,
      cost: setSpec.cost,
      power: setSpec.power,
      description: setSpec.desc,
      dustValue: setSpec.targetRarity === 'UR' ? 3000 : (setSpec.targetRarity === 'SSR' ? 1000 : (setSpec.targetRarity === 'SR' ? 300 : 100)),
      craftCost: null,
      theme: '엔믹스 6인 완전체',
      era: setSpec.era,
      gradient: 'from-pink-600 via-purple-600 to-amber-500',
      symbol: setSpec.targetRarity === 'UR' ? '💎' : (setSpec.targetRarity === 'SSR' ? '👑' : '✨'),
      quote: `우리가 모였을 때 비로소 완성되는 NMIXX CHANGE UP!`,
      image: `/cards/card_${String(pack.startNo).padStart(3, '0')}.jpg`,
      packCode: pack.code,
      packId: pack.id,
      setId: setSpec.setId,
      setTitle: setSpec.setTitle,
    };

    conceptSets.push({
      setId: setSpec.setId,
      setTitle: setSpec.setTitle,
      era: setSpec.era,
      packCode: setSpec.packCode,
      packId: setSpec.packId,
      cardIds: setCardIds,
      members: SIX_MEMBERS,
      rewardCard,
    });
  });

  // 2. 나머지 일반 멤버 카드 채우기 (각 멤버당 균등)
  const remainingPerMember = Math.floor((150 - packCards.length - 18) / 6);
  SIX_MEMBERS.forEach((member, mIdx) => {
    const memberRarities = [
      ...Array(10).fill('C'),
      ...Array(6).fill('UC'),
      ...Array(3).fill('R'),
      'SR'
    ];
    memberRarities.slice(0, remainingPerMember).forEach((rarity, rIdx) => {
      const cardNum = pack.startNo + packCards.length;
      const numStr = String(cardNum).padStart(3, '0');
      packCards.push({
        id: `nmixx_${numStr}`,
        member,
        era: SET_SPECS[(mIdx + rIdx) % SET_SPECS.length].era,
        rarity,
        isConceptSet: false,
        setId: null,
        setTitle: null,
      });
    });
  });

  // 3. NMIXX 스페셜 카드 (150장 정확히 맞추기)
  while (packCards.length < 150) {
    const nIdx = packCards.length;
    const cardNum = pack.startNo + nIdx;
    const numStr = String(cardNum).padStart(3, '0');
    const isSpecialSlot = (150 - packCards.length) <= 2;
    const specialRarity = pack.code === 'OP-04' ? 'MR' : (pack.code === 'OP-03' ? 'LR' : (pack.code === 'OP-02' ? 'UR' : 'SSR'));
    const r = isSpecialSlot ? specialRarity : (nIdx % 3 === 0 ? 'SR' : (nIdx % 2 === 0 ? 'R' : 'UC'));

    packCards.push({
      id: `nmixx_${numStr}`,
      member: 'NMIXX',
      era: SET_SPECS[nIdx % SET_SPECS.length].era,
      rarity: r,
      isConceptSet: false,
      setId: null,
      setTitle: null,
    });
  }

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

const tsContent = `import { Card, Rarity, ConceptSetCard } from '../types/card';

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
console.log('Successfully written src/data/cards.ts with 6 concept sets!');
