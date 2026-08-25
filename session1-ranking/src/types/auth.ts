export type AuthProvider = 'google' | 'kakao' | 'guest';

export interface UserAccount {
  id: string; // SHA-256 해시 기반 고유 식별자 (UID)
  provider: AuthProvider;
  email: string;
  displayName: string;
  avatarUrl: string;
  avatarMemberId?: string; // LILY, HAEWON, SULLYOON, BAE, JIWOO, KYUJIN, PARK
  createdAt: number;
  lastLoginAt: number;
  isCloudSynced: boolean;
  securityHash: string; // 데이터 변조 방지용 HMAC 서명
}

export interface AuthState {
  user: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
