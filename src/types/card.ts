// 9단계 희귀도 (Rarity) 정의: C, UC, R, SR, SSR, UR, LR, MR, XR (초월)
export type Rarity = 'C' | 'UC' | 'R' | 'SR' | 'SSR' | 'UR' | 'LR' | 'MR' | 'XR';

// 9단계 카드 반짝임/가공 (Foil & Finish System)
export type FinishType =
  | 'MATTE'                // C (51.66%) - 무광 / 노멀
  | 'GLOSSY'               // UC (30.00%) - 유광 표면 반사
  | 'SILVER_STAMPING'      // R (15.00%) - 은박 스탬핑 메탈릭 라인
  | 'RAINBOW_FOIL'         // SR (2.50%) - 레인보우 홀로그래픽 포일
  | 'SHATTERED_GLASS'      // SSR (0.45%) - 크랙 / 파편 굴절 이펙트
  | 'PRISM_GLITTER'        // UR (0.25%) - 프리즘 글리터 별빛 굴절
  | 'TEXTURE_GOLD'         // LR (0.12%) - 금박 엠보싱 양각 텍스처
  | 'COSMIC_GHOST'         // MR (0.02%) - 코스믹 오로라 최상위 셰이더
  | 'TRANSCENDENT_COSMIC'; // XR (초월) - 올 컬렉션 마스터 전용 초월 셰이더

export type NmixxMember = 'LILY' | 'HAEWON' | 'SULLYOON' | 'BAE' | 'JIWOO' | 'KYUJIN' | 'NMIXX' | 'PARK';

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
  packCode?: string; // NX-01, NX-02, NX-03, NX-04 (NX - 1 ~ NX - 4)
  packId?: string; // op01, op02, op03, op04
  packName?: string; // 1탄 계승되는 의지, 2탄 정점결전 등
  setId?: string | null; // 동일 컨셉 6인 세트 ID (예: set_op01_dice)
  setTitle?: string | null; // 세트 명칭 (예: [DICE] 6인 완전체 컬렉션)
  isSpecialEdition?: boolean; // 고등급 스페셜 후가공 에디션 여부
  isEmbossed3D?: boolean; // 3D 양각 테두리 및 깊이감 있는 패럴랙스 입체 뎁스 여부
  isLegacy?: boolean; // 구버전 한정판 소장용 레거시 카드 여부
}

export interface RevealedCard extends Card {
  instanceId: string;
  isNew: boolean;
  duplicateCount: number;
  isFlipped: boolean;
}

// 똑같은 컨셉의 카드가 6인 멤버별로 모였을 때 완성되는 SSR 세트 카드
export interface ConceptSetCard {
  setId: string;
  setTitle: string;
  era: string;
  packCode: string;
  packId: string;
  packName?: string;
  rewardCoins: number; // 세트 완성 시 지급되는 게임머니 (예: UR 5천만, R 10만 등)
  cardIds: string[]; // 6명의 멤버 카드 ID 목록 (LILY, HAEWON, SULLYOON, BAE, JIWOO, KYUJIN)
  members: NmixxMember[];
  rewardCard: Card;
}
