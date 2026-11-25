// 카카오 사용자 Firebase 연결 — Firebase 초기화를 import하지 않는 순수 모듈 (specs/023 plan 3절)
// authService가 실제 fetch·signInWithCustomToken을 주입해 쓴다.
import type { KakaoFirebaseTokenRequest } from '../types/auth';

export const KAKAO_AUTH_FAILED_MESSAGE = '카카오 계정 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.';
export const KAKAO_RELOGIN_MESSAGE = '클라우드 저장을 위해 카카오로 다시 로그인해 주세요.';
export const KAKAO_TOKEN_ENDPOINT = '/api/kakao-firebase-token';

/** 커스텀 토큰 사용자(uid가 'kakao_'로 시작)는 그 uid를 그대로, 나머지는 'goog_' + uid (AC-07, AC-08) */
export function accountIdForFirebaseUser(uid: string): { id: string; provider: 'google' | 'kakao' } {
  if (uid.startsWith('kakao_')) {
    return { id: uid, provider: 'kakao' };
  }
  return { id: `goog_${uid}`, provider: 'google' };
}

export interface ConnectDeps {
  postToken(body: KakaoFirebaseTokenRequest): Promise<Response>;
  signInWithCustomToken(token: string): Promise<{ uid: string }>;
}

/** 서버 교환 → Firebase 로그인. 어떤 실패든 KAKAO_AUTH_FAILED_MESSAGE Error를 던진다 (AC-04) */
export async function connectKakaoToFirebase(accessToken: string, deps: ConnectDeps): Promise<{ uid: string }> {
  if (!accessToken) {
    throw new Error(KAKAO_AUTH_FAILED_MESSAGE);
  }
  let customToken: unknown;
  try {
    const res = await deps.postToken({ accessToken });
    if (!res.ok) {
      let code = '';
      try {
        code = String(((await res.json()) as { code?: unknown }).code ?? '');
      } catch {
        // 무시
      }
      console.warn(`[KakaoConnect] token exchange failed: ${res.status} ${code}`);
      throw new Error(KAKAO_AUTH_FAILED_MESSAGE);
    }
    customToken = ((await res.json()) as { customToken?: unknown }).customToken;
  } catch (e) {
    if ((e as Error)?.message !== KAKAO_AUTH_FAILED_MESSAGE) {
      console.warn('[KakaoConnect] token exchange error:', e);
    }
    throw new Error(KAKAO_AUTH_FAILED_MESSAGE);
  }
  if (typeof customToken !== 'string' || !customToken) {
    throw new Error(KAKAO_AUTH_FAILED_MESSAGE);
  }

  let uid: string;
  try {
    ({ uid } = await deps.signInWithCustomToken(customToken));
  } catch (e) {
    console.warn('[KakaoConnect] Firebase sign-in failed:', e);
    throw new Error(KAKAO_AUTH_FAILED_MESSAGE);
  }
  if (!uid.startsWith('kakao_')) {
    throw new Error(KAKAO_AUTH_FAILED_MESSAGE);
  }
  return { uid };
}

/** 연결되지 않은 카카오 사용자는 탈퇴를 막는다. 막으면 안내 문구, 아니면 null (AC-14) */
export function kakaoDeleteBlockedMessage(
  user: { id: string; provider: string },
  firebaseUid: string | null,
): string | null {
  if (user.provider === 'kakao' && firebaseUid !== user.id) {
    return KAKAO_RELOGIN_MESSAGE;
  }
  return null;
}
