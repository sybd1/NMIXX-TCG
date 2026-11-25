# Tasks 024: 이용자 행동 로그

- 상태: Implementing
- 최종 수정일: 2026-11-26
- 기준: [spec.md](spec.md), [plan.md](plan.md)

## 작업 목록

형식: `- [ ] T번호 [P] 설명 — 파일 — AC — 완료 기준`

### 1단계: 계약·기반

- [x] T001 이벤트 타입 계약과 테스트 스크립트 — `src/types/activity.ts`, `package.json`(`test:unit`) — 전체 — 2026-11-26 `npx tsc --noEmit` 통과

### 2단계: 테스트 먼저 (실패 확인)

- [x] T002 [P] 단위 테스트 — `tests/unit/activityLog.test.ts` — AC-01~03, 05, 07, 11, 13 — 2026-11-26 `Cannot find module '../../src/services/activityLog'`로 실패 확인(기능 없음)
- [x] T003 [P] 규칙 테스트 — `tests/rules/events.test.ts` — AC-01, 03, 04, 07~10, 12 — 2026-11-26 현재 규칙에서 허용 테스트 5개 실패(이벤트 규칙 없음), 거부 테스트 4개와 기존 18개 통과

### 3단계: 구현

- [x] T004 서비스 — `src/services/activityLog.ts`(순수 로직, 주입), `src/services/activityLogService.ts`(Firestore 연결) — AC-01~03, 05, 07, 11, 13 — 2026-11-26 단위 17/17 통과. 계획과 다른 점: 테스트하려고 순수 로직과 Firestore 연결을 두 파일로 나눴고, 로그아웃용 `logAndWait`를 추가함
- [x] T005 [P] 규칙·인덱스 — `firestore.rules`, `firestore.indexes.json`, `firebase.json` — AC-03, 04, 07~10, 12 — 2026-11-26 규칙 테스트 27/27 통과(기존 18 포함)
- [x] T006 기록 지점 — `src/hooks/useGameState.ts`(세션 시작·정리, 팩, 세트, 업적, XR, 우편, 쿠폰), `src/services/authService.ts`(로그인·로그아웃·탈퇴 시 삭제), `src/App.tsx`(팩 ID) — AC-01, 02, 06, 07, 10, 12, 13 — 2026-11-26 `npx tsc --noEmit` 통과, 단위·규칙 통과. 코드 검토: 7개 기록 호출 모두 `setState` 업데이터 밖. 탈퇴 시 Firebase 인증이 없으면(카카오, 023 전) 이벤트 삭제를 건너뜀(쓸 수 없었으므로)
- [x] T007 [P] 고지 문구 — `src/pages/Settings/SettingsPage.tsx`, `src/components/Auth/AuthModal.tsx` — AC-14 — 2026-11-26 `npm run dev`에서 로그인 창과 정보 탭 문구 확인(E6). 같은 화면에서 게스트로 1팩 개봉 → 코인 1,000,000 → 996,200, 콘솔 오류 0건(회귀 확인)

### 4단계: 통합 검증·배포

- [x] T008 프로젝트 검사·문서 — `CLAUDE.md`(명령 `test:unit`, 폴더 `tests/unit/`·`firestore.indexes.json`, 행동 로그 규칙, 배포 명령) — 전체 — 2026-11-26 아래 표 전부 통과
- [x] T009 운영 배포 — `firebase deploy --only firestore:rules,firestore:indexes`, `main` 푸시 — 전체 — 2026-11-26 규칙·인덱스 배포 완료: 직전 규칙 테스트 27/27 → `released rules` → 운영 ruleset `0bb6a748…` 본문 = 저장소(API 비교 true), 인덱스 `nmixx_tcg_events (uid, at)` 생성 확인. 로그인 없는 요청: users 읽기 403, leaderboard·feed·market 읽기 200, events 읽기 403, users·leaderboard·feed·events 쓰기 403(배포 전과 같고 events만 추가). 직전 ruleset은 `d4e4458c…`. `main` 푸시 `566deb0` → Vercel `success`. 운영 사이트(비로그인): 정보 탭 고지 표시, 랭킹 Top 50(51행), Firestore 요청은 읽기(Listen)만, 콘솔 오류 0건
- [ ] T010 **운영자** 운영 수동 확인 — 운영 사이트 — AC-01, 02, 06, 07, 08, 10, 12 — E1~E5
- [x] T011 `/sdd-verify` — 전체 — 2026-11-26 검증 기록 작성: 통과 7, 미실행 7(로그인 필요한 운영 확인 E1~E5). Verified 아님

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | 단위 `팩 개봉 이벤트 모양`·`summarizeRarities`, 규칙 `본인 이벤트 생성 허용` 통과. 운영 로그인 확인(E1)은 테스트 계정이 필요해 미실행 | 2026-11-26 |
| AC-02 | 미실행 | 단위 `세션·로그인·로그아웃 이벤트 모양` 통과. 운영 E1 미실행 | 2026-11-26 |
| AC-03 | 통과 | 규칙 `타인 uid·비로그인 생성 거부`, 단위 `shouldLog` 2건 통과. 운영에서 로그인 없는 events 쓰기 403 | 2026-11-26 |
| AC-04 | 통과 | 규칙 `형식 위반 거부`(모르는 종류, 추가 필드, 클라이언트 시각, 날짜 형식, sessionId 41자, data 키 9개, 필드 누락) 통과 | 2026-11-26 |
| AC-05 | 통과 | 단위 `logActivity는 예외를 밖으로 던지지 않는다`(거부·동기 throw) 통과. 코드 검토: 호출처는 결과를 기다리지 않음(로그아웃의 logAndWait도 실패를 삼킴) | 2026-11-26 |
| AC-06 | 미실행 | 코드 검토: 7개 호출 모두 업데이터 밖에서 stateRef로 "이미 받음"을 먼저 검사. 운영 E2 미실행 | 2026-11-26 |
| AC-07 | 미실행 | 단위 `보상 이벤트 모양`, 규칙 `모든 종류 생성 허용` 통과. 운영 E2 미실행 | 2026-11-26 |
| AC-08 | 미실행 | 규칙 `본인 uid 조회 허용` 통과. 콘솔 조회(E3)는 이벤트가 쌓인 뒤 운영자가 확인 | 2026-11-26 |
| AC-09 | 통과 | 규칙 `타인·비로그인 조회 거부, uid 조건 없는 목록 거부` 통과. 운영에서 로그인 없는 events 읽기 403 | 2026-11-26 |
| AC-10 | 미실행 | 규칙 `오래된 이벤트 정리 쿼리·삭제 허용`, 단위 `purgeOld` 2건 통과, 운영 인덱스 생성 확인. 운영 E4 미실행 | 2026-11-26 |
| AC-11 | 통과 | 단위 `purgeOldActivity는 실패를 삼킨다` 통과 | 2026-11-26 |
| AC-12 | 미실행 | 규칙 `본인 삭제 허용, 타인 삭제 거부`, 단위 `deleteAll` 통과. 운영 E5 미실행 | 2026-11-26 |
| AC-13 | 통과 | 단위 `deleteAllActivity는 실패를 던진다` 통과. 코드 검토: deleteAccount가 이벤트 삭제를 먼저 하고, 실패하면 기존 실패 문구로 중단 | 2026-11-26 |
| AC-14 | 통과 | `npm run dev`와 운영 사이트(Vercel 배포 566deb0)에서 정보 탭 고지 문구 확인, dev에서 로그인 창 안내 확인 | 2026-11-26 |

### 프로젝트 검사

| 검사 | 명령 | 결과 |
|---|---|---|
| 단위 테스트 | `npm run test:unit` | 통과 — 17/17 (2026-11-26) |
| 규칙 테스트 | `npm run test:rules` | 통과 — 27/27 (2026-11-26) |
| 타입 | `npx tsc --noEmit` | 통과 (2026-11-26) |
| 빌드 | `npm run build` | 통과 (2026-11-26) |

### 영향받는 기존 흐름

- 002·003 팩 개봉 — dev(게스트)에서 1팩 개봉, 코인 3,800 차감, 오류 없음(2026-11-26). 로그인 상태는 미확인
- 005·009·012 보상 수령 — 미확인
- 007 로그인·로그아웃 — 미확인
- 014 탈퇴 — 미확인 (이벤트 삭제가 먼저 실행됨, 로그인 필요)

## 완료 조건

- [ ] 모든 작업이 체크되었다.
- [ ] 모든 AC가 `통과`다.
- [ ] 프로젝트 검사가 통과했다.
- [ ] 코드와 spec·plan이 일치한다.
- [ ] 알려진 한계·후속 작업: DEC-031 잠정 결정 사용자 확인, 카카오 사용자 기록은 기능 023 배포 후
