import { Card, ConceptSetCard, Rarity } from '../types/card';
import op01 from './card-data/op01.json';
import op02 from './card-data/op02.json';
import op03 from './card-data/op03.json';
import op04 from './card-data/op04.json';
import op05 from './card-data/op05.json';
import special from './card-data/special.json';
import sets from './card-data/sets.json';

export { BACKUP_FUTURE_CARDS as LEGACY_CARDS } from './backup_cards_nx06_future';

// 6개 카드팩 및 스페셜/보상 카드 데이터 병합
export const MASTER_CARDS: Card[] = [
  ...(op01 as Card[]),
  ...(op02 as Card[]),
  ...(op03 as Card[]),
  ...(op04 as Card[]),
  ...(op05 as Card[]),
  ...(special as Card[])
];

export const CONCEPT_SETS: ConceptSetCard[] = sets as ConceptSetCard[];

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
