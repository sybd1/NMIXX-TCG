// POST /api/kakao-firebase-token — 카카오 로그인 사용자에게 Firebase 커스텀 토큰을 발급한다.
// specs/023-kakao-firebase-auth, DEC-030. 게임 데이터는 다루지 않는다.
// 필요한 Vercel 환경 변수: FIREBASE_SERVICE_ACCOUNT(서비스 계정 키 JSON, Sensitive), KAKAO_APP_ID(숫자)
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { fetchKakaoTokenInfo, issueKakaoFirebaseToken } from './_lib/kakaoToken';

let adminApp: App | null | undefined;

function getAdminApp(): App | null {
  if (adminApp !== undefined) return adminApp;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    adminApp = null;
    return adminApp;
  }
  try {
    const serviceAccount = JSON.parse(raw);
    adminApp = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) });
  } catch {
    console.error('[kakao-firebase-token] FIREBASE_SERVICE_ACCOUNT is not valid JSON');
    adminApp = null;
  }
  return adminApp;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const app = getAdminApp();
  const appIdRaw = process.env.KAKAO_APP_ID;
  const result = await issueKakaoFirebaseToken(body, {
    fetchTokenInfo: (token) => fetchKakaoTokenInfo(token),
    createCustomToken: app ? (uid) => getAuth(app).createCustomToken(uid) : null,
    expectedAppId: appIdRaw ? Number(appIdRaw) : null,
  });

  if (result.status !== 200) {
    // 토큰 값은 남기지 않는다. 운영 로그에는 오류 코드만.
    console.warn(`[kakao-firebase-token] ${result.status} ${result.body.code}`);
  }
  return json(result.status, result.body);
}

export function GET(): Response {
  return json(405, { code: 'METHOD_NOT_ALLOWED', message: 'use POST' });
}
