# Tasks 001: 카드 카탈로그와 등급 체계

- 상태: Implementing
- 최종 수정일: 2026-11-10
- 기준: [spec.md](spec.md), [plan.md](plan.md)

## 작업 목록

### 1단계: 계약·기반

- [x] T001 카드·등급 타입 — `src/types/card.ts` — 전체 — 타입 검사 통과
- [x] T002 등급·가공·팩 설정 — `src/config/gameConfig.ts` — AC-04 — 타입 검사 통과

### 2단계: 테스트 먼저

- [x] T003 이미지 경로 빌드 가드 — `scripts/verify_images.cjs`, `package.json` build 스크립트 — AC-02 — 정상 데이터에서 통과
- [ ] T004 (DEC-020 확정 시) 카드 데이터 무결성 테스트: id 중복, `packId`가 `BOOSTER_PACKS`에 있는지, `sets.json`의 `cardIds`가 모두 존재하는지 — `src/data/cards.test.ts` — AC-03

### 3단계: 구현

- [x] T005 [P] 팩별 카드 JSON 5개 + XR — `src/data/card-data/*.json` — AC-01, AC-03 — 빌드 가드 통과
- [x] T006 카드 병합·조회 함수 — `src/data/cards.ts` — AC-01 — 타입 검사 통과
- [x] T007 카드 앞면·효과 — `src/components/Card/CardVisual.tsx` — AC-04, AC-05, AC-06, AC-08 — 수동 M1·M3·M4·M5
- [x] T008 카드 상세 창 — `src/components/Card/CardModal.tsx` — AC-07 — 수동 M3
- [ ] T009 JSON `finishType`을 등급 기준으로 정리할지 결정 — spec 7절 — (후속)

### 4단계: 통합 검증

- [ ] T010 `/sdd-verify` 실행 — 전체 — 모든 AC — 아래 검증 기록 작성

## 검증 기록

| AC | 판정 | 근거 (명령 출력·화면·로그 위치) | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | 데이터 장수 521은 M2 스크립트로 확인, 화면 문구는 미확인 | |
| AC-02 | 통과 | `node scripts/verify_images.cjs` → `✅ [Image Guard] All 529 static images verified and case-matched!` (정상 경로만 확인, 실패 경로는 미확인) | 2026-11-10 |
| AC-03 | 통과 | 데이터 분석 스크립트 → 카드 521장, 중복 id 0 | 2026-11-10 |
| AC-04 | 미실행 | | |
| AC-05 | 미실행 | | |
| AC-06 | 미실행 | | |
| AC-07 | 미실행 | | |
| AC-08 | 미실행 | | |

### 프로젝트 검사

| 검사 | 명령 | 결과 |
|---|---|---|
| 테스트 전체 | 없음 (DEC-019) | 실행 불가(테스트 없음) |
| 타입 | `npx tsc --noEmit` | 통과 (2026-11-10) |
| 빌드 | `npm run build` | 통과 (2026-11-10) |

### 영향받는 기존 흐름

- 해당 없음 (기반 기능)

## 완료 조건

- [ ] 모든 작업이 체크되었다.
- [ ] 모든 AC가 `통과`다.
- [ ] 프로젝트 검사가 통과했다.
- [x] 코드와 spec·plan이 일치한다.
- [x] 알려진 한계·후속 작업: T004, T009, spec 7절
