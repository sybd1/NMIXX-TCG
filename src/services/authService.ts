import { UserAccount } from '../types/auth';
import { SecurityService } from './securityService';

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
  private static async saveSession(account: UserAccount): Promise<void> {
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
   * Google 계정으로 원클릭 소셜 로그인 / 회원가입
   */
  public static async loginWithGoogle(customName?: string): Promise<UserAccount> {
    const randomId = SecurityService.generateSecureUID('goog');
    const emailPrefix = customName ? customName.toLowerCase().replace(/\s+/g, '') : 'nswer_google';
    const email = `${emailPrefix}_${randomId.substring(5, 10)}@gmail.com`;
    const displayName = customName || `엔써_${randomId.substring(5, 9)}`;

    const account: UserAccount = {
      id: randomId,
      provider: 'google',
      email,
      displayName,
      avatarUrl: '/cards/card_003.jpg', // 설윤 기본 아바타
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
   * Kakao 계정으로 원클릭 소셜 로그인 / 회원가입
   */
  public static async loginWithKakao(customName?: string): Promise<UserAccount> {
    const randomId = SecurityService.generateSecureUID('kakao');
    const emailPrefix = customName ? customName.toLowerCase().replace(/\s+/g, '') : 'nswer_kakao';
    const email = `${emailPrefix}_${randomId.substring(6, 11)}@kakao.com`;
    const displayName = customName || `카카오_엔써_${randomId.substring(6, 10)}`;

    const account: UserAccount = {
      id: randomId,
      provider: 'kakao',
      email,
      displayName,
      avatarUrl: '/cards/card_002.jpg', // 해원 기본 아바타
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
      avatarUrl: '/cards/card_001.jpg', // 릴리 기본 아바타
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
  public static logout(): void {
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
}
