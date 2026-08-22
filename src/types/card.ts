// 8단계 희귀도 (Rarity) 정의: C, UC, R, SR, SSR, UR, LR, MR
export type Rarity = 'C' | 'UC' | 'R' | 'SR' | 'SSR' | 'UR' | 'LR' | 'MR';

// 8단계 카드 반짝임/가공 (Foil & Finish System)
export type FinishType =
  | 'MATTE'            // C (50.00%) - 무광 / 노멀
  | 'GLOSSY'           // UC (30.00%) - 유광 표면 반사
  | 'SILVER_STAMPING'  // R (15.00%) - 은박 스탬핑 메탈릭 라인
  | 'RAINBOW_FOIL'     // SR (4.00%) - 레인보우 홀로그래픽 포일
  | 'SHATTERED_GLASS'  // SSR (0.50%) - 크랙 / 파편 굴절 이펙트
  | 'PRISM_GLITTER'    // UR (0.30%) - 프리즘 글리터 별빛 굴절
  | 'TEXTURE_GOLD'     // LR (0.15%) - 금박 엠보싱 양각 텍스처
  | 'COSMIC_GHOST';    // MR (0.05%) - 코스믹 오로라 최상위 셰이더

export type NmixxMember = 'LILY' | 'HAEWON' | 'SULLYOON' | 'BAE' | 'JIWOO' | 'KYUJIN' | 'NMIXX';

export type CardCategory = 'LEADER' | 'CHARACTER' | 'STAGE' | 'EVENT';

export interface Card {
  id: string;
  name: string;
  member: NmixxMember;
  category: CardCategory;
  rarity: Rarity;
  finishType?: FinishType; // 8단계 가공 피니시 (기본값 MATTE)
  collectionNumber: number; // 1 to 600
  cost: number;
  power: number;
  description: string;
  dustValue: number;
  craftCost: number | null;
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
