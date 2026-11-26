# Plan 025: 운영자용 행동 로그 조회 화면

- 상태: Implementing
- 최종 수정일: 2026-11-26
- 기준: [spec.md](spec.md)

## 1. 확인한 기존 구조

- `src/main.tsx` — `App`만 렌더링한다. 라우터 없음.
- `src/config/firebase.ts` — `auth`, `db`, `isFirebaseConfigured`를 내보낸다.
- `src/types/activity.ts` — 이벤트 계약(`ActivityEventDoc`, `ACTIVITY_COLLECTION`)
- `src/services/activityLogService.ts` — 이벤트 쓰기·정리 쿼리(`uid`+`at` 복합 인덱스)
- `src/types/multiplayer.ts` — `LeaderboardEntry.displayName`. 랭킹 문서 ID = 계정 ID, 누구나 읽기
- `firestore.rules` — `isOwner(id)`, `nmixx_tcg_events`는 본인만 읽기·삭제
- `tests/rules/setup.ts` — `googleUser`(sign_in_provider `google.com`), `kakaoUser`, `anonymous`, `seed`

## 2. 구조

```text
src/main.tsx                       — location.hash === '#admin'이면 AdminPage를 lazy import, 아니면 App (해시가 바뀌면 새로고침)
src/config/admin.ts                — ADMIN_GOOGLE_UIDS (운영자 Firebase uid, firestore.rules와 같은 값)
src/services/adminLog.ts           — 순수 로직: 기간 시작 시각, 종류 필터, 날짜별 요약, 회원 요약, 이벤트 설명 (단위 테스트)
src/services/adminLogService.ts    — Firestore 읽기: 기간 이벤트(최대 2,001건), 랭킹 닉네임
src/pages/Admin/AdminPage.tsx      — 화면 (GameState와 무관, 읽기만)
firestore.rules                    — isAdmin() 추가, events read에 OR
```

- 게임 상태(`useGameState`)와 저장소를 건드리지 않는다. 쓰기 코드가 없다.
- 조회: `where('at','>=',Timestamp(start)) + orderBy('at','desc') + limit(2001)` — 단일 필드 자동 인덱스로 충분. 2,001건이 오면 2,000건만 쓰고 상한 안내(AC-10).
- 닉네임: 결과에 나온 uid마다 `nmixx_tcg_leaderboard/{uid}` `getDoc`(병렬). 실패하거나 없으면 계정 ID.
- 운영자 판정(화면): `auth.authStateReady()` 후 `currentUser.uid ∈ ADMIN_GOOGLE_UIDS` 그리고 provider `google.com`. 아니면 조회하지 않는다(AC-04). 실제 차단은 규칙.

## 3. 계약

```ts
// src/config/admin.ts
export const ADMIN_GOOGLE_UIDS: readonly string[];

// src/services/adminLog.ts
export type AdminRange = 'today' | '7d' | '30d';
export const ADMIN_FETCH_LIMIT = 2000;
export interface AdminEvent { id: string; uid: string; type: ActivityEventType; atMs: number; kstDate: string; data: Record<string, unknown> }
export interface DaySummary { kstDate: string; activeUsers: number; logins: number; packs: number; rewards: number }
export interface MemberSummary { uid: string; provider: 'google' | 'kakao' | 'other'; events: number; packs: number; lastAtMs: number }
export function rangeStartMs(range: AdminRange, nowMs: number): number;   // KST 자정 기준
export function filterByType(events: AdminEvent[], type: ActivityEventType | 'all'): AdminEvent[];
export function summarizeByDay(events: AdminEvent[]): DaySummary[];       // 최신 날짜 먼저
export function summarizeMembers(events: AdminEvent[]): MemberSummary[];  // 마지막 활동 최신순
export function describeEvent(e: AdminEvent): string;                     // 부가 정보 한 줄
export function formatKst(ms: number): string;                            // 'MM-DD HH:mm'
export const EVENT_TYPE_LABELS: Record<ActivityEventType, string>;
```

규칙:

```
function isAdmin() {
  return request.auth != null
    && request.auth.uid in ['<운영자 uid>']
    && request.auth.token.firebase.sign_in_provider == 'google.com';
}
match /nmixx_tcg_events/{eventId} {
  allow create: (기존 그대로)
  allow read: if isOwner(resource.data.uid) || isAdmin();
  allow delete: if isOwner(resource.data.uid);
}
```

## 6. 테스트

| AC | 방법 | 테스트 |
|---|---|---|
| AC-01 | 규칙 | `tests/rules/admin.test.ts` › `운영자는 uid 조건 없이 기간 목록을 읽는다`, `운영자는 남의 이벤트 문서를 읽는다` |
| AC-02 | 규칙 | `admin.test.ts` › `일반·카카오·비로그인은 전체 목록 거부`, `카카오 uid가 운영자 uid와 같아도 거부`, `본인 조회는 그대로 허용` / 기존 `events.test.ts` |
| AC-03 | 규칙 | `admin.test.ts` › `운영자도 남의 이벤트 삭제·수정·대리 생성 거부` |
| AC-04 | 수동 M1 | 비로그인으로 `/#admin` → 문구 표시, 네트워크에 events 조회 없음 |
| AC-05~08 | 단위 + 수동 M2 | `tests/unit/adminLog.test.ts` › `summarizeByDay`, `summarizeMembers`, `describeEvent`, `filterByType`, `rangeStartMs` / 운영자 계정으로 화면 확인 |
| AC-09 | 단위 + 수동 | 빈 배열 요약 / 화면 문구 |
| AC-10 | 단위 | `capEvents`(2,001건 → 2,000건 + capped) |
| AC-11 | 수동 M3 | 오프라인으로 바꿔 불러오기 → 오류 문구·다시 시도 |

수동 절차
- M1 (Claude): 운영 `/#admin`을 비로그인으로 연다 → AC-04 문구, Firestore `runQuery` 요청 없음. 게임 주소(`/`)는 그대로 동작.
- M2 (운영자): 운영자 구글 계정으로 게임에 로그인 → `/#admin` → 요약·회원 목록·상세·종류 필터 확인.
- M3 (운영자 또는 Claude 로컬): 개발자 도구 오프라인 → 다시 시도.

## 7. 배포

1. `npm run test:rules` 통과
2. `npx firebase deploy --only firestore:rules --project nmixx-tcg` → 운영 ruleset 본문 = 저장소 확인
3. `main` 푸시 → Vercel 성공 → M1
