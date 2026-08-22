import fs from 'fs';
import path from 'path';

const cardsTsPath = path.join(process.cwd(), 'src', 'data', 'cards.ts');
const cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const currentCards = JSON.parse(masterMatch[1]);
console.log('Current Cards Count:', currentCards.length);

// 1. 기존 XR 카드 분리
const xrCard = currentCards.find(c => c.rarity === 'XR');
const baseAndSpCards = currentCards.filter(c => c.rarity !== 'XR');
console.log('Base + 1st Special Cards Count:', baseAndSpCards.length);

// 2. 미사용 이미지 목록 확보
const usedImages = new Set(currentCards.map(c => c.image.replace(/^\//, '')));
const cardsDir = path.join(process.cwd(), 'public', 'cards');
const allCardFiles = fs.readdirSync(cardsDir).map(f => 'cards/' + f);
const unusedCardFiles = allCardFiles.filter(f => !usedImages.has(f));
console.log('Available unused images:', unusedCardFiles.length);

const MEMBERS = ['LILY', 'HAEWON', 'SULLYOON', 'BAE', 'JIWOO', 'KYUJIN', 'NMIXX'];
const MEMBER_NAMES_KO = {
  LILY: '릴리',
  HAEWON: '해원',
  SULLYOON: '설윤',
  BAE: '배이',
  JIWOO: '지우',
  KYUJIN: '규진',
  NMIXX: 'NMIXX',
};

const MEMBER_QUOTES = {
  LILY: '우리의 울림은 언제나 정점을 향해 피어나.',
  HAEWON: '두려움 없이 엔써와 함께 가장 높은 곳으로!',
  SULLYOON: '빛의 굴절 속에서 영원히 간직될 순간.',
  BAE: '멈추지 않는 파동, 우리만의 리듬으로 온 세상을 뒤흔들자!',
  JIWOO: '모든 프레임을 뚫고 나오는 독보적인 에너지!',
  KYUJIN: '시작부터 클라이맥스까지, 완벽한 올라운더!',
  NMIXX: 'MIXX POP! 어디에서도 본 적 없는 새로운 세계로!',
};

const PACKS = [
  { id: 'op01', code: 'OP-01', name: '1탄 계승되는 의지', era: 'ROMANCE DAWN' },
  { id: 'op02', code: 'OP-02', name: '2탄 정점결전', era: 'PARAMOUNT WAR' },
  { id: 'op03', code: 'OP-03', name: '3탄 Blue Valentine', era: 'BLUE VALENTINE' },
  { id: 'op04', code: 'OP-04', name: '4탄 ZERO FRONTIER', era: 'ZERO FRONTIER' },
];

const EMBOSSED_TIERS = [
  {
    rarity: 'MR',
    prefix: '[3D Cosmic Mythic]',
    finishType: 'COSMIC_GHOST',
    gradient: 'from-cyan-500 via-pink-600 to-amber-400',
    desc: '3D 듀얼 코스믹 오로라 입체 양각 테두리와 4단계 초강력 패럴랙스 뎁스가 적용된 최고 등급 신화 카드입니다.',
    dustValue: 12000,
  },
  {
    rarity: 'LR',
    prefix: '[3D 24K Gold Relic]',
    finishType: 'TEXTURE_GOLD',
    gradient: 'from-amber-300 via-yellow-500 to-yellow-800',
    desc: '24K 순금 3D 조각 엠보싱 볼록 양각 테두리와 골드 텍스처 광택이 빛나는 전설의 황금 카드입니다.',
    dustValue: 5000,
  },
  {
    rarity: 'UR',
    prefix: '[3D Prism Crystal]',
    finishType: 'PRISM_GLITTER',
    gradient: 'from-rose-500 via-purple-600 to-amber-300',
    desc: '다이아몬드 커팅 3D 프리즘 베벨 양각 테두리와 별빛 굴절 셰이더가 조화를 이루는 극희귀 카드입니다.',
    dustValue: 2000,
  },
  {
    rarity: 'SSR',
    prefix: '[3D Shattered Gem]',
    finishType: 'SHATTERED_GLASS',
    gradient: 'from-amber-500 via-pink-600 to-indigo-600',
    desc: '크리스탈 보석 파편 3D 입체 양각 베벨 테두리와 각도별 굴절광이 살아있는 특급 희귀 카드입니다.',
    dustValue: 600,
  },
  {
    rarity: 'SR',
    prefix: '[3D Rainbow Holo]',
    finishType: 'RAINBOW_FOIL',
    gradient: 'from-purple-500 via-indigo-600 to-pink-500',
    desc: '무지개빛 메탈릭 3D 엠보싱 테두리와 깊은 패럴랙스 3D 팝업이 들어간 초희귀 카드입니다.',
    dustValue: 150,
  },
];

let imgIdx = 0;
let nextColNum = baseAndSpCards.length + 1;
const newEmbossedCards = [];

PACKS.forEach(pack => {
  EMBOSSED_TIERS.forEach(tier => {
    MEMBERS.forEach(mem => {
      const imgPath = '/' + (unusedCardFiles[imgIdx] || baseAndSpCards[(nextColNum * 11) % baseAndSpCards.length].image.replace(/^\//, ''));
      imgIdx = (imgIdx + 1) % unusedCardFiles.length;

      const cardName = `${tier.prefix} ${MEMBER_NAMES_KO[mem]}`;
      const newCard = {
        id: `card_emb_${tier.rarity.toLowerCase()}_${pack.id}_${mem.toLowerCase()}_${nextColNum}`,
        collectionNumber: nextColNum,
        name: cardName,
        member: mem,
        category: 'CHARACTER',
        rarity: tier.rarity,
        cost: 0,
        power: 0,
        description: tier.desc,
        dustValue: tier.dustValue,
        craftCost: null,
        theme: '3D EMBOSSED PARALLAX',
        era: pack.era,
        gradient: tier.gradient,
        symbol: '✨',
        quote: MEMBER_QUOTES[mem],
        image: imgPath,
        packCode: pack.code,
        packId: pack.id,
        packName: pack.name,
        setId: null,
        setTitle: null,
        finishType: tier.finishType,
        isSpecialEdition: true,
        isEmbossed3D: true,
      };

      newEmbossedCards.push(newCard);
      nextColNum++;
    });
  });
});

console.log('Generated 3D Embossed Parallax Cards Count:', newEmbossedCards.length);

// XR 카드를 맨 마지막 번호로 재부여
const finalXrCard = {
  ...xrCard,
  collectionNumber: nextColNum,
  description: `${baseAndSpCards.length + newEmbossedCards.length}종의 모든 NMIXX 카드를 정복한 전설의 마스터에게만 허락되는 유일무이한 궁극의 초월 카드입니다.`,
};

const totalUpdatedCards = [...baseAndSpCards, ...newEmbossedCards, finalXrCard];
console.log('New Total Master Cards Count:', totalUpdatedCards.length, '(Base+SP+Emb:', baseAndSpCards.length + newEmbossedCards.length, '+ XR: 1)');

// cards.ts 내용 갱신
const newMasterJson = JSON.stringify(totalUpdatedCards, null, 2);
const updatedCardsTs = cardsTs.replace(
  /export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/,
  `export const MASTER_CARDS: Card[] = ${newMasterJson};\n\nexport const CONCEPT_SETS`
);

fs.writeFileSync(cardsTsPath, updatedCardsTs, 'utf8');
console.log('Successfully updated src/data/cards.ts with', totalUpdatedCards.length, 'cards!');
