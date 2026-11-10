# 결정 기록 (ADR)

프로젝트 구조·기술·계약·정책에 영향을 주는 결정만 남긴다. 대화 내용이나 오탈자 수정은 남기지 않는다.
확정된 결정을 바꿀 때는 기존 항목을 지우지 않고, 새 항목을 추가한 뒤 기존 항목의 상태를 `대체됨 → DEC-NNN`으로 바꾼다.

> 날짜와 근거는 git 커밋을 우선하고, git 이전(2026-08-21까지)은 `src/data/patchNotes.ts`를 따른다. 커밋 시각은 KST.
> - `main` 이력은 2026-08-31 통합 커밋 `cf6cea8`부터 시작한다. 세션 폴더 8개로 복사본이 난립해 루트 하나로 합쳤기 때문이다(GitHub 이슈 #13).
> - 그 이전 이력(2026-08-22 첫 커밋 `5c97931` ~ 08-30)은 `main`과 공통 조상이 없는 PR #5·#10·#11 브랜치에 남아 있다. 보려면 `git fetch origin '+refs/pull/*/head:refs/remotes/origin/pr/*'` 후 `git log origin/pr/11`.
> - 08-30 PR #11과 08-31 `cf6cea8` 사이의 변경(세션 폴더에서 한 작업)은 커밋 기록 없이 `cf6cea8`에 한꺼번에 들어 있다.

---

## DEC-001: 자체 서버 없이 정적 SPA + Firebase로 구성

- 날짜: 2026-08-19 (패치노트) / 첫 커밋 `5c97931` 2026-08-22, Firebase 연동 `c1f9506`·`2c9a956` 2026-08-23~24
- 상태: 확정
- 관련: 전체
- 배경: 1인 개발 팬 게임이라 서버 운영 비용과 관리 부담을 없애야 했다.
- 결정: React SPA를 Vercel 정적 호스팅에 올리고, 계정은 Firebase Auth·Kakao SDK, 저장은 브라우저 `localStorage`와 Cloud Firestore를 클라이언트에서 직접 쓴다. 게임 규칙(추첨·재화 계산)도 전부 클라이언트에서 실행한다.
- 검토한 대안: Express + DB 서버 — 운영 부담이 커서 제외. (`migrations/001_add_finish_type.sql`은 이 시점 이전 SQL 구상의 흔적이며 실행하지 않는다.)
- 영향: 재화·컬렉션은 클라이언트가 계산해 그대로 저장하므로 조작을 서버에서 막을 수 없다. 보안은 `firestore.rules`에만 의존한다 (product.md 7절 Q-01).

## DEC-002: 카드 데이터는 팩별 JSON, 도감 기준은 MASTER_CARDS

- 날짜: 2026-08-25 (`e087903` JSON 분리). 카드 `id` 불변 원칙은 2026-08-23 `10bc978`(구버전 카드를 `(Legacy)`로 보존)부터
- 상태: 확정
- 관련: specs/001-card-catalog
- 배경: 처음에는 카드를 `src/data/cards.ts` TS 상수에 직접 적었다. 카드 수가 600(`16a0bd0`) → 740(`c4ec7ea`) → 651(`a3558c8`)로 바뀌고 NX 팩 재편(`591b6d6`, 08-23)을 거치며 파일이 커졌고, 특정 카드 ID를 코드에 하드코딩한 분기(JYP 이스터에그)가 섞였다.
- 결정: 카드는 `src/data/card-data/op0N.json`에 팩별로 두고 `src/data/cards.ts`가 `MASTER_CARDS`로 합친다. 도감 총수, 수집률 분모, 팩 전종 업적 판정은 모두 이 배열 길이에서 계산한다. 카드 `id`는 사용자 컬렉션의 키이므로 한 번 배포하면 바꾸지 않는다. 카드 ID 하드코딩 분기는 카드 속성으로 바꾼다(`9cf5922`).
- 검토한 대안: 기존 TS 상수 유지 — 위 문제로 교체.
- 영향: `gameConfig.ts`의 `BOOSTER_PACKS[].totalCards`, 업적 설명문의 장수는 표시용이며 실제 장수와 다르다 (product.md 7절 Q-04).

## DEC-003: 9등급, 정수 가중치 10,000, 가공은 등급에 종속

- 날짜: 2026-08-22 첫 커밋(8등급) / 2026-08-23 확률 재조정 `8215038`, XR 추가로 9등급 `3f58979`
- 상태: 확정
- 관련: specs/001-card-catalog, specs/002-pack-draw
- 배경: 부동소수점 확률 누적 오차를 없애고, 등급과 시각 효과를 일관되게 맞춰야 했다.
- 결정: C·UC·R·SR·SSR·UR·LR·MR·XR 9등급. 팩 추첨은 `[0, 9999]` 정수 난수와 누적 가중치(C 5166 / UC 3000 / R 1500 / SR 250 / SSR 45 / UR 25 / LR 12 / MR 2 / XR 0)로 한다. 가공(`FinishType`)은 `RARITY_TO_FINISH`로 등급에서 결정한다.
- 검토한 대안: 카드별 개별 확률 — 팩 구성마다 재계산이 필요해 제외.
- 영향: 가중치가 `gameConfig.ts`의 `RARITY_CONFIGS[].weight`와 `rngService.ts`의 `WEIGHT_*` 상수 두 곳에 있다. 실제 추첨은 `rngService.ts` 값을 쓴다. 바꿀 때 두 곳을 함께 고친다.

## DEC-004: 효과음은 Web Audio 합성, 음원 파일 없음

- 날짜: 2026-08-22
- 상태: 확정
- 관련: specs/003-pack-opening
- 배경: 공식 음원은 저작권 문제로 쓸 수 없고, 오디오 파일은 번들을 키운다.
- 결정: `src/services/soundService.ts`가 오실레이터로 효과음을 합성한다. 음소거 여부는 `GameState.soundMuted`에 저장한다.
- 검토한 대안: 무료 효과음 파일 — 자산 관리 부담으로 제외. / 팩마다 곡 하이라이트 5~10초 재생(GitHub 이슈 #6·#9, 미완료) — 공식 음원 저작권 때문에 구현하지 않았다.
- 영향: 브라우저 정책상 첫 사용자 입력 전에는 소리가 나지 않는다 (`sound.init()`이 `resume` 처리).

## DEC-005: 천장 50팩, SSR 이상 보장

- 날짜: 2026-08-23 (`12ccfb7` 천장 50팩)
- 상태: 확정
- 관련: specs/002-pack-draw AC-08~11, product.md Q-05
- 배경: 0.45% 이하 등급은 운이 나쁘면 수백 팩을 열어도 안 나온다.
- 결정: SSR 이상 없이 49팩을 연 상태(`pityCount ≥ 49`)에서 여는 다음 팩의 5번째 카드는 SSR 70% · UR 20% · LR 8% · MR 2%로 뽑는다. 팩에 SSR 이상이 하나라도 있으면 `pityCount`를 0으로, 없으면 +1 한다.
- 미보유 우선 지급(스마트 천장)의 이력: 2026-08-23 `4960592`에서 구현해 천장 카드는 미보유 SSR+를 100% 주었다. PR #11(08-30)까지 동작했고, 08-31 통합 커밋 `cf6cea8`에서 `rollCard`의 매개변수가 `_userCollection`·`_forceUnowned`(미사용)로 바뀌며 꺼졌다. 끈 이유를 적은 커밋이나 이슈는 없다. 화면의 "미보유 SSR+ 100% 확정" 문구는 이때 남은 것이다.
- 영향: `GameState.pityCount`, `GAME_CONFIG.PITY_THRESHOLD`.

## DEC-006: XR 카드 1장은 전종 수집 보상, 보유 1장 제한

- 날짜: 2026-08-23 (`3f58979` XR 추가, `1eb0e5c` 팩 풀에서 제외, `1fb2ae0` 1장 제한, `60e14d2` 도감 진입 시 지급 연출)
- 상태: 확정
- 관련: specs/006-xr-reward
- 배경: 수집 완주에 상징적인 보상이 필요했다.
- 결정: XR(`card_xr_transcendent_park_741`, `special.json`)은 팩 추첨 풀에서 제외하고, 나머지 카드를 모두 모으면 지급한다. 팩·교환·제작·localStorage 저장본 로드에서 보유 수를 1로 제한한다. 클라우드 데이터 적용(`applyCloudData`)은 제한하지 않는다(값을 그대로 복사).
- 검토한 대안: 극저확률 추첨 — 운에 좌우되어 제외.
- 영향: `rngService.rollCard`, `useGameState`의 모든 카드 추가 액션, `StorageService.loadState`.

## DEC-007: 3D 부스터 팩은 Three.js, WebGL이 없으면 2D

- 날짜: 2026-08-23 (`a70f557` Three.js 팩) / 2D 대체 2026-08-30 (`9ab2f4a`)
- 상태: 확정
- 관련: specs/003-pack-opening
- 배경: 팩 개봉의 손맛이 게임의 핵심 경험이다.
- 결정: `BoosterPackThreeView`/`BoosterPack3DScene`이 3D 팩을 그린다. 개봉 화면에서 렌더 중 예외가 나면 `WebGLErrorBoundary`가 `BoosterPack2DView`로 바꾼다. (`src/utils/webgl.ts`의 사전 검사 함수는 만들었으나 호출하지 않는다. 팩 탭 캐러셀에는 오류 경계가 없다.)
- 검토한 대안: CSS 3D 변환만 사용 — 재질 표현이 부족해 제외.
- 영향: 번들에 `vendor-three` 청크(약 536kB)가 생긴다.

## DEC-008: 로그인은 구글(Firebase 팝업)과 카카오(JS SDK)

- 날짜: 2026-08-23~24 (`b6c681b`·`c1f9506` 구글·카카오 로그인, `a006373` Kakao SDK v1 팝업으로 전환)
- 상태: 확정
- 관련: specs/007-auth
- 배경: 주 사용자층이 한국 팬이라 카카오가 필요하고, 구글은 Firebase가 기본 지원한다.
- 결정: 구글은 `signInWithPopup`, 카카오는 `Kakao.Auth.login` 후 `/v2/user/me`로 프로필을 받는다. 계정 ID는 `goog_<firebase uid>` / `kakao_<kakao id>`. 카카오 로그인은 Firebase Auth에 로그인하지 않는다.
- 검토한 대안: Firebase 커스텀 토큰으로 카카오 연동 — 토큰 발급 서버가 필요해 제외(DEC-001).
- 영향: 카카오 사용자는 Firestore 요청에서 `request.auth`가 null이다. 저장소 `firestore.rules`대로라면 쓰기가 거부된다 (product.md 7절 Q-02). Vercel에 COOP `same-origin-allow-popups` 헤더가 필요하다(DEC-021).

## DEC-009: 게스트 데이터는 저장하지 않는다

- 날짜: 2026-08-24 (`c7b13bd` UID별 저장 분리, `9cff327` 게스트 비저장) / 게스트 세션을 `sessionStorage`로 옮김 2026-08-31 (`5601a41`)
- 상태: 확정
- 관련: specs/008-save-sync
- 배경: 게스트와 로그인 계정 데이터가 섞여 덮어쓰기 사고가 났다. 로그아웃해도 원래 계정의 컬렉션·업적이 그대로 남는 버그가 보고되었다(GitHub 이슈 #6).
- 결정: 게스트(`id: 'guest'`)는 저장하지 않고 새로고침하면 초기 상태(100만 N)로 돌아간다. 게스트 세션 정보만 `sessionStorage`에 둔다. 예외: MMU 이스터에그 수령 표시는 `localStorage['nmixx_mmu_claimed_guest']`에 남아 새로고침 후 게스트는 다시 받을 수 없다. 로그인 계정만 `localStorage`(`nmixx_tcg_user_<id>`)와 Firestore에 저장하고 랭킹에 오른다.
- 검토한 대안: 게스트 진행을 로그인 시 이관 — 계정 간 데이터 혼입 위험으로 제외.
- 영향: `StorageService.saveState`가 게스트면 아무 것도 하지 않는다.

## DEC-010: 한 계정은 한 기기에서만 로그인

- 날짜: 2026-08-31 (`3adcccd`, 보완 `b806f1f`·`e91f763`·`c7cd451`)
- 상태: 대체됨 → DEC-011
- 관련: specs/008-save-sync
- 배경: 두 기기에서 동시에 플레이하면 마지막 저장이 앞선 저장을 덮었다.
- 결정: 로그인 시 `sessionId`를 Firestore에 쓰고, 다른 기기의 세션이 감지되면 강제 로그아웃한다.
- 검토한 대안: 다기기 실시간 동기화 — 이 시점에는 피드백 루프 문제가 있었다.
- 영향: 새로고침만 해도 자기 자신과 충돌하는 문제가 반복되어 같은 날 롤백했다(`47f84b9`). 요구 자체는 GitHub 이슈 #9 "한 번에 하나의 계정만 로그인 가능"에서 나왔다.

## DEC-011: 단일 세션 강제 대신 다기기 실시간 동기화

- 날짜: 2026-08-31 (`47f84b9` 롤백, `6293536` 피드백 루프 수정)
- 상태: 확정
- 관련: specs/008-save-sync
- 배경: DEC-010의 세션 충돌 감지가 새로고침에서도 오작동했다.
- 결정: 세션 강제는 없앤다(`sessionId`는 기록만 하고 검사하지 않는다). 로그인 계정은 Firestore `nmixx_tcg_users/<uid>`를 `onSnapshot`으로 구독해 다른 기기의 변경을 받는다. 받은 변경은 다시 업로드하지 않고(`skipNextCloudSaveRef`), 충돌은 마지막 쓰기가 이긴다.
- 검토한 대안: 서버 트랜잭션 병합 — DEC-001로 불가.
- 영향: 두 기기에서 동시에 팩을 열면 한쪽 결과가 사라질 수 있다(알려진 한계).

## DEC-012: 운영자 계정은 초기 상태가 다르고 랭킹에서 제외

- 날짜: 2026-08-24 (`c8b07a9`·`04b6b9a` 운영자 닉네임) / 초기 상태 2026-08-31 (`d08d8dc`·`64d875d`)
- 상태: 확정
- 관련: specs/007-auth, specs/010-leaderboard
- 배경: 운영자가 테스트하면서 랭킹 1위를 차지하면 안 된다.
- 결정: ID나 이메일에 `chip`이 들어가거나, 표시 이름에 `운영자`가 있거나, 운영자 이메일(`authService.ts`·`useGameState.ts`에 하드코딩)로 로그인한 계정을 운영자로 본다. 클라우드 문서가 없을 때 1억 N과 전종 보유로 시작하고, 랭킹 문서는 저장하지 않고 지운다.
- 주의(코드 검토로 확인): 로그인 함수가 `saveSession` 전에 같은 유저 문서에 프로필 필드를 먼저 쓰므로, 로그인 직후 `loadUserGameData`는 대개 "문서 있음"으로 판단해 `applyCloudData`(기본값 100만 N, 빈 컬렉션)로 간다. 그래서 새 운영자 계정이 1억 N·전종으로 시작하는 분기는 실제로는 거의 타지 않는다(specs/008 plan 7절).
- 검토한 대안: Firestore에 역할 필드 — 클라이언트가 직접 쓸 수 있어 의미가 없음(DEC-001).
- 영향: 판별 로직이 `storageService.ts`, `useGameState.ts`, `multiplayerService.ts`, `authService.ts` 네 곳에 흩어져 있다. 바꿀 때 전부 고친다.

## DEC-013: 닉네임 변경 잠금

- 날짜: 2026-08-31 (`16c5f0e`)
- 상태: 대체됨 → DEC-014
- 관련: specs/013-profile
- 배경: 닉네임을 바꿔 운영자를 사칭하는 사례가 우려되었다.
- 결정: UI와 서비스에서 닉네임 변경을 막는다.
- 영향: 정상 사용자도 이름을 못 바꾸는 불편이 커서 같은 날 되돌렸다.

## DEC-014: 닉네임 변경 허용, 금지어·중복 검사

- 날짜: 2026-08-31 (`2a3fd6a` 되돌림, `dd24c6f` GM·운영자 금지어) / 중복 검사는 2026-08-24 `fd940ce`부터
- 상태: 확정
- 관련: specs/013-profile
- 배경: DEC-013을 되돌리면서 사칭 방지는 규칙으로 처리하기로 했다.
- 결정: 앞뒤 공백 제거 후 2자 이상. `운영자`, `GM`(대소문자 무관)을 포함하면 거부. Firestore `displayName`·`nickname` 필드에 같은 이름이 다른 UID로 있으면 거부. `sanitizeDisplayName()`이 특정 닉네임을 고정 문자열로 치환한다.
- 검토한 대안: 운영자 승인제 — 운영 부담으로 제외.
- 영향: 중복 검사는 클라이언트 쿼리라 동시에 같은 이름을 등록하는 경쟁은 막지 못한다. 조회 실패 시 통과시킨다.

## DEC-015: 게임 초기화 대신 회원 탈퇴

- 날짜: 2026-08-31 (`7653e1d`)
- 상태: 확정
- 관련: specs/014-account-deletion
- 배경: "게임 리셋"이 계정·랭킹 문서를 남겨 랭킹에 유령 계정이 생겼다.
- 결정: 설정의 리셋 버튼을 회원 탈퇴로 바꾼다. Firestore 유저·랭킹 문서, Firebase Auth 계정, `nmixx_`로 시작하는 `localStorage` 키를 모두 지운다.
- 영향: `useGameState.resetGame`은 남아 있지만 UI에서 쓰지 않는다.

## DEC-016: 랭킹 수집률은 저장값을 믿지 않고 다시 계산

- 날짜: 2026-09-01 (`4000392`, `5233ce4`). 앞서 2026-08-30 `7aa8ebd`에서 화면 표기를 651 → 521로 고쳤다
- 상태: 확정
- 관련: specs/010-leaderboard
- 배경: 수집률 분모가 651로 하드코딩되어 랭킹 수집률이 틀렸다. 651은 2026-08-23 `a3558c8` 당시 카드 풀 크기이고, NX 팩 재편 뒤 실제 장수와 달라졌다(GitHub 이슈 #9 "랭킹 보유 카드 총 수 오류").
- 결정: 수집률은 `uniqueCardCount / MASTER_CARDS.length`로 계산하고, 로그인할 때마다 랭킹 문서를 다시 쓴다. 화면 표시도 같은 식으로 다시 계산한다.
- 영향: `multiplayerService.ts`의 봇 생성과 `fetchUserProfile`에는 아직 `521`이 하드코딩되어 있다 (product.md 7절 Q-04).

## DEC-017: 로컬 개발 환경은 전종 보유로 시작하고 클라우드에 올리지 않는다

- 날짜: 2026-08-24 (`a5a8844` 로컬 전종 보유). 전종 보유 "쇼케이스" 상태는 2026-08-23 `5cac89e`에서 시작
- 상태: 확정
- 관련: specs/008-save-sync
- 배경: 카드 연출·도감 화면을 확인하려고 매번 팩을 열 수 없다.
- 결정: `isLocalServer()`(localhost, 127.0.0.1, 192.168.*, 10.*, *.local, Vite DEV)이면 컬렉션을 모든 카드 1장으로 바꾸고, 게임 데이터 Firestore 저장과 랭킹 갱신을 하지 않는다. 예외: 로그인 시 프로필 필드 쓰기와 SSR 이상 전광판 방송(`broadcastHighTierPull`)은 로컬에서도 실제 Firestore에 쓴다.
- 영향: 로컬에서는 수집 진행·저장 동작을 그대로 재현할 수 없다. 저장 관련 수동 검증은 배포 환경(또는 `npm run preview`를 로컬 IP가 아닌 호스트로)에서 해야 한다.

## DEC-018: 전종 완성자끼리는 먼저 완성한 사람이 위, 업적 카테고리 배지 표시

- 날짜: 2026-10-18 (`2e82f89`, 메시지 없는 `배포하기.bat` 자동 커밋)
- 상태: 확정
- 관련: specs/010-leaderboard, specs/009-achievements
- 배경: 전종을 모은 사람이 늘면서 같은 수집 수끼리 순서가 무의미했다.
- 결정: 랭킹 문서에 `fullCollectionAt`을 처음 전종에 도달한 시각으로 한 번만 쓰고 이후 바꾸지 않는다. 기능 도입 전 이미 전종이던 문서는 기존 `updatedAt`을 옮긴다. 정렬은 고유 카드 수 내림차순, 둘 다 전종이면 `fullCollectionAt` 오름차순. 업적 카테고리를 모두 달성하면 `achievementBadges`에 넣어 닉네임 옆에 아이콘으로 보인다.
- 영향: `LeaderboardEntry`에 필드 2개 추가.

## DEC-019: 자동 테스트 대신 빌드 가드와 수동 절차로 검증

- 날짜: 2026-08-24 (`87ea7c6` Image Guard). 계기는 v1.5.4(패치노트 08-23) 이미지 대소문자 사고. 이미지 WebP 일괄 변환 2026-08-30 `73fea3c`
- 상태: 확정
- 관련: 전체 spec의 plan 6절
- 배경: Windows에서는 통과하던 이미지 경로가 Vercel(Linux)에서 대소문자 차이로 깨졌다.
- 결정: `npm run build`가 `scripts/verify_images.cjs` → `tsc` → `vite build` 순서로 실행되어, 이미지 누락·대소문자 불일치·타입 오류가 있으면 배포가 실패한다. 동작은 각 spec의 수동 절차로 확인한다.
- 검토한 대안: Vitest 도입 — 당시 일정상 보류(DEC-020).
- 영향: 추첨 확률·천장·동기화 같은 로직이 회귀해도 자동으로 잡히지 않는다.

## DEC-020: 순수 로직부터 Vitest 단위 테스트 도입

- 날짜: 2026-11-10
- 상태: 제안
- 관련: specs/002-pack-draw, specs/009-achievements, specs/010-leaderboard
- 배경: DEC-019로는 로직 회귀를 막지 못한다. 문서화하면서 `rngService`, `isAchievementCompleted`, `compareLeaderboard`는 React·Firebase 없이 테스트할 수 있는 순수 함수임을 확인했다.
- 결정: (제안) `vitest`를 devDependency로 추가하고 `npm test` 스크립트를 만든다. 각 plan 6절의 "자동화 후보" 열에 적힌 테스트부터 작성한다.
- 검토한 대안: Playwright E2E — Firebase 로그인 팝업 때문에 비용이 커서 후순위.
- 영향: 확정되면 CLAUDE.md 명령어·테스트 항목과 작업 방식 4번을 갱신한다.

## DEC-021: main 푸시로 Vercel 자동 배포, COOP·캐시 헤더

- 날짜: 2026-08-23~24 (`57b86a1` 캐시 금지 → `5a6e7af` 자산 1년 캐시) / COOP 헤더 2026-08-31 (`da02222`)
- 상태: 확정
- 관련: 해당 없음
- 배경: 구글 로그인 팝업이 `Cross-Origin-Opener-Policy` 때문에 막혔고, 카드 이미지가 매번 다시 내려받아졌다.
- 결정: `vercel.json`에서 모든 경로를 `index.html`로 rewrite하고, 전체에 `Cross-Origin-Opener-Policy: same-origin-allow-popups`, `/assets/*`는 1년 immutable, `/cards/*`·`/card-pack-image/*`는 30일 캐시를 건다. 개발 서버(`vite.config.ts`)에도 같은 COOP 헤더를 둔다.
- 영향: 카드 이미지를 같은 경로로 교체하면 최대 30일간 이전 이미지가 보일 수 있다. 교체할 때는 파일명을 바꾼다.

## DEC-022: 완성되지 않은 기능은 코드에 두고 메뉴에서 숨긴다

- 날짜: 교환소 2026-08-24 (`fd940ce` "hide market") / 출석 버튼 2026-08-22 (`fe6680e`에서 미스터리 박스 버튼으로 교체) / 패치노트 탭·더스트 공방 2026-08-30~31 사이(PR #11에는 패치노트 탭이 보이고 공방 버튼이 없으며, `cf6cea8`에는 둘 다 주석 처리되어 있다. 세션 폴더 작업이라 정확한 시각은 기록이 없다)
- 상태: 확정
- 관련: specs/015-dust-craft, specs/016-card-trade, specs/017-patch-notes, specs/018-daily-bonus
- 배경: 교환소는 상대 컬렉션을 바꿀 수 없는 구조(DEC-001)라 거래가 한쪽에만 반영된다. 더스트·출석 보너스는 재화 균형 검토가 끝나지 않았다.
- 결정: 코드·상태는 유지하고 진입 버튼만 숨긴다. 다시 열 때는 해당 spec을 `/sdd-change`로 갱신한 뒤 연다.
- 영향: 숨긴 기능의 상태 필드(`dust`, `lastDailyBonus`)는 계속 저장된다.

## DEC-023: 랭킹 조회 경로에서는 문서를 지우지 않는다

- 날짜: 2026-11-10
- 상태: 확정
- 관련: specs/010-leaderboard (REQ-04, tasks T006·T010), specs/007-auth
- 배경: `fetchLeaderboard`가 목록을 읽으면서 테스트·운영자로 판정한 사용자의 랭킹·유저 문서를 지웠다. 이 정리 코드는 2026-08-24 `d6704da`("auto-purge obsolete test accounts (GM, 카카오_엔써_…)")에서 들어왔는데, 같은 접두어의 기본 닉네임은 그 전날 `b6c681b`부터 실제 카카오 로그인에 쓰이고 있었다. 판정에 쓰인 `카카오_엔써_` 접두어는 카카오 닉네임이 없는 실제 사용자의 기본 닉네임이기도 해서, 누가 랭킹을 열기만 해도 실제 사용자의 저장 데이터가 지워질 수 있었다. 서버가 없고(DEC-001) 규칙상 로그인한 누구나 남의 문서를 쓸 수 있어(product.md Q-01) 클라이언트 실수가 바로 데이터 손실이 된다.
- 결정: 조회 경로는 읽기만 한다. 테스트·운영자 판정 문서는 목록에서 숨기기만 하고, `카카오_엔써_`는 테스트 판정에서 뺀다. 남은 테스트 데이터 정리는 Firebase 콘솔에서 사람이 직접 한다. 운영자 본인이 저장할 때 자기 랭킹 문서를 지우는 동작(DEC-012)은 자기 문서이므로 유지한다.
- 검토한 대안: 판정 조건만 좁히고 삭제는 유지 — 판정이 다시 틀리면 같은 사고가 나므로 택하지 않음 / 일회성 정리 스크립트(`scripts/`) — 필요해지면 별도 결정.
- 영향: 예전 테스트 계정 중 `카카오_엔써_` 이름이 랭킹에 다시 보일 수 있다. 조회 중 `박민주` 닉네임 덮어쓰기는 이 결정에 어긋나며 specs/010 tasks T010으로 남겼다.

## DEC-024: 회원 탈퇴는 구글·카카오 로그인 계정만 할 수 있다

- 날짜: 2026-11-10
- 상태: 확정
- 관련: specs/014-account-deletion (AC-05, T003), DEC-015
- 배경: 탈퇴 영역이 게스트·비로그인에게도 보였고, 게스트 세션에서 탈퇴하면 지울 계정이 없는데도 "성공"하며 이 브라우저의 `nmixx_` localStorage 키(다른 계정의 로컬 저장본 포함)를 모두 지웠다.
- 결정: `SettingsPage`는 App이 넘기는 `canDeleteAccount`(로그인했고 게스트가 아님)가 true일 때만 탈퇴 영역을 그린다. `AuthService.deleteAccount`도 게스트면 아무것도 지우지 않고 실패를 돌려준다. 화면과 서비스 두 곳에서 막는다.
- 영향: DEC-015의 삭제 범위는 로그인 계정에만 적용된다. 로그인 계정 탈퇴 시 모든 `nmixx_` 키를 지우는 동작은 그대로다(specs/014 알려진 한계).

## DEC-025: Tailwind CSS는 v3로 고정한다

- 날짜: 2026-11-10
- 상태: 확정
- 관련: product.md Q-03, `package.json`, `.github/dependabot.yml`
- 배경: 2026-10-19 Dependabot 보안 업데이트(PR #15, `e2e08aa`)가 `postcss-selector-parser` 6.1.4 취약점을 없애려고 `tailwindcss`를 `^3.4.17` → `^4.3.3`으로 올렸다. 설정은 v3 방식이라 이후 Vercel 배포 4건이 모두 실패했고 운영은 `e3a08a4`(10-19) 빌드에 멈췄다. 로컬 `node_modules`에는 3.4.19가 남아 있어 로컬 빌드로는 드러나지 않았다.
- 결정: `tailwindcss`를 `~3.4.17`로 고정하고 lockfile을 다시 만든다. `.github/dependabot.yml`에 `tailwindcss` `>=4` 무시 규칙을 둔다(`versions` 조건은 보안 업데이트에도 적용된다). 정기 버전 업데이트 PR은 열지 않는다(`open-pull-requests-limit: 0`).
- 근거(2026-11-10 실행): 작업 트리를 새 폴더에 복사해 `npm ci` → `npm run build` 통과(Tailwind 3.4.19). 결과 CSS `index-CWDC3NIO.css`(125,404바이트)가 운영 사이트의 CSS와 바이트 단위로 같다. `postcss-selector-parser`는 6.1.6으로 설치되고 `npm audit`에 나오지 않는다.
- 검토한 대안: v4로 이전(`@tailwindcss/postcss`, CSS `@import "tailwindcss"`, 설정 이전) — 화면 전체를 다시 확인해야 하고 얻는 기능이 없어 보류. 이전할 때는 이 결정을 대체하는 새 DEC를 쓴다.
- 영향: 빌드 확인은 로컬 `node_modules`가 아니라 `npm ci` 후에 한다(CLAUDE.md). `npm audit`의 남은 high 5건(firebase 의존 `@grpc/grpc-js`, `re2js`)은 이 결정과 무관하며 별도로 다룬다.
