# Plan 024: 이용자 행동 로그

- 상태: Implementing
- 최종 수정일: 2026-11-26
- 기준 spec: [spec.md](spec.md) (2026-11-26, Ready — 잠정 결정 DEC-031)

> 이 문서는 spec을 **어떻게** 구현하는지 적는다. 요구사항을 새로 만들지 않는다.

## 1. 기존 코드 조사

직접 열어본 파일만 적는다. 이 plan은 `main` 기준이다. 기능 023 코드는 `feat/023-kakao-firebase-auth` 브랜치에만 있다.

- 관련 구조
  - `src/hooks/useGameState.ts`
    - 인증 콜백(104행~): 로그인 이용자의 클라우드 불러오기를 한다. 세션 시작 이벤트를 넣을 위치다.
    - `commitPackOpening(cost, packResults)`(314행): 실제 팩 개봉 확정 지점이다. `App.tsx` 400행이 유일한 호출처다. 팩 ID는 넘어오지 않는다.
    - `claimSetReward`(457행), `claimAchievement`(470행), `claimXrCard`(483행), `claimMail`(522행), `redeemCouponCode`(551행): 모두 `setState` 업데이터 안에서 "이미 받음"을 검사한다.
    - `stateRef`로 최신 상태를 볼 수 있다.
  - `src/services/authService.ts`: `loginWithGoogle`, `loginWithKakao`, `logout`(저장 → `firebaseSignOut`), `deleteAccount`(users·leaderboard 문서 → `deleteUser`)
  - `src/services/storageService.ts`: `isLocalServer()` — localhost, 127.0.0.1, 사설 IP, `.local`이면 true. 클라우드 저장도 이 함수로 막는다(DEC-017).
  - `src/config/firebase.ts`: `db`, `isFirebaseConfigured`
  - `firestore.rules`: `isOwner(id)` 함수(기능 022)
  - `firebase.json`: `firestore.rules` 경로, 에뮬레이터 설정. 인덱스 파일은 없다.
  - 운영 Firestore 인덱스: `npx firebase firestore:indexes --project nmixx-tcg` 결과 `indexes: []`, `fieldOverrides: []`(2026-11-26 확인)
  - `src/pages/Settings/SettingsPage.tsx`: 정보 탭. 탈퇴 영역 위에 고지를 넣을 수 있다.
  - `src/components/Auth/AuthModal.tsx`: 닉네임 입력 영역(110행~)
  - `tests/rules/setup.ts`: `googleUser`, `kakaoUser`, `anonymous`, `seed`, `readAsAdmin`, `countAsAdmin`
- 재사용할 것: `isOwner` 규칙 함수, `isLocalServer`, 규칙 테스트 헬퍼, Vitest
- 실행·검증 명령: `npm run test:rules`, `npx tsc --noEmit`, `npm run build`. 새로 만드는 명령은 `npm run test:unit`이다(기능 023 브랜치와 같은 스크립트를 `main`에도 추가).

## 2. 구조와 데이터 흐름

```text
useGameState 액션(팩 개봉·보상)            src/hooks/useGameState.ts
  → (이미 받음이 아닐 때만) logActivity(user, type, data)
AuthService 로그인 성공·로그아웃 직전       src/services/authService.ts
  → logActivity(user, 'login' | 'logout', …)
useGameState 인증 콜백(로그인 이용자 불러오기 후)
  → logActivity(user, 'session_start') + purgeOldActivity(uid)

logActivity                                 src/services/activityLogService.ts
  → shouldLog(user)? (로그인·비게스트·클라우드 연동·localhost 아님)
  → addDoc(nmixx_tcg_events, { uid, type, at: serverTimestamp(), kstDate, sessionId, data })
  → 실패는 console.warn만 (await 하지 않음, AC-05)

AuthService.deleteAccount
  → deleteAllActivity(uid)  실패 시 탈퇴 중단(AC-13)
  → 기존 users·leaderboard 삭제 → deleteUser
```

- 실패 지점과 처리 책임
  - 이벤트 쓰기와 오래된 이벤트 삭제는 `activityLogService` 안에서 잡고 끝낸다. 호출하는 쪽은 결과를 기다리지 않는다.
  - 탈퇴 시 삭제만 예외를 던지고, `deleteAccount`가 기존 실패 문구로 바꾼다.
- 새로고침·재진입: `sessionId`는 페이지를 열 때마다 새로 만든다(메모리). 세션 시작 이벤트는 인증 콜백마다 한 번 쓴다.

## 3. 계약 (단일 원본)

- 계약 원본 위치
  - 이벤트 타입: `src/types/activity.ts`(새 파일)
  - 권한: `firestore.rules`
  - 인덱스: `firestore.indexes.json`(새 파일)

```ts
// src/types/activity.ts
export type ActivityEventType =
  | 'session_start' | 'login' | 'logout' | 'pack_open'
  | 'set_reward' | 'achievement' | 'xr_card' | 'coupon' | 'mail';

export interface ActivityEventDataMap {
  session_start: Record<string, never>;
  login: { provider: 'google' | 'kakao' };
  logout: Record<string, never>;
  pack_open: { packId: string; packCount: number; cost: number; rarities: Record<string, number> };
  set_reward: { setId: string; coins: number };
  achievement: { achievementId: string; coins: number };
  xr_card: { cardId: string };
  coupon: { code: string; coins: number };
  mail: { mailId: string; coins: number };
}

/** Firestore 문서 (컬렉션 nmixx_tcg_events, 문서 ID 자동) */
export interface ActivityEventDoc<T extends ActivityEventType = ActivityEventType> {
  uid: string;            // 계정 ID (goog_… / kakao_…) — 작성자 본인이어야 함
  type: T;
  at: unknown;            // serverTimestamp() — 규칙에서 request.time과 같아야 함
  kstDate: string;        // 'YYYY-MM-DD' (Date.now() + 9h)
  sessionId: string;      // 페이지 로드마다 새 값, 최대 40자
  data: ActivityEventDataMap[T];   // 키 8개 이하
}

export const ACTIVITY_RETENTION_DAYS = 90;
export const ACTIVITY_PURGE_LIMIT = 100;
```

### 규칙 (firestore.rules에 추가)

```text
match /nmixx_tcg_events/{eventId} {
  allow create: if isOwner(request.resource.data.uid)
    && request.resource.data.keys().hasOnly(['uid','type','at','kstDate','sessionId','data'])
    && request.resource.data.keys().hasAll(['uid','type','at','kstDate','sessionId','data'])
    && request.resource.data.type in ['session_start','login','logout','pack_open',
                                      'set_reward','achievement','xr_card','coupon','mail']
    && request.resource.data.at == request.time
    && request.resource.data.kstDate is string && request.resource.data.kstDate.matches('[0-9]{4}-[0-9]{2}-[0-9]{2}')
    && request.resource.data.sessionId is string && request.resource.data.sessionId.size() <= 40
    && request.resource.data.data is map && request.resource.data.data.size() <= 8;
  allow read, delete: if isOwner(resource.data.uid);   // 오래된 이벤트 정리·탈퇴 삭제용(본인만)
  // update 없음 → 거부
}
```

- 공식 문서 근거: `request.time`은 서버 타임스탬프로 쓴 필드와 같다(rules reference `Request.time`).
- 목록 조회는 `where('uid','==', 본인 ID)`가 있어야 규칙을 통과한다.

### 인덱스 (firestore.indexes.json)

```json
{ "indexes": [ { "collectionGroup": "nmixx_tcg_events", "queryScope": "COLLECTION",
    "fields": [ { "fieldPath": "uid", "order": "ASCENDING" }, { "fieldPath": "at", "order": "ASCENDING" } ] } ],
  "fieldOverrides": [] }
```

- 오래된 이벤트 정리 쿼리 `where uid == me && where at < (지금 − 90일) && limit 100`에 필요하다.
- 운영의 기존 인덱스는 비어 있으므로, 배포해도 지워지는 인덱스가 없다.

### 서비스 (src/services/activityLogService.ts)

```ts
export function kstDateString(nowMs: number): string;                       // (nowMs + 9h) → YYYY-MM-DD
export function shouldLog(user: UserAccount | null, isLocal: boolean): boolean;
export function buildActivityEvent<T extends ActivityEventType>(
  uid: string, type: T, data: ActivityEventDataMap[T], sessionId: string, nowMs: number,
): Omit<ActivityEventDoc<T>, 'at'>;
export function summarizeRarities(cards: { rarity: string }[]): Record<string, number>;
export function logActivity<T extends ActivityEventType>(user: UserAccount | null, type: T, data: ActivityEventDataMap[T]): void;
export async function purgeOldActivity(user: UserAccount | null): Promise<void>;   // 실패는 삼킴
export async function deleteAllActivity(uid: string): Promise<void>;             // 실패 시 throw
```

## 4. 화면 구현

- `SettingsPage`: 탈퇴 영역 위에 고지 문단을 둔다. 문구는 spec 5절.
- `AuthModal`: 닉네임 입력 아래에 짧은 안내 한 줄을 둔다. 문구는 spec 5절.
- 상태 변화는 없다.

## 5. 설계 결정

- **기록 지점**
  - 게임 행동: `useGameState` 액션
  - 로그인·로그아웃·탈퇴: `AuthService`
  - 실제 쓰기: `activityLogService` 한 곳
  - 컴포넌트는 Firestore를 쓰지 않는다(CLAUDE.md). 팩 ID는 `App`이 `commitPackOpening`의 세 번째 인자로 넘긴다.
- **이미 받은 보상 검사**: `setState` 업데이터 안에서 기록하지 않는다. React가 업데이터를 두 번 실행할 수 있기 때문이다. 업데이터 밖에서 `stateRef.current`로 같은 조건을 먼저 검사하고 기록한다(AC-06).
- **localhost에서는 쓰지 않는다**: `isLocalServer()`로 막는다(DEC-017과 같음). 그래서 개발 서버로는 이벤트 쓰기를 확인할 수 없고, 에뮬레이터 규칙 테스트와 단위 테스트로 확인한다.
- **기다리지 않는 쓰기**: `logActivity`는 `void` 함수다. 내부에서 `addDoc(...).catch()`로 처리한다(AC-05).
- **`npm run test:unit` 스크립트를 `main`에도 추가한다.** 기능 023 브랜치에 같은 스크립트가 있어 합칠 때 충돌하지 않는다.

## 6. AC → 테스트 매핑

| AC | 테스트 종류 | 테스트 위치·이름 | 핵심 입력 → 기대 결과 |
|---|---|---|---|
| AC-01 | 단위 + 규칙 + 수동 | `tests/unit/activityLog.test.ts` › `팩 개봉 이벤트 모양`, `summarizeRarities` / `tests/rules/events.test.ts` › `본인 이벤트 생성 허용` / 수동 E1 | 생성 문서가 규칙 통과, `kstDate` KST |
| AC-02 | 단위 + 수동 | `activityLog.test.ts` › `세션·로그인·로그아웃 이벤트 모양` / 수동 E1 | 운영 로그인 후 콘솔에 세 종류 문서 |
| AC-03 | 규칙 + 단위 | `events.test.ts` › `타인 uid·비로그인 생성 거부` / `activityLog.test.ts` › `shouldLog: 게스트·비연동·localhost 제외` | 거부 |
| AC-04 | 규칙 | `events.test.ts` › `형식 위반 거부` | 모르는 종류, 추가 필드, 클라이언트 시각, `data` 키 9개, 날짜 형식 → 거부 |
| AC-05 | 단위 + 코드 검토 | `activityLog.test.ts` › `logActivity는 예외를 밖으로 던지지 않는다` | `addDoc`이 거부되어도 throw 없음, 반환값 없음 |
| AC-06 | 코드 검토 + 수동 | 수동 E2 | 받은 보상 다시 누르기 → 이벤트 수 그대로 |
| AC-07 | 단위 + 규칙 + 수동 | `activityLog.test.ts` › `보상 이벤트 모양` / `events.test.ts` › `모든 종류 생성 허용` / 수동 E2 | 종류 9개 모두 규칙 통과 |
| AC-08 | 규칙 + 수동 | `events.test.ts` › `본인 uid 조회 허용` / 수동 E3 | 콘솔에서 uid 필터·정렬 |
| AC-09 | 규칙 | `events.test.ts` › `타인·비로그인 조회 거부`, `uid 조건 없는 목록 거부` | 거부 |
| AC-10 | 규칙 + 수동 | `events.test.ts` › `오래된 이벤트 정리 쿼리·삭제 허용(본인)` / 수동 E4 | 본인 `uid ==`·`at <` 쿼리와 삭제 허용 |
| AC-11 | 단위 | `activityLog.test.ts` › `purgeOldActivity는 실패를 삼킨다` | 쿼리 실패해도 throw 없음 |
| AC-12 | 규칙 + 수동 | `events.test.ts` › `본인 삭제 허용, 타인 삭제 거부` / 수동 E5 | |
| AC-13 | 단위 | `activityLog.test.ts` › `deleteAllActivity는 실패를 던진다` + 코드 검토(`deleteAccount`가 먼저 호출하고 실패 시 중단) | |
| AC-14 | 수동 | E6 | 정보 탭·로그인 창 문구 확인(로컬 dev에서 가능) |

### 수동 절차

운영 Firestore. 로그인한 테스트 계정이 필요해 운영자가 한다. E6만 로컬에서 할 수 있다.

- **E1**: 운영 사이트에서 테스트 구글 계정 로그인 → 팩 1개 → 콘솔 `nmixx_tcg_events`를 `uid == goog_<uid>`로 거름 → `login`, `session_start`, `pack_open` 문서와 필드 확인 → 로그아웃 → `logout` 확인
- **E2**: 새 보상(세트·업적·우편·쿠폰) 받기 → 이벤트 1개씩. 같은 보상을 다시 누르면 늘지 않는다.
- **E3**: 콘솔 필터 `uid ==`, 정렬 `at`
- **E4**: 테스트 계정 이벤트 하나의 `at`을 콘솔에서 91일 전으로 바꾸고 재접속 → 그 문서가 사라짐
- **E5**: 테스트 계정 탈퇴 → `uid ==` 결과 0건
- **E6**: `npm run dev` → 정보 탭과 로그인 창에서 문구 확인

## 7. 위험과 구현 순서

- 위험
  - 인덱스가 만들어지기 전에는 정리 쿼리가 실패한다. 실패는 삼키므로 화면에는 영향이 없다. 배포 후 `firebase firestore:indexes`로 확인한다.
  - 카카오 사용자는 기능 023 전까지 기록되지 않는다(spec 2절).
  - 규칙 배포는 운영 전체에 즉시 적용된다. 기존 18개 규칙 테스트와 새 이벤트 테스트를 함께 통과해야만 배포한다. 배포 직후 운영에서 로그인 없는 읽기·쓰기 결과가 이전과 같은지 다시 확인한다.
- 순서
  1. 계약(`src/types/activity.ts`)
  2. 테스트(단위·규칙) 실패 확인
  3. 서비스 → 규칙·인덱스 → 훅·AuthService → 화면
  4. 검사 → 규칙·인덱스 배포 → `main` 푸시(Vercel) → 운영 확인

## 8. Ready 조건

- [x] spec의 모든 AC가 6절 표에 있다. (AC-01~14)
- [x] 계약 원본 위치가 하나로 정해졌다.
- [x] 1절의 모든 경로와 명령을 실제로 확인했다.
- [x] 구현을 막는 `[확인 필요]`가 없다.
