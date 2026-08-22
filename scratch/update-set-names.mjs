import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const cardsTsPath = path.join(ROOT_DIR, 'src', 'data', 'cards.ts');
const cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

const setsMatch = cardsTs.match(/export const CONCEPT_SETS: ConceptSetCard\[\] = (\[[\s\S]*?\]);\n\nexport const CARDS_DATA/);
const sets = JSON.parse(setsMatch[1]);

const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const masterCards = JSON.parse(masterMatch[1]);

// 세트 이름 변경 규칙
// [Flower] NMIXX 세트 카드 -> Flower 세트 카드
// [Light] NMIXX 세트 카드 -> Light 세트 카드
// [School] NMIXX 세트 카드 -> School 세트 카드
// [NMIXX] NMIXX 세트 카드 -> NMIXX 세트 카드
// [Blue Valentine] NMIXX 세트 카드 -> Blue Valentine 세트 카드
// [ZERO FRONTIER] NMIXX 세트 카드 -> ZERO FRONTIER 세트 카드

const NAME_MAP = {
  'set_r_flower': 'Flower 세트 카드',
  'set_sr_light': 'Light 세트 카드',
  'set_r_school': 'School 세트 카드',
  'set_ssr_nmixx': 'NMIXX 세트 카드',
  'set_sr_blue_valentine': 'Blue Valentine 세트 카드',
  'set_ur_zero_frontier': 'ZERO FRONTIER 세트 카드',
};

// 1. CONCEPT_SETS 업데이트
sets.forEach(set => {
  const newTitle = NAME_MAP[set.setId] || set.setTitle.replace(/\[(.*?)\] NMIXX 세트 카드/, '$1 세트 카드');
  set.setTitle = newTitle;
  set.rewardCard.setTitle = newTitle;
  set.rewardCard.name = `[${set.rewardCard.rarity} SET] ${newTitle}`;
});

// 2. MASTER_CARDS 업데이트
masterCards.forEach(card => {
  if (card.setId && NAME_MAP[card.setId]) {
    card.setTitle = NAME_MAP[card.setId];
  }
});

console.log('Updated Concept Sets:');
sets.forEach(s => console.log('  -', s.setId, '->', s.setTitle, '| Reward:', s.rewardCard.name));

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
console.log('Successfully written updated set names to src/data/cards.ts!');
