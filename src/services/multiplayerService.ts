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
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { UserAccount } from '../types/auth';
import { Card } from '../types/card';
import { MASTER_CARDS } from '../data/cards';
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
  public static async fetchLeaderboard(limitCount = 50, _currentUserId?: string): Promise<LeaderboardEntry[]> {
    let entries: LeaderboardEntry[] = [];

    if (isFirebaseConfigured && db) {
      try {
        const q = query(
          collection(db, 'nmixx_tcg_leaderboard'),
          orderBy('uniqueCardCount', 'desc'),
          limit(limitCount)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as LeaderboardEntry;
            const uid = docSnap.id || data.uid;

            // 🗑️ 과거 테스트 계정 및 관리자(운영자/GM) 계정 식별
            const isAdmin = uid.includes('chip') || uid.includes('운영자') || (data.displayName && (data.displayName.includes('운영자') || data.displayName.includes('GM')));
            const isOldTest =
              !uid ||
              uid === 'guest' ||
              uid.startsWith('mock_') ||
              uid.startsWith('user_mock_') ||
              data.displayName === 'GM' ||
              data.displayName?.startsWith('카카오_엔써_') ||
              isAdmin;

            if (isOldTest) {
              // Firebase Firestore에서 해당 테스트 계정 영구 삭제 (관리자 계정은 users는 지우지 않고 leaderboard만 삭제)
              deleteDoc(doc(db!, 'nmixx_tcg_leaderboard', uid)).catch(() => {});
              if (!isAdmin) {
                deleteDoc(doc(db!, 'nmixx_tcg_users', uid)).catch(() => {});
              }
              return;
            }

            entries.push({
              ...data,
              uid,
            });
          });
        }
      } catch (error) {
        console.warn('[Multiplayer] Failed to fetch leaderboard, fallback:', error);
      }
    }

    // 🤖 53명의 봇 추가
    const bots = this.getMockBots();
    const combined = [...entries, ...bots];

    // 고유 카드 개수 기준으로 내림차순 정렬
    combined.sort((a, b) => b.uniqueCardCount - a.uniqueCardCount);

    // 순위 매기기
    const ranked = combined.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));

    return ranked.slice(0, limitCount);
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

    const isAdmin = user.id.includes('chip') || user.id.includes('운영자') || (user.displayName && user.displayName.includes('운영자'));
    if (isAdmin) {
      // 관리자 계정은 랭킹에 절대로 노출되지 않도록 실시간으로 leaderboard 문서 삭제 처리
      try {
        const entryRef = doc(db, 'nmixx_tcg_leaderboard', user.id);
        await deleteDoc(entryRef);
      } catch (e) {}
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
    if (!isFirebaseConfigured || !db || !uid || uid === 'guest') return;

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
    if (!user || user.id === 'guest' || !user.isCloudSynced) {
      return { success: false, error: '게스트는 거래를 이용할 수 없습니다.' };
    }
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
    if (!buyerUser || buyerUser.id === 'guest' || !buyerUser.isCloudSynced) {
      return false;
    }
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

  public static async fetchUserProfile(uid: string): Promise<any | null> {
    if (uid && uid.startsWith('bot_')) {
      const bots = this.getMockBots();
      const bot = bots.find(b => b.uid === uid);
      return bot || null;
    }
    if (!isFirebaseConfigured || !db || !uid) return null;
    try {
      const leaderRef = doc(db, 'nmixx_tcg_leaderboard', uid);
      const snap = await getDoc(leaderRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          uid,
          displayName: data.displayName || '엔써_교환자',
          avatarUrl: data.avatarUrl || '/cards/card_001.webp',
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
          avatarUrl: udata.avatarUrl || '/cards/card_001.webp',
          avatarMemberId: udata.avatarMemberId || 'SULLYOON',
          uniqueCardCount,
          collectionRate: Math.round((uniqueCardCount / 521) * 1000) / 10,
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
    if (uid && uid.startsWith('bot_')) {
      return this.getBotCollection(uid);
    }
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
  private static getMockFeed(): GlobalPullFeedItem[] {
    return [];
  }

  private static getMockTradeListings(): CardTradeListing[] {
    return [];
  }

  // 🤖 53명의 봇 정보 생성 (결정론적 난수 사용)
  private static getMockBots(): LeaderboardEntry[] {
    const BOT_NAMES = [
      // 현실 밀착형
      '내일출근안함', '야근각나왔다', '월급로그아웃', '퇴사마려운사람', '학점복구불가',
      '종강언제하냐', '카페인도핑중', '자퇴각재는중', '침대밖은위험', '회사가기싫다',
      '기상알람혐오', '텅장잔고0원', '영혼가출상태', '집가고싶어요', '눈떠보니월요일',
      '과제폭탄맞음', '밤샘코딩중', '수면부족환자', '칼퇴기원1일차', '연차쓰고싶다',
      '마감직전도망', '인생리셋버튼', '출근길지옥철', '방학언제오냐', '뇌빼고게임함',
      // 음식/야식형
      '제육덮밥특', '치킨은후라이드', '국밥부장관', '삼겹살소주한잔', '엽떡착한맛',
      '돈까스망치', '새벽라면원샷', '마라탕3단계', '치즈추가필수', '냉면다대기팍팍',
      '배고파서접속', '야식참는중', '공기밥두공기', '붕어빵슈크림', '피자끝도우먹음',
      '김치찌개장인', '불닭볶음면고수', '탕수육은찍먹', '순대국다대기', '탄산음료중독',
      '햄버거세트단품', '간장계란밥장인', '고기추가두번', '떡볶이국물파', '라면물조절실패',
      // 게임 자폭형
      '일단내탓아님', '손가락이안움직임', '핑찍지마세요', '뇌정지왔어요', '채팅치다사망',
      '님손이더이상함', '훈수두면탈주', '뉴비봐주세요', '스킬쿨이었음', '키보드렉걸림',
      '마우스가이상함', '화면안보고함', '눈감고플레이', '평타만치는중', '억까당해서죽음',
      '핑계대지마라', '판수박치기', '남탓전문가', '피지컬바닥남', '반응속도3초',
      '스킬다빗나감', '멘탈터짐주의', '말걸면던짐', '살살해주세요', '님티어가보임',
      // 무성의/아재형
      '김철수123', '닉네임추천좀', '뭐로하지이거', '그냥만든계정', '닉네임만30분',
      '동네PC방죽돌이', '흔한유저1', '아무거나함', '길가던아저씨', '잠수타는중',
      '방구석폐인', '진짜마지막판', '이거어떻게함', '한판만하고잠', '지나가던행인',
      '물마시러감', '밥먹으러감', '본캐따로있음', '비번까먹음', '폰게임하는중',
      '친구따라왔음', '자동로그인러', '대충지은닉', '이름없는유저', '심심해서켜봄'
    ];

    // 결정론적 피셔-예이츠 셔플로 봇 닉네임 랜덤성 확보 (중복 방지)
    const shuffledNames = [...BOT_NAMES];
    let shuffleSeed = 77;
    for (let k = shuffledNames.length - 1; k > 0; k--) {
      const x = Math.sin(shuffleSeed++) * 10000;
      const randVal = x - Math.floor(x);
      const j = Math.floor(randVal * (k + 1));
      const temp = shuffledNames[k];
      shuffledNames[k] = shuffledNames[j];
      shuffledNames[j] = temp;
    }

    const bots: LeaderboardEntry[] = [];
    const totalMasterCards = 521;

    for (let i = 0; i < 53; i++) {
      const name = shuffledNames[i % shuffledNames.length];
      const avatarMemberId = ['LILY', 'HAEWON', 'SULLYOON', 'BAE', 'JIWOO', 'KYUZIN'][i % 6];
      
      // 해당 멤버의 일반 카드 중 이미지 경로가 존재하는 카드를 프로필 아바타로 할당
      const memberCards = MASTER_CARDS.filter(c => c.member === avatarMemberId && c.image && !c.isMystery);
      const avatarUrl = (memberCards.length > 0 ? memberCards[(i * 3) % memberCards.length].image : '/cards/card_001.webp') || '/cards/card_001.webp';

      // 결정론적 랜덤 생성 (3% ~ 46%)
      const seedVal = Math.sin(i * 123.456) * 10000;
      const randPercent = 3 + Math.floor((seedVal - Math.floor(seedVal)) * 44); // 3% ~ 46%
      
      const uniqueCount = Math.round(totalMasterCards * (randPercent / 100));
      const collectionRate = Math.round((uniqueCount / totalMasterCards) * 1000) / 10;
      const totalPacks = Math.round(uniqueCount * 2.5) + (i % 5);
      
      bots.push({
        uid: `bot_${i + 1}`,
        displayName: name,
        avatarUrl,
        avatarMemberId,
        uniqueCardCount: uniqueCount,
        collectionRate,
        totalPacksOpened: totalPacks,
        coins: 10000 + (i * 379) % 50000,
        hasXR: false,
        updatedAt: null,
      });
    }
    return bots;
  }

  // 🤖 봇의 카드 컬렉션 맵 결정론적 생성
  private static getBotCollection(uid: string): Record<string, number> {
    const botId = parseInt(uid.replace('bot_', ''), 10);
    const botIndex = isNaN(botId) ? 0 : botId - 1;
    
    const bots = this.getMockBots();
    const botData = bots[botIndex] || bots[0];
    
    const collection: Record<string, number> = {};
    const availableCards = MASTER_CARDS.filter(c => c.rarity !== 'XR');
    
    // 결정론적 랜덤 함수
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };
    
    const cardsWithWeight = availableCards.map((c, idx) => {
      const randVal = seededRandom(botIndex * 17 + idx * 31);
      const rarityWeights: Record<string, number> = { C: 0.9, UC: 0.7, R: 0.5, SR: 0.3, SSR: 0.15, UR: 0.08, LR: 0.04, MR: 0.02 };
      const rWeight = rarityWeights[c.rarity] || 0.01;
      return { card: c, sortVal: randVal * rWeight };
    });
    
    const selected = cardsWithWeight
      .sort((a, b) => b.sortVal - a.sortVal)
      .slice(0, botData.uniqueCardCount)
      .map(x => x.card);
      
    selected.forEach(c => {
      collection[c.id] = 1;
    });
    
    return collection;
  }
}
