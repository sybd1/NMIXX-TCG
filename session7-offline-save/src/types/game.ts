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
  lastDailyBonus: string | null; // YYYY-MM-DD (KST)
  lastMailClaimDate: string | null; // YYYY-MM-DD (KST) - 우편 일일 1회 수령 날짜
  packHistory: PackHistoryItem[];
  openedPacksTotal: number;
  coinsSpentTotal?: number;
  soundMuted: boolean;
  isFirstVisit: boolean;
  claimedSetRewards?: string[];
  claimedAchievements?: string[];
  claimedMailIds?: string[];
  claimedCouponCodes?: string[];
  coinReset_v16?: boolean;
  hasClaimedMmuEasterEgg?: boolean;
}
