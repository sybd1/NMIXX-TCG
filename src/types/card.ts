// 8단계 희귀도 (Rarity) 정의: C, UC, R, SR, SSR, UR, LR, MR
export type Rarity = 'C' | 'UC' | 'R' | 'SR' | 'SSR' | 'UR' | 'LR' | 'MR';

export type NmixxMember = 'LILY' | 'HAEWON' | 'SULLYOON' | 'BAE' | 'JIWOO' | 'KYUJIN' | 'NMIXX';

export type CardCategory = 'LEADER' | 'CHARACTER' | 'STAGE' | 'EVENT';

export interface Card {
  id: string;
  name: string;
  member: NmixxMember;
  category: CardCategory;
  rarity: Rarity;
  collectionNumber: number; // 1 to 60
  cost: number;
  power: number;
  description: string;
  dustValue: number;
  craftCost: number | null; // null for SECRET
  theme: string;
  era: string; // O.O, DICE, Love Me Like This, Dash, See that?, Fe3O4 등
  gradient: string;
  symbol: string;
  quote?: string;
  image?: string;
}

export interface RevealedCard extends Card {
  instanceId: string;
  isNew: boolean;
  duplicateCount: number;
  isFlipped: boolean;
}
