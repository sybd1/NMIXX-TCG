import fs from 'fs';
import path from 'path';

const cardsTsPath = path.join(process.cwd(), 'src', 'data', 'cards.ts');
const cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const currentCards = JSON.parse(masterMatch[1]);
console.log('Current Cards Count:', currentCards.length);

// 741번째 XR 카드 정의
const xrCard = {
  id: 'card_xr_transcendent_park_741',
  collectionNumber: 741,
  name: '[XR] Transcendent - 박진영',
  member: 'PARK',
  category: 'CHARACTER',
  rarity: 'XR',
  cost: 0,
  power: 0,
  description: '740종의 모든 NMIXX 카드를 정복한 전설의 마스터에게만 허락되는 유일무이한 궁극의 초월 카드입니다.',
  dustValue: 50000,
  craftCost: null,
  theme: 'TRANSCENDENT',
  era: 'JYP NATION',
  gradient: 'from-rose-600 via-purple-700 to-amber-500',
  symbol: '👑',
  quote: '가장 완벽한 올라운더, NMIXX의 시작과 끝.',
  image: '/XR-park.jpg',
  packCode: 'XR-SPECIAL',
  packId: 'xr_special',
  packName: '초월 컬렉션 특전',
  setId: null,
  setTitle: null,
  finishType: 'TRANSCENDENT_COSMIC',
  isSpecialEdition: true,
};

// 기존 740장에 XR 추가 (중복 방지)
const filteredCards = currentCards.filter(c => c.id !== xrCard.id);
const totalUpdatedCards = [...filteredCards, xrCard];
console.log('New Total Master Cards Count:', totalUpdatedCards.length);

const newMasterJson = JSON.stringify(totalUpdatedCards, null, 2);
const updatedCardsTs = cardsTs.replace(
  /export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/,
  `export const MASTER_CARDS: Card[] = ${newMasterJson};\n\nexport const CONCEPT_SETS`
);

fs.writeFileSync(cardsTsPath, updatedCardsTs, 'utf8');
console.log('Successfully updated src/data/cards.ts with XR card (Total:', totalUpdatedCards.length, ')!');
