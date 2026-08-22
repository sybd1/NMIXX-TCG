import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const cardsTsPath = path.join(ROOT_DIR, 'src', 'data', 'cards.ts');
const cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

const setsMatch = cardsTs.match(/export const CONCEPT_SETS: ConceptSetCard\[\] = (\[[\s\S]*?\]);\n\nexport const CARDS_DATA/);
const sets = JSON.parse(setsMatch[1]);

const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const masterCards = JSON.parse(masterMatch[1]);

// 등급 가중치 (높은 등급 우선: UR > SSR > SR > R)
const RARITY_WEIGHT = {
  MR: 8,
  LR: 7,
  UR: 6,
  SSR: 5,
  SR: 4,
  R: 3,
  UC: 2,
  C: 1,
};

// 등급별 내림차순 정렬 (UR -> SSR -> SR -> R)
sets.sort((a, b) => {
  const weightA = RARITY_WEIGHT[a.rewardCard.rarity] || 0;
  const weightB = RARITY_WEIGHT[b.rewardCard.rarity] || 0;
  if (weightB !== weightA) return weightB - weightA;
  return a.packCode.localeCompare(b.packCode);
});

console.log('Sorted Sets by Rarity:');
sets.forEach((s, idx) => {
  console.log(`  ${idx + 1}. [${s.rewardCard.rarity} SET] ${s.setTitle} (${s.packCode})`);
});

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
console.log('Successfully written rarity-sorted CONCEPT_SETS to src/data/cards.ts!');
