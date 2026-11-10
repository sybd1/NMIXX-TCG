# Tasks 007: 로그인(구글·카카오·게스트)

- 상태: Implementing
- 최종 수정일: 2026-11-10
- 기준: [spec.md](spec.md), [plan.md](plan.md)

## 작업 목록

### 1단계: 계약·기반

- [x] T001 `UserAccount` 타입 — `src/types/auth.ts` — 전체 — 타입 검사 통과
- [x] T002 [P] Firebase·Kakao 초기화 — `src/config/firebase.ts`, `index.html`, `.env.example` — AC-01, AC-05 — 타입 검사 통과

### 2단계: 테스트 먼저

- 자동 테스트 없음(DEC-019). 외부 로그인이라 E2E 자동화도 보류(DEC-020).

### 3단계: 구현

- [x] T003 구글 로그인·닉네임 결정 — `src/services/authService.ts` — AC-01~AC-04 — 수동 M1~M4
- [x] T004 카카오 로그인 — `src/services/authService.ts` — AC-05, AC-06 — 수동 M5
- [x] T005 게스트·세션 저장·복원·로그아웃 — `src/services/authService.ts` — AC-07~AC-09 — 수동 M2·M6
- [x] T006 로그인 창 — `src/components/Auth/AuthModal.tsx` — AC-01~AC-07 — 수동 M1·M3·M6
- [x] T007 운영자 처리 — `authService.ts` 외 3곳 — AC-10 — 수동 M7
- [ ] T008 도메인 오류 문구의 포트(5173→3000) 수정 — `authService.ts` 223행 — (후속)
- [ ] T009 게스트 로그인 오류 처리 — `AuthModal.tsx` — (후속)

### 4단계: 통합 검증

- [ ] T010 `/sdd-verify` 실행 — 전체 — 모든 AC

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | | |
| AC-02 | 미실행 | | |
| AC-03 | 미실행 | | |
| AC-04 | 미실행 | | |
| AC-05 | 미실행 | | |
| AC-06 | 미실행 | | |
| AC-07 | 미실행 | | |
| AC-08 | 미실행 | | |
| AC-09 | 미실행 | | |
| AC-10 | 미실행 | | |

### 프로젝트 검사

| 검사 | 명령 | 결과 |
|---|---|---|
| 테스트 전체 | 없음 (DEC-019) | 실행 불가(테스트 없음) |
| 타입 | `npx tsc --noEmit` | 통과 (2026-11-10) |
| 빌드 | `npm run build` | 통과 (2026-11-10) |

### 영향받는 기존 흐름

- 기능 008 로그인 전환 시 상태 복원 — 미확인

## 완료 조건

- [ ] 모든 작업이 체크되었다.
- [ ] 모든 AC가 `통과`다.
- [ ] 프로젝트 검사가 통과했다.
- [x] 코드와 spec·plan이 일치한다.
- [x] 알려진 한계·후속 작업: T008, T009, spec 7절, plan 7절
