# Tasks 023: 카카오 사용자 Firebase 인증 연동

- 상태: Implementing
- 최종 수정일: 2026-11-26
- 기준: [spec.md](spec.md), [plan.md](plan.md)

## 작업 목록

형식: `- [ ] T번호 [P] 설명 — 파일 — AC — 완료 기준`

- `[P]`: 앞 작업과 다른 파일만 건드려 동시에 진행해도 되는 작업
- 한 작업은 한 번에 검토할 수 있는 크기(대략 파일 1~3개)로 나눈다.
- 체크는 완료 기준을 실제로 확인한 뒤에만 한다. 막힌 작업은 `- [!]`로 표시하고 이유를 적는다.
- 수동 절차 K1~K14는 plan 6절에 있다. **운영자** 표시는 콘솔·계정 권한이나 카카오 로그인이 필요해 사용자가 해야 하는 작업이다.

### 1단계: 사전 확인·계약

- [x] T001 [P] 카카오 토큰 확인 API 사양 확인 — `specs/023-kakao-firebase-auth/plan.md` 5절 — AC-01, AC-03 — 2026-11-26 공식 문서로 확인: `GET kapi.kakao.com/v1/user/access_token_info`, 응답 `id`·`app_id`·`expires_in`, 오류 `-401`(401)·`-2`·`-1`·`-7`(400). plan 5절의 `[확인 필요]`를 지우고 오류 코드 매핑을 적음
- [ ] T002 [P] **운영자** 외부 설정 준비 — Firebase 콘솔, Vercel 프로젝트 설정, 카카오 개발자 콘솔 — 전체 — 아래 4개를 확인하고 결과를 plan 7절에 기록
  - [x] Firebase 서비스 계정 키를 Vercel Sensitive 변수 `FIREBASE_SERVICE_ACCOUNT`로 등록(Production·Preview) — 2026-11-26 운영자 등록. Vercel API로 확인: type `sensitive`(Secret), target production·preview
  - [x] 카카오 숫자 앱 ID를 `KAKAO_APP_ID`로 등록 — 2026-11-26 `1554532`, production·preview
  - 카카오 플랫폼 사이트 도메인에 `http://localhost:3000`과 Preview 도메인 등록 여부
  - 카카오 로그인 후 새로고침해도 `Kakao.Auth.getAccessToken()`이 값을 돌려주는지(브라우저 콘솔에서 확인)
- [ ] T003 [P] **운영자** 구글 사용자 새로고침 직후 Firestore 거부 여부 확인(기능 022 영향) — 운영 사이트 — AC-08 — 구글 테스트 계정으로 로그인 → 새로고침 → 브라우저 콘솔에 `permission-denied`·`[CloudSync] onSnapshot error`가 없는지 확인. 있으면 T014를 연다
- [x] T004 계약·기반 — `src/types/auth.ts`(API 타입·오류 코드), `src/types/game.ts`(`localSavedAt`), `package.json`·`package-lock.json`(`firebase-admin@14.5.1`, `test:unit`, build에 `tsc -p api`), `api/tsconfig.json`, `docs/decisions.md`(DEC-030 설치 기록) — 전체 — 2026-11-26: `npx tsc --noEmit` exit 0, `npx tsc -p api --noEmit` exit 0(api에 파일이 없어도 `src/types/auth.ts`를 입력으로 포함), 새 폴더 `npm ci` → `npm run build` 통과, `dist/`에 `firebase-admin`·`private_key` 0건

### 2단계: 테스트 먼저 (실패 확인)

각 작업의 완료 기준: `npm run test:unit` 실행 시 대상 모듈이 없거나 구현되지 않아 실패함을 확인한다(문법·import 경로 오류가 아니라 "기능 없음"이 원인). 출력 요약을 작업 줄에 남긴다.

- [x] T005 [P] 서버 판정 테스트 — `tests/unit/kakaoToken.test.ts` — AC-01, AC-03, AC-04 — 2026-11-26 모듈이 없을 때 실행 → `Cannot find module '../../api/_lib/kakaoToken'`로 실패(기능 없음). `fetchKakaoTokenInfo`의 오류 코드 매핑 테스트도 추가
- [x] T006 [P] 진행 결정 테스트 — `tests/unit/progressMerge.test.ts` — AC-11, AC-11a, AC-11b, AC-12 — 2026-11-26 모듈 없음으로 실패 확인. 구현 중 `hasProgress`(빈 초기 저장본이 클라우드를 덮지 않게)·`progressSignature` 테스트를 추가
- [x] T007 [P] 카카오 연결 모듈 테스트 — `tests/unit/kakaoConnect.test.ts` — AC-04, AC-07, AC-08, AC-14 — 2026-11-26 모듈 없음으로 실패 확인

### 3단계: 구현

- [x] T008 [P] 서버 함수 — `api/_lib/kakaoToken.ts`, `api/kakao-firebase-token.ts` — AC-01, AC-03, AC-04 — 2026-11-26 T005 통과, `npx tsc -p api --noEmit` 통과. dist 검사는 T015
- [x] T009 [P] 카카오 연결 모듈 — `src/services/kakaoConnect.ts` — AC-04, AC-07, AC-08, AC-14 — 2026-11-26 T007 통과, `npx tsc --noEmit` 통과
- [x] T010 [P] 진행 결정 모듈 — `src/services/progressMerge.ts` — AC-11, AC-11a, AC-11b, AC-12 — 2026-11-26 T006 통과(단위 테스트 전체 47/47)
- [x] T011 로그인·재연결·탈퇴 연결 — `src/services/authService.ts` — AC-01, AC-02, AC-04, AC-05, AC-07, AC-09, AC-09a, AC-13, AC-14, AC-17 — 2026-11-26 `npx tsc --noEmit` 통과, 단위 47/47, 무작위 `kakao_` ID 생성 코드 검색 0건. 동시 호출 시 서버 교환을 한 번만 하도록 `ensureKakaoConnection`에 진행 중 약속 공유 추가
  - `loginWithKakao`: 팝업 → `connectKakaoToFirebase` → `/v2/user/me`(실패 시 `firebaseSignOut`) → 기존 흐름
  - SDK가 없으면 실패 문구를 던짐
  - `onAuthStateChanged`가 `accountIdForFirebaseUser`를 사용
  - `ensureKakaoConnection`·`subscribeKakaoConnection` 추가
  - `deleteAccount` 가드
- [x] T012 로컬 저장 시각·진행 결정 적용 — `src/hooks/useGameState.ts` — AC-11, AC-11a, AC-11b, AC-12, AC-05 — 2026-11-26 `npx tsc --noEmit` 통과, 단위 47/47. 저장 시각은 `StorageService`가 아니라 `useGameState`의 저장 지점에서 붙인다(진행 서명 비교). 로컬에 진행이 없으면(`hasProgress` false) 클라우드를 쓴다
- [x] T013 화면 — `src/components/Auth/AuthModal.tsx`, `src/components/Navigation/Header.tsx`, `src/App.tsx` — AC-09a, AC-10 — 2026-11-26 `npm run dev`에서 카카오 세션(provider kakao, Firebase 세션 없음)을 흉내 냄: 재연결 안내 창 표시 → 닫으면 안내 사라지고 헤더 `클라우드 저장 안 됨` 배지 유지 → 배지 클릭 시 안내와 함께 로그인 창 다시 열림. 콘솔 오류 0건. 흉내 낸 세션은 지움
- [!] T014 (조건부) 구글 첫 불러오기 거부 수정 — `src/hooks/useGameState.ts` — AC-08 — **T003에서 거부가 확인될 때만 연다.** 먼저 `/sdd-change`로 기능 008에 반영하고 진행한다

### 4단계: 통합 검증

- [x] T015 프로젝트 검사·문서 — `CLAUDE.md`(명령어 `test:unit`·`tsc -p api`, 폴더 구조 `api/`·`tests/unit/`, 환경 변수 이름, 기술 스택), `docs/decisions.md`(DEC-030 확정) — AC-15 — 2026-11-26 아래 "프로젝트 검사" 표 전부 통과. 새 폴더 빌드는 T004에서 통과(이후 의존성 변경 없음). `dist/`·`git log -p --all`·작업 트리에 키 문자열 0건
- [ ] T016 **운영자** Preview(또는 `vercel dev`) 수동 검증 — Preview 배포 — AC-01~05, 07, 09, 09a, 10, 13, 14, 17 — K1~K5, K7~K12, K14 결과를 검증 기록에 작성. `/api/kakao-firebase-token`이 rewrite에 가로채이지 않는지(K3 응답이 JSON) 확인
  - 2026-11-26 사전 확인(Claude, 환경 변수 없이): Preview에서 서버 함수가 두 번 실패해 고쳤다.
    ① 상대 import에 `.js`가 없어 `ERR_MODULE_NOT_FOUND`
    ② `firebase-admin@14`의 `jwks-rsa@4`가 `jose@6`(ESM)을 `require()`해서 `ERR_REQUIRE_ESM` → `~13.10`으로 낮춤
  - 수정 후 Preview(`ad4aef1`)에서 `GET /api/kakao-firebase-token`이 `405 {"code":"METHOD_NOT_ALLOWED"}` JSON을 돌려준다. 함수가 로드되고, rewrite가 가로채지 않는다.
  - 2026-11-26 환경 변수 등록 후 Preview(`bcbbb7a`, `dpl_BwmFp6k4…`)에서 curl로 확인:
    - `GET` → 405 `METHOD_NOT_ALLOWED`
    - `POST {}` → 400 `INVALID_REQUEST`
    - `POST {accessToken:'fake…'}` → 401 `KAKAO_TOKEN_INVALID`(카카오 -401). 설정 검사가 카카오 호출보다 앞이므로 `SERVER_MISCONFIGURED`가 아니라는 것은 키 JSON 파싱·`cert()`가 성공했다는 뜻
    - `POST {accessToken:'x', id:'123'}` → 401(본문 id 무시)
    - 실제 카카오 토큰으로 커스텀 토큰 서명(200)은 카카오 로그인이 필요해 운영자 K1에서 확인
- [ ] T017 **운영자** 운영 배포·확인 — `main` 푸시, 운영 사이트 — AC-06, AC-16 — K13(K1·K5·K7), 하루 뒤 K6
  - 2026-11-26 배포(Claude): `main` 병합 `66754b5` → Vercel `success`. 운영 `GET /api/kakao-firebase-token` 405, 임의 토큰 `POST` 401 `KAKAO_TOKEN_INVALID`, 첫 화면 200·콘솔 오류 0건(비로그인). 카카오 로그인 확인(K1·K5·K7·K13)과 하루 뒤 K6은 운영자
- [ ] T018 `/sdd-verify` 실행 — 전체 — 모든 AC — 아래 검증 기록 작성

## 검증 기록

`/sdd-verify`가 채운다. 확인 방법은 plan.md 6절을 따른다.
판정: `통과 / 실패 / 미실행 / 실행 불가(사유)`

| AC | 판정 | 근거 (명령 출력·화면·로그 위치) | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | | |
| AC-02 | 미실행 | | |
| AC-03 | 통과 | 단위 `app_id 불일치 거부`·`카카오 401 거부`·`본문의 id 무시`, 규칙 `kakao: 타인 문서 거부` 통과. Preview curl: 임의 토큰 → 401 `KAKAO_TOKEN_INVALID`, 본문 id 위조 → 401 (K3) | 2026-11-26 |
| AC-04 | 미실행 | | |
| AC-05 | 미실행 | | |
| AC-06 | 미실행 | | |
| AC-07 | 미실행 | | |
| AC-08 | 미실행 | | |
| AC-09 | 미실행 | | |
| AC-09a | 미실행 | | |
| AC-10 | 미실행 | | |
| AC-11 | 미실행 | | |
| AC-11a | 미실행 | | |
| AC-11b | 미실행 | | |
| AC-12 | 미실행 | | |
| AC-13 | 미실행 | | |
| AC-14 | 미실행 | | |
| AC-15 | 통과 | DEC-030에 서버 범위(카카오 토큰 교환 1개), 자격 증명(서비스 계정 키, Vercel Sensitive), 비용이 적혀 있음. DEC-001·008 상태 갱신 | 2026-11-26 |
| AC-16 | 미실행 | | |
| AC-17 | 미실행 | | |

### 프로젝트 검사

| 검사 | 명령 | 결과 |
|---|---|---|
| 단위 테스트 | `npm run test:unit` | 통과 — 64/64 (2026-11-26, main 병합 후 `npm ci`) |
| 규칙 테스트 | `npm run test:rules` | 통과 — 27/27 (2026-11-26, main 병합 후) |
| 타입(클라이언트) | `npx tsc --noEmit` | 통과 (2026-11-26) |
| 타입(서버 함수) | `npx tsc -p api --noEmit` | 통과 (2026-11-26) |
| 빌드(이미지 검사 포함) | `npm run build` | 통과 (2026-11-26, main 병합 후, `tsc -p api` 포함) |
| 비밀 유출 검사 | `dist/`와 `git log -p`에서 `private_key` 검색 | 통과 — 0건 (2026-11-26, 병합 후 `git grep` 0건) |

### 영향받는 기존 흐름

- 007 구글 로그인 — 미확인 (AC-08)
- 008 저장·동기화(구글 첫 불러오기, onSnapshot) — 미확인 (T003)
- 010 랭킹(카카오 사용자 재등록) — 미확인 (K1)
- 014 탈퇴(카카오) — 미확인 (K11·K12)

## 완료 조건

- [ ] 모든 작업이 체크되었다. (T014는 T003 결과에 따라 해당 없음 처리 가능)
- [ ] 모든 AC가 `통과`다. (`미실행`·`실행 불가`가 있으면 Verified 아님)
- [ ] 프로젝트 검사가 통과했다.
- [ ] 코드와 spec·plan이 일치한다. 구현 중 바뀐 내용을 문서에 반영했다.
- [ ] 알려진 한계·후속 작업: spec Q-C(인증 유지 기간), Q-G(남용 방지)
