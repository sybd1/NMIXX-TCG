import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const cardsTsPath = path.join(ROOT_DIR, 'src', 'data', 'cards.ts');
const cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

const setsMatch = cardsTs.match(/export const CONCEPT_SETS: ConceptSetCard\[\] = (\[[\s\S]*?\]);\n\nexport const CARDS_DATA/);
const sets = JSON.parse(setsMatch[1]);

const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const masterCards = JSON.parse(masterMatch[1]);

const EXACT_SET_NAMES = {
  'set_r_flower': 'Flower 세트 카드',
  'set_sr_light': 'Light 세트 카드',
  'set_r_school': 'School 세트 카드',
  'set_ssr_nmixx': 'NMIXX 세트 카드',
  'set_sr_blue_valentine': 'Blue Valentine 세트 카드',
  'set_ur_zero_frontier': 'ZERO FRONTIER 세트 카드',
};

// 1. CONCEPT_SETS 및 rewardCard.name 완벽 수정
sets.forEach(set => {
  const exactName = EXACT_SET_NAMES[set.setId];
  set.setTitle = exactName;
  set.rewardCard.setTitle = exactName;
  set.rewardCard.name = exactName; // '[R SET]' 등의 접두사 완전 제거하고 순수 'Flower 세트 카드'로 설정!
});

// 2. MASTER_CARDS의 모든 세트 카드 setTitle 일치
masterCards.forEach(card => {
  if (card.setId && EXACT_SET_NAMES[card.setId]) {
    card.setTitle = EXACT_SET_NAMES[card.setId];
  }
});

console.log('CONCEPT_SETS updated:');
sets.forEach(s => console.log('  -', s.setId, '-> setTitle:', s.setTitle, '| rewardCard.name:', s.rewardCard.name));

const tsContent = `import { Card, Rarity, ConceptSetCard } from '../types/card';

export const MASTER_CARDS: Card[] = ${JSON.stringify(masterCards, null, 2)};

export const CONCEPT_SETS: ConceptSetCard[] = ${JSON.stringify(sets, null, 2)};

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
console.log('Successfully updated src/data/cards.ts!');
