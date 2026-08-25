import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
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
    isClaimed: false,
    createdAt: Date.now() - 3600000 * 2,
  },
  {
    id: 'mail_fe3o4_celebration',
    title: '✨ Fe3O4: FORWARD 팩 출시 기념 특별 보급품',
    content: '신규 카드팩 출시를 기념하여 무료 카드팩을 개봉할 수 있는 보너스 50,000 코인을 드립니다! - 운영자 드림',
    sender: '운영자',
    coinsReward: 50000,
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
    description: '2026 NMIXX 공식 웰컴 쿠폰',
  },
  FE3O4_FORWARD: {
    code: 'FE3O4_FORWARD',
    coinsReward: 20000,
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
    description: '초월자 박진영의 축복 쿠폰',
  },
  SECRET_NSWER_100M: {
    code: 'SECRET_NSWER_100M',
    coinsReward: 100000000,
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
    if (!isFirebaseConfigured || !db) {
      return false;
    }
    if (tradeId.startsWith('mock_')) {
      return true;
    }

    try {
      const tradeRef = doc(db, 'nmixx_tcg_market', tradeId);
      const result = await runTransaction(db, async (transaction) => {
        const tradeSnap = await transaction.get(tradeRef);
        if (!tradeSnap.exists()) {
          throw new Error('존재하지 않는 거래 정보입니다.');
        }

        const tradeData = tradeSnap.data() as CardTradeListing;
        if (tradeData.status !== 'OPEN') {
          throw new Error('이미 완료되었거나 취소된 거래입니다.');
        }

        const sellerUid = tradeData.sellerUid;
        const buyerUid = buyerUser.id;

        if (sellerUid === buyerUid) {
          throw new Error('자신이 등록한 거래는 수락할 수 없습니다.');
        }

        const sellerRef = doc(db!, 'nmixx_tcg_users', sellerUid);
        const buyerRef = doc(db!, 'nmixx_tcg_users', buyerUid);

        const sellerSnap = await transaction.get(sellerRef);
        const buyerSnap = await transaction.get(buyerRef);

        if (!sellerSnap.exists()) {
          throw new Error('판매자 정보를 찾을 수 없습니다.');
        }
        if (!buyerSnap.exists()) {
          throw new Error('구매자 정보를 찾을 수 없습니다.');
        }

        const sellerData = sellerSnap.data();
        const buyerData = buyerSnap.data();

        const sellerCol = sellerData.collection || {};
        const buyerCol = buyerData.collection || {};

        const offeredCardId = tradeData.offeredCardId;
        const wantedCardId = tradeData.wantedCardId;

        // 판매자 보유량 검증: offeredCardId >= 2
        const sellerOfferedCount = sellerCol[offeredCardId] || 0;
        if (sellerOfferedCount < 2) {
          throw new Error(`판매자가 제공할 카드 [${tradeData.offeredCardName}]를 충분히 보유하고 있지 않습니다.`);
        }

        // 구매자 보유량 검증: wantedCardId >= 1
        const buyerWantedCount = buyerCol[wantedCardId] || 0;
        if (buyerWantedCount < 1) {
          throw new Error(`교환에 필요한 [${tradeData.wantedCardName}] 카드를 보유하고 있지 않습니다.`);
        }

        // 양측 보유 카드 수량 업데이트 (원자적 교환)
        const nextSellerCol = { ...sellerCol };
        nextSellerCol[offeredCardId] = sellerOfferedCount - 1;
        nextSellerCol[wantedCardId] = (nextSellerCol[wantedCardId] || 0) + 1;

        const nextBuyerCol = { ...buyerCol };
        nextBuyerCol[wantedCardId] = buyerWantedCount - 1;
        nextBuyerCol[offeredCardId] = (nextBuyerCol[offeredCardId] || 0) + 1;

        // 트랜잭션 내에서 두 사용자 문서 업데이트
        transaction.update(sellerRef, {
          collection: nextSellerCol,
          lastSavedAt: serverTimestamp(),
        });
        transaction.update(buyerRef, {
          collection: nextBuyerCol,
          lastSavedAt: serverTimestamp(),
        });

        // 거래 상태 업데이트
        transaction.update(tradeRef, {
          status: 'COMPLETED',
          buyerUid: buyerUid,
          buyerName: buyerUser.displayName,
          completedAt: Date.now(),
        });

        return true;
      });
      return result;
    } catch (error: any) {
      console.warn('[Multiplayer] Failed to complete trade via transaction:', error);
      alert(error.message || '거래 완료 처리 중 에러가 발생했습니다.');
      return false;
    }
  }

  public static async fetchUserProfile(uid: string): Promise<any | null> {
    if (!isFirebaseConfigured || !db || !uid) return null;
    try {
      const leaderRef = doc(db, 'nmixx_tcg_leaderboard', uid);
      const snap = await getDoc(leaderRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          uid,
          displayName: data.displayName || '엔써_교환자',
          avatarUrl: data.avatarUrl || '/cards/card_001.jpg',
          avatarMemberId: data.avatarMemberId || 'SULLYOON',
          uniqueCardCount: data.uniqueCardCount || 0,
          collectionRate: data.collectionRate || 0,
          totalPacksOpened: data.totalPacksOpened || 0,
          coins: data.coins || 0,
          rank: data.rank || '-',
        };
      }

      const userRef = doc(db, 'nmixx_tcg_users', uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const udata = userSnap.data();
        const uniqueCardCount = udata.collection ? Object.values(udata.collection).filter((c: any) => c > 0).length : 0;
        return {
          uid,
          displayName: udata.displayName || '엔써_교환자',
          avatarUrl: udata.avatarUrl || '/cards/card_001.jpg',
          avatarMemberId: udata.avatarMemberId || 'SULLYOON',
          uniqueCardCount,
          collectionRate: Math.round((uniqueCardCount / 651) * 1000) / 10,
          totalPacksOpened: udata.totalPacksOpened || 0,
          coins: udata.coins || 0,
          rank: '-',
        };
      }
    } catch (e) {
      console.warn('[Multiplayer] fetchUserProfile error:', e);
    }
    return null;
  }

  public static async fetchUserCollection(uid: string): Promise<Record<string, number>> {
    if (!isFirebaseConfigured || !db || !uid) return {};
    try {
      const userDocRef = doc(db, 'nmixx_tcg_users', uid);
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        return data?.collection || {};
      }
      return {};
    } catch (error) {
      console.warn('[Multiplayer] Failed to fetch user collection:', error);
      return {};
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
    return [];
  }
}
