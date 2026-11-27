import {
  signInWithPopup,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  deleteUser,
} from 'firebase/auth';
import {
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  limit,
  doc,
} from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured, initKakaoSdk } from '../config/firebase';
import { UserAccount } from '../types/auth';
import { SecurityService } from './securityService';
import { CloudSyncService } from './cloudSyncService';
import { activityLog } from './activityLogService';
import { deleteMetricsIdentity, metrics } from './metricsService';
import {
  KAKAO_AUTH_FAILED_MESSAGE,
  KAKAO_TOKEN_ENDPOINT,
  accountIdForFirebaseUser,
  connectKakaoToFirebase,
  kakaoDeleteBlockedMessage,
} from './kakaoConnect';

const AUTH_STORAGE_KEY = 'nmixx_tcg_auth_session_v1';

/** 카카오 사용자의 Firebase 연결 상태 (specs/023 REQ-04). 'none'은 카카오 세션이 아닐 때 */
export type KakaoConnectionStatus = 'none' | 'connected' | 'needs-login';

/** 카카오 액세스 토큰을 서버에서 커스텀 토큰으로 바꿔 Firebase에 로그인한다. 실패하면 KAKAO_AUTH_FAILED_MESSAGE */
async function exchangeKakaoTokenForFirebase(accessToken: string): Promise<{ uid: string }> {
  const firebaseAuth = auth;
  if (!isFirebaseConfigured || !firebaseAuth) {
    throw new Error(KAKAO_AUTH_FAILED_MESSAGE);
  }
  return connectKakaoToFirebase(accessToken, {
    postToken: (body) =>
      fetch(KAKAO_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
    signInWithCustomToken: async (token) => (await signInWithCustomToken(firebaseAuth, token)).user,
  });
}

export function sanitizeDisplayName(name: string): string {
  if (!name) return name;
  if (name.includes('박민주') || name === '박민주 사랑해') {
    return 'anjffhrkwl';
  }
  return name;
}

export class AuthService {
  private static currentUser: UserAccount | null = null;
  private static authListeners: ((user: UserAccount | null) => void)[] = [];
  private static kakaoStatus: KakaoConnectionStatus = 'none';
  private static kakaoStatusListeners: ((status: KakaoConnectionStatus) => void)[] = [];

  private static setKakaoStatus(status: KakaoConnectionStatus): void {
    if (this.kakaoStatus === status) return;
    this.kakaoStatus = status;
    this.kakaoStatusListeners.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.warn('[Auth] Kakao status listener error:', err);
      }
    });
  }

  /** 카카오 연결 상태 구독. 즉시 현재 상태를 한 번 알린다 (specs/023 AC-09a·AC-10) */
  public static subscribeKakaoConnection(callback: (status: KakaoConnectionStatus) => void): () => void {
    this.kakaoStatusListeners.push(callback);
    callback(this.kakaoStatus);
    return () => {
      this.kakaoStatusListeners = this.kakaoStatusListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * 카카오 세션이 Firebase에 연결되어 있는지 확인하고, 아니면 브라우저에 남은 카카오 토큰으로 자동 연결한다.
   * 연결되면 인증 콜백을 다시 불러 저장본을 다시 결정하게 한다 (specs/023 REQ-04·05, DEC-029).
   */
  private static kakaoEnsureInFlight: Promise<KakaoConnectionStatus> | null = null;

  public static ensureKakaoConnection(): Promise<KakaoConnectionStatus> {
    // 여러 곳에서 동시에 불러도 서버 교환은 한 번만 한다
    if (!this.kakaoEnsureInFlight) {
      this.kakaoEnsureInFlight = this.ensureKakaoConnectionOnce().finally(() => {
        this.kakaoEnsureInFlight = null;
      });
    }
    return this.kakaoEnsureInFlight;
  }

  private static async ensureKakaoConnectionOnce(): Promise<KakaoConnectionStatus> {
    const session = this.getCurrentUser();
    if (!session || session.provider !== 'kakao') {
      this.setKakaoStatus('none');
      return 'none';
    }
    if (!isFirebaseConfigured || !auth) {
      this.setKakaoStatus('needs-login');
      return 'needs-login';
    }
    await auth.authStateReady();
    if (auth.currentUser?.uid === session.id) {
      this.setKakaoStatus('connected');
      return 'connected';
    }

    initKakaoSdk();
    const kakaoToken: string | null =
      typeof window !== 'undefined' ? (window as any).Kakao?.Auth?.getAccessToken?.() ?? null : null;
    if (!kakaoToken) {
      this.setKakaoStatus('needs-login');
      return 'needs-login';
    }
    try {
      const { uid } = await exchangeKakaoTokenForFirebase(kakaoToken);
      if (uid !== session.id) {
        // 브라우저의 카카오 토큰이 세션과 다른 계정이면 연결하지 않는다
        await firebaseSignOut(auth);
        this.setKakaoStatus('needs-login');
        return 'needs-login';
      }
    } catch {
      this.setKakaoStatus('needs-login');
      return 'needs-login';
    }
    this.setKakaoStatus('connected');
    if (this.currentUser?.id === session.id) {
      this.notifyAuthChange(this.currentUser);
    }
    return 'connected';
  }

  private static notifyAuthChange(user: UserAccount | null): void {
    this.currentUser = user;
    this.authListeners.forEach((cb) => {
      try {
        cb(user);
      } catch (err) {
        console.warn('[Auth] Listener callback error:', err);
      }
    });
  }

  /**
   * 🛡️ Firestore에서 기존 유저의 커스텀 닉네임 및 아바타 프로필 조회
   */
  public static async fetchExistingProfile(uid: string): Promise<{
    displayName: string;
    avatarMemberId?: string;
    avatarUrl?: string;
  } | null> {
    if (!isFirebaseConfigured || !db || !uid) return null;
    try {
      const userDocRef = doc(db, 'nmixx_tcg_users', uid);
      const snapshot = await getDoc(userDocRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && (data.displayName || data.nickname)) {
          return {
            displayName: data.displayName || data.nickname,
            avatarMemberId: data.avatarMemberId || 'SULLYOON',
            avatarUrl: data.avatarUrl,
          };
        }
      }
      return null;
    } catch (e) {
      console.warn('[Auth] Failed to fetch existing user profile:', e);
      return null;
    }
  }

  /**
   * 닉네임 중복 검사 (본인 닉네임 제외)
   */
  public static async isNicknameAvailable(nickname: string, currentUid?: string): Promise<boolean> {
    const cleanName = nickname.trim();
    if (!cleanName || cleanName.length < 2) return false;

    // 🚫 운영자, GM 관련 단어 생성 불가 제한 (대소문자 무관)
    const upperName = cleanName.toUpperCase();
    if (upperName.includes('운영자') || upperName.includes('GM')) {
      return false;
    }

    if (!isFirebaseConfigured || !db) {
      return true; // 오프라인 모드에서는 통과
    }

    try {
      // 공개 문서인 랭킹 문서에서만 검색한다. 유저 문서는 주인만 읽을 수 있다 (specs/022 REQ-01, AC-03b).
      // 알려진 한계: 랭킹에 오르지 않은 사용자와는 닉네임이 겹칠 수 있다 (AC-03c).
      const q = query(
        collection(db, 'nmixx_tcg_leaderboard'),
        where('displayName', '==', cleanName),
        limit(2)
      );
      const snap = await getDocs(q);

      let isTakenByOther = false;
      snap.forEach((docSnap) => {
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
        const avatarUrl = fbUser.photoURL || '/cards/card_003.webp';
        
        // 🛡️ 기존 Firestore 계정 프로필 우선 조회 (커스텀 닉네임 보존)
        const existingProfile = await this.fetchExistingProfile(uid);

        let displayName = '';
        let avatarMemberId = 'SULLYOON';

        if (email === 'gjffpdlem@gmail.com') {
          displayName = '운영자';
          avatarMemberId = 'SULLYOON';
        } else if (existingProfile && existingProfile.displayName) {
          if (existingProfile.displayName.includes('박민주') || existingProfile.displayName === '박민주 사랑해' || ((existingProfile as any).nickname && (existingProfile as any).nickname.includes('박민주'))) {
            displayName = 'anjffhrkwl';
          } else {
            displayName = existingProfile.displayName;
          }
          avatarMemberId = existingProfile.avatarMemberId || 'SULLYOON';
        } else {
          // 신규 유저일 때만 이름 생성
          displayName = customName?.trim() || fbUser.displayName || `엔써_${fbUser.uid.substring(0, 5)}`;
          
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
        }

        const newSessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        const account: UserAccount = {
          id: uid,
          provider: 'google',
          email,
          displayName: sanitizeDisplayName(displayName),
          avatarUrl: existingProfile?.avatarUrl || avatarUrl,
          avatarMemberId,
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          isCloudSynced: true,
          securityHash: '',
          sessionId: newSessionId,
        };

        // ⚠️ 순서 중요: Firestore에 새 sessionId를 먼저 기록하여 타 기기 세션을 즉시 무효화한 뒤 로컬 세션 저장
        if (db) {
          try {
            const userDocRef = doc(db, 'nmixx_tcg_users', uid);
            await setDoc(userDocRef, {
              displayName: account.displayName,
              nickname: account.displayName,
              email: account.email,
              avatarUrl: account.avatarUrl,
              avatarMemberId: account.avatarMemberId,
              provider: 'google',
              lastLoginAt: Date.now(),
              sessionId: newSessionId,
            }, { merge: true });
          } catch (e) {
            console.warn('[Auth] Firestore sync warning:', e);
          }
        }

        await AuthService.saveSession(account);
        activityLog.log(account, 'login', { provider: 'google' }); // specs/024
        metrics.identify(account.id); // specs/026: 방문자 ID ↔ 계정 ID

        return account;
      } catch (err: any) {
        console.error('Google Sign-In Error:', err);
        // COOP 또는 팝업 차단 대응 에러 핸들링
        if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('Cross-Origin-Opener-Policy')) {
          throw new Error('로그인 팝업이 닫혔거나 브라우저 보안 정책에 의해 차단되었습니다. 팝업 차단을 해제하거나 다시 시도해 주세요.');
        }
        if (err.code === 'auth/unauthorized-domain') {
          const host = typeof window !== 'undefined' ? window.location.host : '';
          throw new Error(
            `이 주소(${host})는 Firebase 로그인 허용 목록에 없습니다. 로컬에서는 http://localhost:5173 으로 여세요. 배포 주소라면 Firebase 콘솔의 Authentication → Settings → Authorized domains에 그 도메인을 추가해야 합니다.`
          );
        }
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
    const kakao = typeof window !== 'undefined' ? (window as any).Kakao : undefined;

    // SDK가 없으면 로컬 전용 카카오 계정을 만들지 않고 실패로 처리한다 (specs/023 REQ-08, AC-17)
    if (!isSdkReady || !kakao?.Auth || !kakao?.API) {
      throw new Error(KAKAO_AUTH_FAILED_MESSAGE);
    }

    // 1. 카카오 팝업 로그인
    await new Promise<void>((resolve, reject) => {
      kakao.Auth.login({
        success: () => resolve(),
        fail: (err: any) => {
          console.warn('Kakao login popup failed:', err);
          reject(new Error('카카오 로그인 처리 중 문제가 발생했습니다.'));
        },
      });
    });

    // 2. 카카오 토큰을 서버에서 확인받아 Firebase에 kakao_<회원번호>로 로그인 (AC-01, AC-03, AC-04)
    const accessToken: string = kakao.Auth.getAccessToken?.() || '';
    const { uid } = await exchangeKakaoTokenForFirebase(accessToken);

    // 3. 프로필 조회. 실패하면 Firebase 세션만 남지 않게 로그아웃한다 (plan 3절)
    let res: any;
    try {
      res = await new Promise<any>((resolve, reject) => {
        kakao.API.request({ url: '/v2/user/me', success: resolve, fail: reject });
      });
    } catch (err) {
      console.warn('Kakao profile request error:', err);
      if (auth) await firebaseSignOut(auth).catch(() => {});
      throw new Error(KAKAO_AUTH_FAILED_MESSAGE);
    }
    const kakaoId = res?.id ? String(res.id) : '';
    if (!kakaoId || uid !== `kakao_${kakaoId}`) {
      // 서버가 확인한 회원번호와 프로필 회원번호가 다르면 진행하지 않는다
      if (auth) await firebaseSignOut(auth).catch(() => {});
      throw new Error(KAKAO_AUTH_FAILED_MESSAGE);
    }

    const kakaoAccount = res.kakao_account;
    const profileImg = kakaoAccount?.profile?.profile_image_url || '/cards/card_002.webp';
    const email = kakaoAccount?.email || `kakao_${kakaoId}@kakao.com`;

    // 🔑 [1순위] localStorage 기존 세션 확인 — 닉네임 변경 즉시 반영됨
    const existingLocalSession = AuthService.loadSession();
    const hasSameUidSession = existingLocalSession?.id === uid && existingLocalSession.provider === 'kakao';

    // 🛡️ [2순위] Firestore에서 기존 계정 프로필 조회 (타 기기 닉네임 변경 반영)
    const existingProfile = hasSameUidSession ? null : await this.fetchExistingProfile(uid);

    let nickname = '';
    let avatarMemberId = 'HAEWON';
    let avatarUrl = profileImg;

    if (hasSameUidSession && existingLocalSession) {
      nickname = existingLocalSession.displayName;
      avatarMemberId = existingLocalSession.avatarMemberId || 'HAEWON';
      avatarUrl = existingLocalSession.avatarUrl || profileImg;
    } else if (existingProfile && existingProfile.displayName) {
      nickname = existingProfile.displayName;
      avatarMemberId = existingProfile.avatarMemberId || 'HAEWON';
      avatarUrl = existingProfile.avatarUrl || profileImg;
    } else {
      nickname = customName?.trim() || kakaoAccount?.profile?.nickname || `카카오_엔써_${kakaoId.substring(0, 4)}`;

      const available = await AuthService.isNicknameAvailable(nickname, uid);
      if (!available && !customName) {
        nickname = `${nickname}_${kakaoId.substring(0, 3)}`;
      }
    }

    const newSessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const account: UserAccount = {
      id: uid,
      provider: 'kakao',
      email,
      displayName: sanitizeDisplayName(nickname),
      avatarUrl,
      avatarMemberId,
      createdAt: existingLocalSession?.createdAt || Date.now(),
      lastLoginAt: Date.now(),
      isCloudSynced: true,
      securityHash: '',
      sessionId: newSessionId,
    };

    // ⚠️ 순서 중요: Firestore에 새 sessionId를 먼저 기록하여 타 기기 세션을 즉시 무효화한 뒤 로컬 세션 저장
    if (db) {
      try {
        const userDocRef = doc(db, 'nmixx_tcg_users', uid);
        await setDoc(userDocRef, {
          displayName: account.displayName,
          nickname: account.displayName,
          email: account.email,
          avatarUrl: account.avatarUrl,
          avatarMemberId: account.avatarMemberId,
          provider: 'kakao',
          lastLoginAt: Date.now(),
          sessionId: newSessionId,
        }, { merge: true });
      } catch (e) {
        console.warn('[Auth] Firestore sync warning:', e);
      }
    }

    await AuthService.saveSession(account);
    this.setKakaoStatus('connected');
    activityLog.log(account, 'login', { provider: 'kakao' }); // specs/024
    metrics.identify(account.id); // specs/026: 방문자 ID ↔ 계정 ID

    return account;
  }

  /**
   * 🌟 게스트(비로그인) 세션 생성 (클라우드 미동기화, 랭킹 미등록)
   */
  public static async loginAsGuest(customName?: string): Promise<UserAccount> {
    const randomId = SecurityService.generateSecureUID('guest');
    const displayName = customName?.trim() || `게스트_${randomId.substring(6, 10)}`;
    const guestSessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const account: UserAccount = {
      id: 'guest',
      provider: 'guest',
      email: `${randomId.substring(6, 11)}@guest.local`,
      displayName,
      avatarUrl: '/cards/card_001.webp',
      avatarMemberId: 'LILY',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
      isCloudSynced: false,
      securityHash: '',
      sessionId: guestSessionId,
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
      if (user.provider === 'guest' || user.id === 'guest') {
        sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } else {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to persist auth session:', e);
    }
    this.notifyAuthChange(user);
  }

  /**
   * 로컬 세션 로드
   */
  public static loadSession(): UserAccount | null {
    try {
      let data = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!data) {
        data = sessionStorage.getItem(AUTH_STORAGE_KEY);
      }
      if (!data) return null;
      const parsed: UserAccount = JSON.parse(data);
      if (parsed.displayName?.toLowerCase().includes('chip sofa') || parsed.email?.toLowerCase().includes('chip') || parsed.displayName?.includes('운영자')) {
        parsed.displayName = '운영자';
      } else if (parsed.displayName?.includes('박민주') || parsed.displayName === '박민주 사랑해') {
        parsed.displayName = 'anjffhrkwl';
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

    let newDisplayName = updates.displayName ? updates.displayName.trim() : this.currentUser.displayName;
    newDisplayName = sanitizeDisplayName(newDisplayName);
    const isNameChanging = newDisplayName !== this.currentUser.displayName;

    // 🚫 운영자, GM 관련 단어 생성 불가 제한 (대소문자 무관)
    const upperName = newDisplayName.toUpperCase();
    if (upperName.includes('운영자') || upperName.includes('GM')) {
      return { success: false, message: '사용할 수 없는 단어(운영자, GM)가 포함되어 있습니다.' };
    }

    if (isNameChanging) {
      const isAvailable = await this.isNicknameAvailable(newDisplayName, this.currentUser.id);
      if (!isAvailable) {
        return { success: false, message: '이미 사용 중인 닉네임입니다.' };
      }
    }

    const updatedAccount: UserAccount = {
      ...this.currentUser,
      displayName: newDisplayName,
      avatarMemberId: updates.avatarMemberId || this.currentUser.avatarMemberId,
      ...(updates.avatarUrl ? { avatarUrl: updates.avatarUrl } : {}),
      lastLoginAt: Date.now(),
    };

    await this.saveSession(updatedAccount);
    CloudSyncService.forceResetHash();

    // Firestore users 및 leaderboard 문서 실시간 업데이트
    if (isFirebaseConfigured && db && updatedAccount.id && updatedAccount.id !== 'guest') {
      try {
        const userRef = doc(db, 'nmixx_tcg_users', updatedAccount.id);
        await setDoc(userRef, {
          displayName: updatedAccount.displayName,
          nickname: updatedAccount.displayName,
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
    // 🔑 로그아웃 전 현재 유저의 게임 데이터를 Firestore에 강제 저장 (카카오 유저 데이터 유실 방지)
    const userBeforeLogout = this.currentUser;
    if (userBeforeLogout?.isCloudSynced && userBeforeLogout.id && userBeforeLogout.id !== 'guest') {
      try {
        const { StorageService, isLocalServer } = await import('./storageService');
        const { CloudSyncService } = await import('./cloudSyncService');
        if (!isLocalServer()) {
        CloudSyncService.forceResetHash(); // 해시 초기화로 저장 강제
        const savedState = StorageService.loadState(userBeforeLogout.id);
        if (savedState && savedState.coins !== undefined) {
          await CloudSyncService.saveUserGameData(userBeforeLogout, {
            collection: savedState.collection || {},
            coins: savedState.coins,
            dust: savedState.dust || 0,
            pityCounter: savedState.pityCount || 0,
            totalPacksOpened: savedState.openedPacksTotal || 0,
            unlockedAchievements: savedState.claimedAchievements || [],
            claimedSetRewards: savedState.claimedSetRewards || [],
            claimedMailIds: savedState.claimedMailIds || [],
            claimedCouponCodes: savedState.claimedCouponCodes || [],
            hasClaimedMmuEasterEgg: savedState.hasClaimedMmuEasterEgg || false,
            lastMailClaimDate: savedState.lastMailClaimDate || null,
          });
        }
        }
      } catch (e) {
        console.warn('[Auth] Pre-logout Firestore save failed:', e);
      }
    }

    // 로그아웃 기록은 인증이 사라지기 전에 끝낸다 (specs/024 AC-02)
    await activityLog.logAndWait(userBeforeLogout, 'logout', {});

    if (isFirebaseConfigured && auth) {
      try {
        await firebaseSignOut(auth);
      } catch (err) {
        console.warn('Firebase signout error:', err);
      }
    }

    if (typeof window !== 'undefined' && (window as any).Kakao?.Auth?.getAccessToken()) {
      try {
        (window as any).Kakao.Auth.logout(() => {});
      } catch (err) {
        console.warn('Kakao logout error:', err);
      }
    }

    this.currentUser = null;
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {}

    this.setKakaoStatus('none');
    this.notifyAuthChange(null);
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
    this.authListeners.push(callback);

    // 즉시 현재 상태 1회 통지
    const current = this.getCurrentUser();
    callback(current);

    // 카카오 세션이면 Firebase 연결을 확인하고, 필요하면 자동 재연결한다 (specs/023 REQ-04)
    if (current?.provider === 'kakao') {
      void this.ensureKakaoConnection();
    }

    // Firebase Auth 상태 변화 감지 리스너
    let unsubFirebase = () => {};
    if (isFirebaseConfigured && auth) {
      unsubFirebase = onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          const mapped = accountIdForFirebaseUser(fbUser.uid);
          if (mapped.provider === 'kakao') {
            // 카카오 커스텀 토큰 사용자는 구글 계정으로 처리하지 않는다 (specs/023 AC-07)
            const session = AuthService.getCurrentUser();
            if (session?.provider === 'kakao' && session.id === mapped.id) {
              this.setKakaoStatus('connected');
            }
            return;
          }
          const uid = mapped.id;
          const account = AuthService.getCurrentUser();
          if (!account || !account.id.includes(fbUser.uid)) {
            // 🛡️ Firestore에서 기존 커스텀 닉네임 우선 조회
            const existing = await AuthService.fetchExistingProfile(uid);

            const newSessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
            const newAccount: UserAccount = {
              id: uid,
              provider: 'google',
              email: fbUser.email || `nswer_${fbUser.uid.substring(0, 6)}@gmail.com`,
              displayName: sanitizeDisplayName(existing?.displayName || fbUser.displayName || `엔써_${fbUser.uid.substring(0, 5)}`),
              avatarUrl: existing?.avatarUrl || fbUser.photoURL || '/cards/card_003.webp',
              avatarMemberId: existing?.avatarMemberId || 'SULLYOON',
              createdAt: Date.now(),
              lastLoginAt: Date.now(),
              isCloudSynced: true,
              securityHash: '',
              sessionId: newSessionId,
            };
            await AuthService.saveSession(newAccount);
            if (db) {
              try {
                const userDocRef = doc(db, 'nmixx_tcg_users', uid);
                await setDoc(userDocRef, {
                  displayName: newAccount.displayName,
                  nickname: newAccount.displayName,
                  email: newAccount.email,
                  avatarUrl: newAccount.avatarUrl,
                  avatarMemberId: newAccount.avatarMemberId,
                  provider: 'google',
                  lastLoginAt: Date.now(),
                  sessionId: newSessionId,
                }, { merge: true });
              } catch (e) {
                console.warn('[Auth] Firestore sync warning on state change:', e);
              }
            }
          }
        } else {
          // Firebase 로그아웃 감지 시 세션 확인
          const currentSession = AuthService.loadSession();
          if (!currentSession || currentSession.provider === 'google') {
            this.currentUser = null;
            try {
              localStorage.removeItem(AUTH_STORAGE_KEY);
            } catch (e) {}
            this.notifyAuthChange(null);
          }
        }
      });
    }

    return () => {
      this.authListeners = this.authListeners.filter((cb) => cb !== callback);
      unsubFirebase();
    };
  }

  /**
   * 회원 탈퇴: Firestore 계정 데이터 및 Firebase Auth 계정 완전 삭제
   */
  public static async deleteAccount(): Promise<{ success: boolean; message: string }> {
    if (!this.currentUser) {
      return { success: false, message: '로그인 상태가 아닙니다.' };
    }
    // 게스트는 지울 계정이 없다. 진행하면 이 브라우저의 nmixx_ 로컬 저장본만 모두 지워진다.
    if (this.currentUser.provider === 'guest' || this.currentUser.id === 'guest') {
      return { success: false, message: '게스트는 탈퇴할 계정이 없습니다.' };
    }

    const userId = this.currentUser.id;

    // 연결되지 않은 카카오 사용자는 클라우드를 지울 수 없으므로 먼저 다시 연결하게 한다 (specs/023 AC-14)
    if (auth) await auth.authStateReady();
    const blocked = kakaoDeleteBlockedMessage(this.currentUser, auth?.currentUser?.uid ?? null);
    if (blocked) {
      return { success: false, message: blocked };
    }

    // 행동 로그 삭제 (specs/024 REQ-05, DEC-031). 탈퇴 뒤에는 지울 수 없으므로 먼저 지우고, 실패하면 탈퇴를 멈춘다.
    //    Firebase 인증이 없는 세션은 이벤트를 쓸 수 없었으므로 건너뛴다.
    if (isFirebaseConfigured && db && auth?.currentUser) {
      try {
        await activityLog.deleteAll(userId);
        await deleteMetricsIdentity(userId); // specs/026: 계정과 연결된 분석 기록
      } catch (e) {
        console.warn('[Auth] Failed to delete activity events:', e);
        return { success: false, message: '탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
      }
    }

    try {
      // 1. Firestore nmixx_tcg_users 문서 삭제
      if (isFirebaseConfigured && db && userId && userId !== 'guest') {
        try {
          await deleteDoc(doc(db, 'nmixx_tcg_users', userId));
        } catch (e) {
          console.warn('[Auth] Failed to delete user Firestore doc:', e);
        }

        // 2. Firestore nmixx_tcg_leaderboard 문서 삭제
        try {
          await deleteDoc(doc(db, 'nmixx_tcg_leaderboard', userId));
        } catch (e) {
          console.warn('[Auth] Failed to delete leaderboard Firestore doc:', e);
        }
      }

      // 3. Firebase Auth 계정 삭제 (구글, 연결된 카카오 사용자)
      if (auth?.currentUser) {
        try {
          await deleteUser(auth.currentUser);
        } catch (e: any) {
          // requires-recent-login: 재인증 필요 (드문 케이스)
          console.warn('[Auth] Firebase deleteUser error:', e?.code, e?.message);
          if (e?.code === 'auth/requires-recent-login') {
            return { success: false, message: '보안을 위해 다시 로그인 후 탈퇴를 진행해 주세요.' };
          }
        }
      }

      // 4. 로컬 세션 및 localStorage 전체 정리
      this.currentUser = null;
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        // 게임 데이터 키도 함께 제거
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('nmixx_')) keysToRemove.push(key);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {}

      this.setKakaoStatus('none');
      this.notifyAuthChange(null);
      return { success: true, message: '회원 탈퇴가 완료되었습니다.' };
    } catch (error: any) {
      console.error('[Auth] deleteAccount error:', error);
      return { success: false, message: '탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' };
    }
  }
}
