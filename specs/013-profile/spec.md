# Spec 013 (Lite): 프로필(닉네임·최애 멤버)

- 상태: Implementing  <!-- 코드 배포됨, 검증 기록 미완 -->
- 최종 수정일: 2026-11-10

> 작은 기능용 한 장짜리 명세. 계약이 새로 생기거나, 파일이 5개 넘게 바뀌거나, 데이터 구조가 바뀌면 Full로 전환한다.

## 목표

랭킹에 보이는 이름과 대표 멤버를 사용자가 정하게 한다. 운영자 사칭과 중복 이름은 막는다(DEC-013 → DEC-014).

- 제외: 프로필 사진 업로드, 닉네임 변경 횟수 제한

## 인수 조건

- **AC-01** Given 로그인 사용자 When 헤더 닉네임 → 프로필 창에서 이름을 "릴리팬"으로 바꾸고 멤버 `릴리 🌸`를 골라 `프로필 저장하기` Then 버튼이 `저장 완료!`(2초)로 바뀌고 헤더·랭킹 이름과 이모지가 바뀐다
- **AC-02** Given 1글자 입력 When 저장 Then `닉네임은 최소 2글자 이상 입력해 주세요.`가 보이고 저장되지 않는다(최대 12자는 입력 제한)
- **AC-03** Given `운영자` 또는 `gm`이 들어간 이름 When 저장 Then `사용할 수 없는 단어(운영자, GM)가 포함되어 있습니다.`
- **AC-04** Given 다른 사람이 쓰는 이름 When 저장 Then `이미 사용 중인 닉네임입니다.`
- **AC-05** Given AC-01로 바꾼 상태 When 다른 기기에서 로그인 Then 바뀐 이름·멤버가 보인다

## 구현 메모

- 바꿀 파일: `src/components/Auth/UserProfileModal.tsx` — 입력·멤버 선택·로그아웃 / `src/services/authService.ts` — `updateProfile`, `isNicknameAvailable`, `sanitizeDisplayName`
- 저장: 세션(`localStorage`), Firestore `nmixx_tcg_users/<uid>`의 `displayName`·`nickname`·`avatarMemberId`, `nmixx_tcg_leaderboard/<uid>`의 `displayName`·`avatarMemberId`
- 멤버: LILY 🌸, HAEWON 🌊, SULLYOON 🦌(기본), BAE 🐥, JIWOO 🐶, KYUJIN 🐱
- 테스트: 수동. 테스트 계정 두 개(A, B)로 AC-01~05. AC-04는 B의 이름을 A에서 시도
- 알려진 한계: 중복 검사는 클라이언트 쿼리라 동시 등록 경쟁을 막지 못하고, 조회 실패 시 통과시킨다. 창의 입력값은 처음 열 때의 사용자 정보로만 초기화되어 계정을 바꾸면 이전 값이 남을 수 있다. `클라우드 세이브 활성화됨` 문구가 게스트에게도 보인다.

## 작업

- [x] T001 프로필 창 — `UserProfileModal.tsx`
- [x] T002 변경·검증·동기화 — `authService.ts` (2026-08-31 잠금 후 되돌림)
- [ ] T003 `/sdd-verify` 실행

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | | |
| AC-02 | 미실행 | | |
| AC-03 | 미실행 | | |
| AC-04 | 미실행 | | |
| AC-05 | 미실행 | | |

- 프로젝트 검사: `npx tsc --noEmit` 통과, `npm run build` 통과 (2026-11-10)
