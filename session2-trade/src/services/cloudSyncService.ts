import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { UserAccount } from '../types/auth';
import { MultiplayerService } from './multiplayerService';

export interface CloudGameData {
  collection: Record<string, number>;
  coins: number;
  dust: number;
  pityCounter: number;
  totalPacksOpened: number;
  unlockedAchievements?: string[];
  claimedSetRewards?: string[];
  claimedMailIds?: string[];
  claimedCouponCodes?: string[];
  hasClaimedMmuEasterEgg?: boolean;
  lastMailClaimDate?: string | null;
  lastSavedAt?: any;
  userEmail?: string;
  displayName?: string;
  provider?: string;
}

export class CloudSyncService {
  private static lastSavedHash: string = '';

  public static forceResetHash(): void {
    this.lastSavedHash = '';
  }

  /**
   * 클라우드 Firestore에서 특정 유저의 게임 데이터 로드 (오프라인 내성 탑재)
   */
  public static async loadUserGameData(uid: string): Promise<CloudGameData | null> {
    if (!isFirebaseConfigured || !db || !uid) return null;

    try {
      const userDocRef = doc(db, 'nmixx_tcg_users', uid);
      const snapshot = await getDoc(userDocRef);

      if (snapshot.exists()) {
        return snapshot.data() as CloudGameData;
      }
      return null;
    } catch (error) {
      console.warn('[CloudSync] Network offline or Firestore read fallback:', error);
      return null;
    }
  }

  /**
   * 유저의 게임 데이터를 클라우드 Firestore에 즉각 영구 저장 (중복 방지 & 실시간 저장)
   */
  public static async saveUserGameData(
    user: UserAccount | null,
    data: {
      collection: Record<string, number>;
      coins: number;
      dust: number;
      pityCounter: number;
      totalPacksOpened: number;
      unlockedAchievements?: string[];
      claimedSetRewards?: string[];
      claimedMailIds?: string[];
      claimedCouponCodes?: string[];
      hasClaimedMmuEasterEgg?: boolean;
      lastMailClaimDate?: string | null;
    }
  ): Promise<boolean> {
    const firestore = db;
    if (!isFirebaseConfigured || !firestore || !user?.id) return false;

    // 변경점이 없는 중복 쓰기 원천 차단 (닉네임/아바타/쿠폰 변경 시 즉시 동기화 포함)
    const currentHash = `${user.displayName}_${user.avatarMemberId}_${Object.keys(data.collection).length}_${data.coins}_${data.pityCounter}_${data.totalPacksOpened}_${(data.unlockedAchievements || []).length}_${(data.claimedSetRewards || []).length}_${(data.claimedCouponCodes || []).length}_${data.hasClaimedMmuEasterEgg ? '1' : '0'}_${data.lastMailClaimDate || ''}`;
    if (currentHash === this.lastSavedHash) {
      return true;
    }

    try {
      const userDocRef = doc(firestore, 'nmixx_tcg_users', user.id);
      const payload: CloudGameData = {
        collection: data.collection,
        coins: data.coins,
        dust: data.dust,
        pityCounter: data.pityCounter,
        totalPacksOpened: data.totalPacksOpened,
        unlockedAchievements: data.unlockedAchievements || [],
        claimedSetRewards: data.claimedSetRewards || [],
        claimedMailIds: data.claimedMailIds || [],
        claimedCouponCodes: data.claimedCouponCodes || [],
        hasClaimedMmuEasterEgg: data.hasClaimedMmuEasterEgg || false,
        lastMailClaimDate: data.lastMailClaimDate || null,
        lastSavedAt: serverTimestamp(),
        userEmail: user.email,
        displayName: user.displayName,
        provider: user.provider,
      };

      await setDoc(userDocRef, payload, { merge: true });
      this.lastSavedHash = currentHash;

      // 🏆 글로벌 리더보드 인덱스 자동 갱신
      const uniqueCards = Object.values(data.collection).filter(c => c > 0).length;
      const totalMasterCards = 651;
      const collectionRate = Math.round((uniqueCards / totalMasterCards) * 1000) / 10;
      const hasXR = (data.collection['card_xr_transcendent_park_741'] || 0) > 0;

      await MultiplayerService.updateLeaderboardEntry(user, {
        uniqueCardCount: uniqueCards,
        collectionRate,
        totalPacksOpened: data.totalPacksOpened,
        coins: data.coins,
        hasXR,
      });

      return true;
    } catch (error) {
      console.warn('[CloudSync] Failed to save user game data to Firestore:', error);
      return false;
    }
  }
}
