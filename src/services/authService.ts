import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  setDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  doc,
} from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured, initKakaoSdk } from '../config/firebase';
import { UserAccount } from '../types/auth';
import { SecurityService } from './securityService';

const AUTH_STORAGE_KEY = 'nmixx_tcg_auth_session_v1';

export class AuthService {
  private static currentUser: UserAccount | null = null;

  /**
   * 닉네임 중복 검사 (본인 닉네임 제외)
   */
  public static async isNicknameAvailable(nickname: string, currentUid?: string): Promise<boolean> {
    const cleanName = nickname.trim();
    if (!cleanName || cleanName.length < 2) return false;

    if (!isFirebaseConfigured || !db) {
      return true; // 오프라인 모드에서는 통과
    }

    try {
      // 1. 유저 컬렉션에서 닉네임 검색
      const q = query(
        collection(db, 'nmixx_tcg_users'),
        where('displayName', '==', cleanName),
        limit(2)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) return true;

      // 검색된 문서가 본인의 문서인지 확인
      let isTakenByOther = false;
      snapshot.forEach((docSnap) => {
        if (docSnap.id !== currentUid) {
          isTakenByOther = true;
        }
      });

      return !isTakenByOther;
    } catch (error) {
      console.warn('[Auth] Nickname check error, fallback:', error);
      return true;
    }
  }

  /**
   * 🌟 Google 공식 OAuth 2.0 팝업 로그인 / 회원가입
   */
  public static async loginWithGoogle(customName?: string): Promise<UserAccount> {
    if (isFirebaseConfigured && auth && googleProvider) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const fbUser: FirebaseUser = result.user;

        const uid = `goog_${fbUser.uid}`;
        const email = fbUser.email || `${fbUser.uid.substring(0, 8)}@gmail.com`;
        let displayName = customName?.trim() || fbUser.displayName || `엔써_${fbUser.uid.substring(0, 5)}`;
        const avatarUrl = fbUser.photoURL || '/cards/card_003.jpg';
        
        // 👑 공식 운영자 계정 닉네임: '운영자' 단독 세팅
        if (displayName.toLowerCase().includes('chip sofa') || email.toLowerCase().includes('chip') || customName?.includes('chip') || displayName.includes('운영자')) {
          displayName = '운영자';
        } else {
          // 닉네임 중복 시 고유 해시 부착
          const available = await this.isNicknameAvailable(displayName, uid);
          if (!available && !customName) {
            displayName = `${displayName}_${fbUser.uid.substring(0, 4)}`;
          }
        }

        const account: UserAccount = {
          id: uid,
          provider: 'google',
          email,
          displayName,
          avatarUrl,
          avatarMemberId: 'SULLYOON',
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          isCloudSynced: true,
          securityHash: '',
        };

        await AuthService.saveSession(account);

        // Firestore에 유저 기본 정보 동기화
        if (db) {
          try {
            const userDocRef = doc(db, 'nmixx_tcg_users', uid);
            await setDoc(userDocRef, {
              displayName: account.displayName,
              email: account.email,
              avatarUrl: account.avatarUrl,
              avatarMemberId: account.avatarMemberId,
              provider: 'google',
              lastLoginAt: Date.now(),
            }, { merge: true });
          } catch (e) {
            console.warn('[Auth] Firestore sync warning:', e);
          }
        }

        return account;
      } catch (err: any) {
        console.error('Google Sign-In Error:', err);
        throw new Error(err.message || 'Google 로그인에 실패했습니다.');
      }
    }

    throw new Error('Firebase가 구성되지 않았습니다.');
  }

  /**
   * 🌟 Kakao 공식 SDK를 통한 카카오 로그인 / 회원가입
   */
  public static async loginWithKakao(customName?: string): Promise<UserAccount> {
    const isSdkReady = initKakaoSdk();

    if (isSdkReady && typeof window !== 'undefined' && (window as any).Kakao?.Auth) {
      const kakao = (window as any).Kakao;

      return new Promise<UserAccount>((resolve, reject) => {
        kakao.Auth.login({
          success: () => {
            kakao.API.request({
              url: '/v2/user/me',
              success: async (res: any) => {
                const kakaoAccount = res.kakao_account;
                const kakaoId = res.id ? String(res.id) : SecurityService.generateSecureUID('kakao');
                const uid = `kakao_${kakaoId}`;
                let nickname = customName?.trim() || kakaoAccount?.profile?.nickname || `카카오_엔써_${kakaoId.substring(0, 4)}`;
                const profileImg = kakaoAccount?.profile?.profile_image_url || '/cards/card_002.jpg';
                const email = kakaoAccount?.email || `kakao_${kakaoId}@kakao.com`;

                const available = await AuthService.isNicknameAvailable(nickname, uid);
                if (!available && !customName) {
                  nickname = `${nickname}_${kakaoId.substring(0, 3)}`;
                }

                const account: UserAccount = {
                  id: uid,
                  provider: 'kakao',
                  email,
                  displayName: nickname,
                  avatarUrl: profileImg,
                  avatarMemberId: 'HAEWON',
                  createdAt: Date.now(),
                  lastLoginAt: Date.now(),
                  isCloudSynced: true,
                  securityHash: '',
                };

                await AuthService.saveSession(account);

                // Firestore에 유저 기본 정보 동기화
                if (db) {
                  try {
                    const userDocRef = doc(db, 'nmixx_tcg_users', uid);
                    await setDoc(userDocRef, {
                      displayName: account.displayName,
                      email: account.email,
                      avatarUrl: account.avatarUrl,
                      avatarMemberId: account.avatarMemberId,
                      provider: 'kakao',
                      lastLoginAt: Date.now(),
                    }, { merge: true });
                  } catch (e) {
                    console.warn('[Auth] Firestore sync warning:', e);
                  }
                }

                resolve(account);
              },
              fail: (err: any) => {
                console.warn('Kakao profile request error:', err);
                reject(err);
              },
            });
          },
          fail: (err: any) => {
            console.warn('Kakao login popup failed:', err);
            reject(err);
          },
        });
      });
    }

    // 2. Kakao Developers 키 미등록 시 자동 연동 모드로 Firestore 계정 생성
    const randomId = SecurityService.generateSecureUID('kakao');
    const uid = `kakao_${randomId.substring(6, 16)}`;
    const email = `kakao_${randomId.substring(6, 12)}@kakao.com`;
    let nickname = customName?.trim() || `카카오_엔써_${randomId.substring(6, 10)}`;

    const available = await AuthService.isNicknameAvailable(nickname, uid);
    if (!available && !customName) {
      nickname = `${nickname}_${randomId.substring(6, 9)}`;
    }

    const account: UserAccount = {
      id: uid,
      provider: 'kakao',
      email,
      displayName: nickname,
      avatarUrl: '/cards/card_002.jpg',
      avatarMemberId: 'HAEWON',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      isCloudSynced: true,
      securityHash: '',
    };

    await AuthService.saveSession(account);

    // Firestore에 유저 기본 정보 동기화
    if (db) {
      try {
        const userDocRef = doc(db, 'nmixx_tcg_users', uid);
        await setDoc(userDocRef, {
          displayName: account.displayName,
          email: account.email,
          avatarUrl: account.avatarUrl,
          avatarMemberId: account.avatarMemberId,
          provider: 'kakao',
          lastLoginAt: Date.now(),
        }, { merge: true });
      } catch (e) {
        console.warn('[Auth] Firestore sync warning:', e);
      }
    }

    return account;
  }

  /**
   * 🌟 게스트(비로그인) 세션 생성 (클라우드 미동기화, 랭킹 미등록)
   */
  public static async loginAsGuest(customName?: string): Promise<UserAccount> {
    const randomId = SecurityService.generateSecureUID('guest');
    const displayName = customName?.trim() || `게스트_${randomId.substring(6, 10)}`;

    const account: UserAccount = {
      id: 'guest',
      provider: 'guest',
      email: `${randomId.substring(6, 11)}@guest.local`,
      displayName,
      avatarUrl: '/cards/card_001.jpg',
      avatarMemberId: 'LILY',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      isCloudSynced: false,
      securityHash: '',
    };

    await this.saveSession(account);
    return account;
  }

  /**
   * 세션 저장
   */
  public static async saveSession(user: UserAccount): Promise<void> {
    const rawData = `${user.id}:${user.provider}:${user.displayName}:${user.email}:${user.createdAt}`;
    user.securityHash = await SecurityService.hashSHA256(rawData);
    this.currentUser = user;

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to persist auth session:', e);
    }
  }

  /**
   * 로컬 세션 로드
   */
  public static loadSession(): UserAccount | null {
    try {
      const data = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!data) return null;
      const parsed: UserAccount = JSON.parse(data);
      if (parsed.displayName?.toLowerCase().includes('chip sofa') || parsed.email?.toLowerCase().includes('chip') || parsed.displayName?.includes('운영자')) {
        parsed.displayName = '운영자';
      }
      this.currentUser = parsed;
      return parsed;
    } catch (e) {
      console.warn('Failed to load auth session:', e);
      return null;
    }
  }

  /**
   * 닉네임 및 프로필 변경 (중복 검사 및 Firestore 동기화)
   */
  public static async updateProfile(
    updates: Partial<Pick<UserAccount, 'displayName' | 'avatarMemberId' | 'avatarUrl'>>
  ): Promise<{ success: boolean; message?: string; user?: UserAccount }> {
    if (!this.currentUser) {
      return { success: false, message: '로그인 상태가 아닙니다.' };
    }

    const newDisplayName = updates.displayName ? updates.displayName.trim() : this.currentUser.displayName;

    // 닉네임이 변경된 경우 중복 검사
    if (newDisplayName !== this.currentUser.displayName) {
      const isAvailable = await this.isNicknameAvailable(newDisplayName, this.currentUser.id);
      if (!isAvailable) {
        return {
          success: false,
          message: `이미 다른 엔써가 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.`,
        };
      }
    }

    const updatedAccount: UserAccount = {
      ...this.currentUser,
      ...updates,
      displayName: newDisplayName,
    };

    await this.saveSession(updatedAccount);

    // Firestore users 및 leaderboard 문서 실시간 업데이트
    if (isFirebaseConfigured && db && updatedAccount.id && updatedAccount.id !== 'guest') {
      try {
        const userRef = doc(db, 'nmixx_tcg_users', updatedAccount.id);
        await setDoc(userRef, {
          displayName: updatedAccount.displayName,
          avatarMemberId: updatedAccount.avatarMemberId || 'SULLYOON',
          ...(updatedAccount.avatarUrl ? { avatarUrl: updatedAccount.avatarUrl } : {}),
        }, { merge: true });

        const leaderRef = doc(db, 'nmixx_tcg_leaderboard', updatedAccount.id);
        await setDoc(leaderRef, {
          displayName: updatedAccount.displayName,
          avatarMemberId: updatedAccount.avatarMemberId || 'SULLYOON',
        }, { merge: true });
      } catch (err) {
        console.warn('[Auth] Failed to sync profile updates to Firestore:', err);
      }
    }

    return { success: true, user: updatedAccount };
  }

  /**
   * 로그아웃
   */
  public static async logout(): Promise<void> {
    if (isFirebaseConfigured && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.warn('Firebase signout error:', err);
      }
    }

    if (typeof window !== 'undefined' && (window as any).Kakao?.Auth?.getAccessToken()) {
      try {
        (window as any).Kakao.Auth.logout(() => {
          console.log('Kakao logged out');
        });
      } catch (err) {
        console.warn('Kakao logout error:', err);
      }
    }

    this.currentUser = null;
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  /**
   * 현재 유저 정보
   */
  public static getCurrentUser(): UserAccount | null {
    if (!this.currentUser) {
      this.currentUser = this.loadSession();
    }
    return this.currentUser;
  }

  /**
   * 실시간 Auth 상태 리스너 연동
   */
  public static subscribeAuthState(callback: (user: UserAccount | null) => void): () => void {
    if (isFirebaseConfigured && auth) {
      return onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const account = AuthService.getCurrentUser();
          if (!account || !account.id.includes(fbUser.uid)) {
            const newAccount: UserAccount = {
              id: `goog_${fbUser.uid}`,
              provider: 'google',
              email: fbUser.email || `nswer_${fbUser.uid.substring(0, 6)}@gmail.com`,
              displayName: fbUser.displayName || `엔써_${fbUser.uid.substring(0, 5)}`,
              avatarUrl: fbUser.photoURL || '/cards/card_003.jpg',
              avatarMemberId: 'SULLYOON',
              createdAt: Date.now(),
              lastLoginAt: Date.now(),
              isCloudSynced: true,
              securityHash: '',
            };
            await AuthService.saveSession(newAccount);
            callback(newAccount);
            return;
          }
          callback(account);
        } else {
          const localAccount = AuthService.getCurrentUser();
          callback(localAccount);
        }
      });
    }

    const current = AuthService.getCurrentUser();
    callback(current);
    return () => {};
  }
}
