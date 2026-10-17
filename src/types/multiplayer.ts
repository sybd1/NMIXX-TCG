import { Rarity } from './card';

// 🏆 1. 글로벌 리더보드 항목 인터페이스
export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  avatarUrl: string;
  avatarMemberId: string;
  uniqueCardCount: number;
  collectionRate: number; // 0 ~ 100%
  totalPacksOpened: number;
  coins: number;
  hasXR: boolean;
  /** 카테고리 업적을 전부 달성한 항목. PACK_SETS, RARITY, SPENDING, PACKS */
  achievementBadges?: string[];
  rank?: number;
  updatedAt: any;
  /** 현재 도감 전체를 처음 채운 시각. 한 번 기록되면 갱신하지 않는다. */
  fullCollectionAt?: any;
}

// 📢 2. 실시간 고등급 획득 전광판 피드 항목 인터페이스
export interface GlobalPullFeedItem {
  id: string;
  uid: string;
  userName: string;
  cardId: string;
  cardName: string;
  rarity: Rarity;
  member: string;
  image: string;
  timestamp: number;
}

// 🎁 3. 우편함 항목 인터페이스
export interface MailItem {
  id: string;
  title: string;
  content: string;
  sender: string;
  coinsReward: number;
  dustReward?: number;
  isClaimed: boolean;
  createdAt: number;
  expiresAt?: number;
}

// 🎫 4. 쿠폰 인터페이스
export interface CouponDefinition {
  code: string;
  coinsReward: number;
  dustReward?: number;
  description: string;
}

// 🔄 5. 중복 카드 1:1 교환소 항목 인터페이스
export interface CardTradeListing {
  id: string;
  sellerUid: string;
  sellerName: string;
  sellerAvatar: string;
  offeredCardId: string;
  offeredCardName: string;
  offeredRarity: Rarity;
  offeredImage: string;
  offeredMember: string;
  wantedCardId: string;
  wantedCardName: string;
  wantedRarity: Rarity;
  status: 'OPEN' | 'COMPLETED' | 'CANCELLED';
  buyerUid?: string;
  buyerName?: string;
  createdAt: number;
  completedAt?: number;
}
