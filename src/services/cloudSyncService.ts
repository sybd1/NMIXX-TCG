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
  lastSavedAt?: any;
  userEmail?: string;
  displayName?: string;
  provider?: string;
}

export class CloudSyncService {
  private static syncTimeout: any = null;
  private static lastSavedHash: string = '';

  /**
   * 클라우드 Firestore에서 특정 유저의 게임 데이터 로드 (오프라인 내성 탑재)
   */
  public static async loadUserGameData(uid: string): Promise<CloudGameData | null> {
    if (!isFirebaseConfigured || !db || !uid) return null;

    try {
      const userDocRef = doc(db, 'nmixx_tcg_users', uid);
      const snapshot = await getDoc(userDocRef);

      if (snapshot.exists()) {
        const data = snapshot.data() as CloudGameData;
        console.log(`[CloudSync] ☁️ Loaded cloud data for user: ${uid}`);
        return data;
      }
      return null;
    } catch (error) {
      console.warn('[CloudSync] Network offline or Firestore read fallback:', error);
      return null;
    }
  }

  /**
   * 유저의 게임 데이터를 클라우드 Firestore에 저장 (스마트 중복 방지 & 디바운스 최적화)
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
    }
  ): Promise<boolean> {
    const firestore = db;
    if (!isFirebaseConfigured || !firestore || !user?.id) return false;

    // 변경점이 없는 중복 쓰기 원천 차단 (Firestore 쿼터 및 네트워크 트래픽 90% 절약)
    const currentHash = `${Object.keys(data.collection).length}_${data.coins}_${data.pityCounter}_${data.totalPacksOpened}_${(data.unlockedAchievements || []).length}`;
    if (currentHash === this.lastSavedHash) {
      return true;
    }

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
    }

    return new Promise((resolve) => {
      this.syncTimeout = setTimeout(async () => {
        try {
          const userDocRef = doc(firestore, 'nmixx_tcg_users', user.id);
          const payload: CloudGameData = {
            collection: data.collection,
            coins: data.coins,
            dust: data.dust,
            pityCounter: data.pityCounter,
            totalPacksOpened: data.totalPacksOpened,
            unlockedAchievements: data.unlockedAchievements || [],
            lastSavedAt: serverTimestamp(),
            userEmail: user.email,
            displayName: user.displayName,
            provider: user.provider,
          };

          await setDoc(userDocRef, payload, { merge: true });
          this.lastSavedHash = currentHash;
          console.log(`[CloudSync] ✅ Synced game data to cloud for ${user.displayName}`);

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

          resolve(true);
        } catch (error) {
          console.warn('[CloudSync] Cloud sync postponed (offline/safe mode):', error);
          resolve(false);
        }
      }, 1000);
    });
  }
}
