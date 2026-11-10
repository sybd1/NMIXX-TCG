# Tasks 002: 팩 구매와 카드 추첨(확률·천장)

- 상태: Implementing
- 최종 수정일: 2026-11-10
- 기준: [spec.md](spec.md), [plan.md](plan.md)

## 작업 목록

### 1단계: 계약·기반

- [x] T001 가격·천장 상수 — `src/config/gameConfig.ts` — AC-01, AC-08 — 타입 검사 통과

### 2단계: 테스트 먼저

- [ ] T002 (DEC-020 확정 시) `rngService` 단위 테스트: 등급 비율, 천장 49/48 경계, 팩 풀, 오름차순 — `src/services/rngService.test.ts` — AC-04~AC-10 — 시뮬레이션 S1을 테스트로 옮김

### 3단계: 구현

- [x] T003 등급·카드·팩 추첨 — `src/services/rngService.ts` — AC-04~AC-07 — S1 통과
- [x] T004 천장 — `src/services/rngService.ts` — AC-08~AC-11 — S1 통과 (v1.3.0)
- [x] T005 구매 핸들러(1·5·10팩) — `src/App.tsx` — AC-01, AC-02, AC-11 — 수동 M1
- [x] T006 원자적 반영 `commitPackOpening`, 찢을 때 커밋 — `useGameState.ts`, `PackOpeningSequence.tsx` — AC-01, AC-03, AC-12 — 수동 M3·M5 (v1.4.8~v1.4.9 연타 버그 수정)
- [ ] T007 천장 문구를 실제 동작과 맞추기 — `PackOpeningSequence.tsx` — Q-05 결정 후 (후속)
- [ ] T008 `rngService.ts` 47~53행 틀린 주석 정리 — (후속, 동작 영향 없음)
- [x] T010 (결함 수정, 2026-11-10) 다시 열기 미커밋: `[cards]` 이펙트에서 `hasCommittedRef` 초기화 — `PackOpeningSequence.tsx` — AC-01·AC-12(다시 열기 경로), 기능 003 AC-08 — 기능 003 tasks 검증 기록 AC-08 통과

### 4단계: 통합 검증

- [ ] T009 `/sdd-verify` 실행 — 전체 — 모든 AC

## 검증 기록

| AC | 판정 | 근거 (명령 출력·화면·로그 위치) | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | | |
| AC-02 | 미실행 | | |
| AC-03 | 미실행 | | |
| AC-04 | 통과 | S1: C 51.719 / UC 29.979 / R 14.951 / SR 2.506 / SSR 0.456 / UR 0.247 / LR 0.121 / MR 0.021 %, XR 0회 (100만 회) | 2026-11-10 |
| AC-05 | 통과 | S1: NX-03 50,000팩 중 오름차순 50,000 | 2026-11-10 |
| AC-06 | 통과 | S1: NX-03 50,000팩 `wrongPack 0`, `xr 0` | 2026-11-10 |
| AC-07 | 통과 | S1: `rollCard('LR','op01')` 200,000회 모두 다른 팩 카드 | 2026-11-10 |
| AC-08 | 통과 | S1: `generatePack(49)` 20,000회 중 SSR+ 없음·pity≠0 = 0 | 2026-11-10 |
| AC-09 | 통과 | S1: `generatePack(48)` 20,000회 중 `pityTriggered` 0 | 2026-11-10 |
| AC-10 | 통과 | S1: SSR 70.07 / UR 20.02 / LR 7.96 / MR 1.94 % (20만 회) | 2026-11-10 |
| AC-11 | 미실행 | 코드상 `currentPity = res.newPity` 연쇄 확인, 화면 관찰 없음 | |
| AC-12 | 미실행 | | |

### 프로젝트 검사

| 검사 | 명령 | 결과 |
|---|---|---|
| 테스트 전체 | 없음 (DEC-019) | 실행 불가(테스트 없음) |
| 타입 | `npx tsc --noEmit` | 통과 (2026-11-10) |
| 빌드 | `npm run build` | 통과 (2026-11-10) |

### 영향받는 기존 흐름

- 기능 009 업적(`coinsSpentTotal`, `openedPacksTotal`), 기능 011 전광판 — 미확인
- T010 이후 다시 열기 경로도 `commitPackOpening`을 타므로 위 두 기능이 다시 연 팩에도 반영된다. 팩 탭 버튼 경로의 동작은 바뀌지 않았다(첫 마운트 때 ref는 원래 false) — 코드 검토, 2026-11-10

## 완료 조건

- [ ] 모든 작업이 체크되었다.
- [ ] 모든 AC가 `통과`다.
- [ ] 프로젝트 검사가 통과했다.
- [x] 코드와 spec·plan이 일치한다.
- [x] 알려진 한계·후속 작업: T002, T007, T008, spec 7절
