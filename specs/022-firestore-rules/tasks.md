# Tasks 022: Firestore 보안 규칙 강화

- 상태: Implementing
- 최종 수정일: 2026-11-25
- 기준: [spec.md](spec.md), [plan.md](plan.md)

## 작업 목록

형식: `- [ ] T번호 [P] 설명 — 파일 — AC — 완료 기준`

- `[P]`: 앞 작업과 다른 파일만 건드려 동시에 진행해도 되는 작업
- 한 작업은 한 번에 검토할 수 있는 크기(대략 파일 1~3개)로 나눈다.
- 체크는 완료 기준을 실제로 확인한 뒤에만 한다. 막힌 작업은 `- [!]`로 표시하고 이유를 적는다.
- 수동 절차 M0~M10은 plan 6절에 있다. 운영 콘솔이 필요한 절차는 운영자가 직접 한다.

### 1단계: 계약·기반

- [ ] T001 운영 상태 기록(코드 변경 전) — `docs/product.md` Q-01·Q-02 — AC-14 — 수동 M0 결과(콘솔 규칙과 저장소 파일의 같음/다름과 차이, `kakao_` 문서의 최근 `lastSavedAt`)가 날짜와 함께 적혀 있음. **운영자 콘솔 접근 필요**
- [x] T002 [P] 규칙 테스트 기반 — `package.json`, `package-lock.json`, `firebase.json`, `tests/rules/setup.ts`, `tests/rules/emulator.test.ts`, `docs/decisions.md`(DEC-027 설치 기록) — 전체 — 2026-11-25 완료
  - JDK: Temurin 21.0.12.1 확인(`java -version` → `21.0.12.1 LTS`). 시스템 PATH에 없어서 실행 전 설정 필요. plan 7절 갱신
  - devDependency `vitest@5.1.2`, `@firebase/rules-unit-testing@5.0.2`, `firebase-tools@15.37.0` 추가
  - `firebase.json`: 규칙 경로, Firestore 에뮬레이터 8080, UI 끔, `singleProjectMode`
  - `npm run test:rules` → 에뮬레이터 시작, `Test Files 1 passed (1) / Tests 1 passed (1)`, `Script exited successfully (code 0)`, 12초(jar 첫 다운로드 포함)
  - 새 폴더 `npm ci` 9초 → 16초, 새 폴더 `npm ci` → `npm run build` 통과, `npx tsc --noEmit` 통과
  - 계획과 다른 점: 연결 확인 테스트는 `setup.ts`가 아닌 `emulator.test.ts`에 두었다(`setup.ts`는 테스트 파일 패턴이 아님)

### 2단계: 테스트 먼저 (실패 확인)

각 작업의 완료 기준: 현재 `firestore.rules`로 `npm run test:rules` 실행 시, 허용 테스트는 통과하거나 실패 원인이 기록되어 있고, **거부 테스트가 실패**함을 확인한다(출력 요약을 작업 줄에 남김).

- [x] T003 [P] users 규칙 테스트 — `tests/rules/users.test.ts` — AC-01, AC-02, AC-03, AC-03a, AC-04 — 2026-11-25 현재 규칙 실행: AC-02·03·03a `Expected request to fail, but it succeeded`로 실패, AC-01·04 통과(현재 규칙도 허용)
- [x] T004 [P] leaderboard 규칙 테스트 — `tests/rules/leaderboard.test.ts` — AC-03b, AC-05, AC-06 — 2026-11-25 현재 규칙 실행: AC-06 `Expected request to fail, but it succeeded`로 실패, AC-03b·05 통과
- [x] T005 [P] 전광판 규칙 테스트 — `tests/rules/feed.test.ts` — AC-08, AC-09, AC-10 — 2026-11-25 현재 규칙 실행: AC-08·10이 `PERMISSION_DENIED: No matching allow statements`로 실패(`nmixx_tcg_global_feed` 규칙 없음), AC-09 통과(이미 전부 거부)
- [x] T006 [P] 교환소·기본 거부 테스트 — `tests/rules/market.test.ts` — AC-11, AC-12, AC-13, AC-18 — 2026-11-25 현재 규칙 실행: AC-11·12 `Expected request to fail, but it succeeded`로 실패, AC-13·18 통과
- [x] T007 [P] 카카오 규칙 테스트 — `tests/rules/kakao.test.ts` — AC-15, AC-15a — 2026-11-25 현재 규칙 실행: AC-15는 전광판 추가가 `PERMISSION_DENIED`로 실패, AC-15a는 카카오 K가 `goog_A`에 쓰기가 성공해 실패(42행)

- 2단계 전체 실행(2026-11-25, `npm run test:rules`, 현재 `firestore.rules`): `Test Files 5 failed | 1 passed (6)`, `Tests 10 failed | 8 passed (18)`. 실패 10건은 모두 규칙이 없거나 너무 느슨해서 생긴 것이고, 문법·import 오류는 없다. 공통 헬퍼 `readAsAdmin`·`countAsAdmin`을 `setup.ts`에 추가했다.

### 3단계: 구현

- [x] T008 규칙 다시 쓰기 — `firestore.rules` — AC-01~06, 03a·03b, AC-08~13, AC-15, 15a, AC-18 — 2026-11-25 `npm run test:rules` → `Test Files 6 passed (6)`, `Tests 18 passed (18)`, `Script exited successfully (code 0)`. plan 3절을 규칙 요약표로 바꿈
- [x] T009 [P] 조회 경로 정리 — `src/services/multiplayerService.ts` — AC-07, AC-03a — 2026-11-25: `fetchLeaderboard`의 다른 사용자 문서 `setDoc` 2줄을 지우고 화면 치환만 남김. `fetchUserProfile`의 `nmixx_tcg_users` 대체 조회를 지움. `npx tsc --noEmit` 통과. `fetchLeaderboard` 안 `setDoc`·`deleteDoc`·`updateDoc`·`addDoc` 검색 결과 0건. `npm run test:rules` 18/18 통과. 수동 M2(비로그인, `npm run dev`): 랭킹 탭에서 `performance` 리소스 기준 Firestore 요청 3건이 모두 `Listen/channel`이고 `Write` 0건. 화면에 `anjffhrkwl` 1건 표시. 원본 문서가 `박민주`를 담고 있었는지는 확인하지 못했다(치환 분기를 탔는지 불확실). 로그인 상태 M2는 T014에서 함께 본다
- [ ] T010 [P] 닉네임 중복 확인을 랭킹 문서로 — `src/services/authService.ts` `isNicknameAvailable` — AC-03b, AC-03c — 2026-11-25 코드 완료: `nmixx_tcg_leaderboard`를 `displayName`으로 검색(오류 시 통과 처리 유지). `npx tsc --noEmit` 통과, `npm run test:rules` 18/18 통과. **남음: 수동 M3-a·M3-b는 로그인한 테스트 계정이 필요해 미실행(운영자가 진행)**
- [x] T011 문서 갱신 — `CLAUDE.md`(기술 스택 테스트 항목, 명령어 `npm run test:rules`와 JDK 설정, 폴더 구조 `firebase.json`·`tests/rules/`, 작업 방식 4·5번), `docs/decisions.md`(DEC-020 진행 메모) — 전체 — 2026-11-25. CLAUDE.md 89줄. 적은 명령을 CLAUDE.md의 PowerShell JDK 설정 그대로 모두 실행해 통과(T012)

### 4단계: 통합 검증

- [x] T012 프로젝트 검사 — 전체 — 2026-11-25. `npm ci` exit 0, `npx tsc --noEmit` exit 0, `verify_images` 529개 통과, `npm run build` 통과, `npm run test:rules` 18/18 통과
- [!] T013 운영 배포 — Firebase 콘솔, `docs/product.md` — AC-15b, AC-16, AC-17, AC-13(M6), AC-01·05·08·04·15 수동 — 수동 M8 → M6(직전 값) → 콘솔 게시 → M9 → M1·M4·M5·M6·M7(실패하면 M10). **막힘: 카카오 Firebase 인증 연동 기능이 운영에 배포되어야 함(DEC-026). 그 기능의 명세가 아직 없다**
- [x] T014 `/sdd-verify` 실행 — 전체 — 모든 AC — 2026-11-25 검증 기록 작성. 통과 10, 미실행 7, 실행 불가 6(총 23). Verified 아님

## 검증 기록

`/sdd-verify`가 채운다. 확인 방법은 plan.md 6절을 따른다.
판정: `통과 / 실패 / 미실행 / 실행 불가(사유)`

| AC | 판정 | 근거 (명령 출력·화면·로그 위치) | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | 규칙: `npm run test:rules --reporter=verbose` ✓ `users: 본인 저장 허용`. 앱 수동 M1(로그인 저장)은 테스트 계정 로그인이 필요해 미실행 | 2026-11-25 |
| AC-02 | 통과 | `npm run test:rules --reporter=verbose` ✓ `users: 타인 문서 쓰기 거부` (사전 데이터 그대로 확인 포함) | 2026-11-25 |
| AC-03 | 통과 | `npm run test:rules --reporter=verbose` ✓ `users: 타인 삭제·비로그인 쓰기 거부` | 2026-11-25 |
| AC-03a | 통과 | `npm run test:rules --reporter=verbose` ✓ `users: 타인 읽기·컬렉션 검색 거부`. 코드 검색: 다른 사용자 users 문서를 읽는 곳은 숨김 기능 `fetchUserCollection`뿐(plan 5절 의도) | 2026-11-25 |
| AC-03b | 미실행 | 규칙: `npm run test:rules --reporter=verbose` ✓ `leaderboard: 닉네임 검색 허용`. 앱 수동 M3-a는 로그인이 필요해 미실행 | 2026-11-25 |
| AC-03c | 실행 불가(로그인한 테스트 계정 필요, M3-b) | 코드: `isNicknameAvailable`이 랭킹 문서만 검색함을 확인 | 2026-11-25 |
| AC-04 | 미실행 | 규칙: `npm run test:rules --reporter=verbose` ✓ `users·leaderboard: 본인 삭제 허용`. 앱 수동 M5(탈퇴)는 로그인이 필요해 미실행 | 2026-11-25 |
| AC-05 | 미실행 | 규칙: `npm run test:rules --reporter=verbose` ✓ `leaderboard: 공개 읽기·본인 쓰기`. 앱 수동 M1은 미실행(비로그인 랭킹 표시는 현재 운영 규칙에서만 확인) | 2026-11-25 |
| AC-06 | 통과 | `npm run test:rules --reporter=verbose` ✓ `leaderboard: 타인 수정·삭제 거부` | 2026-11-25 |
| AC-07 | 실행 불가(운영 데이터에 전제 조건 없음) | 운영 랭킹 27건 공개 조회 결과 `displayName`에 `박민주` 포함 0건이라 치환 분기를 재현할 수 없음. 만들려면 운영 문서를 써야 함. 대신: 비로그인 M2에서 Firestore 요청 3건 모두 `Listen/channel`, Write 0건. 코드 검색으로 `fetchLeaderboard` 안 쓰기 호출 0건 | 2026-11-25 |
| AC-08 | 미실행 | 규칙: `npm run test:rules --reporter=verbose` ✓ `feed: 본인 항목 추가·공개 읽기`. 앱 수동 M4는 로그인이 필요해 미실행 | 2026-11-25 |
| AC-09 | 통과 | `npm run test:rules --reporter=verbose` ✓ `feed: 수정·삭제·비로그인 추가 거부` | 2026-11-25 |
| AC-10 | 통과 | `npm run test:rules --reporter=verbose` ✓ `feed: 작성자 uid 위조 거부` | 2026-11-25 |
| AC-11 | 통과 | `npm run test:rules --reporter=verbose` ✓ `market: 등록 거부` | 2026-11-25 |
| AC-12 | 통과 | `npm run test:rules --reporter=verbose` ✓ `market: 수정·삭제 거부` (`completeTrade`와 같은 변경 포함) | 2026-11-25 |
| AC-13 | 미실행 | 규칙: `npm run test:rules --reporter=verbose` ✓ `market: 공개 읽기`. 배포 전후 문서 수 비교(M6)는 배포 때 함 | 2026-11-25 |
| AC-14 | 실행 불가(운영 Firebase 콘솔 접근 필요, T001) |  | 2026-11-25 |
| AC-15 | 미실행 | 규칙: `npm run test:rules --reporter=verbose` ✓ `kakao: 본인 문서 쓰기 허용`. 앱 수동 M7은 카카오 연동 배포 뒤 | 2026-11-25 |
| AC-15a | 통과 | `npm run test:rules --reporter=verbose` ✓ `kakao: 타인 문서 거부` (구글 uid가 `kakao_K`인 경우 포함) | 2026-11-25 |
| AC-15b | 실행 불가(운영 배포 단계, T013 막힘) |  | 2026-11-25 |
| AC-16 | 실행 불가(운영 배포 단계, T013 막힘) |  | 2026-11-25 |
| AC-17 | 실행 불가(운영 배포 단계, T013 막힘) |  | 2026-11-25 |
| AC-18 | 통과 | `npm run test:rules --reporter=verbose` ✓ `기본 거부: 규칙에 없는 컬렉션` | 2026-11-25 |

### 프로젝트 검사

| 검사 | 명령 | 결과 |
|---|---|---|
| 규칙 테스트 | `npm run test:rules` | 통과 — `Tests 18 passed (18)` (2026-11-25) |
| 타입 | `npx tsc --noEmit` | 통과 — exit 0 (2026-11-25) |
| 빌드(이미지 검사 포함) | `npm run build` | 통과 — 이미지 529개, `built in 5.92s` (2026-11-25) |

### 영향받는 기존 흐름

- 008 저장·기기 간 동기화 — 미확인. 새 규칙은 운영에 없고, 로그인 테스트가 필요함 (M1)
- 010 랭킹 표시·이름 치환 — 비로그인 `npm run dev`에서 Top 50 표시, 쓰기 요청 0건 (2026-11-25). 치환 분기는 운영 데이터에 대상이 없어 미재현
- 011 전광판 — 미확인. 규칙 테스트로 컬렉션 이름 일치는 확인 (M4)
- 013 닉네임 변경 — 미확인. 코드 변경 완료, 로그인 필요 (M3)
- 014 회원 탈퇴 — 미확인 (M5)
- 016 교환소(숨김) — 쓰기 거부, 상대 컬렉션 조회 불가가 의도된 결과임 (spec Q-A·Q-B)

## 완료 조건

- [ ] 모든 작업이 체크되었다.
- [ ] 모든 AC가 `통과`다. (`미실행`·`실행 불가`가 있으면 Verified 아님)
- [ ] 프로젝트 검사가 통과했다.
- [ ] 코드와 spec·plan이 일치한다. 구현 중 바뀐 내용을 문서에 반영했다.
- [ ] 알려진 한계·후속 작업: 카카오 Firebase 인증 연동 기능 명세(DEC-026, 027) / 인증 복원 전 요청 거부 여부(plan 7절) / 교환소 재개 시 권한 재설계(016)
