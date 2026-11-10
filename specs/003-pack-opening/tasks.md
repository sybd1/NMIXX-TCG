# Tasks 003: 팩 선택과 개봉 연출

- 상태: Implementing
- 최종 수정일: 2026-11-10
- 기준: [spec.md](spec.md), [plan.md](plan.md)

## 작업 목록

### 1단계: 계약·기반

- [x] T001 개봉 단계 타입 — `src/types/game.ts` — 전체 — 타입 검사 통과

### 2단계: 테스트 먼저

- 자동 테스트 없음(DEC-019). 3단계 각 작업의 완료 기준은 plan 6절 수동 절차다.

### 3단계: 구현

- [x] T002 [P] 뒤집기 카드 — `src/components/Card/CardFlip.tsx` — AC-03, AC-04 — 수동 M3
- [x] T003 개봉 상태 기계, 카드 합치기, 쇼케이스, 요약 — `src/components/Pack/PackOpeningSequence.tsx` — AC-03~AC-10 — 수동 M3·M4
- [x] T004 [P] 3D 팩 엔진 — `src/components/Pack/BoosterPack3DScene.ts`, `BoosterPackThreeView.tsx`, `Pack3D.tsx` — AC-01 — 수동 M1
- [x] T005 [P] 2D 대체와 오류 경계 — `BoosterPack2DView.tsx`, `WebGLErrorBoundary.tsx` — AC-11 — 수동 M6
- [x] T006 팩 탭 캐러셀·버튼·첫 방문 — `src/pages/Home/HomePage.tsx` — AC-01, AC-02 — 수동 M1·M2
- [x] T007 키 연타·꾹 누름 방지 — `PackOpeningSequence.tsx` — AC-07 — v1.4.8
- [ ] T008 ESC 처리기 정리: `App.tsx` 123~145행과 `PackOpeningSequence.tsx` 141~150행 두 capture 처리기를 모두 고쳐야 단계별 ESC 잠금이 동작한다 — spec 7절 (후속)
- [ ] T009 팩 탭 `Pack3D`에 `WebGLErrorBoundary` 적용 — `HomePage.tsx` 또는 `Pack3D.tsx` — AC-11 확장 (후속)
- [ ] T010 `BoosterPack3DScene.ts` 대체 이미지 로딩 버그·NX-05 파라미터 — (후속)
- [x] T012 (결함 수정, 2026-11-10) 다시 열기 미커밋 — 기능 002 tasks T010과 같은 코드 변경 — AC-08 — 수동 M3 통과

### 4단계: 통합 검증

- [ ] T011 `/sdd-verify` 실행 — 전체 — 모든 AC

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | | |
| AC-02 | 실행 불가(초기 상태에서 `isFirstVisit`가 항상 false, spec 7절) | | 2026-11-10 |
| AC-03 | 미실행 | | |
| AC-04 | 미실행 | | |
| AC-05 | 미실행 | | |
| AC-06 | 미실행 | | |
| AC-07 | 미실행 | | |
| AC-08 | 통과 | M3 변형(`npm run dev`, 게스트): 1팩 개봉 → 찢기 1,000,000→996,200 N → 요약에서 `🔁 1팩 다시 열기 (3,800 N)` 클릭 → 찢기 996,200→992,400 N, 정보 탭 `총 소지 카드 수` 521→531장(2팩 10장). Space로 다시 열기 경로도 996,200→992,400→988,600 N, 천장 게이지 1→2→3 | 2026-11-10 |
| AC-09 | 미실행 | | |
| AC-10 | 미실행 | | |
| AC-11 | 미실행 | | |

### 프로젝트 검사

| 검사 | 명령 | 결과 |
|---|---|---|
| 테스트 전체 | 없음 (DEC-019) | 실행 불가(테스트 없음) |
| 타입 | `npx tsc --noEmit` | 통과 (2026-11-10) |
| 빌드 | `npm run build` | 통과 (2026-11-10) |

### 영향받는 기존 흐름

- 기능 002 결제 시점(찢을 때) — 다시 연 팩도 찢은 순간 차감됨을 확인(다시 열기 클릭 직후 996,200 유지 → 찢은 뒤 992,400), 2026-11-10

## 완료 조건

- [ ] 모든 작업이 체크되었다.
- [ ] 모든 AC가 `통과`다.
- [ ] 프로젝트 검사가 통과했다.
- [x] 코드와 spec·plan이 일치한다.
- [x] 알려진 한계·후속 작업: T008~T010, spec 7절
