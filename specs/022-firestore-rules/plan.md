# Plan 022: Firestore 보안 규칙 강화

- 상태: Implementing
- 최종 수정일: 2026-11-25
- 기준 spec: [spec.md](spec.md) (2026-11-25, Ready)

> 이 문서는 spec을 **어떻게** 구현하는지 적는다. 요구사항을 새로 만들지 않는다.
> spec에 없는 동작이 필요해 보이면 spec을 먼저 고치거나 `[확인 필요]`로 남긴다.

## 1. 기존 코드 조사

직접 열어본 파일만 적는다.

- 관련 구조
  - `firestore.rules` — `users`·`leaderboard`의 쓰기 조건이 `request.auth != null`뿐이다. 전광판은 `nmixx_tcg_feed`로 적혀 있다. `market`은 로그인 사용자 누구나 수정·삭제할 수 있다.
  - `src/services/authService.ts`
    - 계정 ID 형식: 구글은 `goog_${fbUser.uid}`(140·604행), 카카오는 `kakao_${kakaoId}`(250행). SDK가 실패하면 무작위 `kakao_…`(339행)를 쓴다.
    - `isNicknameAvailable`(97~127행): `nmixx_tcg_users`를 `displayName`·`nickname`으로 검색한다. 오류가 나면 `true`를 돌려준다(통과 처리).
    - `fetchExistingProfile`(59행): 본인 문서를 읽는다.
    - 프로필 변경(499·507행): 본인의 `users`·`leaderboard` 문서를 쓴다.
    - `deleteAccount`(681·688행): 본인의 두 문서를 지운다.
    - `subscribeAuthState`(590행~): 로컬 세션으로 먼저 콜백을 호출하고, 그 뒤에 `onAuthStateChanged`가 온다.
  - `src/services/cloudSyncService.ts` — `saveUserGameData`가 본인 `users` 문서를 `setDoc(merge)`한 뒤 `updateLeaderboardEntry`를 호출한다. `subscribeUserGameData`는 본인 문서를 `onSnapshot`으로 구독한다.
  - `src/services/multiplayerService.ts`
    - `fetchLeaderboard`(118행): `leaderboard`를 `orderBy('uniqueCardCount')`로 읽는다. 146~149행에서 `박민주`가 든 이름을 바꾸면서, **다른 사용자**의 `leaderboard`·`users` 문서에 `setDoc`한다.
    - `updateLeaderboardEntry`(179~235행): 본인 랭킹 문서를 쓴다. 운영자면 본인 문서를 지운다.
    - `broadcastHighTierPull`(244행~, `addDoc` 253행): `nmixx_tcg_global_feed`에 `addDoc`한다. 필드는 `uid, userName, cardId, cardName, rarity, member, image, timestamp`다.
    - 전광판 구독(277행): `orderBy('timestamp','desc')`, `limit(15)`.
    - 교환소: `fetchTradeListings`(390행), `createTradeListing`의 `addDoc`(431행), `completeTrade`에서 구매자가 하는 `updateDoc`(465행).
    - `fetchUserProfile`(479~525행): 랭킹 문서를 읽고, 없으면 다른 사용자의 `users` 문서로 대체한다.
    - `fetchUserCollection`(527행~): 다른 사용자의 `users` 문서를 읽는다. 오류가 나면 `{}`를 돌려준다.
  - `src/hooks/useGameState.ts`(170~200행) — 로그인 후 랭킹 갱신과 본인 문서 구독을 시작한다.
  - `src/config/firebase.ts` — 프로젝트 `nmixx-tcg`. 에뮬레이터 연결 코드는 없다.
  - `package.json` — 스크립트는 `dev`·`build`·`preview`뿐이다. `firebase@12.18.0`을 쓴다.
  - `tsconfig.json` — `include: ["src"]`라서 `src` 밖 파일은 `tsc`가 검사하지 않는다.
  - 저장소 루트에 `firebase.json`, `.firebaserc`, `.github/workflows`가 없다.
  - 로컬 환경(2026-11-25 확인): Node v24.19.0. Java와 Firebase CLI는 없다.
- 재사용할 것
  - 저장 payload 모양: `CloudGameData`(`cloudSyncService.ts`)와 `LeaderboardEntry`(`src/types/multiplayer.ts`). 규칙 테스트의 입력으로 쓴다.
- 새로 만들거나 바꿀 것: 5절과 7절 순서 참고.
- 실행·검증 명령: `npx tsc --noEmit`, `npm run build`. 새로 만드는 명령은 `npm run test:rules`(3절).

## 2. 구조와 데이터 흐름

화면 흐름은 바뀌지 않는다. 바뀌는 지점은 Firestore가 요청을 판정하는 곳과, 규칙에 막히는 클라이언트 요청 세 곳이다.

```text
팩 개봉 → useGameState 저장 트리거                 src/hooks/useGameState.ts
  → CloudSyncService.saveUserGameData            src/services/cloudSyncService.ts
      setDoc users/{goog_uid}   ── 규칙 isOwner(id) ──▶ 허용
      updateLeaderboardEntry → setDoc leaderboard/{goog_uid} ── isOwner ──▶ 허용
  → (고등급) broadcastHighTierPull → addDoc global_feed  ── uid == 요청자 ──▶ 허용

랭킹 탭 → fetchLeaderboard → getDocs leaderboard ── 공개 읽기 ──▶ 허용
      (변경) 이름 치환은 화면 값에만 적용. 다른 사용자 문서에 setDoc 하지 않음

닉네임 변경 → isNicknameAvailable
      (변경) users 검색 → leaderboard where displayName == 이름 (공개 읽기)
```

- 실패 지점과 처리 책임
  - 규칙이 거부하면 SDK가 `permission-denied`를 던진다. 기존 서비스 함수들은 이미 `catch`에서 `console.warn`을 남기고 실패 값(`false`, `{}`, `null`)을 돌려준다. 새 오류 형식은 만들지 않는다.
  - 배포 직후 기능이 고장 나면 콘솔 규칙 이력에서 되돌린다(AC-17, 6절 수동 절차).
- 새로고침·재진입 시 동작
  - `subscribeAuthState`는 Firebase 인증이 복원되기 전에 로컬 세션으로 먼저 콜백을 부른다. 이 사이에 Firestore 요청이 나가면 `request.auth`가 null이라 거부된다.
  - 이 문제는 지금 규칙(`request.auth != null`)에서도 똑같이 생긴다. 이번 변경으로 새로 생기는 문제는 아니다. 7절 위험에 기록한다.

## 3. 계약 (단일 원본)

- 계약 원본 위치
  - 접근 권한: `firestore.rules`가 원본이다.
  - 문서 모양: `src/services/cloudSyncService.ts`의 `CloudGameData`와 `src/types/multiplayer.ts`의 `LeaderboardEntry`가 원본이다. 이번에 모양을 바꾸지 않는다.
  - 아래 규칙 코드는 구현 목표다. 구현 후에는 `firestore.rules`가 원본이 되고, 이 절에는 핵심 조건만 남긴다.

### 문서 주인 판단

규칙 본문의 원본은 `firestore.rules`다(T008, 2026-11-25 구현). 여기에는 핵심 조건만 적는다.

| 경로 | 읽기 | 쓰기 |
|---|---|---|
| `nmixx_tcg_users/{id}` | `isOwner(id)` | `isOwner(id)` |
| `nmixx_tcg_leaderboard/{id}` | 누구나 | `isOwner(id)` |
| `nmixx_tcg_global_feed/{itemId}` | 누구나 | 추가만, `isOwner(request.resource.data.uid)`. 수정·삭제 없음 |
| `nmixx_tcg_market/{tradeId}` | 누구나 | 없음 |
| 그 밖의 경로 | 없음 | 없음 |

- `isOwner(id)` = 로그인 상태이고, 다음 둘 중 하나를 만족한다.
  - `id == 'goog_' + request.auth.uid`
  - `id`가 `kakao_.+` 패턴과 맞고, `id == request.auth.uid`이며, `sign_in_provider == 'custom'`
- 계획과의 차이: 정규식을 `^kakao_.+`가 아니라 `kakao_.+`로 썼다. Firestore 규칙의 `matches`는 문자열 전체와 비교하므로 의미는 같다.

- 인증·권한: `firestore.rules`가 전부다. 클라이언트는 권한을 따로 검사하지 않는다.
- 중복 요청·동시 변경: 해당 없음. 규칙은 요청을 하나씩 판정한다. 동시 저장 충돌은 범위 밖이다(DEC-011).
- 부분 실패 시 일관성: `saveUserGameData`가 `users`를 쓴 뒤 `leaderboard`를 쓴다. 두 문서 모두 주인 규칙이 같아서, 한쪽만 거부되는 경우는 인증이 중간에 풀릴 때뿐이다. 현재 동작을 유지한다.

### 카카오 연동 기능에 넘기는 계약

- 카카오 사용자의 Firebase 인증 uid는 문서 ID와 같은 `kakao_<카카오 회원번호>`여야 한다. 이 값을 커스텀 토큰으로 발급한다.
- 이 조건을 지키지 않으면 REQ-05(AC-15, 15a)가 성립하지 않는다. 연동 기능의 spec·plan에 이 계약을 옮겨 적는다(DEC-027).

### 규칙 테스트 명령

```jsonc
// package.json scripts (추가)
"test:rules": "firebase emulators:exec --only firestore --project demo-nmixx-tcg \"vitest run tests/rules\""
```

- `demo-` 접두어 프로젝트는 에뮬레이터 전용이다. 운영 프로젝트 `nmixx-tcg`에 연결되지 않는다.

## 5. 설계 결정

- **주인 판단을 `'goog_' + request.auth.uid`로 한다.** 이유: 문서 ID 형식이 이미 운영 데이터에 있다. ID를 바꾸면 컬렉션과 랭킹 키가 깨진다(DEC-002와 같은 이유). 대안: 문서 ID를 Firebase uid로 옮기기 — 데이터 이전이 필요해 제외.
- **카카오 분기는 `sign_in_provider == 'custom'`일 때만 허용한다.** 이유: 구글 사용자가 `kakao_…` 문서를 쓰지 못하게 막는다. 대안: `id == request.auth.uid`만 검사 — 구글 uid는 `kakao_`로 시작하지 않지만, 접두어와 제공자를 함께 검사하는 쪽이 더 분명하다.
- **전광판 컬렉션 이름은 코드의 `nmixx_tcg_global_feed`에 맞춘다.** 이유: 코드는 처음부터 이 이름을 썼고(specs/011 이력), 운영 데이터도 이 컬렉션에 있을 것이다. 규칙만 고치면 된다.
- **닉네임 중복 확인은 `nmixx_tcg_leaderboard`를 `displayName`으로 검색한다.** 이유: Q-A. 랭킹 문서에는 `nickname` 필드가 없어서 `displayName` 하나만 검색한다. 오류가 나면 통과시키는 현재 동작은 바꾸지 않는다(범위 밖).
- **`fetchUserProfile`의 `users` 대체 조회를 지운다.** 랭킹 문서가 없으면 `null`을 돌려준다. 이유: Q-A. 교환소는 숨김 상태이고 쓰기도 막힌다(Q-B).
- **`fetchUserCollection`은 고치지 않는다.** 이유: 숨김 기능이고, 거부되면 이미 `{}`를 돌려준다. 교환소를 다시 열 때 다룬다(spec Q-A·Q-B).
- **교환소 클라이언트 코드(등록·완료)는 고치지 않는다.** 이유: 메뉴에서 숨겨져 있고, 규칙이 거부하면 기존 `catch`가 실패를 돌려준다.
- **규칙 검증은 Firestore 에뮬레이터와 `@firebase/rules-unit-testing`, Vitest로 자동화한다.** 의존성과 이유는 DEC-027에 적었다. 대안: 콘솔 Rules Playground 수동 확인 — 거부 사례가 20개가 넘고, 규칙을 바꿀 때마다 반복해야 해서 제외(2026-11-25 사용자 결정).
- **운영 배포는 Firebase 콘솔에 `firestore.rules` 내용을 붙여넣는 방식으로 한다.** `firebase.json`은 에뮬레이터 설정용으로만 둔다. 이유: CLI 배포는 운영 프로젝트 로그인이 필요하고, 검증 방식을 정할 때 CLI 배포 안을 고르지 않았다. 바꾸려면 이 줄과 spec Q-F를 고친다.

## 6. AC → 테스트 매핑

- 규칙 테스트 파일: 컬렉션별로 `tests/rules/{users,leaderboard,feed,market,kakao}.test.ts`로 나눈다. 공통 준비 코드(테스트 환경 생성, 인증 컨텍스트, 사전 데이터)는 `tests/rules/setup.ts`에 둔다. 에뮬레이터 연결 확인은 `tests/rules/emulator.test.ts`가 한다. 파일들이 같은 에뮬레이터 데이터를 쓰므로 `--no-file-parallelism`으로 한 파일씩 실행한다. 아래 표의 테스트 위치는 `파일 › 테스트 이름`이다.
- 테스트 환경: `initializeTestEnvironment({ projectId: 'demo-nmixx-tcg', firestore: { rules: readFileSync('firestore.rules') } })`.
- 인증 컨텍스트
  - 구글 사용자: `authenticatedContext('A')` → 문서 `goog_A`
  - 카카오 사용자: `authenticatedContext('kakao_K', { firebase: { sign_in_provider: 'custom' } })` → 문서 `kakao_K`
  - 비로그인: `unauthenticatedContext()`
- 사전 데이터는 `withSecurityRulesDisabled`로 넣는다.

| AC | 테스트 종류 | 테스트 위치·이름 | 핵심 입력 → 기대 결과 |
|---|---|---|---|
| AC-01 | 규칙 자동 + 수동 | `users.test.ts` › `users: 본인 저장 허용` / 수동 M1 | A가 `CloudGameData` 모양 payload로 `users/goog_A`를 merge set → 성공 |
| AC-02 | 규칙 자동 | `users.test.ts` › `users: 타인 문서 쓰기 거부` | A가 `users/goog_B`에 `{coins}` set → 실패, 사전 데이터 그대로 |
| AC-03 | 규칙 자동 | `users.test.ts` › `users: 타인 삭제·비로그인 쓰기 거부` | A가 `goog_B` 삭제 → 실패 / 비로그인이 `goog_B` set → 실패 |
| AC-03a | 규칙 자동 | `users.test.ts` › `users: 타인 읽기·컬렉션 검색 거부` | A가 `goog_B` get → 실패 / A가 `users`를 `where displayName ==` 검색 → 실패 |
| AC-03b | 규칙 자동 + 수동 | `leaderboard.test.ts` › `leaderboard: 닉네임 검색 허용` / 수동 M3 | 비로그인·A가 `leaderboard`를 `where displayName ==` 검색 → 성공 |
| AC-03c | 수동 | M3-b | 랭킹 문서가 없는 닉네임으로 변경 → 허용됨 |
| AC-04 | 규칙 자동 + 수동 | `users.test.ts` › `users·leaderboard: 본인 삭제 허용` / 수동 M5 | A가 `goog_A` 두 문서 삭제 → 성공 |
| AC-05 | 규칙 자동 + 수동 | `leaderboard.test.ts` › `leaderboard: 공개 읽기·본인 쓰기` / 수동 M1 | 비로그인이 `orderBy uniqueCardCount` 조회 → 성공 / A가 `leaderboard/goog_A`를 `LeaderboardEntry` 모양으로 set → 성공 |
| AC-06 | 규칙 자동 | `leaderboard.test.ts` › `leaderboard: 타인 수정·삭제 거부` | A가 `goog_B` update·delete → 실패 |
| AC-07 | 수동 | M2 | 랭킹 탭을 열었을 때 다른 사용자 문서로 가는 Firestore 쓰기 요청 0건, 이름은 `anjffhrkwl`로 표시 |
| AC-08 | 규칙 자동 + 수동 | `feed.test.ts` › `feed: 본인 항목 추가·공개 읽기` / 수동 M4 | A가 `{uid:'goog_A', …}`를 `global_feed`에 add → 성공 / 비로그인이 `orderBy timestamp` 조회 → 성공 |
| AC-09 | 규칙 자동 | `feed.test.ts` › `feed: 수정·삭제·비로그인 추가 거부` | A가 기존 항목 update·delete → 실패 / 비로그인 add → 실패 |
| AC-10 | 규칙 자동 | `feed.test.ts` › `feed: 작성자 uid 위조 거부` | A가 `{uid:'goog_B'}` add → 실패. `{uid:'goog_A', userName:'아무이름'}` → 성공 |
| AC-11 | 규칙 자동 | `market.test.ts` › `market: 등록 거부` | A가 `{sellerUid:'goog_A', …}` add → 실패 |
| AC-12 | 규칙 자동 | `market.test.ts` › `market: 수정·삭제 거부` | A가 본인 글·남의 글의 `status` update와 delete → 모두 실패 |
| AC-13 | 규칙 자동 + 수동 | `market.test.ts` › `market: 공개 읽기` / 수동 M6 | 비로그인이 사전 등록글 get·list → 성공 / 배포 전후 등록글 수가 같음 |
| AC-14 | 수동 | M0 | 콘솔 규칙과 저장소 파일 비교, `kakao_` 문서의 최근 `lastSavedAt` 확인 → product.md Q-01·Q-02에 기록 |
| AC-15 | 규칙 자동 + 수동 | `kakao.test.ts` › `kakao: 본인 문서 쓰기 허용` / 수동 M7 | `kakao_K`(custom) 컨텍스트가 `users`·`leaderboard/kakao_K` set, feed add → 성공. 수동 검증은 카카오 연동 배포 뒤에 한다 |
| AC-15a | 규칙 자동 | `kakao.test.ts` › `kakao: 타인 문서 거부` | `kakao_K`가 `goog_A`·`kakao_J` set → 실패. 구글 A(`sign_in_provider: google.com`)가 `kakao_K` set → 실패 |
| AC-15b | 수동 | M8 | 배포 전 체크: 카카오 연동 배포 기록이 없으면 배포하지 않음 |
| AC-16 | 수동 | M9 | 배포 후 콘솔 규칙 본문과 저장소 파일 비교(공백 제외 동일), 배포 날짜·커밋 기록 |
| AC-17 | 수동 | M10 | 배포 후 M1·M4 중 하나라도 실패하면 콘솔 이력에서 직전 버전 게시 → M1 다시 성공 |
| AC-18 | 규칙 자동 | `market.test.ts` › `기본 거부` | A가 `nmixx_tcg_unknown/x` get·set → 실패 |

### 수동 절차

수동 절차는 운영 Firestore에 직접 닿는다(`npm run dev`도 운영에 연결됨). 테스트 전용 구글 계정만 쓴다.

- **M0 (AC-14, 배포 전)**
  1. Firebase 콘솔 › Firestore › 규칙 화면의 본문을 복사한다.
  2. 저장소 `firestore.rules`(변경 전 커밋)와 비교한다.
  3. 데이터 화면에서 `nmixx_tcg_users` 중 `kakao_`로 시작하는 문서를 몇 개 열어 `lastSavedAt`을 확인한다.
  4. 결과를 날짜와 함께 product.md Q-01·Q-02에 적는다.
- **M1 (AC-01·05)**: 테스트 계정으로 로그인 → 팩 1개 개봉 → 콘솔에서 `users/goog_<uid>`의 `coins`·`lastSavedAt`, `leaderboard/goog_<uid>`의 `uniqueCardCount`가 바뀌었는지 확인한다. 브라우저 콘솔에 `permission-denied`가 없어야 한다. 시크릿 창(비로그인)에서 랭킹 탭이 보여야 한다.
- **M2 (AC-07)**: 개발자도구 Network에서 `firestore.googleapis.com` 요청을 기록하며 랭킹 탭을 연다. 다른 사용자 문서 ID가 들어간 쓰기(Write/Commit) 요청이 없어야 한다. 코드 변경 후라면 배포 전에도 할 수 있다.
- **M3 (AC-03b·03c)**
  - a. 랭킹에 있는 다른 사용자의 닉네임으로 바꾸기 → "이미 쓰는 닉네임" 안내가 나오고 이름이 바뀌지 않아야 한다.
  - b. 랭킹에 없는 새 닉네임 → 변경되어야 한다.
  - 코드 변경 후라면 배포 전에도 할 수 있다(랭킹 문서 읽기는 지금 규칙에서도 공개).
- **M4 (AC-08)**: 테스트 계정으로 전광판 대상 등급이 나올 때까지 개봉한다. 다른 브라우저(비로그인) 전광판에 그 항목이 보여야 한다.
- **M5 (AC-04)**: 테스트 계정으로 탈퇴 → 콘솔에서 두 문서가 사라졌는지, 다른 문서 수는 그대로인지 확인한다.
- **M6 (AC-13)**: 배포 직전과 직후에 `nmixx_tcg_market` 문서 수를 콘솔에서 센다. 두 값이 같아야 한다.
- **M7 (AC-15)**: 카카오 연동 배포 뒤, 카카오 테스트 계정으로 M1·M4를 반복한다.
- **M8 (AC-15b)**: 배포 체크리스트 첫 줄 — decisions.md나 product.md에 카카오 연동 운영 배포 날짜·커밋이 있는지 확인한다. 없으면 멈춘다.
- **M9 (AC-16)**: 콘솔에 붙여넣고 게시한 뒤 콘솔 본문을 다시 복사해 저장소 파일과 비교한다. 배포 날짜·커밋을 product.md Q-01에 기록한다.
- **M10 (AC-17)**: M1·M4가 실패하면 콘솔 규칙 화면의 이전 버전 목록에서 직전 버전을 게시한다. M1을 다시 해서 성공하면, 실패 내용을 product.md에 기록한다.

## 7. 위험과 구현 순서

- 위험·불확실성
  - **인증 복원 전 요청**: 새로고침 직후 Firebase 인증이 복원되기 전에 저장·구독 요청이 나가면 거부된다(2절). 지금 규칙에서도 같지만, 배포 후 M1에서 새로고침 직후 콘솔 오류도 함께 본다. 문제가 보이면 별도로 `/sdd-change`(기능 008)를 한다.
  - **카카오 커스텀 토큰 계약**: 연동 기능이 uid를 `kakao_<id>`로 발급하지 않으면 REQ-05가 깨진다. DEC-027로 계약을 고정하고, 연동 spec에 AC로 넣는다.
  - **Java 요구 버전**: 해결(2026-11-25, T002). Temurin 21.0.12.1로 에뮬레이터 실행을 확인했다. 시스템 PATH에 Java가 없으므로 실행 전에 PATH를 설정해야 한다(DEC-027).
  - **Vercel 설치 시간**: 로컬 새 폴더 측정 9초 → 16초, `node_modules` 355MB → 608MB(DEC-027). Vercel 실제 시간은 푸시 후 배포 로그로 확인한다.
  - **`@firebase/rules-unit-testing` 버전**: 6.x는 `firebase@^13`을 요구한다. 이 프로젝트는 12.18이라 5.x(`^12.0.0` 호환, 최신 5.0.2)를 쓴다.
  - **테스트 타입 검사**: `tsconfig.json`이 `src`만 포함하므로 `tests/`는 `tsc`로 검사되지 않는다. Vitest가 실행 시 변환한다. 테스트 타입 검사가 필요해지면 별도 tsconfig를 둔다(이번 범위 밖).
- 순서
  1. M0으로 운영 상태를 기록한다(AC-14). 코드 변경 전에 한다.
  2. 테스트 기반을 만든다: Java 설치, 의존성 추가, `firebase.json`(에뮬레이터 설정), `test:rules` 스크립트.
  3. 6절의 규칙 테스트를 먼저 쓴다. 지금 규칙으로 실행해 거부 테스트가 실패하는 것을 확인한다.
  4. `firestore.rules`를 다시 쓴다. 모든 규칙 테스트가 통과해야 한다.
  5. 클라이언트를 정리한다: `fetchLeaderboard` 덮어쓰기 제거, `isNicknameAvailable` 랭킹 검색, `fetchUserProfile` 대체 조회 제거. 그다음 `npm run build`, M2·M3.
  6. CLAUDE.md 명령어와 DEC-020 상태를 갱신한다.
  7. (카카오 연동 배포 뒤) M8 → M6 직전 값 → 콘솔 배포 → M9 → M1·M4·M5·M6·M7, 실패하면 M10.

## 8. Ready 조건

- [x] spec의 모든 AC가 6절 표에 있다. (AC-01~18, 03a~c, 15a·b)
- [x] 계약 원본 위치가 하나로 정해졌다. (`firestore.rules`, 문서 모양은 기존 타입)
- [x] 1절의 모든 경로와 명령을 실제로 확인했다. (`npm run test:rules`는 새로 만드는 명령)
- [x] 구현을 막는 `[확인 필요]`가 없다.
