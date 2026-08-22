import fs from 'fs';
import path from 'path';

const cardsTsPath = path.join(process.cwd(), 'src', 'data', 'cards.ts');
const cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

// 1. 기존 MASTER_CARDS 파싱
const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const currentCards = JSON.parse(masterMatch[1]);
console.log('Current Cards Count:', currentCards.length);

// 2. 미사용 이미지 파일 목록 수집
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
  LILY: '우리의 목소리가 온 우주에 울려 퍼질 때까지!',
  HAEWON: '엔믹스와 엔써가 함께라면 어디든 정점이야.',
  SULLYOON: '별빛처럼 영원히 반짝이는 우리의 무대.',
  BAE: '멈추지 않는 에너지로 세상을 뒤흔들 거야!',
  JIWOO: '리듬을 타고 끝없이 질주하는 파동!',
  KYUJIN: '가장 화려하게 피어나는 우리의 클라이맥스!',
  NMIXX: 'NMIXX CHANGE UP! Let’s roll the dice!',
};

const PACKS = [
  { id: 'op01', code: 'OP-01', name: '1탄 계승되는 의지', era: 'ROMANCE DAWN' },
  { id: 'op02', code: 'OP-02', name: '2탄 정점결전', era: 'PARAMOUNT WAR' },
  { id: 'op03', code: 'OP-03', name: '3탄 Blue Valentine', era: 'BLUE VALENTINE' },
  { id: 'op04', code: 'OP-04', name: '4탄 ZERO FRONTIER', era: 'ZERO FRONTIER' },
];

const SPECIAL_TIERS = [
  {
    rarity: 'MR',
    prefix: '[Cosmic Aurora]',
    finishType: 'COSMIC_GHOST',
    gradient: 'from-amber-500 via-pink-600 to-cyan-500',
    desc: '3단계 패럴랙스 3D 뎁스와 마우스 틸트 코스믹 오로라 셰이더, 금빛 라이브 파티클이 적용된 최고 등급 신화 카드입니다.',
  },
  {
    rarity: 'LR',
    prefix: '[Texture Gold]',
    finishType: 'TEXTURE_GOLD',
    gradient: 'from-amber-400 via-yellow-500 to-amber-700',
    desc: '24K 순금 엠보싱 텍스처와 입체 양각 포일 가공이 들어간 전설의 황금 카드입니다.',
  },
  {
    rarity: 'UR',
    prefix: '[Prism Glitter]',
    finishType: 'PRISM_GLITTER',
    gradient: 'from-rose-500 via-pink-500 to-amber-400',
    desc: '영롱한 다이아몬드 별빛 프리즘 굴절과 은은한 엔믹스 멜로디가 울려 퍼지는 극희귀 카드입니다.',
  },
  {
    rarity: 'SSR',
    prefix: '[Shattered Crystal]',
    finishType: 'SHATTERED_GLASS',
    gradient: 'from-purple-500 via-pink-500 to-indigo-500',
    desc: '빛의 각도에 따라 찬란하게 반사되는 크리스탈 유리 파편 크랙 피니시가 적용된 특급 희귀 카드입니다.',
  },
  {
    rarity: 'SR',
    prefix: '[Rainbow Holo]',
    finishType: 'RAINBOW_FOIL',
    gradient: 'from-blue-500 via-purple-500 to-pink-500',
    desc: '무지개빛 스펙트럼 포일과 3D 라이브 이펙트가 들어간 초희귀 스페셜 패러렐 카드입니다.',
  },
];

let imgIdx = 0;
let nextColNum = currentCards.length + 1;
const newSpecialCards = [];

PACKS.forEach(pack => {
  SPECIAL_TIERS.forEach(tier => {
    MEMBERS.forEach(mem => {
      const imgPath = '/' + (unusedCardFiles[imgIdx] || currentCards[(nextColNum * 7) % currentCards.length].image.replace(/^\//, ''));
      imgIdx = (imgIdx + 1) % unusedCardFiles.length;

      const cardName = `${tier.prefix} ${MEMBER_NAMES_KO[mem]}`;
      const newCard = {
        id: `card_sp_${tier.rarity.toLowerCase()}_${pack.id}_${mem.toLowerCase()}_${nextColNum}`,
        collectionNumber: nextColNum,
        name: cardName,
        rarity: tier.rarity,
        member: mem,
        era: pack.era,
        image: imgPath,
        packId: pack.id,
        packCode: pack.code,
        packName: pack.name,
        quote: MEMBER_QUOTES[mem],
        description: tier.desc,
        gradient: tier.gradient,
        finishType: tier.finishType,
        isSpecialEdition: true,
      };

      newSpecialCards.push(newCard);
      nextColNum++;
    });
  });
});

console.log('Generated Special Cards Count:', newSpecialCards.length);
const totalUpdatedCards = [...currentCards, ...newSpecialCards];
console.log('New Total Master Cards Count:', totalUpdatedCards.length);

// 3. cards.ts 내용 갱신
const newMasterJson = JSON.stringify(totalUpdatedCards, null, 2);
const updatedCardsTs = cardsTs.replace(
  /export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/,
  `export const MASTER_CARDS: Card[] = ${newMasterJson};\n\nexport const CONCEPT_SETS`
);

fs.writeFileSync(cardsTsPath, updatedCardsTs, 'utf8');
console.log('Successfully updated src/data/cards.ts with', totalUpdatedCards.length, 'cards!');
