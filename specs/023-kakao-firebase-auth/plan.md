# Plan 023: 카카오 사용자 Firebase 인증 연동

- 상태: Implementing
- 최종 수정일: 2026-11-26
- 기준 spec: [spec.md](spec.md) (2026-11-26, Ready)

> 이 문서는 spec을 **어떻게** 구현하는지 적는다. 요구사항을 새로 만들지 않는다.
> spec에 없는 동작이 필요해 보이면 spec을 먼저 고치거나 `[확인 필요]`로 남긴다.

## 1. 기존 코드 조사

직접 열어본 파일만 적는다.

- 관련 구조
  - `src/services/authService.ts`
    - `loginWithKakao`(224행~): `Kakao.Auth.login` → `/v2/user/me` → `fetchExistingProfile` → `nmixx_tcg_users/kakao_<id>`에 프로필 `setDoc` → `saveSession`. Firebase 인증은 받지 않는다.
    - SDK가 준비되지 않으면 무작위 `kakao_…` 로컬 전용 계정을 만든다(325~371행).
    - `subscribeAuthState`(580행~): 로컬 세션으로 콜백을 먼저 부른다. 그다음 `onAuthStateChanged`에서 Firebase 사용자를 **무조건** `goog_${fbUser.uid}` 구글 계정으로 처리한다(592행). Firebase 사용자가 없으면 세션이 구글일 때만 지운다.
    - `deleteAccount`(654행~): 두 문서를 지운 뒤 `auth.currentUser`가 있으면 `deleteUser`를 부른다. 실패 메시지를 `{success, message}`로 돌려준다.
    - `logout`(511행~): 저장 → `firebaseSignOut` → `Kakao.Auth.logout`.
  - `src/hooks/useGameState.ts`(104~225행): 인증 콜백마다 다음 순서로 처리한다.
    - `loadUserGameData`를 부른다.
    - 클라우드가 있으면 `applyCloudData`로 로컬을 덮는다. 이때 `StorageService.saveState`도 부른다.
    - 클라우드가 없으면 로컬 또는 초기 상태로 시작하고 클라우드에 저장한다.
    - 300ms 뒤 랭킹 갱신과 `onSnapshot` 구독을 시작한다.
  - `src/services/storageService.ts`: `saveState(state, userId)`는 `localStorage[nmixx_tcg_user_<id>]`에 그대로 저장한다. 저장 시각은 없다.
  - `src/services/cloudSyncService.ts`: `CloudGameData.lastSavedAt`은 `serverTimestamp()`로 저장된다(읽으면 Firestore `Timestamp`).
  - `src/types/game.ts`: `GameState`에 저장 시각 필드가 없다.
  - `src/types/auth.ts`: `UserAccount`(`provider: 'google' | 'kakao' | 'guest'`)
  - `src/components/Auth/AuthModal.tsx`: 로그인 함수가 던진 `err.message`를 그대로 `errorMessage`로 보여 준다(59행).
  - `src/components/Navigation/Header.tsx`: `user`, `onOpenAuth` props. 로그인 상태면 닉네임을 표시한다(132~145행).
  - `src/App.tsx`: `isAuthModalOpen` 상태(55행), `AuthModal` 렌더(432행). 탈퇴 결과 `message`를 표시한다(368행).
  - `index.html`: 버전 없는 `https://developers.kakao.com/sdk/js/kakao.min.js`(레거시 v1 SDK, `Kakao.Auth.login` 팝업 방식)
  - `src/config/firebase.ts`: `auth`, `db`. `initKakaoSdk()`는 `VITE_KAKAO_JS_KEY`나 기본값을 쓴다.
  - `vercel.json`: 헤더 설정과 `/(.*)` → `/index.html` rewrite만 있다. 저장소에 `api/` 폴더는 없다.
  - `package.json`: `"type": "module"`. `firebase@12.18.0`을 쓴다. `@types/node`는 `node_modules/@types/node`에 있다(간접 의존).
  - 운영 규칙 배포 시각: release `cloud.firestore` → ruleset `d4e4458c…`, `updateTime 2026-11-25T15:13:46.798Z`(firebase-tools rules API로 확인)
- 재사용할 것
  - 기능 022의 `firestore.rules`: 카카오 분기(`kakao_…` == `request.auth.uid` && `sign_in_provider == 'custom'`)를 그대로 쓴다.
  - `tests/rules/kakao.test.ts`: 규칙 수준 AC는 이미 검증되어 있다.
  - Vitest(DEC-027), `AuthModal`의 오류 표시, `deleteAccount`의 `{success, message}` 형식
- 새로 만들거나 바꿀 것: 2절 그림과 7절 순서 참고
- 실행·검증 명령: `npx tsc --noEmit`, `npm run build`, `npm run test:rules`. 새로 만드는 명령은 `npm run test:unit`, `vercel dev`(로컬 함수 실행, 7절 위험).

## 2. 구조와 데이터 흐름

```text
[로그인] 카카오 계정으로 시작
  → Kakao.Auth.login 팝업 성공 → accessToken = Kakao.Auth.getAccessToken()
  → POST /api/kakao-firebase-token { accessToken }            api/kakao-firebase-token.ts
      → GET kapi.kakao.com/v1/user/access_token_info (Bearer) api/_lib/kakaoToken.ts
          → { id, app_id } 확인: app_id == KAKAO_APP_ID
      → firebase-admin createCustomToken('kakao_' + id)       (서비스 계정, DEC-030)
      ← { customToken }
  → signInWithCustomToken(auth, customToken)                  src/services/kakaoConnect.ts (authService가 호출)
      → auth.currentUser.uid == 'kakao_<id>' 확인
  → 기존 흐름: /v2/user/me → 프로필 → users/kakao_<id> setDoc → saveSession
  실패하면 throw Error(KAKAO_AUTH_FAILED_MESSAGE) → AuthModal이 표시 (AC-04)

[앱 시작·재연결] 세션 provider == 'kakao'
  → await auth.authStateReady()
  → auth.currentUser?.uid == session.id ?  connected
  → 아니면 Kakao.Auth.getAccessToken() 있으면 위 서버 교환 → connected → notifyAuthChange(session)
  → 없거나 실패: status = 'needs-login' → App이 AuthModal(notice=RELOG) 열기 + Header 배지

[진행 결정] useGameState 인증 콜백, provider == 'kakao' && connected
  → chooseKakaoProgress(local, cloud, RULES_CUTOFF_MS)        src/services/progressMerge.ts
      'local' → setState(local) + saveUserGameData(local)      (AC-11)
      'cloud' → applyCloudData(cloud)                          (AC-11a, AC-12)
```

- 실패 지점과 처리 책임
  - 서버 함수는 오류 코드를 JSON으로 돌려준다(3절). 클라이언트 `connectKakaoToFirebase`는 어떤 실패든 `KAKAO_AUTH_FAILED_MESSAGE`를 담은 `Error`로 바꿔 던진다. 화면 문구는 하나로 통일한다(spec Q-B).
  - Firestore 거부는 기존처럼 서비스 함수의 `catch`가 처리한다.
- 새로고침·재진입 시 동작
  - Firebase 인증 세션은 브라우저에 남는다(Firebase Auth 기본 지속성은 `browserLocalPersistence`). 그래서 연결된 카카오 사용자는 새로고침해도 `auth.currentUser.uid == kakao_<id>`이다.
  - 연결되지 않은 기존 세션은 위 [재연결] 흐름을 탄다.
  - Firestore 요청이 인증 복원보다 먼저 나가는지 확인해야 한다. 7절 위험에 적었다.

## 3. 계약 (단일 원본)

- 계약 원본 위치
  - 서버 함수 요청·응답 타입과 오류 코드: `src/types/auth.ts`에 추가한다. 서버(`api/`)와 클라이언트가 같은 파일을 import한다.
  - 로컬 저장 시각: `src/types/game.ts`의 `GameState.localSavedAt`
  - 문구 상수, 계정 ID 변환, 카카오 연결·탈퇴 가드: `src/services/kakaoConnect.ts`(Firebase 초기화를 import하지 않는 순수 모듈이라 단위 테스트할 수 있다). `authService`는 이 모듈을 import해서 쓴다.
  - 규칙 배포 기준 시각: `src/services/progressMerge.ts`의 export 상수

### API

| ID | 메서드·경로 | 요청 | 성공 | 오류 | AC |
|---|---|---|---|---|---|
| API-01 | `POST /api/kakao-firebase-token` | `KakaoFirebaseTokenRequest` | `200 KakaoFirebaseTokenResponse` | `400 INVALID_REQUEST`, `401 KAKAO_TOKEN_INVALID`, `405 METHOD_NOT_ALLOWED`, `502 KAKAO_UNAVAILABLE`, `500 SERVER_MISCONFIGURED`, `500 TOKEN_ISSUE_FAILED` | AC-01~04, 09 |

```ts
// src/types/auth.ts (추가)
export interface KakaoFirebaseTokenRequest {
  accessToken: string;            // Kakao.Auth.getAccessToken() 값. 비어 있으면 400
}
export interface KakaoFirebaseTokenResponse {
  customToken: string;            // uid = 'kakao_' + 카카오 회원번호 (DEC-027)
}
export type KakaoFirebaseTokenErrorCode =
  | 'INVALID_REQUEST'             // 본문 없음·accessToken이 문자열이 아니거나 비어 있음
  | 'KAKAO_TOKEN_INVALID'         // 카카오 -401(HTTP 401)·-2(HTTP 400), 또는 app_id가 우리 앱이 아님
  | 'KAKAO_UNAVAILABLE'           // 카카오 -1·-7, 그 밖의 오류 응답, 네트워크 실패, 시간 초과(5초)
  | 'METHOD_NOT_ALLOWED'
  | 'SERVER_MISCONFIGURED'        // FIREBASE_SERVICE_ACCOUNT·KAKAO_APP_ID 없음
  | 'TOKEN_ISSUE_FAILED';         // createCustomToken 실패
export interface KakaoFirebaseTokenError {
  code: KakaoFirebaseTokenErrorCode;
  message: string;                // 운영 로그용. 화면에는 쓰지 않는다
}
```

```ts
// api/_lib/kakaoToken.ts — 순수 로직 (단위 테스트 대상). '_'로 시작해 라우트가 되지 않는다
export interface KakaoTokenInfo { id: number; app_id: number }
export interface IssueDeps {
  fetchTokenInfo(accessToken: string): Promise<KakaoTokenInfo>;  // 401이면 KAKAO_TOKEN_INVALID로 throw
  createCustomToken(uid: string): Promise<string>;
  expectedAppId: number;                                          // KAKAO_APP_ID (JS 키가 아니라 숫자 앱 ID)
}
export async function issueKakaoFirebaseToken(
  body: unknown, deps: IssueDeps,
): Promise<{ status: 200; body: KakaoFirebaseTokenResponse } | { status: number; body: KakaoFirebaseTokenError }>;
```

- 서버 환경 변수(Vercel Production·Preview, 저장소에 넣지 않음)
  - `FIREBASE_SERVICE_ACCOUNT`: 서비스 계정 키 JSON 전체. Sensitive로 저장한다.
  - `KAKAO_APP_ID`: 카카오 앱 ID(숫자)
- 인증·권한
  - 클라이언트가 보낸 회원번호는 받지 않는다. 회원번호는 카카오 `access_token_info`의 `id`만 쓴다(AC-03).
  - `app_id`가 다르면 다른 앱이 발급한 토큰이므로 거부한다.
- 중복 요청·동시 변경: 커스텀 토큰 발급은 상태를 바꾸지 않으므로 중복 요청해도 안전하다. 남용 방지는 spec Q-G로 남긴다(기본 없음).
- 부분 실패 시 일관성
  - `signInWithCustomToken`이 성공한 뒤 `/v2/user/me`가 실패하면 `firebaseSignOut`을 부르고 실패로 처리한다. 카카오 세션 없이 Firebase 세션만 남지 않게 하기 위해서다.

### 로컬 저장 시각과 진행 결정

```ts
// src/types/game.ts (추가)
export interface GameState {
  // ...
  /** 이 기기에서 진행이 마지막으로 바뀐 시각(epoch ms). 클라우드에서 받은 상태면 클라우드 lastSavedAt. 없으면 기능 023 이전 저장본 */
  localSavedAt?: number;
}

// src/services/progressMerge.ts
/** DEC-028 규칙 배포 시각 = ruleset d4e4458c release updateTime */
export const RULES_CUTOFF_MS = Date.parse('2026-11-25T15:13:46.798Z');
export type ProgressChoice = 'local' | 'cloud';
export function chooseKakaoProgress(
  local: Pick<GameState, 'localSavedAt'> | null,
  cloudLastSavedAtMs: number | null,      // 클라우드 문서·진행 필드가 없으면 null
  cutoffMs = RULES_CUTOFF_MS,
): ProgressChoice;
// 규칙 (spec REQ-05, DEC-029)
// - local == null → 'cloud' (AC-12)
// - cloudLastSavedAtMs == null → 'local'
// - local.localSavedAt 있음 → 더 큰 쪽 (같으면 'cloud')
// - local.localSavedAt 없음 → cloud < cutoff ? 'local' : 'cloud'
```

- `localSavedAt` 갱신 규칙
  - 진행 필드(`collection`, `coins`, `dust`, `pityCount`, `openedPacksTotal`, `claimed*`, `hasClaimedMmuEasterEgg`, `lastMailClaimDate`)가 바뀐 상태를 저장할 때만 `Date.now()`로 바꾼다.
  - 앱을 열어 상태를 다시 저장하기만 할 때는 시각을 바꾸지 않는다. 바꾸면 오래된 기기의 로컬이 "최신"으로 보이기 때문이다.
  - `applyCloudData`는 클라우드 `lastSavedAt`을 ms로 넣는다.
  - (구현 메모 2026-11-26) 시각은 `StorageService`가 아니라 `useGameState`의 저장 지점에서 붙인다. 진행 서명(`progressSignature`)을 직전 값과 비교해, 바뀌었고 불러오는 중·다른 기기 반영 중이 아닐 때만 갱신한다.
  - (구현 메모) 로컬 저장본에 진행이 없으면(`hasProgress` false: 연 팩 0, 카드 0) 시각이 없더라도 클라우드를 쓴다. 새 기기에서 만들어진 빈 초기 저장본이 "더 최근 로컬"로 판단되어 클라우드 진행을 덮지 않게 하기 위해서다.

### 문구 상수

```ts
// src/services/kakaoConnect.ts
export const KAKAO_AUTH_FAILED_MESSAGE = '카카오 계정 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.';
export const KAKAO_RELOGIN_MESSAGE = '클라우드 저장을 위해 카카오로 다시 로그인해 주세요.';
```

### Firebase 사용자 → 계정 ID

```ts
// src/services/kakaoConnect.ts (단위 테스트 대상)
/** 커스텀 토큰 사용자(uid가 'kakao_'로 시작)는 그 uid를 그대로, 나머지는 'goog_' + uid */
export function accountIdForFirebaseUser(uid: string): { id: string; provider: 'google' | 'kakao' };

/** 서버 교환 → signInWithCustomToken. 어떤 실패든 KAKAO_AUTH_FAILED_MESSAGE Error를 던진다 */
export async function connectKakaoToFirebase(
  accessToken: string,
  deps: {
    postToken(body: KakaoFirebaseTokenRequest): Promise<Response>;   // fetch('/api/kakao-firebase-token')
    signInWithCustomToken(token: string): Promise<{ uid: string }>;
  },
): Promise<{ uid: string }>;   // uid는 'kakao_'로 시작해야 함. 아니면 실패

/** 연결되지 않은 카카오 사용자는 탈퇴를 막는다 (AC-14) */
export function kakaoDeleteBlockedMessage(
  user: { id: string; provider: string },
  firebaseUid: string | null,
): string | null;   // 막으면 KAKAO_RELOGIN_MESSAGE, 아니면 null
```

## 4. 화면 구현

- 진입 경로: 기존 로그인 창. 라우트는 바뀌지 않는다.
- 컴포넌트
  - `AuthModal` — `notice?: string` prop을 추가한다. 있으면 창 위쪽에 안내 문구를 보여 준다(AC-09a). 오류 문구 표시는 기존 그대로다(AC-04, AC-17).
  - `Header` — `cloudSaveBlocked?: boolean`, `onReconnect?: () => void` prop을 추가한다. true면 닉네임 옆에 `클라우드 저장 안 됨` 작은 버튼을 보여 주고, 누르면 안내와 함께 로그인 창을 연다(AC-10에서 "다시 볼 수 있는 곳").
  - `App` — `AuthService.subscribeKakaoConnection(status => …)`로 `'connected' | 'needs-login'`을 받는다. `'needs-login'`이면 처음 한 번 `AuthModal`을 `notice=KAKAO_RELOGIN_MESSAGE`로 연다. 닫으면 Header 배지만 남는다.
- 상태 관리
  - 연결 상태는 화면용 상태라 `App`의 `useState`에 둔다.
  - `GameState`는 바꾸지 않는다. 단, `localSavedAt`은 저장 계층(useGameState·StorageService)에서만 쓴다(CLAUDE.md 규칙).

## 5. 설계 결정

- **서버 쪽 처리는 Vercel Function 하나(`api/kakao-firebase-token.ts`)로 한다.** 이유: 이미 Vercel에 배포되고, 같은 도메인이라 CORS가 필요 없다. 대안: Firebase Cloud Functions — 유료(Blaze) 요금제가 필요하고 배포 경로가 둘이 된다. DEC-030에 기록한다.
- **자격 증명은 서비스 계정 키 JSON을 Vercel Sensitive 환경 변수로 둔다.** 2026-11-26 사용자 결정이다. 대안: Vercel OIDC + Workload Identity Federation — 키는 없지만 GCP 설정 단계가 많다. DEC-030.
- **카카오 확인은 `GET https://kapi.kakao.com/v1/user/access_token_info`로 한다.** `id`와 `app_id`를 함께 준다. `/v2/user/me`는 앱 ID를 주지 않아 다른 앱의 토큰을 구별할 수 없다. 2026-11-26 T001에서 카카오 공식 문서(developers.kakao.com/docs/ko/kakaologin/rest-api#get-token-info, rest-api/error-code)로 확인한 내용은 다음과 같다. 요청은 `Authorization: Bearer <token>` 헤더를 쓴다. 200 응답은 `id`(Long, 회원번호), `app_id`(Integer, 토큰이 발급된 앱 ID), `expires_in`(Integer, 초)을 준다. 오류 응답은 `-401`(HTTP 401, 유효하지 않거나 만료된 토큰·앱 불일치), `-2`(HTTP 400, 인자·토큰 형식 오류), `-1`·`-7`(HTTP 400, 일시 장애·점검)이다. 매핑: `-401`·`-2` → `KAKAO_TOKEN_INVALID`(401), `-1`·`-7`·그 밖의 5xx·시간 초과 → `KAKAO_UNAVAILABLE`(502). 이용 한도와 요금은 문서에 적혀 있지 않다.
- **새 의존성 `firebase-admin`(dependencies, 서버 함수 전용)을 추가한다.** 이유: 커스텀 토큰 서명. 대안: 서비스 계정 키로 JWT를 직접 서명 — 코드가 늘고 실수 위험이 크다. 최신 14.5.1은 Node 22 이상이 필요하고 Vercel 기본은 Node 26이라 맞는다. 클라이언트 번들에는 들어가지 않는다(`api/`만 import). DEC-030에 제안으로 기록한다.
- **서버 함수는 Web 표준 `export async function POST(request: Request)` 형식으로 쓴다.** Vercel Node 런타임이 지원하므로 `@vercel/node` 타입 의존성이 필요 없다.
- **`api/` 타입 검사는 `api/tsconfig.json`(Node 타입)으로 분리하고 `npm run build`에 `tsc -p api`를 추가한다.** 루트 tsconfig는 DOM 대상이고 `src`만 포함하기 때문이다.
- **Firebase 사용자를 계정 ID로 바꾸는 로직을 `accountIdForFirebaseUser` 하나로 모은다.** `onAuthStateChanged`가 카카오 사용자를 `goog_`로 만들지 않게 하기 위해서다(AC-07).
- **진행 결정은 카카오 사용자가 연결된 시점에만 적용한다.** 구글 흐름(`applyCloudData` 우선)은 그대로 둔다(spec REQ-05).
- **로컬 전용 카카오 계정 분기를 삭제한다**(spec Q-D). SDK가 없으면 `KAKAO_AUTH_FAILED_MESSAGE`를 던진다.
- **Q-C(인증 유지 기간)**: Firebase 세션은 로그아웃하거나 토큰이 폐기될 때까지 유지된다. 구글과 같다. 카카오 액세스 토큰 만료와는 관계가 없다(교환할 때만 쓴다). spec Q-C는 이 동작으로 정리할지 사용자 확인이 필요하다.

## 6. AC → 테스트 매핑

- 단위 테스트: `npm run test:unit` = `vitest run tests/unit`(새 스크립트)
- 규칙 테스트: `npm run test:rules`(기존)
- 수동 테스트: 카카오 테스트 계정과 운영 Firestore가 필요하다. 테스트 계정 문서만 쓴다.

| AC | 테스트 종류 | 테스트 위치·이름 | 핵심 입력 → 기대 결과 |
|---|---|---|---|
| AC-01 | 단위 + 수동 | `tests/unit/kakaoToken.test.ts` › `유효 토큰 → kakao_<id> 커스텀 토큰` / 수동 K1 | tokenInfo `{id:123, app_id:APP}` → 200, `createCustomToken('kakao_123')` 호출 / 새 기기 로그인 → 팩 개봉 → `users/kakao_<id>.lastSavedAt`·랭킹 갱신, 콘솔 `permission-denied` 없음 |
| AC-02 | 수동 | K2 | 문서 없는 테스트 카카오 계정 로그인 → `kakao_<id>` 문서만 생김, `goog_` 문서 없음 |
| AC-03 | 단위 + 규칙(기존) + 수동 | `kakaoToken.test.ts` › `app_id 불일치 거부`, `카카오 401 거부`, `본문의 id 무시` / `tests/rules/kakao.test.ts` › `kakao: 타인 문서 거부` / 수동 K3 | 다른 app_id → 401 `KAKAO_TOKEN_INVALID`, 발급 호출 없음 / 본문 `{accessToken, id:'J'}` → id 무시 / 임의 문자열 토큰으로 API 호출(curl) → 401 |
| AC-04 | 단위 + 수동 | `kakaoToken.test.ts` › `카카오 시간 초과 → 502`, `설정 없음 → 500` / `tests/unit/kakaoConnect.test.ts` › `서버 실패 → KAKAO_AUTH_FAILED_MESSAGE`, `kakao_ 아닌 uid → 실패` / 수동 K4 | 개발자도구에서 `/api/kakao-firebase-token` 차단 → 로그인 창에 실패 문구, 헤더 닉네임 없음 |
| AC-05 | 수동 | K5 | K1 뒤 새로고침 → 로그인 창 안 뜸, 팩 개봉 시 문서 갱신 |
| AC-06 | 수동 | K6 | 브라우저를 닫고 다음 날 다시 열기 → 팩 개봉 저장 성공 |
| AC-07 | 단위 + 수동 | `tests/unit/kakaoConnect.test.ts` › `kakao_ uid는 그대로`, `그 외는 goog_` / 수동 K5 | `accountIdForFirebaseUser('kakao_1')` → `{id:'kakao_1', provider:'kakao'}` / K5 후 세션 ID `kakao_…`, `goog_kakao_` 문서 없음(콘솔 조회) |
| AC-08 | 단위 + 수동 | `kakaoConnect.test.ts` › `구글 uid` / 수동 M1(기능 022와 같음) | `('abc')` → `goog_abc` / 구글 로그인·개봉·새로고침 정상 |
| AC-09 | 수동 | K7 | 기능 023 배포 전 상태로 만든 기존 카카오 세션(Firebase 세션 없음) → 사이트 열기 → 클릭 없이 연결, 개봉 저장 |
| AC-09a | 수동 | K8 | K7에서 카카오 토큰을 지운 브라우저 → 재로그인 안내가 보임 → 로그인 후 연결 |
| AC-10 | 수동 | K9 | K8 안내 닫기 → Header `클라우드 저장 안 됨` 배지, 개봉 시 로컬만 바뀜 |
| AC-11 | 단위 + 수동 | `tests/unit/progressMerge.test.ts` › `시각 없는 로컬 + 배포 전 클라우드 → local` / 수동 K10 | `(local{}, 10-31)` → `'local'` |
| AC-11a | 단위 | `progressMerge.test.ts` › `시각 없는 로컬 + 배포 후 클라우드 → cloud` | `(local{}, 11-27)` → `'cloud'` |
| AC-11b | 단위 | `progressMerge.test.ts` › `둘 다 시각 있음 → 늦은 쪽`, `같으면 cloud` | 로컬 11-28 vs 클라우드 11-27 → `'local'`, 반대 → `'cloud'` |
| AC-12 | 단위 | `progressMerge.test.ts` › `로컬 없음 → cloud`, `클라우드 없음 → local` | `(null, x)` → `'cloud'` / `(local, null)` → `'local'` |
| AC-13 | 규칙(기존) + 수동 | `tests/rules/users.test.ts` › `본인 삭제 허용`(구글), `kakao.test.ts`(카카오 쓰기) / 수동 K11 | 연결된 카카오 테스트 계정 탈퇴 → 두 문서 삭제, Firebase Auth 사용자 목록에서 `kakao_<id>` 사라짐 |
| AC-14 | 단위 + 수동 | `tests/unit/kakaoConnect.test.ts` › `연결 안 된 카카오 → 재로그인 메시지`, `연결된 카카오·구글 → null` / 수동 K12 | `auth.currentUser == null`, provider kakao → `{success:false, message:KAKAO_RELOGIN_MESSAGE}` |
| AC-15 | 문서 확인 | `docs/decisions.md` DEC-030 | 서버 범위·자격 증명·비용이 적혀 있음 |
| AC-16 | 수동(운영) | K13 | 운영 배포 후 K1·K5·K7 반복, 결과 기록 |
| AC-17 | 수동 | K14 | 개발자도구에서 `developers.kakao.com` 요청 차단 → 실패 문구, `kakao_` 세션·문서 생성 없음 |

### 수동 절차

공통 조건
- 카카오 테스트 계정 2개(문서 있음 / 없음)가 필요하다.
- 실행 환경은 `vercel dev`(로컬, 함수 포함) 또는 Preview 배포다. 둘 다 카카오 플랫폼 도메인 등록이 필요하다(7절).
- 운영 Firestore에 연결되므로 테스트 계정만 쓴다.

- **K1**: 새 브라우저 프로필 → 카카오 로그인 → 팩 1개 → 콘솔에서 `users/kakao_<id>.lastSavedAt`, `leaderboard/kakao_<id>` 확인. 브라우저 콘솔 오류 없음.
- **K2**: 문서 없는 테스트 계정으로 K1을 한다. 콘솔에서 `goog_` 쪽 새 문서가 없는지 본다.
- **K3**: 아래 명령의 응답이 `401` `KAKAO_TOKEN_INVALID`인지 본다.
  ```text
  curl -X POST <배포주소>/api/kakao-firebase-token -H "content-type: application/json" -d "{\"accessToken\":\"forged\"}"
  ```
- **K4**: 개발자도구 Network › Block request URL에 `/api/kakao-firebase-token`을 넣고 카카오 로그인 → 실패 문구가 보여야 한다.
- **K5**: K1 뒤 새로고침 → 팩 1개 → 문서 갱신, `localStorage` 세션 ID `kakao_…`.
- **K6**: K1 뒤 브라우저를 종료하고 다음 날 연다 → 팩 1개 → 저장되어야 한다.
- **K7**: 배포 전 코드로 카카오 로그인해 둔 브라우저(또는 Firebase IndexedDB만 지운 브라우저) → 새 코드로 연다 → 자동 연결, 팩 저장.
- **K8**: K7 브라우저에서 카카오 토큰 저장소(SDK v1 저장 위치, T001에서 확인)를 지우고 연다 → `KAKAO_RELOGIN_MESSAGE` 안내 → 로그인하면 연결된다.
- **K9**: K8 안내를 닫는다 → Header 배지가 보이고, 개봉하면 콘솔 문서는 바뀌지 않는다.
- **K10**: 테스트 계정 클라우드 `lastSavedAt`이 배포 전인 상태, 로컬은 더 많은 도감 → 연결 → 화면·문서가 로컬 값이어야 한다. 테스트 데이터는 규칙을 끈 에뮬레이터가 아니라, 테스트 계정의 기존 문서를 쓴다.
- **K11**: 연결된 테스트 계정으로 탈퇴 → 두 문서 삭제, Firebase 콘솔 Authentication 사용자 목록에서 사라짐.
- **K12**: K9 상태에서 탈퇴 → 탈퇴되지 않고 안내가 보여야 한다.
- **K13**: 운영에서 K1·K5·K7을 하고 tasks 검증 기록에 남긴다.
- **K14**: `developers.kakao.com` 요청을 막고 카카오 로그인 → 실패 문구가 보여야 한다.

## 7. 위험과 구현 순서

- 위험·불확실성
  - **[확인 필요: 카카오 SDK v1이 새로고침 뒤에도 `Kakao.Auth.getAccessToken()`으로 토큰을 돌려주는지 — 영향: AC-09 자동 재연결. 돌려주지 않으면 모든 기존 사용자가 AC-09a(재로그인 안내)로 간다 — 구현 막음: 아니오, T001에서 확인]**
  - **카카오 플랫폼 도메인**: 로그인 팝업은 카카오 개발자 콘솔에 등록된 사이트 도메인에서만 동작한다. `localhost:3000`과 Preview 도메인이 등록되어 있는지 운영자가 확인해야 한다. [확인 필요: 등록 현황 — 구현 막음: 아니오, 수동 검증을 막음]
  - **`vercel.json` rewrite**: `/(.*)` → `/index.html`이 `/api/*`를 가로채지 않는지 Preview 배포에서 확인한다. Vercel은 파일 시스템·함수를 rewrite보다 먼저 보지만, 실제 배포로 확인한다.
  - **인증 복원보다 먼저 나가는 Firestore 요청**: 앱 시작 때 로컬 세션으로 먼저 `loadUserGameData`를 부른다. Firestore SDK가 첫 요청 전에 인증 초기화를 기다리지 않으면, 구글·카카오 모두 첫 불러오기와 `onSnapshot`이 거부될 수 있다. 기능 022 배포 후 구글 사용자에게도 해당되는 위험이다. 첫 작업에서 로그인된 구글 테스트 계정으로 새로고침 직후 콘솔 오류를 확인하고, 있으면 `auth.authStateReady()` 뒤로 미루는 수정을 이 기능에 포함한다(spec 008 영향, `/sdd-change`).
  - **서비스 계정 키 유출**: 키는 Vercel Sensitive 변수에만 둔다. 확인 방법은 두 가지다. 빌드 결과 `dist/`에서 `private_key` 검색 결과가 0건이어야 하고, `git log -p`에도 키 문자열이 없어야 한다.
  - **Vercel 함수 비용·시간**: 로그인할 때만 호출된다. firebase-admin 콜드 스타트는 1~2초 정도로 예상한다. 실제 값은 Preview에서 잰다.
- 순서
  1. 사전 확인: SDK v1 토큰 유지, 카카오 도메인 등록, 구글 새로고침 직후 Firestore 거부 여부, 카카오 `access_token_info` 문서
  2. 운영자 준비: Firebase 서비스 계정 키 생성 → Vercel Sensitive 변수 `FIREBASE_SERVICE_ACCOUNT`, `KAKAO_APP_ID`(Production·Preview)
  3. 계약: `src/types/auth.ts`, `src/types/game.ts`, `firebase-admin` 추가, DEC-030 확정
  4. 단위 테스트 작성(실패 확인): kakaoToken, progressMerge, kakaoConnect
  5. 구현
     - 서버 함수
     - `kakaoConnect`(순수) → `authService`: 연결, 재연결, 오인 방지, SDK 없음 처리, 탈퇴 가드
     - `progressMerge`·`useGameState`·`StorageService` 저장 시각
     - `AuthModal`·`Header`·`App`
  6. 검증: `vercel dev` 또는 Preview에서 K1~K12, K14 → 운영 배포 → K13

## 8. Ready 조건

- [x] spec의 모든 AC가 6절 표에 있다. (AC-01~17, 09a, 11a·11b)
- [x] 계약 원본 위치가 하나로 정해졌다. (`src/types/auth.ts`, `src/types/game.ts`, 상수는 각 서비스 파일)
- [x] 1절의 모든 경로와 명령을 실제로 확인했다. (`npm run test:unit`, `vercel dev`, `api/`는 새로 만듦)
- [x] 구현을 막는 `[확인 필요]`가 없다. (7절의 세 항목은 첫 작업에서 확인하며 구현을 막지 않음)
