# Tasks 010: 글로벌 랭킹

- 상태: Implementing
- 최종 수정일: 2026-11-10
- 기준: [spec.md](spec.md), [plan.md](plan.md)

## 작업 목록

### 1단계: 계약·기반

- [x] T001 `LeaderboardEntry` 타입(+`achievementBadges`, `fullCollectionAt`) — `src/types/multiplayer.ts` — 전체 — 타입 검사 통과

### 2단계: 테스트 먼저

- [ ] T002 (DEC-020 확정 시) `compareLeaderboard`·`completionMillis` 단위 테스트 — `src/services/multiplayerService.test.ts` — AC-01, AC-02 (두 함수를 export해야 함)

### 3단계: 구현

- [x] T003 랭킹 문서 갱신·완성 시각 고정·이관 — `multiplayerService.ts` `updateLeaderboardEntry` — AC-03~AC-06 — 수동 M1·M2
- [x] T004 조회·정렬·봇 혼합 — `multiplayerService.ts` `fetchLeaderboard` — AC-01, AC-02, AC-09, AC-10 — 수동 M1·M5
- [x] T005 랭킹 탭 화면·수집률 재계산·배지 — `RankingPage.tsx`, `AchievementBadges.tsx` — AC-07, AC-08 — 수동 M3·M4
- [x] T006 (변경, 2026-11-10, DEC-023) 조회 시 문서 삭제 제거, `카카오_엔써_` 숨김 해제 — `multiplayerService.ts` 129~143행 — AC-06, AC-11, AC-12 — 타입 검사·빌드 통과, 코드 검토로 `fetchLeaderboard` 안에 `deleteDoc` 없음 확인. AC-11·AC-12 수동 M6·M7은 미실행
- [ ] T007 대표 카드 정렬 배열에 UC·C 추가, MR > LR 순서 통일 — `RankingPage.tsx` 49행 — (후속)
- [ ] T008 `521` 하드코딩을 `MASTER_CARDS.length`로 — `RankingPage.tsx`, `LeaderboardModal.tsx`, `multiplayerService.ts` 봇·프로필 — (후속, Q-04)
- [ ] T010 조회 시 남은 쓰기(`박민주` → `anjffhrkwl` 덮어쓰기) 제거, 운영자 판정의 `GM` 부분 문자열 조건 정리 — `multiplayerService.ts` — DEC-023, spec 7절 (후속)

### 4단계: 통합 검증

- [ ] T009 `/sdd-verify` 실행 — 전체 — 모든 AC

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | | |
| AC-02 | 미실행 | | |
| AC-03 | 미실행 | | |
| AC-04 | 미실행 | 코드 분기만 확인 | |
| AC-05 | 미실행 | | |
| AC-06 | 미실행 | | |
| AC-07 | 미실행 | | |
| AC-08 | 미실행 | | |
| AC-09 | 미실행 | | |
| AC-10 | 미실행 | | |
| AC-11 | 미실행 | 부분 관찰만 있음: `npm run dev`(운영 Firestore `nmixx-tcg`에 연결)에서 게스트로 랭킹 탭을 연 세션 동안 Firestore 요청 13건이 모두 `Listen`, `Write` 0건. 테스트 판정 문서가 실제로 있는지 몰라 Given을 충족했다고 볼 수 없다 → M6 필요 | |
| AC-12 | 미실행 | 같은 세션의 목록에 `카카오_엔써_` 이름이 없었다(해당 문서 존재 여부 미확인) → M7 필요 | |

### 프로젝트 검사

| 검사 | 명령 | 결과 |
|---|---|---|
| 테스트 전체 | 없음 (DEC-019) | 실행 불가(테스트 없음) |
| 타입 | `npx tsc --noEmit` | 통과 (2026-11-10) |
| 빌드 | `npm run build` | 통과 (2026-11-10) |

### 영향받는 기존 흐름

- 기능 008 저장마다 랭킹 갱신 호출, 기능 020 공유 배지의 대표 카드 — 미확인
- T006: 갱신 경로(`updateLeaderboardEntry`)는 바꾸지 않았다. 운영자 본인 문서 삭제(DEC-012)는 그대로다 — 코드 검토, 2026-11-10

## 완료 조건

- [ ] 모든 작업이 체크되었다.
- [ ] 모든 AC가 `통과`다.
- [ ] 프로젝트 검사가 통과했다.
- [x] 코드와 spec·plan이 일치한다.
- [x] 알려진 한계·후속 작업: T002, T007, T008, T010, spec 7절
