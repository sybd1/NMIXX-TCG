import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../config/firebase';
import { UserAccount } from '../types/auth';

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

  /**
   * 클라우드 Firestore에서 특정 유저의 게임 데이터 로드
   */
  public static async loadUserGameData(uid: string): Promise<CloudGameData | null> {
    if (!isFirebaseConfigured || !db || !uid) return null;

    try {
      const userDocRef = doc(db, 'nmixx_tcg_users', uid);
      const snapshot = await getDoc(userDocRef);

      if (snapshot.exists()) {
        const data = snapshot.data() as CloudGameData;
        console.log(`[CloudSync] Loaded cloud data for user: ${uid}`);
        return data;
      }
      return null;
    } catch (error) {
      console.warn('[CloudSync] Failed to load cloud data:', error);
      return null;
    }
  }

  /**
   * 유저의 게임 데이터를 클라우드 Firestore에 저장 (디바운스 자동 적용)
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

    // 1초 디바운스로 잦은 연속 쓰기 최적화
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
          console.log(`[CloudSync] Successfully synced game data to cloud for ${user.displayName}`);
          resolve(true);
        } catch (error) {
          console.warn('[CloudSync] Failed to save cloud data:', error);
          resolve(false);
        }
      }, 1000);
    });
  }
}
