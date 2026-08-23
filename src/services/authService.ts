import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { UserAccount } from '../types/auth';
import { SecurityService } from './securityService';
import { auth, googleProvider, isFirebaseConfigured, initKakaoSdk } from '../config/firebase';

const AUTH_STORAGE_KEY = 'nmixx_tcg_auth_session_v1';

export class AuthService {
  private static currentUser: UserAccount | null = null;

  /**
   * 로컬 암호화 세션에서 기존 로그인 계정 로드
   */
  public static loadSession(): UserAccount | null {
    try {
      const encrypted = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!encrypted) return null;
      const account = SecurityService.decodeEncryptedStore<UserAccount>(encrypted);
      this.currentUser = account;
      return account;
    } catch {
      return null;
    }
  }

  /**
   * 계정 세션을 암호화하여 로컬에 안전하게 영속화
   */
  public static async saveSession(account: UserAccount): Promise<void> {
    const signature = await SecurityService.signAccountData({
      id: account.id,
      email: account.email,
      provider: account.provider,
      createdAt: account.createdAt,
    });
    account.securityHash = signature;
    account.lastLoginAt = Date.now();
    this.currentUser = account;

    const encrypted = SecurityService.encodeEncryptedStore(account);
    localStorage.setItem(AUTH_STORAGE_KEY, encrypted);
  }

  /**
   * 🌟 Google 공식 계정으로 OAuth 팝업 로그인 / 회원가입
   */
  public static async loginWithGoogle(customName?: string): Promise<UserAccount> {
    // 1. Firebase Auth가 설정되어 있는 경우 실제 Google OAuth 팝업 실행
    if (isFirebaseConfigured && auth && googleProvider) {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        const fbUser = result.user;

        const account: UserAccount = {
          id: `goog_${fbUser.uid}`,
          provider: 'google',
          email: fbUser.email || `nswer_${fbUser.uid.substring(0, 6)}@gmail.com`,
          displayName: customName || fbUser.displayName || `엔써_${fbUser.uid.substring(0, 5)}`,
          avatarUrl: fbUser.photoURL || '/cards/card_003.jpg',
          avatarMemberId: 'SULLYOON',
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          isCloudSynced: true,
          securityHash: '',
        };

        await this.saveSession(account);
        return account;
      } catch (error: any) {
        console.warn('Google OAuth Popup cancelled or failed, falling back:', error);
        if (error.code === 'auth/popup-closed-by-user') {
          throw new Error('Google 로그인이 사용자에 의해 취소되었습니다.');
        }
      }
    }

    // 2. Firebase 설정 이전 또는 로컬 데모 환경용 안전 모드
    const randomId = SecurityService.generateSecureUID('goog');
    const emailPrefix = customName ? customName.toLowerCase().replace(/\s+/g, '') : 'nswer_google';
    const email = `${emailPrefix}_${randomId.substring(5, 10)}@gmail.com`;
    const displayName = customName || `엔써_${randomId.substring(5, 9)}`;

    const account: UserAccount = {
      id: randomId,
      provider: 'google',
      email,
      displayName,
      avatarUrl: '/cards/card_003.jpg',
      avatarMemberId: 'SULLYOON',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      isCloudSynced: true,
      securityHash: '',
    };

    await this.saveSession(account);
    return account;
  }

  /**
   * 🌟 Kakao 공식 SDK를 통한 카카오 로그인 / 회원가입
   */
  public static async loginWithKakao(customName?: string): Promise<UserAccount> {
    const isSdkReady = initKakaoSdk();

    // 1. Kakao SDK가 초기화되어 있는 경우 실제 카카오 로그인 팝업 실행
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
                const nickname = customName || kakaoAccount?.profile?.nickname || `카카오_엔써_${kakaoId.substring(0, 4)}`;
                const profileImg = kakaoAccount?.profile?.profile_image_url || '/cards/card_002.jpg';
                const email = kakaoAccount?.email || `kakao_${kakaoId}@kakao.com`;

                const account: UserAccount = {
                  id: `kakao_${kakaoId}`,
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

    // 2. Kakao JS Key 설정 이전 또는 로컬 데모 환경용 안전 모드
    const randomId = SecurityService.generateSecureUID('kakao');
    const emailPrefix = customName ? customName.toLowerCase().replace(/\s+/g, '') : 'nswer_kakao';
    const email = `${emailPrefix}_${randomId.substring(6, 11)}@kakao.com`;
    const displayName = customName || `카카오_엔써_${randomId.substring(6, 10)}`;

    const account: UserAccount = {
      id: randomId,
      provider: 'kakao',
      email,
      displayName,
      avatarUrl: '/cards/card_002.jpg',
      avatarMemberId: 'HAEWON',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      isCloudSynced: true,
      securityHash: '',
    };

    await this.saveSession(account);
    return account;
  }

  /**
   * 게스트(Guest) 계정 생성
   */
  public static async loginAsGuest(): Promise<UserAccount> {
    const randomId = SecurityService.generateSecureUID('guest');
    const account: UserAccount = {
      id: randomId,
      provider: 'guest',
      email: `guest_${randomId.substring(6, 11)}@nmixx-tcg.local`,
      displayName: `게스트_${randomId.substring(6, 10)}`,
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
   * 프로필 수정 (닉네임 / 대표 멤버 아바타 변경)
   */
  public static async updateProfile(updates: Partial<Pick<UserAccount, 'displayName' | 'avatarMemberId' | 'avatarUrl'>>): Promise<UserAccount | null> {
    if (!this.currentUser) return null;

    const updatedAccount: UserAccount = {
      ...this.currentUser,
      ...updates,
    };

    await this.saveSession(updatedAccount);
    return updatedAccount;
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
