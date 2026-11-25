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
  sessionId?: string; // 단일 기기 중복 로그인 감지용 세션 고유 ID
}

export interface AuthState {
  user: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// 카카오 → Firebase 커스텀 토큰 교환 API (specs/023 plan 3절, DEC-030)
// POST /api/kakao-firebase-token — 서버(api/)와 클라이언트가 같은 정의를 쓴다.
// ---------------------------------------------------------------------------

export interface KakaoFirebaseTokenRequest {
  /** Kakao.Auth.getAccessToken() 값. 비어 있으면 400 INVALID_REQUEST */
  accessToken: string;
}

export interface KakaoFirebaseTokenResponse {
  /** uid = 'kakao_' + 카카오 회원번호 (DEC-027) */
  customToken: string;
}

export type KakaoFirebaseTokenErrorCode =
  | 'INVALID_REQUEST' // 400: 본문 없음, accessToken이 문자열이 아니거나 비어 있음
  | 'KAKAO_TOKEN_INVALID' // 401: 카카오 -401·-2, 또는 app_id가 우리 앱이 아님
  | 'KAKAO_UNAVAILABLE' // 502: 카카오 -1·-7, 그 밖의 오류 응답, 네트워크 실패, 시간 초과
  | 'METHOD_NOT_ALLOWED' // 405
  | 'SERVER_MISCONFIGURED' // 500: FIREBASE_SERVICE_ACCOUNT·KAKAO_APP_ID 없음
  | 'TOKEN_ISSUE_FAILED'; // 500: 커스텀 토큰 발급 실패

export interface KakaoFirebaseTokenError {
  code: KakaoFirebaseTokenErrorCode;
  /** 운영 로그용. 화면 문구로 쓰지 않는다 (화면은 KAKAO_AUTH_FAILED_MESSAGE 하나) */
  message: string;
}
