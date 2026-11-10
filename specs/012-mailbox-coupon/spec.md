# Spec 012 (Lite): 우편함과 쿠폰

- 상태: Implementing  <!-- 코드 배포됨, 검증 기록 미완 -->
- 최종 수정일: 2026-11-10

> 작은 기능용 한 장짜리 명세. 계약이 새로 생기거나, 파일이 5개 넘게 바뀌거나, 데이터 구조가 바뀌면 Full로 전환한다.

## 목표

운영자가 코인을 나눠 줄 통로를 만든다. 우편함에서 공지 보상과 매일 받는 응원 상자를 받고, 쿠폰 코드를 입력해 추가 코인을 받는다.

- 제외: 서버에서 우편 추가(우편은 코드에 고정), 카드·더스트 보상(타입에만 있음), 쿠폰 사용 횟수 전역 제한

## 인수 조건

- **AC-01** Given 처음 받는 계정 When 헤더 `우편`(모바일 `공식 우편함`)을 연다 Then 우편 3통(`mail_welcome_2026` 1,000,000 / `mail_fe3o4_celebration` 500,000 / `mail_daily_support` 300,000)과 `미수령 우편: 3통`이 보이고 헤더 배지가 3이다
- **AC-02** Given AC-01 When `보상 모두 받기` Then 코인이 1,800,000 늘고 세 우편이 `수령 완료`가 된다
- **AC-03** Given 오늘(KST) 응원 상자를 받음 When 다음 날 KST 00:00 이후 연다 Then 응원 상자만 다시 `수령`할 수 있다. 같은 날에는 다시 받을 수 없다
- **AC-04** Given 쿠폰 탭 When `nmixx2026`(소문자·공백 포함 가능) 입력 후 `쿠폰 등록` Then 대문자·공백 제거 후 `NMIXX2026`으로 처리되어 100,000 N이 지급되고 `🎉 [2026 NMIXX 공식 웰컴 쿠폰] 보상이 정상 지급되었습니다!`가 보인다
- **AC-05** Given 이미 쓴 쿠폰 When 다시 입력 Then `이미 사용 완료된 쿠폰입니다.`가 보이고 코인이 그대로다
- **AC-06** Given 없는 코드 When 입력 Then `유효하지 않은 쿠폰 번호입니다. (대소문자 및 띄어쓰기를 확인해 주세요)`
- **AC-07** Given 게스트 When 시크릿 문구(또는 `SECRET_NSWER_100M`) 입력 Then `🔒 시크릿 쿠폰은 로그인한 엔써(회원)만 사용할 수 있습니다. …`가 보이고 지급되지 않는다. 로그인 계정은 100,000,000 N과 축하 창(`⭐ SECRET EASTER EGG UNLOCKED ⭐`)을 계정당 1회 받는다

## 구현 메모

- 바꿀 파일: `src/services/multiplayerService.ts` — `DEFAULT_GLOBAL_MAILS`, `VALID_COUPONS`, `getMailList`, `redeemCoupon` / `src/components/Multiplayer/MailboxModal.tsx` / `src/pages/Settings/SettingsPage.tsx` 338~378행(같은 쿠폰 입력 폼) / `src/hooks/useGameState.ts` — `claimMail`, `redeemCouponCode`
- 쿠폰 표: `NMIXX2026`, `FE3O4_FORWARD`, `WELCOME_NSWER`, `PARK_XR_GOD` 각 100,000 / `SECRET_NSWER_100M` 100,000,000(로그인 전용, 시크릿 문구로도 사용)
- 저장: `claimedMailIds`, `lastMailClaimDate`(KST `YYYY-MM-DD`), `claimedCouponCodes` — 모두 클라우드 동기화(기능 008)
- 새 우편·쿠폰 추가: 위 두 상수에 항목을 추가하고 배포한다. 우편 `id`는 바꾸지 않는다(수령 기록 키).
- 테스트: 자동화 후보(DEC-020) — `redeemCoupon`, `getMailList`는 순수 함수. 현재는 수동: 새 테스트 계정으로 AC-01~07 순서대로, AC-03은 `lastMailClaimDate`를 콘솔에서 어제 날짜로 바꿔 확인
- 알려진 한계: 쿠폰 코드와 시크릿 문구가 클라이언트 번들에 그대로 들어 있어 누구나 볼 수 있다(DEC-001). 우편함 힌트 카드에 금액이 하드코딩. 게스트도 일반 쿠폰·우편은 받을 수 있지만 저장되지 않는다.

## 작업

- [x] T001 우편·쿠폰 정의와 검증 — `multiplayerService.ts` (v1.6.0, 2026-08-31 보상액 조정)
- [x] T002 우편함 창 — `MailboxModal.tsx`
- [x] T003 정보 탭 쿠폰 입력 — `SettingsPage.tsx`
- [ ] T004 `/sdd-verify` 실행

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

- 프로젝트 검사: `npx tsc --noEmit` 통과, `npm run build` 통과 (2026-11-10)
