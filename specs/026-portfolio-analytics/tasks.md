# Tasks 026: 포트폴리오용 이용자 분석·성능 로그

- 상태: Implementing
- 최종 수정일: 2026-11-27
- 기준: [spec.md](spec.md), [plan.md](plan.md)

## 작업 목록

형식: `- [ ] T번호 [P] 설명 — 파일 — AC — 완료 기준`

### 1단계: 계약·기반

- [x] T001 계약·의존성 — `src/types/metrics.ts`, `package.json`(`web-vitals`), `docs/decisions.md`(DEC-034·035) — 전체 — `npx tsc --noEmit` 통과
  - 2026-11-27 `npm install web-vitals@4.2.4`(lock 변경 2줄), `npx tsc --noEmit` 통과

### 2단계: 테스트 먼저

- [x] T002 [P] 규칙 테스트 — `tests/rules/metrics.test.ts` — AC-01, 13, 17 — 현재 규칙에서 허용 테스트 실패 확인
  - 2026-11-27 규칙 없을 때 7개 중 6개 실패(허용·읽기 테스트), 거부 테스트 1개 통과 확인
- [x] T003 [P] 기록 단위 테스트 — `tests/unit/metrics.test.ts` — AC-01~04, 06, 13~15 — 모듈 없음으로 실패 확인
  - 2026-11-27 `Cannot find module '../../src/services/metrics'`로 실패 확인
- [x] T004 [P] 분석 단위 테스트 — `tests/unit/metricsAnalysis.test.ts` — AC-05, 07~13, 16 — 모듈 없음으로 실패 확인
  - 2026-11-27 `Cannot find module '../../src/services/metricsAnalysis'`로 실패 확인. 구현 후 `첫 팩까지 시간` 1건은 테스트 기대값 오류(평균으로 적음)였고 plan 4절 nearest-rank 정의대로 고침

### 3단계: 구현

- [x] T005 규칙 — `firestore.rules` — AC-01, 13, 17 — `npm run test:rules` 통과
  - 2026-11-27 규칙 40/40(기존 33 + 새 7)
- [x] T006 순수 로직 — `src/services/metrics.ts`, `src/services/metricsAnalysis.ts` — AC-01~16 — `npm run test:unit` 통과
  - 2026-11-27 단위 100/100. 계획 추가: 3D 성능 기록 세션당 10건 상한(plan 5절)
- [x] T007 서비스·연결 지점 — `src/services/metricsService.ts`, `src/main.tsx`, `src/App.tsx`, `src/hooks/useGameState.ts`, `src/services/authService.ts`, `src/components/Pack/BoosterPackThreeView.tsx`, `src/components/Common/WebGLErrorBoundary.tsx` — AC-01~06, 10~15 — `npx tsc --noEmit` 통과, dev에서 게임 회귀 없음(콘솔 오류 0)
  - 2026-11-27 `npx tsc --noEmit` 통과. dev(localhost): 1팩 개봉 → 개봉 화면 → 뒤로 → 정보 탭, 콘솔 오류 0건, `nmixx_tcg_metrics` 요청 0건(localhost 미기록)
- [x] T008 운영자 화면·고지 — `src/pages/Admin/AdminPage.tsx`, `src/pages/Admin/MetricsPanel.tsx`, `src/services/adminMetricsService.ts`, `src/pages/Settings/SettingsPage.tsx` — AC-16~19 — `npm run build` 통과, dev에서 정보 탭 문구 확인
  - 2026-11-27 `npm run build` 통과(AdminPage 청크 25.34 kB). dev 정보 탭 새 고지 문구 확인. 비로그인 `/#admin`: 권한 없음 문구만, 탭 버튼 없음, 콘솔 오류 0건

### 4단계: 배포·검증

- [x] T009 문서 — `CLAUDE.md`(폴더 구조), `docs/product.md` — 전체
  - 2026-11-27 CLAUDE.md(스택·services·Admin·기록 규칙, 95줄), product.md 026 행
- [x] T010 규칙 배포·`main` 푸시 — 운영 — 전체 — 직전 `test:rules` 통과 → 규칙 배포 → 운영 ruleset = 저장소 → 푸시 → Vercel `success`
  - 2026-11-27 직전 단위 100/100·규칙 40/40·빌드 통과 → `released rules` → 운영 ruleset `8a68778b…` 본문 = 저장소(true) → `main` `386d5c0` 푸시 → Vercel `success`
- [ ] T011 운영 확인 P1·P3·P5 — 운영 사이트 — AC-10, 11, 17, 19
  - 2026-11-27 앱 내장 브라우저(배경 실행, 화면 숨김 상태)로 운영 사이트 방문. 운영자 CLI 권한으로 같은 `vid` 조회:
    - visit(first true → 재방문 시 false), screen(home→collection→settings), pack3d 5건(홈 캐러셀, readyMs 90~100, 프레임이 적어 avgFps null), session_end(19,425ms, home), vitals(lcp·inp·cls 모두 null) 기록됨
    - session_end·vitals는 이 브라우저가 화면 숨김 신호를 보내지 않아 `visibilitychange`를 흉내 내 확인함. 숨김 실행이라 그리기·입력이 없어 Web Vitals 값과 평균 프레임은 측정되지 않았다 → AC-10·11의 실제 값은 일반 브라우저(운영자 P2)에서 확인
    - 로그인 없이 `nmixx_tcg_metrics` 목록 조회: 403
    - P3: 비로그인 `/#admin` 권한 없음 문구만, 콘솔 오류 0건
    - P5: 운영 정보 탭 새 고지 문구 표시
- [ ] T012 **운영자** P2·P4 — 운영 사이트 — AC-16, 18

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 통과 | 단위 `screen: 화면이 바뀌면 to·from`, 규칙 `비로그인·로그인 모두 정해진 모양 추가 허용` | 2026-11-27 |
| AC-02 | 통과 | 단위 `screen: 같은 화면이면 기록하지 않는다` | 2026-11-27 |
| AC-03 | 통과 | 단위 `기록 실패는 밖으로 던지지 않고 다시 보내지 않는다`(비동기 거부·동기 throw) | 2026-11-27 |
| AC-04 | 통과 | 단위 `sessionEnd: 경과 시간과 마지막 화면` | 2026-11-27 |
| AC-05 | 통과 | 단위 `종료 기록이 없으면 마지막 기록까지, 따로 센다` | 2026-11-27 |
| AC-06 | 통과 | 단위 `pack: 수집 종류 수와 전체 수`. 코드 검토: useGameState가 `newCollection` 0 초과 개수와 `MASTER_CARDS.length`를 넘김 | 2026-11-27 |
| AC-07 | 통과 | 단위 `D1 재방문율과 표본 수`(10명 중 3명 → 0.3, n 10) | 2026-11-27 |
| AC-08 | 통과 | 단위 `D7 표본 부족은 null과 사유` | 2026-11-27 |
| AC-09 | 통과 | 단위 `등급 비율: 실제·설정·표본` | 2026-11-27 |
| AC-10 | 미실행 | 단위 통과. 운영에서 vitals 문서 쓰기 확인, 값은 숨김 실행 브라우저라 null. 일반 브라우저 값은 운영자 P2 대기 | 2026-11-27 |
| AC-11 | 미실행 | 단위 통과. 운영에서 pack3d readyMs 90~100ms 기록 확인, avgFps는 숨김 실행이라 null. 운영자 P2 대기 | 2026-11-27 |
| AC-12 | 통과 | 단위 `2D 대체 비율`. 코드 검토: WebGLErrorBoundary.componentDidCatch가 mode 2d 기록 | 2026-11-27 |
| AC-13 | 통과 | 단위 `메시지를 자르고 이메일·계정 ID를 가린다`, `오류 종류별 횟수와 방문자 수`, 규칙 `error 메시지 201자 거부` | 2026-11-27 |
| AC-14 | 통과 | 단위 `세션당 5건, 같은 메시지는 1건` | 2026-11-27 |
| AC-15 | 통과 | 단위 `error 기록 실패가 다시 error를 만들지 않는다` | 2026-11-27 |
| AC-16 | 미실행 | 단위 계산 통과. 운영자 화면 확인(P2) 대기 | 2026-11-27 |
| AC-17 | 통과 | 규칙 `운영자만 목록을 읽는다`, `identify는 본인도 읽고 지운다`, `uid 위장·형식 위반 거부`, `수정 거부`. 운영: 비로그인 목록 조회 403, 비로그인 `/#admin` 권한 없음 문구 | 2026-11-27 |
| AC-18 | 미실행 | 코드 검토: 실패 시 문구·다시 시도. 운영자 P4 대기 | 2026-11-27 |
| AC-19 | 통과 | dev·운영 정보 탭 새 고지 문구 확인 | 2026-11-27 |

### 프로젝트 검사

| 검사 | 명령 | 결과 |
|---|---|---|
| 단위 테스트 | `npm run test:unit` | 통과 — 100/100 (2026-11-27) |
| 규칙 테스트 | `npm run test:rules` | 통과 — 40/40 (2026-11-27) |
| 타입 | `npx tsc --noEmit` | 통과 (`npm run build` 안에서, 2026-11-27) |
| 빌드 | `npm run build` | 통과 (2026-11-27) |
