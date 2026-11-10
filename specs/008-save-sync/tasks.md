# Tasks 008: 게임 데이터 저장과 기기 간 동기화

- 상태: Implementing
- 최종 수정일: 2026-11-10
- 기준: [spec.md](spec.md), [plan.md](plan.md)

## 작업 목록

### 1단계: 계약·기반

- [x] T001 `GameState` 저장 필드 정의 — `src/types/game.ts` — 전체 — 타입 검사 통과
- [x] T002 [P] localStorage 저장소, 초기 상태 생성기 — `src/services/storageService.ts` — AC-02, AC-05, AC-11 — 타입 검사 통과

### 2단계: 테스트 먼저

- [ ] T003 (DEC-020 확정 시) `saveUserGameData` 중복 쓰기 방지 단위 테스트 — `src/services/cloudSyncService.test.ts` — AC-03 — 실패 확인 후 통과

### 3단계: 구현

- [x] T004 Firestore 저장·로드 — `src/services/cloudSyncService.ts` — AC-01, AC-04, AC-05 — 수동 M1·M4·M5
- [x] T005 상태 변경 시 자동 저장 이펙트 — `src/hooks/useGameState.ts` — AC-01, AC-02, AC-06 — 수동 M1·M2
- [x] T006 로그인 전환 시 클라우드 복원 — `src/hooks/useGameState.ts` — AC-04, AC-05, AC-06 — 수동 M4·M5
- [x] T007 onSnapshot 실시간 구독, 피드백 루프 방지 — `cloudSyncService.ts`, `useGameState.ts` — AC-07, AC-08 — 2026-08-31 커밋 `3adcccd`, `6293536`
- [x] T008 로그아웃 전 강제 저장, `activeUserRef`로 게스트 덮어쓰기 차단 — `authService.ts`, `useGameState.ts` — AC-09, AC-10 — 2026-08-31 커밋 `0a984f7`
- [ ] T009 Firestore 읽기 실패와 "문서 없음" 구분 — `cloudSyncService.ts`, `useGameState.ts` — AC-04 — plan 7절 위험 해소 (후속)
- [ ] T010 중복 쓰기 방지 해시에 `dust`·카드 수량 합계 포함 — `cloudSyncService.ts` — AC-03 — 기능 015 재개 전 필수 (후속)

### 4단계: 통합 검증

- [ ] T011 `/sdd-verify` 실행 — 전체 — 모든 AC — 아래 검증 기록 작성

## 검증 기록

`/sdd-verify`가 채운다. 확인 방법은 plan.md 6절을 따른다.
판정: `통과 / 실패 / 미실행 / 실행 불가(사유)`

| AC | 판정 | 근거 (명령 출력·화면·로그 위치) | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | | |
| AC-02 | 미실행 | | |
| AC-03 | 미실행 | | |
| AC-04 | 미실행 | | |
| AC-05 | 미실행 | | |
| AC-06 | 미실행 | 코드 가드 위치만 확인(`useGameState.ts:48`). 관찰 근거 없음 | |
| AC-07 | 미실행 | | |
| AC-08 | 미실행 | | |
| AC-09 | 미실행 | | |
| AC-10 | 미실행 | | |
| AC-11 | 미실행 | | |

### 프로젝트 검사

| 검사 | 명령 | 결과 |
|---|---|---|
| 테스트 전체 | 없음 (DEC-019) | 실행 불가(테스트 없음) |
| 타입 | `npx tsc --noEmit` | 통과 (2026-11-10, 출력 없음·종료 코드 0) |
| 빌드 | `npm run build` | 통과 (2026-11-10, `✓ built in 5.53s`) |

### 영향받는 기존 흐름

- 기능 010 랭킹: 저장할 때마다 `updateLeaderboardEntry`가 호출된다 — 미확인

## 완료 조건

- [ ] 모든 작업이 체크되었다.
- [ ] 모든 AC가 `통과`다.
- [ ] 프로젝트 검사가 통과했다.
- [x] 코드와 spec·plan이 일치한다. (2026-11-10 코드 기준으로 문서 작성)
- [x] 알려진 한계·후속 작업: T009, T010, spec 7절 확인 필요 2건
