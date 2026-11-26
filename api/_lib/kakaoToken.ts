// 카카오 액세스 토큰 확인 → Firebase 커스텀 토큰 발급 판정 (specs/023 plan 3절, DEC-030)
// '_'로 시작하는 폴더라 Vercel 라우트가 되지 않는다. 네트워크·firebase-admin은 주입받아 단위 테스트한다.
import type {
  KakaoFirebaseTokenError,
  KakaoFirebaseTokenErrorCode,
  KakaoFirebaseTokenResponse,
} from '../../src/types/auth';

export const KAKAO_TOKEN_INFO_URL = 'https://kapi.kakao.com/v1/user/access_token_info';
export const KAKAO_TIMEOUT_MS = 5000;

export interface KakaoTokenInfo {
  id: number; // 카카오 회원번호
  app_id: number; // 토큰이 발급된 앱 ID
}

/** invalid: 토큰이 잘못되었거나 만료됨(-401, -2) / unavailable: 카카오 장애·네트워크·시간 초과 */
export class KakaoApiError extends Error {
  constructor(
    public readonly kind: 'invalid' | 'unavailable',
    message: string,
  ) {
    super(message);
    this.name = 'KakaoApiError';
  }
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** 카카오 공식 API로 토큰을 확인한다. 오류 코드 매핑은 plan 5절(T001 확인) */
export async function fetchKakaoTokenInfo(
  accessToken: string,
  fetchImpl: FetchLike = fetch,
  timeoutMs = KAKAO_TIMEOUT_MS,
): Promise<KakaoTokenInfo> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(KAKAO_TOKEN_INFO_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });
  } catch (e) {
    throw new KakaoApiError('unavailable', `kakao request failed: ${(e as Error)?.name ?? 'error'}`);
  } finally {
    clearTimeout(timer);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    // 본문이 JSON이 아니면 아래 상태 코드로만 판단한다
  }

  if (res.ok) {
    return { id: Number(body.id), app_id: Number(body.app_id) };
  }
  if (res.status === 401 || body.code === -401 || body.code === -2) {
    throw new KakaoApiError('invalid', `kakao rejected token (status ${res.status}, code ${String(body.code)})`);
  }
  throw new KakaoApiError('unavailable', `kakao error (status ${res.status}, code ${String(body.code)})`);
}

export interface IssueDeps {
  fetchTokenInfo(accessToken: string): Promise<KakaoTokenInfo>;
  /** null이면 서버 설정(FIREBASE_SERVICE_ACCOUNT)이 없다는 뜻 */
  createCustomToken: ((uid: string) => Promise<string>) | null;
  /** null이면 KAKAO_APP_ID 설정이 없다는 뜻 */
  expectedAppId: number | null;
}

export type IssueResult =
  | { status: 200; body: KakaoFirebaseTokenResponse }
  | { status: 400 | 401 | 500 | 502; body: KakaoFirebaseTokenError };

function fail(status: 400 | 401 | 500 | 502, code: KakaoFirebaseTokenErrorCode, message: string): IssueResult {
  return { status, body: { code, message } };
}

/**
 * 요청 본문에서 accessToken만 읽는다. 회원번호는 카카오 응답의 id만 쓴다 (AC-03).
 */
export async function issueKakaoFirebaseToken(body: unknown, deps: IssueDeps): Promise<IssueResult> {
  const accessToken =
    body && typeof body === 'object' && typeof (body as { accessToken?: unknown }).accessToken === 'string'
      ? (body as { accessToken: string }).accessToken.trim()
      : '';
  if (!accessToken) {
    return fail(400, 'INVALID_REQUEST', 'accessToken is required');
  }

  const { createCustomToken, expectedAppId } = deps;
  if (createCustomToken === null || expectedAppId === null || !Number.isFinite(expectedAppId)) {
    return fail(500, 'SERVER_MISCONFIGURED', 'server credentials or KAKAO_APP_ID missing');
  }

  let info: KakaoTokenInfo;
  try {
    info = await deps.fetchTokenInfo(accessToken);
  } catch (e) {
    if (e instanceof KakaoApiError && e.kind === 'invalid') {
      return fail(401, 'KAKAO_TOKEN_INVALID', e.message);
    }
    return fail(502, 'KAKAO_UNAVAILABLE', (e as Error)?.message ?? 'kakao unavailable');
  }

  if (info.app_id !== expectedAppId) {
    return fail(401, 'KAKAO_TOKEN_INVALID', 'token was issued for another app');
  }
  if (!Number.isSafeInteger(info.id) || info.id <= 0) {
    return fail(502, 'KAKAO_UNAVAILABLE', 'kakao response has no user id');
  }

  try {
    const customToken = await createCustomToken(`kakao_${info.id}`);
    return { status: 200, body: { customToken } };
  } catch (e) {
    return fail(500, 'TOKEN_ISSUE_FAILED', (e as Error)?.message ?? 'createCustomToken failed');
  }
}
