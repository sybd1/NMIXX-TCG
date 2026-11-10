# Spec 014 (Lite): 회원 탈퇴

- 상태: Implementing  <!-- 코드 배포됨, 검증 기록 미완 -->
- 최종 수정일: 2026-11-10

> 작은 기능용 한 장짜리 명세. 계약이 새로 생기거나, 파일이 5개 넘게 바뀌거나, 데이터 구조가 바뀌면 Full로 전환한다.

## 목표

사용자가 자기 데이터를 지울 수 있게 한다. "게임 초기화"가 랭킹에 유령 계정을 남기던 문제를 없앤다(DEC-015).

- 제외: 탈퇴 유예 기간, 데이터 내보내기, 카카오 앱 연결 끊기(unlink)

## 인수 조건

- **AC-01** Given 구글 로그인 사용자 When 정보 탭 `회원 탈퇴 (DELETE ACCOUNT)` › `탈퇴` › `확인 및 탈퇴` Then Firestore `nmixx_tcg_users/<uid>`와 `nmixx_tcg_leaderboard/<uid>`가 삭제되고, Firebase Auth 계정이 삭제되고, `nmixx_`로 시작하는 localStorage 키가 모두 지워진 뒤 페이지가 새로고침되어 게스트 상태가 된다
- **AC-02** Given 확인 창 When `취소` Then 아무 것도 지워지지 않는다
- **AC-03** Given 구글 로그인한 지 오래되어 Firebase가 재인증을 요구 When 탈퇴 Then `보안을 위해 다시 로그인 후 탈퇴를 진행해 주세요.` 알림이 뜬다 [확인 필요: 이때 Firestore 문서는 이미 삭제된 뒤라(삭제 순서: 유저 문서 → 랭킹 → Auth) 데이터는 지워지고 Auth 계정만 남는다. 의도인지 — 구현 막음: 아니오]
- **AC-04** Given 카카오 사용자 When 탈퇴 Then Firestore 문서와 로컬 데이터가 지워진다(Firebase Auth 계정은 원래 없음)
- **AC-05** (2026-11-10 `/sdd-change`로 추가, DEC-024) Given 게스트이거나 로그인하지 않음 When 정보 탭을 본다 Then 회원 탈퇴 영역이 보이지 않는다. 다른 경로로 `deleteAccount`가 게스트 세션에서 호출되어도 아무 것도 지우지 않고 `{ success: false, message: '게스트는 탈퇴할 계정이 없습니다.' }`를 돌려준다

## 구현 메모

- 바꿀 파일: `src/services/authService.ts` — `deleteAccount` / `src/pages/Settings/SettingsPage.tsx` — 탈퇴 영역·확인 창 / `src/App.tsx` 366~374행 — 성공 시 `window.location.reload()`, 실패 시 `alert`
- 테스트: 수동. 탈퇴 전용 테스트 계정으로 AC-01·02·04, Firestore 콘솔과 DevTools Local Storage로 확인. AC-03은 재현 어려움(로그인 후 오래 지난 세션). AC-05: `npm run dev`에서 (1) 로그인 전 정보 탭 확인 (2) `로그인 없이 게스트로 시작하기` 후 정보 탭 확인 (3) DevTools 콘솔에서 `localStorage.setItem('nmixx_probe','keep')` → `(await import('/src/services/authService.ts')).AuthService.deleteAccount()` 결과와 `nmixx_probe`가 남았는지 확인 후 키 삭제
- 해결된 결함(2026-11-10, T003): 게스트 세션에서 탈퇴가 "성공"하며 이 브라우저의 `nmixx_` localStorage 키를 모두 지우던 문제. `SettingsPage`는 `canDeleteAccount`(App에서 로그인·비게스트일 때만 true)가 false면 탈퇴 영역을 그리지 않고, `deleteAccount`도 게스트면 바로 실패를 돌려준다.
- 알려진 한계: 로그인 사용자가 탈퇴하면 여전히 `nmixx_`로 시작하는 모든 키를 지운다(같은 브라우저의 다른 계정 로컬 저장본 포함). 클라우드 데이터는 남으므로 그 계정은 다음 로그인 때 복구된다. 실패 문구용 상태(`deleteError`)가 쓰이지 않아 실패는 브라우저 `alert`로만 보인다. 이미 쓴 시크릿 쿠폰 등 기록도 함께 사라져 재가입하면 다시 받을 수 있다.

## 작업

- [x] T001 탈퇴 처리 — `authService.ts` (2026-08-31 커밋 `7653e1d`)
- [x] T002 탈퇴 화면 — `SettingsPage.tsx`, `App.tsx`
- [x] T003 (변경, 2026-11-10, DEC-024) 비로그인·게스트 탈퇴 차단과 탈퇴 영역 숨김 — `SettingsPage.tsx`(`canDeleteAccount` prop), `App.tsx`, `authService.ts` — AC-05 — 타입 검사·빌드 통과, AC-05 수동 통과
- [ ] T004 `/sdd-verify` 실행

## 검증 기록

| AC | 판정 | 근거 | 날짜 |
|---|---|---|---|
| AC-01 | 미실행 | | |
| AC-02 | 미실행 | | |
| AC-03 | 미실행 | | |
| AC-04 | 미실행 | | |
| AC-05 | 통과 | `npm run dev`: 로그인 전 정보 탭에 `회원 탈퇴` 문구 없음(쿠폰 교환소는 보임). 게스트(`게스트_e748`)로 시작한 뒤에도 없음. 게스트 세션에서 `deleteAccount()` → `{success:false, message:'게스트는 탈퇴할 계정이 없습니다.'}`, `nmixx_probe` 유지, 세션도 게스트 그대로 | 2026-11-10 |

- 프로젝트 검사: `npx tsc --noEmit` 통과, `npm run build` 통과 (2026-11-10)
