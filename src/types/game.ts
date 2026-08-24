import { Card, Rarity } from './card';

export type NavTab = 'home' | 'collection' | 'achievements' | 'ranking' | 'settings' | 'patch-notes';

export type PackOpeningState = 
  | 'IDLE' 
  | 'DIM_BG' 
  | 'PACK_ENTER' 
  | 'PACK_SHAKE' 
  | 'PACK_GLOW' 
  | 'PACK_TEAR' 
  | 'SHOWCASE'
  | 'CARDS_DEALT' 
  | 'REVEALING' 
  | 'SECRET_CINEMATIC' 
  | 'SUMMARY';

export interface PackHistoryItem {
  id: string;
  timestamp: number;
  packName: string;
  cards: Card[];
  highestRarity: Rarity;
  hasMR?: boolean;
  hasLR?: boolean;
  hasUR?: boolean;
  hasSSR?: boolean;
}

export interface GameState {
  coins: number;
  dust: number;
  collection: Record<string, number>; // cardId -> count
  pityCount: number; // Current packs without Legendary+
  lastDailyBonus: string | null; // YYYY-MM-DD
  packHistory: PackHistoryItem[];
  openedPacksTotal: number;
  coinsSpentTotal?: number; // 누적 소비 골드/코인
  soundMuted: boolean;
  isFirstVisit: boolean;
  claimedSetRewards?: string[]; // 이미 머니 보상을 수령한 세트 ID 목록
  claimedAchievements?: string[]; // 이미 보상을 수령한 업적 ID 목록
  claimedMailIds?: string[]; // 이미 수령한 우편 ID 목록
  claimedCouponCodes?: string[]; // 이미 사용한 쿠폰 코드 목록
  coinReset_v16?: boolean; // v1.6.0 전 유저 100만원 초기화 적용 플래그
  hasClaimedMmuEasterEgg?: boolean; // MMU 우주선 50만 N COIN 이스터에그 수령 여부 (계정당 1회)
}
