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
  /** 카드별 이스터에그 수령일 (YYYY-MM-DD, KST). 카드당 하루 한 번 */
  cardEasterEggClaims?: Record<string, string>;
  /**
   * 이 기기에서 진행이 마지막으로 바뀐 시각(epoch ms). 클라우드에서 받은 상태면 클라우드 lastSavedAt.
   * 진행 필드가 바뀔 때만 갱신한다. 없으면 기능 023 이전 저장본 (specs/023 REQ-05, DEC-029)
   */
  localSavedAt?: number;
}
