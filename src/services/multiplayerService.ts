import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { UserAccount } from '../types/auth';
import { Card } from '../types/card';
import {
  LeaderboardEntry,
  GlobalPullFeedItem,
  MailItem,
  CouponDefinition,
  CardTradeListing,
} from '../types/multiplayer';

// 🎁 기본 시스템 공식 우편 목록
const DEFAULT_GLOBAL_MAILS: MailItem[] = [
  {
    id: 'mail_welcome_2026',
    title: '🎉 NMIXX TCG 공식 클라우드 서버 오픈 기념!',
    content: '엔믹스 TCG 정식 글로벌 서버 연동을 축하합니다! 모든 엔써(NSWER) 여러분께 특별 지원금 1,000,000 코인(100만원)을 지급합니다. - 운영자 드림',
    sender: '운영자',
    coinsReward: 1000000,
    dustReward: 5000,
    isClaimed: false,
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'mail_fe3o4_celebration',
    title: '✨ Fe3O4: FORWARD 팩 출시 기념 특별 보급품',
    content: '신규 카드팩 출시를 기념하여 무료 카드팩을 개봉할 수 있는 보너스 50,000 코인을 드립니다! - 운영자 드림',
    sender: '운영자',
    coinsReward: 50000,
    dustReward: 100,
    isClaimed: false,
    createdAt: Date.now() - 3600000 * 12,
  },
  {
    id: 'mail_daily_support',
    title: '💖 데일리 엔써 응원 상자',
    content: '오늘도 엔믹스와 함께 즐거운 카드 수집 되세요! 파이팅! - 운영자 드림',
    sender: '운영자',
    coinsReward: 10000,
    isClaimed: false,
    createdAt: Date.now() - 3600000 * 24,
  },
];

// 🎫 기본 활성화 쿠폰 목록
const VALID_COUPONS: Record<string, CouponDefinition> = {
  NMIXX2026: {
    code: 'NMIXX2026',
    coinsReward: 30000,
    dustReward: 300,
    description: '2026 NMIXX 공식 웰컴 쿠폰',
  },
  FE3O4_FORWARD: {
    code: 'FE3O4_FORWARD',
    coinsReward: 20000,
    dustReward: 200,
    description: 'Fe3O4: FORWARD 컴백 기념 쿠폰',
  },
  WELCOME_NSWER: {
    code: 'WELCOME_NSWER',
    coinsReward: 10000,
    description: '신규 엔써 환영 특별 보급품',
  },
  PARK_XR_GOD: {
    code: 'PARK_XR_GOD',
    coinsReward: 50000,
    dustReward: 1000,
    description: '초월자 박진영의 축복 쿠폰',
  },
  SECRET_NSWER_100M: {
    code: 'SECRET_NSWER_100M',
    coinsReward: 100000000,
    dustReward: 0,
    description: '평생 엔써의 맹세 (1억 N COIN 특별 보급금)',
  },
};

export class MultiplayerService {
  // ---------------------------------------------------------------------------
  // 🏆 1. 글로벌 리더보드
  // ---------------------------------------------------------------------------
  public static async fetchLeaderboard(limitCount = 50, currentUserId?: string): Promise<LeaderboardEntry[]> {
    if (!isFirebaseConfigured || !db) {
      return this.getMockLeaderboard();
    }

    try {
      const q = query(
        collection(db, 'nmixx_tcg_leaderboard'),
        orderBy('uniqueCardCount', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return this.getMockLeaderboard();
      }

      const entries: LeaderboardEntry[] = [];
      let rank = 1;
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as LeaderboardEntry;
        const uid = docSnap.id || data.uid;

        // 🗑️ 과거 테스트 계정 식별 (GM, 카카오_엔써_..., 중복 구버전 운영자 등)
        const isOldTest =
          !uid ||
          uid === 'guest' ||
          uid.startsWith('mock_') ||
          uid.startsWith('user_mock_') ||
          data.displayName === 'GM' ||
          data.displayName?.startsWith('카카오_엔써_') ||
          (data.displayName === '운영자' && currentUserId && uid !== currentUserId);

        if (isOldTest) {
          // Firebase Firestore에서 해당 테스트 계정 영구 삭제
          deleteDoc(doc(db!, 'nmixx_tcg_leaderboard', uid)).catch(() => {});
          deleteDoc(doc(db!, 'nmixx_tcg_users', uid)).catch(() => {});
          return;
        }

        entries.push({
          ...data,
          uid,
          rank: rank++,
        });
      });

      return entries;
    } catch (error) {
      console.warn('[Multiplayer] Failed to fetch leaderboard, fallback:', error);
      return this.getMockLeaderboard();
    }
  }

  public static async updateLeaderboardEntry(
    user: UserAccount,
    stats: {
      uniqueCardCount: number;
      collectionRate: number;
      totalPacksOpened: number;
      coins: number;
      hasXR: boolean;
    }
  ): Promise<void> {
    // 🛡️ 게스트는 랭킹에 등록되지 않으며, 소셜 계정 연동 유저만 랭킹 등록
    if (!isFirebaseConfigured || !db || !user?.id || user.id === 'guest' || !user.isCloudSynced) {
      return;
    }

    try {
      const entryRef = doc(db, 'nmixx_tcg_leaderboard', user.id);
      const payload: LeaderboardEntry = {
        uid: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        avatarMemberId: user.avatarMemberId || 'SULLYOON',
        uniqueCardCount: stats.uniqueCardCount,
        collectionRate: stats.collectionRate,
        totalPacksOpened: stats.totalPacksOpened,
        coins: stats.coins,
        hasXR: stats.hasXR,
        updatedAt: serverTimestamp(),
      };
      await setDoc(entryRef, payload, { merge: true });
    } catch (error) {
      console.warn('[Multiplayer] Failed to update leaderboard entry:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // 📢 2. 실시간 고등급 획득 전광판 (Global Pull Feed)
  // ---------------------------------------------------------------------------
  public static async broadcastHighTierPull(
    userName: string,
    uid: string,
    card: Card
  ): Promise<void> {
    if (!['SSR', 'UR', 'LR', 'MR', 'XR'].includes(card.rarity)) return;
    if (!isFirebaseConfigured || !db) return;

    try {
      await addDoc(collection(db, 'nmixx_tcg_global_feed'), {
        uid,
        userName,
        cardId: card.id,
        cardName: card.name,
        rarity: card.rarity,
        member: card.member,
        image: card.image,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn('[Multiplayer] Failed to broadcast pull:', error);
    }
  }

  public static subscribeGlobalFeed(
    callback: (items: GlobalPullFeedItem[]) => void
  ): () => void {
    if (!isFirebaseConfigured || !db) {
      callback(this.getMockFeed());
      return () => {};
    }

    try {
      const q = query(
        collection(db, 'nmixx_tcg_global_feed'),
        orderBy('timestamp', 'desc'),
        limit(15)
      );

      return onSnapshot(
        q,
        snapshot => {
          const items: GlobalPullFeedItem[] = [];
          snapshot.forEach(docSnap => {
            items.push({
              id: docSnap.id,
              ...(docSnap.data() as Omit<GlobalPullFeedItem, 'id'>),
            });
          });
          callback(items.length > 0 ? items : this.getMockFeed());
        },
        err => {
          console.warn('[Multiplayer] Global feed listener error, using fallback:', err);
          callback(this.getMockFeed());
        }
      );
    } catch (error) {
      console.warn('[Multiplayer] Feed setup error:', error);
      callback(this.getMockFeed());
      return () => {};
    }
  }

  // ---------------------------------------------------------------------------
  // 🎁 3. 우편함 & 쿠폰 시스템
  // ---------------------------------------------------------------------------
  public static getMailList(claimedMailIds: string[] = []): MailItem[] {
    return DEFAULT_GLOBAL_MAILS.map(mail => ({
      ...mail,
      isClaimed: claimedMailIds.includes(mail.id),
    }));
  }

  public static redeemCoupon(
    inputCode: string,
    claimedCouponCodes: string[] = [],
    currentUser?: UserAccount | null
  ): { success: boolean; message: string; reward?: CouponDefinition; isSecret?: boolean } {
    if (!inputCode) {
      return { success: false, message: '쿠폰 코드를 입력해 주세요.' };
    }

    const rawNormalized = inputCode.trim().replace(/\s+/g, '');
    const isSecretEasterEgg =
      rawNormalized === '목숨을걸고평생엔써하겠습니다.' ||
      rawNormalized.toUpperCase() === 'SECRET_NSWER_100M';

    // 🔒 1. 시크릿 쿠폰: 반드시 소셜 로그인(구글/카카오) 인증 회원만 사용 가능
    if (isSecretEasterEgg) {
      if (!currentUser || !currentUser.id || currentUser.id === 'guest' || !currentUser.isCloudSynced) {
        return {
          success: false,
          message: '🔒 시크릿 쿠폰은 로그인한 엔써(회원)만 사용할 수 있습니다. 로그인 후 다시 시도해 주세요!',
        };
      }

      if (claimedCouponCodes.includes('SECRET_NSWER_100M')) {
        return {
          success: false,
          message: '이미 보상을 수령한 계정입니다.',
        };
      }

      return {
        success: true,
        isSecret: true,
        message: '👑 [평생 엔써의 맹세] 진정한 엔써의 서약 완료! 특별 지원금 100,000,000 N COIN이 지급되었습니다!',
        reward: VALID_COUPONS.SECRET_NSWER_100M,
      };
    }

    // 🎫 2. 일반 공개 쿠폰 검증
    const cleanCode = rawNormalized.toUpperCase();

    if (claimedCouponCodes.includes(cleanCode)) {
      return { success: false, message: '이미 사용 완료된 쿠폰입니다.' };
    }

    const coupon = VALID_COUPONS[cleanCode];
    if (!coupon) {
      return {
        success: false,
        message: '유효하지 않은 쿠폰 번호입니다. (대소문자 및 띄어쓰기를 확인해 주세요)',
      };
    }

    return {
      success: true,
      message: `🎉 [${coupon.description}] 보상이 정상 지급되었습니다!`,
      reward: coupon,
    };
  }

  // ---------------------------------------------------------------------------
  // 🔄 4. 중복 카드 1:1 교환소 (Marketplace)
  // ---------------------------------------------------------------------------
  public static async fetchTradeListings(): Promise<CardTradeListing[]> {
    if (!isFirebaseConfigured || !db) {
      return this.getMockTradeListings();
    }

    try {
      const q = query(
        collection(db, 'nmixx_tcg_market'),
        orderBy('createdAt', 'desc'),
        limit(40)
      );
      const snapshot = await getDocs(q);

      const list: CardTradeListing[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Omit<CardTradeListing, 'id'>;
        if (data.status === 'OPEN') {
          list.push({ id: docSnap.id, ...data });
        }
      });

      return list.length > 0 ? list : this.getMockTradeListings();
    } catch (error) {
      console.warn('[Multiplayer] Failed to fetch trade listings:', error);
      return this.getMockTradeListings();
    }
  }

  public static async createTradeListing(
    user: UserAccount,
    offeredCard: Card,
    wantedCard: Card
  ): Promise<{ success: boolean; listingId?: string; error?: string }> {
    if (!isFirebaseConfigured || !db) {
      return { success: true, listingId: `mock_${Date.now()}` };
    }

    try {
      const docRef = await addDoc(collection(db, 'nmixx_tcg_market'), {
        sellerUid: user.id,
        sellerName: user.displayName,
        sellerAvatar: user.avatarUrl,
        offeredCardId: offeredCard.id,
        offeredCardName: offeredCard.name,
        offeredRarity: offeredCard.rarity,
        offeredImage: offeredCard.image,
        offeredMember: offeredCard.member,
        wantedCardId: wantedCard.id,
        wantedCardName: wantedCard.name,
        wantedRarity: wantedCard.rarity,
        status: 'OPEN',
        createdAt: Date.now(),
      });
      return { success: true, listingId: docRef.id };
    } catch (error: any) {
      console.warn('[Multiplayer] Failed to create trade listing:', error);
      return { success: false, error: error.message };
    }
  }

  public static async completeTrade(
    tradeId: string,
    buyerUser: UserAccount
  ): Promise<boolean> {
    if (!isFirebaseConfigured || !db || tradeId.startsWith('mock_')) {
      return true;
    }

    try {
      const tradeRef = doc(db, 'nmixx_tcg_market', tradeId);
      await updateDoc(tradeRef, {
        status: 'COMPLETED',
        buyerUid: buyerUser.id,
        buyerName: buyerUser.displayName,
        completedAt: Date.now(),
      });
      return true;
    } catch (error) {
      console.warn('[Multiplayer] Failed to complete trade:', error);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // 🤖 Clean Fallback Data (더미 계정 제거 및 실시간 실유저 전용)
  // ---------------------------------------------------------------------------
  private static getMockLeaderboard(): LeaderboardEntry[] {
    return [];
  }

  private static getMockFeed(): GlobalPullFeedItem[] {
    return [];
  }

  private static getMockTradeListings(): CardTradeListing[] {
    return [
      {
        id: 'trade_mock_1',
        sellerUid: 'seller_1',
        sellerName: '엔써_릴리팬',
        sellerAvatar: '/cards/card_001.jpg',
        offeredCardId: 'nmixx_001',
        offeredCardName: '릴리 - MIXX LAB',
        offeredRarity: 'UR',
        offeredImage: '/cards/card_001.jpg',
        offeredMember: 'LILY',
        wantedCardId: 'nmixx_003',
        wantedCardName: '설윤 - MIXX LAB',
        wantedRarity: 'UR',
        status: 'OPEN',
        createdAt: Date.now() - 3600000,
      },
      {
        id: 'trade_mock_2',
        sellerUid: 'seller_2',
        sellerName: '배이홀릭',
        sellerAvatar: '/cards/card_004.jpg',
        offeredCardId: 'nmixx_004',
        offeredCardName: '배이 - MIXX LAB',
        offeredRarity: 'SSR',
        offeredImage: '/cards/card_004.jpg',
        offeredMember: 'BAE',
        wantedCardId: 'nmixx_005',
        wantedCardName: '지우 - MIXX LAB',
        wantedRarity: 'SSR',
        status: 'OPEN',
        createdAt: Date.now() - 7200000,
      },
    ];
  }
}
