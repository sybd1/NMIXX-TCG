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
- 상태: 확정 (서버 함수 1개 예외: DEC-030)
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
- 상태: 부분 대체됨 → DEC-030 (카카오도 커스텀 토큰으로 Firebase 인증)
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
- 진행(2026-11-25): Vitest는 DEC-027로 Firestore 규칙 테스트(`tests/rules/`, `npm run test:rules`)에 먼저 도입되었다. 이 항목이 제안한 순수 로직 단위 테스트(`rngService` 등)는 아직 없다. CLAUDE.md는 규칙 테스트 기준으로 갱신했다.

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

## DEC-026: Firestore 규칙 강화는 카카오 Firebase 인증 연동 뒤에 배포한다

- 날짜: 2026-11-25
- 상태: 대체됨 → DEC-028
- 관련: specs/022-firestore-rules (REQ-05, Q-E), DEC-001, DEC-008, product.md Q-01·Q-02
- 배경: 저장소 `firestore.rules`는 로그인한 누구나 모든 유저·랭킹 문서를 쓸 수 있다. 문서 주인만 쓰게 좁히면, Firebase 인증을 거치지 않는 카카오 사용자(DEC-008)의 저장·랭킹 등록·전광판 추가가 모두 거부된다.
- 결정: 카카오 로그인 사용자가 Firebase 인증을 받은 상태로 Firestore에 요청하게 만드는 기능을 먼저 운영에 낸다. 기능 022의 규칙은 그 뒤에 배포한다. 규칙 작성과 에뮬레이터 검증은 먼저 해도 된다. 연동 방식(커스텀 토큰 발급 서버 등)은 그 기능의 명세·설계에서 정한다.
- 검토한 대안: 규칙을 먼저 배포하고 카카오 사용자는 로컬 저장 + 안내 문구 — 카카오 사용자가 랭킹과 기기 간 동기화를 잃어 제외. 연동을 022 범위에 포함 — 범위가 커져 제외.
- 영향: 연동에 토큰 발급 서버가 필요하면 DEC-001(자체 서버 없음)과 DEC-008(카카오는 Firebase Auth에 로그인하지 않음)을 대체하는 새 결정이 필요하다. 그때까지 저장소 규칙의 느슨한 쓰기 권한이 운영에 남는다(콘솔 배포본이 저장소와 같다면).
- 재확인(2026-11-26): 처음에는 "카카오 쓰기가 이미 거부되고 있다"고 기록했지만 틀렸다. 시험 요청에 운영 규칙의 허용 필드 목록에 없는 필드를 써서 403이 났던 것이다. 바로잡은 사실은 DEC-028에 있다.

## DEC-027: Firestore 규칙의 문서 주인 판단과 에뮬레이터 규칙 테스트

- 날짜: 2026-11-25
- 상태: 확정
- 관련: specs/022-firestore-rules (plan 3·5·6절), DEC-002, DEC-008, DEC-019, DEC-020, DEC-026
- 배경: 문서 ID는 Firebase uid가 아니라 `goog_<uid>`·`kakao_<회원번호>`다. 그래서 `request.auth.uid == id`로는 주인을 판단할 수 없다. 또 규칙의 허용·거부를 확인할 사례가 20개가 넘는데, 자동 테스트 도구가 없다(DEC-019).
- 결정
  1. 문서 주인은 `id == 'goog_' + request.auth.uid`, 또는 (`id`가 `kakao_`로 시작하고 `id == request.auth.uid`이며 `sign_in_provider == 'custom'`)으로 판단한다. 기존 문서 ID는 바꾸지 않는다(DEC-002).
  2. 카카오 Firebase 인증 연동(DEC-026)은 커스텀 토큰의 uid를 문서 ID와 같은 `kakao_<카카오 회원번호>`로 발급해야 한다.
  3. 규칙은 Firestore 에뮬레이터에서 자동 테스트한다. devDependency로 `vitest`, `@firebase/rules-unit-testing@^5`(6.x는 `firebase@^13`을 요구하는데 이 프로젝트는 12.x라서), `firebase-tools`를 추가하고 `npm run test:rules` 스크립트를 만든다. 에뮬레이터를 쓰려면 로컬에 JDK가 필요하다. 테스트는 `demo-nmixx-tcg` 프로젝트 ID를 써서 운영에 연결되지 않게 한다.
  4. 운영 배포는 콘솔에 붙여넣는 방식을 유지한다. `firebase.json`은 에뮬레이터 설정용이다. → 2026-11-26 DEC-028에서 CLI 배포(`firebase deploy --only firestore:rules`)로 바꿨다.
- 검토한 대안: 문서 ID를 Firebase uid로 옮기기 — 운영 데이터 이전이 필요해 제외. 콘솔 Rules Playground 수동 확인 — 반복 비용이 커서 제외(2026-11-25 사용자 결정). Firebase CLI 배포 — 운영 로그인이 필요해 보류.
- 설치 기록(2026-11-25, specs/022 T002)
  - 설치 버전: `vitest@5.1.2`, `@firebase/rules-unit-testing@5.0.2`(`firebase@12.18.0` 재사용), `firebase-tools@15.37.0`. 첫 실행 때 `cloud-firestore-emulator-v1.22.0.jar`를 내려받는다.
  - JDK: Temurin 21.0.12.1(`%USERPROFILE%\.jdks	emurin-21.0.12.1`)로 실행을 확인했다. 시스템 PATH에는 Java가 없으므로, `npm run test:rules` 전에 `JAVA_HOME`과 PATH에 JDK `bin`을 넣어야 한다.
  - 새 폴더 `npm ci --ignore-scripts` 측정(npm 캐시 있음): 추가 전 9초·`node_modules` 355MB → 추가 후 16초·608MB.
  - 새 폴더 `npm ci` → `npm run build` 통과.
  - `firebase-tools`가 의존하는 `re2@1.27.2`(optional)에 설치 스크립트가 있다. 그런데 `package.json`의 `allowScripts`에 없어서 npm 11.17이 경고만 내고 실행하지 않는다. Vercel의 npm 버전에서 어떻게 동작하는지는 푸시 후 배포 결과로 확인한다.
  - `npm audit`: 운영 의존성은 기존 high 5건 그대로(DEC-025). 개발 의존성 포함 시 20건(moderate 14, high 6).
- 영향: 처음 도입하는 자동 테스트다. DEC-020(Vitest 제안)의 Vitest 도입 부분이 이 결정으로 실현된다. 구현을 마치면 DEC-020 상태와 CLAUDE.md의 "테스트" 항목·명령어를 갱신한다. `firebase-tools` 때문에 Vercel `npm ci` 시간이 늘 수 있다(구현할 때 측정).

## DEC-028: Firestore 규칙을 카카오 연동보다 먼저 운영에 배포한다

- 날짜: 2026-11-26
- 상태: 확정 (DEC-026을 대체)
- 관련: specs/022-firestore-rules (REQ-05, AC-14·15b·16, T013), DEC-026, DEC-027, product.md Q-01·Q-02
- 배경: 운영 규칙 본문을 CLI로 받아 보니(ruleset `a458d19c-35e6-4229-8428-71feb64cb566`, 2026-08-31 게시) 저장소와 전혀 달랐다.
  - `nmixx_tcg_users`: 누구나 읽고(이메일 포함 29건), **로그인 없이 누구나** 허용 필드 목록 안에서 쓸 수 있다. 남의 코인·컬렉션을 바꿀 수 있다.
  - `nmixx_tcg_leaderboard`: 누구나 쓸 수 있지만, 허용 필드 목록에 `achievementBadges`·`fullCollectionAt`이 없어 현재 앱의 랭킹 쓰기는 모두 거부된다.
  - `nmixx_tcg_global_feed`: 누구나 읽고, 쓰고, 고치고, 지울 수 있다.
  - 카카오 사용자(11명, 마지막 저장 2026-10-31)의 클라우드 저장은 로그인 없는 쓰기로 동작하고 있었다.
- 결정: 위조를 바로 막기 위해 저장소 `firestore.rules`를 지금 운영에 배포한다(사용자 결정 2026-11-26). 배포는 `npx firebase deploy --only firestore:rules --project nmixx-tcg`(CLI)로 한다. 이에 따라 DEC-027의 "콘솔 붙여넣기" 방식도 바뀐다.
- 배포 기록: 2026-11-26, 커밋 `19405f2`의 `firestore.rules` → ruleset `d4e4458c-f407-4d12-8041-de0395e48b4a`. 배포 직전 `npm run test:rules` 18/18 통과. 배포 후 운영 본문이 저장소 파일과 같음을 API로 확인. 로그인 없는 users 읽기 403, users(허용 필드 `coins`)·leaderboard·global_feed 쓰기 모두 403, leaderboard·global_feed 읽기 200.
- 되돌리기: 콘솔 › Firestore › 규칙 이력에서 `a458d19c…`(2026-08-31)를 다시 게시하면 된다. 다만 위조 구멍도 함께 돌아온다.
- 검토한 대안: 카카오 연동 후 배포(DEC-026) — 그동안 누구나 남의 데이터를 바꿀 수 있어 제외. 위조만 막는 중간 규칙 — 카카오 사용자는 Firebase 인증이 없어 로그인하지 않은 요청과 구별할 수 없으므로 불가능하다.
- 영향: 카카오 사용자는 카카오 Firebase 인증 연동(별도 명세 필요, 토큰 uid = `kakao_<회원번호>`, DEC-027)이 나올 때까지 클라우드 저장·불러오기·랭킹 등록·탈퇴 시 클라우드 삭제를 할 수 없다. 로컬 저장은 된다. 구글 사용자의 랭킹 등록은 다시 된다.

## DEC-029: 카카오 Firebase 인증 연동의 사용자 정책

- 날짜: 2026-11-26
- 상태: 확정 (정책) / 서버 측 처리 방식은 plan에서 정하고, DEC-001·DEC-008을 대체하는 별도 DEC로 남긴다(specs/023 AC-15)
- 관련: specs/023-kakao-firebase-auth, specs/007-auth, specs/008-save-sync, DEC-011, DEC-027, DEC-028
- 배경: DEC-028로 카카오 사용자의 클라우드 저장이 멈췄다. 다시 연결할 때 진행 손실, 인증 실패, 탈퇴 처리에 대한 정책이 필요했다.
- 결정
  1. 연결 실패 처리: 카카오 회원번호 확인이나 Firebase 인증이 실패하면 로그인 실패로 처리한다. 로컬 전용으로 계속하지 않는다. 문구는 `카카오 계정 확인에 실패했습니다. 잠시 후 다시 시도해 주세요.`다.
  2. 기존 세션 재연결: 브라우저에 남은 카카오 토큰으로 자동 연결을 먼저 시도하고, 안 되면 `클라우드 저장을 위해 카카오로 다시 로그인해 주세요.`를 보여 준다.
  3. 진행 보존: 카카오 사용자가 연결될 때 로컬과 클라우드 중 마지막 저장 시각이 늦은 쪽을 남긴다. 로컬 저장본은 앞으로 저장 시각을 남긴다. 시각이 없는 기존 로컬 저장본은 다음처럼 판단한다. 클라우드 `lastSavedAt`이 DEC-028 배포(`2026-11-25T15:13:46.798Z`, ruleset 게시 시각) 이전이면 로컬이 더 최근이고, 이후면 클라우드가 더 최근이다. 구글 로그인 동작(DEC-011, 008)은 바꾸지 않는다.
  4. 탈퇴: 연결되지 않은 카카오 사용자는 먼저 다시 연결해야 탈퇴할 수 있다.
  5. 카카오 SDK가 없으면 무작위 ID의 로컬 전용 카카오 계정을 만들지 않고 로그인 실패로 처리한다.
- 검토한 대안: 진행 충돌 시 사용자가 고르기 — 선택 화면이 필요해 제외. 인증 실패 시 로컬 전용으로 계속 — 저장된다고 착각하기 쉬워 제외.
- 영향: 로컬 저장 형식에 저장 시각이 추가된다(`src/types/game.ts` 계약 변경은 plan에서 정한다).

## DEC-030: 카카오 인증 발급용 Vercel Function과 서비스 계정 키

- 날짜: 2026-11-26
- 상태: 확정
- 관련: specs/023-kakao-firebase-auth (plan 3·5절, AC-15), DEC-001, DEC-008, DEC-027, DEC-029
- 배경: 카카오 사용자를 Firebase에서 `kakao_<회원번호>`로 인증하려면 커스텀 토큰이 필요하다. 커스텀 토큰은 서비스 계정 권한으로만 서명할 수 있어서, 브라우저 밖의 처리가 필요하다.
- 결정
  1. 서버 쪽 처리는 Vercel Function `api/kakao-firebase-token.ts` 하나로 한정한다. 하는 일: 카카오 액세스 토큰을 `kapi.kakao.com/v1/user/access_token_info`로 확인하고, `app_id`가 우리 앱인지 본 뒤, uid `kakao_<id>`로 커스텀 토큰을 발급한다. 게임 로직·데이터 쓰기는 하지 않는다(나머지는 DEC-001대로 클라이언트 + Firestore 규칙).
  2. 자격 증명: Firebase 서비스 계정 키 JSON을 Vercel Sensitive 환경 변수 `FIREBASE_SERVICE_ACCOUNT`(Production·Preview)에 둔다. 카카오 숫자 앱 ID는 `KAKAO_APP_ID`. 저장소·클라이언트 번들에 넣지 않는다.
  3. `firebase-admin`(~13.10)을 dependencies에 추가한다. 서버 함수에서만 import한다.
- 설치 기록(2026-11-26, specs/023 T004)
  - `firebase-admin@14.5.1`(의존 패키지 60개 추가)
  - 2026-11-26 변경: Preview에서 함수가 `ERR_REQUIRE_ESM`으로 실패했다. 원인은 `firebase-admin@14`의 `jwks-rsa@4`가 ESM 전용 `jose@6`을 `require()`하는 것이다. 그래서 `firebase-admin@~13.10.0`(`jwks-rsa@3` → `jose@4`)으로 낮췄다. 같은 날 서버 함수의 상대 import에 `.js` 확장자가 없어 생긴 `ERR_MODULE_NOT_FOUND`도 고쳤다.
  - 서버 함수 타입 검사용 `api/tsconfig.json`을 추가하고, `npm run build`에 `tsc -p api`를 넣었다.
  - 새 폴더 `npm ci`(19초) → `npm run build` 통과. `dist/`에 `firebase-admin`·`private_key` 문자열 0건.
  - `npm audit --omit=dev`: high 5건으로 기존과 같다.
- 비용: 로그인할 때만 호출되는 함수 1개다. Vercel Functions 사용량(Active CPU·호출 수)으로 과금되며, 이 규모에서는 무료 한도 안일 것으로 본다. Preview에서 실제 호출 시간을 잰다.
- 검토한 대안: Firebase Cloud Functions — Blaze 요금제가 필요하고 배포 경로가 둘이 되어 제외. Vercel OIDC + GCP Workload Identity Federation — 장기 키가 없지만 설정 단계가 많아 제외(2026-11-26 사용자 결정). JWT 직접 서명 — 실수 위험이 커서 제외.
- 영향: DEC-001(자체 서버 없음)과 DEC-008(카카오는 Firebase Auth 미사용)을 부분 대체한다. 함수가 하나 생기고, 카카오 사용자는 Firebase에 커스텀 토큰으로 로그인한다. 서비스 계정 키가 유출되면 Firebase 콘솔에서 키를 폐기하고 새로 만든 뒤 Vercel 변수를 바꾼다.

## DEC-031: 이용자 행동 로그 정책 (잠정)

- 날짜: 2026-11-26
- 상태: **잠정 — 사용자 확인 필요**. 사용자가 자리를 비운 상태에서 "SDD 문서부터 배포까지 끝까지 진행" 지시를 받아 결정했다.
- 관련: specs/024-activity-log, DEC-009, DEC-017, DEC-023, DEC-028
- 배경: 이용자별 행동 기록이 없다. Vercel Analytics(Hobby)는 31일 집계만 볼 수 있어, 이용자 단위로 조회하려고 Firestore 이벤트 컬렉션을 골랐다(요청 원문 "방법 A").
- 결정
  1. 컬렉션 `nmixx_tcg_events`. 로그인 이용자의 본인 이벤트만 기록한다. 이메일·닉네임은 넣지 않는다. 게스트는 기록하지 않는다(DEC-009 유지).
  2. 고지: 정보 탭에 이용 기록 보관 고지, 로그인 창에 짧은 안내를 둔다. 별도 동의 절차는 두지 않는다.
  3. ~~보관 90일.~~ **DEC-033으로 대체: 1년.** Firestore TTL은 결제 활성화가 필요해(공식 문서: TTL 삭제는 무료 사용량 없음) 쓰지 않는다. 이용자가 접속할 때 본인의 보관 기간 지난 이벤트를 최대 100개 지운다.
  4. 회원 탈퇴 시 이벤트를 먼저 지우고, 실패하면 탈퇴를 멈춘다.
  5. 이벤트마다 즉시 쓴다. localhost(개발 서버)에서는 쓰지 않는다(DEC-017과 같은 이유: `npm run dev`도 운영 Firestore에 연결).
  6. 조회는 Firebase 콘솔에서 한다.
- 확인한 사실(firebase.google.com/docs/firestore/quotas, /ttl, 2026-11-26)
  - 무료 한도: 저장 1 GiB, 읽기 50,000/일, 쓰기 20,000/일, 삭제 20,000/일
  - TTL: 만료 후 보통 24시간 안에 삭제한다. TTL 삭제는 무료 사용량이 없다.
- 검토한 대안: GA4·Vercel 커스텀 이벤트 — 이용자 단위 조회가 어려워 제외(요청 원문). TTL — 결제 필요. 모아 쓰기 — 이벤트 양이 적어 이득이 작다.
- 영향: 카카오 사용자는 기능 023이 운영에 나갈 때까지 Firebase 인증이 없어 이벤트가 기록되지 않는다.

## DEC-032: 운영자 계정 1개에만 전체 행동 로그 읽기 허용

- 날짜: 2026-11-26
- 상태: 확정 (사용자 답변: "게임 사이트 안 숨김 화면", "지금 게임에 쓰는 내 구글 계정")
- 관련: specs/025-admin-activity-viewer, DEC-027, DEC-031(6항 조회 방법을 보완)
- 배경: 행동 로그를 Firebase 콘솔로만 보기 불편하다. 운영자가 사이트에서 회원별·날짜별로 모아 보려면 남의 이벤트를 읽을 권한이 필요하다.
- 결정
  1. 숨김 주소 `/#admin`에 읽기 전용 조회 화면을 둔다. 메뉴에는 넣지 않는다.
  2. `firestore.rules`에 `isAdmin()`을 둔다: Firebase uid가 운영자 목록에 있고 로그인 제공자가 `google.com`일 때만 참. 카카오 커스텀 토큰은 제공자가 `custom`이라 운영자가 될 수 없다.
  3. 운영자 권한은 `nmixx_tcg_events` **읽기**에만 쓴다. 쓰기·삭제와 다른 컬렉션 권한은 바뀌지 않는다.
  4. 운영자 uid는 `firestore.rules`와 `src/config/admin.ts` 두 곳에 같은 값으로 둔다. 바꿀 때 둘 다 고치고 규칙을 배포한다.
- 검토한 대안: 이 PC 전용 로컬 도구(규칙 변경 없음, 휴대폰 불가), 서버 함수 + 비밀번호(구조 복잡) — 사용자가 숨김 화면을 골랐다. 커스텀 클레임 — 설정에 Admin SDK 스크립트가 필요해 목록 방식을 골랐다.
- 영향: 운영자 계정이 털리면 모든 이용자의 행동 기록(이메일·닉네임 없음)을 읽을 수 있다. 운영자 구글 계정에 2단계 인증을 권장한다.

## DEC-033: 행동 로그 보관 기간 1년

- 날짜: 2026-11-27
- 상태: 확정 (2026-11-27 사용자: "이 기록들 5년간 저장하게 해줘" → 같은 날 "1년으로 바꾸자")
- 관련: specs/024-activity-log REQ-04·REQ-06, DEC-031 3항을 대체
- 결정
  1. `nmixx_tcg_events` 보관 기간을 90일에서 1년(365일)으로 바꾼다. 상수는 `src/types/activity.ts`의 `ACTIVITY_RETENTION_DAYS` 한 곳이다.
  2. 삭제 방식은 그대로다: TTL 없이, 이용자가 접속할 때 본인의 기간 지난 이벤트를 최대 100개 지운다. 회원 탈퇴 시에는 기간과 상관없이 모두 지운다(REQ-05 그대로).
  3. 정보 탭·로그인 창 고지 문구의 "90일"을 "1년"으로 바꾼다.
- 영향
  - 계약 모양·규칙·인덱스는 바뀌지 않는다. 운영 규칙 배포는 필요 없다.
  - 기존 데이터: 기록은 2026-11-26부터 쌓였으므로 90일 기준으로 이미 지워진 이벤트는 없다.
  - 저장량: 지금 규모면 1년 동안 무료 저장 1 GiB 안으로 추정한다(spec 024 6절). 이용자가 크게 늘면 Firebase 콘솔 사용량을 보고 다시 정한다.
  - 운영자 조회 화면(specs/025)은 최대 30일만 보여 준다. 더 오래된 기록은 저장은 되지만 그 화면에서는 볼 수 없다.
  - [확인 필요: 개인정보 보관 기간의 법적 적정성] 수집 목적(부정 이용 확인·서비스 개선)에 1년이 필요한지는 운영자가 판단한다. 고지 문구로 기간을 알린다.

## DEC-034: 분석 기록은 비로그인 방문자도 남긴다

- 날짜: 2026-11-27
- 상태: 확정 (사용자 답변: "비로그인도 기록", "관리자 화면에 추가")
- 관련: specs/026-portfolio-analytics, DEC-009, DEC-031(1항 "게스트는 기록하지 않는다"를 새 분석 기록에 한해 바꿈), DEC-032
- 배경: 포트폴리오용 지표(재방문율, 첫 팩까지 시간, 성능)는 처음 온 방문자가 대상인데, 처음 온 방문자는 대부분 로그인하지 않는다. 로그인 이용자만 기록하면 표본이 너무 작다.
- 결정
  1. 기능 026의 새 기록(화면 이동, 세션 종료, 성능, 오류)은 비로그인 방문자도 남긴다. 브라우저마다 이름 없는 무작위 방문자 ID로 구분한다. 로그인 이용자는 계정 ID도 붙인다.
  2. 기존 024 이벤트(`nmixx_tcg_events`)의 대상·모양·권한은 바꾸지 않는다.
  3. DEC-009(게스트 게임 데이터 비저장)는 그대로다. 방문자 ID는 분석에만 쓴다.
  4. 결과는 운영자 화면 `/#admin`의 `지표` 탭에서만 본다. 읽기는 DEC-032의 운영자만.
  5. 고지 문구를 고쳐 비로그인 방문자에게도 알린다(정보 탭).
- 영향
  - 로그인하지 않은 쓰기가 생긴다. 규칙에서 모양·크기를 검사하고 읽기·수정·삭제를 막아야 한다(plan에서 규칙 테스트 먼저).
  - 쓰기 수가 늘어 무료 한도(쓰기 20,000/일)에 더 가까워진다. plan에서 계산한다.
  - 방문자 ID만 있는 기록은 탈퇴로 지울 수 없다. 보관 기간 뒤 정리 방법은 plan에서 정한다.

## DEC-035: 분석 기록의 저장 방식, web-vitals 직접 의존성, 운영자 정리 권한

- 날짜: 2026-11-27
- 상태: 확정 (사용자: "sdd 플랜대로 전부다 진행하고 마지막에 push까지")
- 관련: specs/026-portfolio-analytics plan 5절, DEC-032, DEC-034
- 결정
  1. 새 컬렉션 `nmixx_tcg_metrics`. 계정 ID는 `identify` 문서에만 둔다. 탈퇴하면 본인 `identify` 문서를 지운다.
  2. `web-vitals@4.2.4`를 직접 의존성으로 추가한다. 이유: LCP·INP·CLS 측정 규칙을 직접 구현하면 틀리기 쉽다. 같은 버전이 `@firebase/performance` 하위 의존성으로 이미 설치돼 있다. 대안: PerformanceObserver 직접 구현, Vercel Speed Insights(이용자 단위 조회 불가).
  3. 운영자는 `nmixx_tcg_metrics`를 읽고 지울 수 있다(DEC-032 3항 "읽기에만"의 예외). `지표` 탭을 열 때 1년 지난 기록을 최대 400건 지운다.
- 위험: 로그인 없이 쓸 수 있어 가짜 기록을 대량으로 넣으면 프로젝트 쓰기 한도를 쓸 수 있다. 규칙은 모양·크기만 검사한다. 문제가 생기면 Firebase App Check를 별도 명세로 도입한다.

