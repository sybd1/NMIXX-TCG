import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const cardsTsPath = path.join(ROOT_DIR, 'src', 'data', 'cards.ts');
const cardsTs = fs.readFileSync(cardsTsPath, 'utf8');

const setsMatch = cardsTs.match(/export const CONCEPT_SETS: ConceptSetCard\[\] = (\[[\s\S]*?\]);\n\nexport const CARDS_DATA/);
const sets = JSON.parse(setsMatch[1]);

const masterMatch = cardsTs.match(/export const MASTER_CARDS: Card\[\] = (\[[\s\S]*?\]);\n\nexport const CONCEPT_SETS/);
const masterCards = JSON.parse(masterMatch[1]);

const REWARD_COINS_MAP = {
  'set_ur_zero_frontier': 50_000_000, // UR: 5천만 머니
  'set_ssr_nmixx': 5_000_000,         // SSR: 500만 머니
  'set_sr_light': 500_000,            // SR: 50만 머니
  'set_sr_blue_valentine': 500_000,   // SR: 50만 머니
  'set_r_flower': 100_000,            // R: 10만 머니
  'set_r_school': 100_000,            // R: 10만 머니
};

sets.forEach(set => {
  set.rewardCoins = REWARD_COINS_MAP[set.setId] || 100_000;
});

console.log('Set Reward Coins:');
sets.forEach(s => {
  console.log(`  - [${s.rewardCard.rarity}] ${s.setTitle}: +${s.rewardCoins.toLocaleString()} COIN`);
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
console.log('Successfully written updated rewardCoins to src/data/cards.ts!');
